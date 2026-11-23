<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\MailerAuthException;
use App\Http\Controllers\Controller;
use App\Models\UserSmtpSetting;
use App\Services\Mail\DynamicSmtpMailerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserSmtpSettingController extends Controller
{
    public function __construct(
        private readonly DynamicSmtpMailerService $dynamicSmtpMailer,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $setting = $request->user()->smtpSetting()->first();

        return response()->json([
            'data' => $setting,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $existing = $user->smtpSetting()->first();

        $validated = $request->validate([
            'from_email' => ['required', 'email', 'max:255'],
            'from_name' => ['nullable', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => [$existing ? 'nullable' : 'required', 'string'],
            'host' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'encryption' => ['nullable', Rule::in(['tls', 'ssl', 'none'])],
        ]);

        $password = ! empty($validated['password'])
            ? (string) $validated['password']
            : (string) $existing->password;

        try {
            $resolved = $this->dynamicSmtpMailer->resolveConnectionConfig([
                'from_email' => $validated['from_email'],
                'from_name' => $validated['from_name'] ?? $user->name,
                'username' => $validated['username'] ?? $validated['from_email'],
                'password' => $password,
                'host' => $validated['host'] ?? null,
                'port' => $validated['port'] ?? null,
                'encryption' => $validated['encryption'] ?? null,
            ]);
        } catch (MailerAuthException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], $e->statusCode);
        }

        $setting = UserSmtpSetting::updateOrCreate(
            ['user_id' => $user->id],
            $resolved
        );

        return response()->json([
            'message' => 'Configuración SMTP guardada de forma segura.',
            'data' => $setting->fresh(),
        ]);
    }

    public function test(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'use_saved' => ['nullable', 'boolean'],
            'from_email' => ['nullable', 'email', 'max:255'],
            'smtp_email' => ['nullable', 'email', 'max:255'],
            'from_name' => ['nullable', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string'],
            'smtp_password' => ['nullable', 'string'],
            'host' => ['nullable', 'string', 'max:255'],
            'smtp_host' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'smtp_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'encryption' => ['nullable', Rule::in(['tls', 'ssl', 'none'])],
            'smtp_encryption' => ['nullable', Rule::in(['tls', 'ssl', 'none'])],
        ]);

        try {
            if (! empty($validated['use_saved'])) {
                $existing = $user->smtpSetting()->first();
                if (! $existing) {
                    return response()->json([
                        'message' => 'No tienes una configuración SMTP guardada para probar.',
                    ], 422);
                }

                $resolved = $this->dynamicSmtpMailer->configFromModel($existing);
            } else {
                $email = $validated['from_email'] ?? $validated['smtp_email'] ?? null;
                $password = $validated['password'] ?? $validated['smtp_password'] ?? null;

                if (empty($email) || empty($password)) {
                    return response()->json([
                        'message' => 'Debes ingresar el correo y la contraseña SMTP para probar la conexión.',
                    ], 422);
                }

                $resolved = $this->dynamicSmtpMailer->resolveConnectionConfig([
                    'from_email' => $email,
                    'from_name' => $validated['from_name'] ?? $user->name,
                    'username' => $validated['username'] ?? $email,
                    'password' => $password,
                    'host' => $validated['host'] ?? $validated['smtp_host'] ?? null,
                    'port' => $validated['port'] ?? $validated['smtp_port'] ?? null,
                    'encryption' => $validated['encryption'] ?? $validated['smtp_encryption'] ?? null,
                ]);
            }

            $this->dynamicSmtpMailer->testConnection($resolved);
        } catch (MailerAuthException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], $e->statusCode);
        }

        return response()->json([
            'message' => "Conexión SMTP verificada correctamente para {$resolved['from_email']}.",
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->user()->smtpSetting()?->delete();

        return response()->json([
            'message' => 'Configuración SMTP eliminada correctamente.',
        ]);
    }
}
