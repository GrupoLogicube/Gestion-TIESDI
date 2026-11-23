<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\MailerAuthException;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Guest;
use App\Models\GuestMagicLink;
use App\Models\UserSmtpSetting;
use App\Services\Mail\DynamicSmtpMailerService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;
use Throwable;

class GuestInvitationController extends Controller
{
    public function __construct(
        private readonly DynamicSmtpMailerService $dynamicSmtpMailer,
    ) {}

    public function sendEmail(Request $request, Event $event): JsonResponse
    {
        Gate::authorize('update', $event);

        $validated = $request->validate([
            'guest_ids' => ['nullable', 'array'],
            'guest_ids.*' => ['integer'],
            'smtp_mode' => ['required', Rule::in(['saved', 'custom'])],
            'smtp_email' => ['required_if:smtp_mode,custom', 'nullable', 'email', 'max:255'],
            'smtp_password' => ['required_if:smtp_mode,custom', 'nullable', 'string'],
            'smtp_from_name' => ['nullable', 'string', 'max:255'],
            'smtp_username' => ['nullable', 'string', 'max:255'],
            'smtp_host' => ['nullable', 'string', 'max:255'],
            'smtp_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'smtp_encryption' => ['nullable', Rule::in(['tls', 'ssl', 'none'])],
            'save_credentials' => ['nullable', 'boolean'],
        ]);

        $guests = $this->resolveTargetGuests($event, $validated['guest_ids'] ?? null);

        if ($guests->isEmpty()) {
            return response()->json([
                'message' => 'No se encontraron invitados para enviar invitaciones.',
            ], 422);
        }

        $sender = $request->user();
        $smtpMode = $validated['smtp_mode'];

        try {
            if ($smtpMode === 'saved') {
                $savedSetting = $sender->smtpSetting()->first();
                if (! $savedSetting) {
                    return response()->json([
                        'message' => 'No tienes una configuración SMTP guardada. Ingresa tus credenciales para enviar invitaciones.',
                    ], 422);
                }

                $resolvedConfig = $this->dynamicSmtpMailer->configFromModel($savedSetting);
            } else {
                $resolvedConfig = $this->dynamicSmtpMailer->resolveConnectionConfig([
                    'from_email' => (string) $validated['smtp_email'],
                    'from_name' => $validated['smtp_from_name'] ?? $sender->name,
                    'username' => $validated['smtp_username'] ?? (string) $validated['smtp_email'],
                    'password' => (string) $validated['smtp_password'],
                    'host' => $validated['smtp_host'] ?? null,
                    'port' => $validated['smtp_port'] ?? null,
                    'encryption' => $validated['smtp_encryption'] ?? null,
                ]);
            }

            $customMailer = $this->dynamicSmtpMailer->buildMailer($resolvedConfig);
        } catch (MailerAuthException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], $e->statusCode);
        }

        $senderEmail = $resolvedConfig['from_email'];
        $senderName = $resolvedConfig['from_name'] ?: $sender->name;

        $sent = 0;
        $skipped = 0;
        $failed = 0;
        $results = [];

        foreach ($guests as $guest) {
            if (empty($guest->email)) {
                $skipped++;
                $results[] = [
                    'guest_id' => $guest->id,
                    'name' => $guest->name,
                    'status' => 'skipped',
                    'reason' => 'Sin correo electrónico registrado',
                ];
                continue;
            }

            try {
                $token = $this->createMagicLinkToken($guest);
                $rsvpUrl = $this->buildFrontendRsvpUrl($token);

                $this->dynamicSmtpMailer->sendInvitation(
                    mailer: $customMailer,
                    fromEmail: $senderEmail,
                    fromName: $senderName,
                    event: $event,
                    guest: $guest,
                    rsvpUrl: $rsvpUrl
                );

                $sent++;
                $results[] = [
                    'guest_id' => $guest->id,
                    'name' => $guest->name,
                    'email' => $guest->email,
                    'status' => 'sent',
                ];
            } catch (MailerAuthException $e) {
                return response()->json([
                    'message' => $e->getMessage(),
                ], $e->statusCode);
            } catch (Throwable) {
                $failed++;
                $results[] = [
                    'guest_id' => $guest->id,
                    'name' => $guest->name,
                    'email' => $guest->email,
                    'status' => 'failed',
                    'reason' => 'Error al enviar correo al destinatario.',
                ];
            }
        }

        $credentialsSaved = false;
        if ($smtpMode === 'custom' && ! empty($validated['save_credentials']) && $sent > 0) {
            UserSmtpSetting::updateOrCreate(
                ['user_id' => $sender->id],
                $resolvedConfig
            );
            $credentialsSaved = true;
        }

        return response()->json([
            'message' => $sent > 0
                ? "Se enviaron {$sent} invitación(es) desde {$senderEmail}."
                : 'No se pudo enviar ningún correo.',
            'data' => [
                'sent' => $sent,
                'skipped' => $skipped,
                'failed' => $failed,
                'total_targeted' => $guests->count(),
                'smtp_mode' => $smtpMode,
                'sender_email' => $senderEmail,
                'credentials_saved' => $credentialsSaved,
                'results' => $results,
            ],
        ]);
    }

    public function startWhatsapp(Request $request, Event $event): JsonResponse
    {
        Gate::authorize('update', $event);

        $validated = $request->validate([
            'guest_ids' => ['nullable', 'array'],
            'guest_ids.*' => ['integer'],
        ]);

        $guests = $this->resolveTargetGuests($event, $validated['guest_ids'] ?? null);

        $recipients = [];
        $skipped = 0;

        foreach ($guests as $guest) {
            if (empty($guest->phone)) {
                $skipped++;
                continue;
            }

            $token = $this->createMagicLinkToken($guest);
            $rsvpUrl = $this->buildFrontendRsvpUrl($token);

            $recipients[] = [
                'guest_id' => $guest->id,
                'name' => $guest->name,
                'phone' => $guest->phone,
                'message' => $this->buildWhatsappMessage($event, $guest, $rsvpUrl),
            ];
        }

        if (empty($recipients)) {
            return response()->json([
                'message' => 'Ninguno de los invitados seleccionados tiene número de teléfono registrado.',
            ], 422);
        }

        $serviceUrl = rtrim((string) config('services.whatsapp.url'), '/');

        try {
            $response = Http::timeout(10)->post("{$serviceUrl}/sessions", [
                'recipients' => $recipients,
            ]);
        } catch (ConnectionException) {
            return response()->json([
                'message' => 'El servicio efímero de WhatsApp no está en ejecución. Inícialo con: cd whatsapp-service && npm start',
            ], 503);
        }

        if (! $response->successful()) {
            return response()->json([
                'message' => $response->json('message') ?? 'No se pudo iniciar la sesión de WhatsApp.',
            ], $response->status());
        }

        return response()->json([
            'data' => [
                ...$response->json(),
                'skipped' => $skipped,
            ],
        ], 201);
    }

    public function whatsappStatus(Event $event, string $sessionId): JsonResponse
    {
        Gate::authorize('view', $event);

        $serviceUrl = rtrim((string) config('services.whatsapp.url'), '/');

        try {
            $response = Http::timeout(10)->get("{$serviceUrl}/sessions/{$sessionId}");
        } catch (ConnectionException) {
            return response()->json([
                'message' => 'No se pudo conectar con el servicio de WhatsApp.',
            ], 503);
        }

        return response()->json([
            'data' => $response->json(),
        ], $response->status());
    }

    public function cancelWhatsapp(Event $event, string $sessionId): JsonResponse
    {
        Gate::authorize('update', $event);

        $serviceUrl = rtrim((string) config('services.whatsapp.url'), '/');

        try {
            $response = Http::timeout(10)->delete("{$serviceUrl}/sessions/{$sessionId}");
        } catch (ConnectionException) {
            return response()->json(['message' => 'Sesión cerrada.']);
        }

        return response()->json($response->json(), $response->status());
    }

    /**
     * @param  array<int>|null  $guestIds
     * @return Collection<int, Guest>
     */
    private function resolveTargetGuests(Event $event, ?array $guestIds): Collection
    {
        $query = $event->guests()->orderBy('name');

        if (! empty($guestIds)) {
            $query->whereIn('id', $guestIds);
        }

        return $query->get();
    }

    private function createMagicLinkToken(Guest $guest): string
    {
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);

        DB::transaction(function () use ($guest, $rawToken, $tokenHash) {
            $guest->magicLinks()->whereNull('revoked_at')->update(['revoked_at' => now()]);

            GuestMagicLink::create([
                'guest_id' => $guest->id,
                'token_hash' => $tokenHash,
                'token_prefix' => substr($rawToken, 0, 12),
            ]);
        });

        return $rawToken;
    }

    private function buildFrontendRsvpUrl(string $token): string
    {
        $baseUrl = rtrim((string) config('services.frontend_url', 'http://localhost:5173'), '/');

        return "{$baseUrl}/rsvp/{$token}";
    }

    private function buildWhatsappMessage(Event $event, Guest $guest, string $rsvpUrl): string
    {
        $lines = [
            "¡Hola {$guest->name}! 🎉",
            "Estás invitado a *{$event->title}*.",
            '',
            '📅 *Fecha:* '.$event->starts_at?->format('d/m/Y H:i'),
        ];

        if ($event->location) {
            $lines[] = "📍 *Lugar:* {$event->location}";
        }
        if ($event->location_url) {
            $lines[] = "🗺️ *Mapa:* {$event->location_url}";
        }

        $lines[] = "🎟️ *Pases asignados:* {$guest->passes_count}";
        $lines[] = '';
        $lines[] = "Confirma tu asistencia aquí:\n{$rsvpUrl}";

        return implode("\n", $lines);
    }
}
