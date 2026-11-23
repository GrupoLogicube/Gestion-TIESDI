<?php

namespace App\Services\Mail;

use App\Exceptions\MailerAuthException;
use App\Mail\GuestInvitationMail;
use App\Models\Event;
use App\Models\Guest;
use App\Models\UserSmtpSetting;
use Illuminate\Contracts\Mail\Mailer as MailerContract;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class DynamicSmtpMailerService
{
    /**
     * @var array<string, array{host: string, port: int, encryption: string}>
     */
    private const DOMAIN_PRESETS = [
        'gmail.com' => ['host' => 'smtp.gmail.com', 'port' => 587, 'encryption' => 'tls'],
        'googlemail.com' => ['host' => 'smtp.gmail.com', 'port' => 587, 'encryption' => 'tls'],
        'outlook.com' => ['host' => 'smtp-mail.outlook.com', 'port' => 587, 'encryption' => 'tls'],
        'hotmail.com' => ['host' => 'smtp-mail.outlook.com', 'port' => 587, 'encryption' => 'tls'],
        'live.com' => ['host' => 'smtp-mail.outlook.com', 'port' => 587, 'encryption' => 'tls'],
        'msn.com' => ['host' => 'smtp-mail.outlook.com', 'port' => 587, 'encryption' => 'tls'],
        'yahoo.com' => ['host' => 'smtp.mail.yahoo.com', 'port' => 587, 'encryption' => 'tls'],
        'yahoo.es' => ['host' => 'smtp.mail.yahoo.com', 'port' => 587, 'encryption' => 'tls'],
    ];

    /**
     * @return array{host: string, port: int, encryption: string}|null
     */
    public function detectServerForEmail(string $email): ?array
    {
        $parts = explode('@', strtolower(trim($email)));
        if (count($parts) !== 2) {
            return null;
        }

        return self::DOMAIN_PRESETS[$parts[1]] ?? null;
    }

    /**
     * @param  array{
     *     from_email: string,
     *     from_name?: string|null,
     *     username?: string|null,
     *     password: string,
     *     host?: string|null,
     *     port?: int|string|null,
     *     encryption?: string|null
     * }  $input
     * @return array{
     *     from_email: string,
     *     from_name: string|null,
     *     username: string,
     *     password: string,
     *     host: string,
     *     port: int,
     *     encryption: string|null
     * }
     */
    public function resolveConnectionConfig(array $input): array
    {
        $fromEmail = trim($input['from_email']);
        $detected = $this->detectServerForEmail($fromEmail);

        $providedHost = ! empty($input['host']) ? trim((string) $input['host']) : null;
        $providedPort = isset($input['port']) && $input['port'] !== '' && $input['port'] !== null
            ? (int) $input['port']
            : null;

        if ($detected === null && (empty($providedHost) || empty($providedPort))) {
            throw new MailerAuthException(
                'Para dominios corporativos o personalizados debes especificar el Host y el Puerto SMTP en Configuración avanzada.',
                422
            );
        }

        $host = $providedHost ?? $detected['host'];
        $port = $providedPort ?? $detected['port'];

        $rawEncryption = $input['encryption'] ?? ($detected['encryption'] ?? 'tls');
        $encryption = match (strtolower((string) $rawEncryption)) {
            'tls' => 'tls',
            'ssl' => 'ssl',
            '', 'none', 'null' => null,
            default => 'tls',
        };

        $username = ! empty($input['username']) ? trim((string) $input['username']) : $fromEmail;
        $fromName = ! empty($input['from_name']) ? trim((string) $input['from_name']) : null;

        return [
            'from_email' => $fromEmail,
            'from_name' => $fromName,
            'username' => $username,
            'password' => (string) $input['password'],
            'host' => $host,
            'port' => $port,
            'encryption' => $encryption,
        ];
    }

    /**
     * @return array{
     *     from_email: string,
     *     from_name: string|null,
     *     username: string,
     *     password: string,
     *     host: string,
     *     port: int,
     *     encryption: string|null
     * }
     */
    public function configFromModel(UserSmtpSetting $setting): array
    {
        return [
            'from_email' => $setting->from_email,
            'from_name' => $setting->from_name,
            'username' => $setting->username,
            'password' => (string) $setting->password,
            'host' => $setting->host,
            'port' => (int) $setting->port,
            'encryption' => $setting->encryption,
        ];
    }

    /**
     * @param  array{
     *     from_email: string,
     *     from_name: string|null,
     *     username: string,
     *     password: string,
     *     host: string,
     *     port: int,
     *     encryption: string|null
     * }  $resolvedConfig
     */
    public function buildMailer(array $resolvedConfig): MailerContract
    {
        $scheme = ($resolvedConfig['encryption'] === 'ssl' || $resolvedConfig['port'] === 465)
            ? 'smtps'
            : 'smtp';

        $mailer = Mail::build([
            'transport' => 'smtp',
            'scheme' => $scheme,
            'host' => $resolvedConfig['host'],
            'port' => $resolvedConfig['port'],
            'username' => $resolvedConfig['username'],
            'password' => $resolvedConfig['password'],
            'timeout' => 15,
        ]);

        if (method_exists($mailer, 'alwaysFrom')) {
            $mailer->alwaysFrom(
                $resolvedConfig['from_email'],
                $resolvedConfig['from_name'] ?: $resolvedConfig['from_email']
            );
        }

        return $mailer;
    }

    /**
     * @param  array{
     *     from_email: string,
     *     from_name: string|null,
     *     username: string,
     *     password: string,
     *     host: string,
     *     port: int,
     *     encryption: string|null
     * }  $resolvedConfig
     */
    public function testConnection(array $resolvedConfig): void
    {
        $mailer = $this->buildMailer($resolvedConfig);

        try {
            if (method_exists($mailer, 'getSymfonyTransport')) {
                $transport = $mailer->getSymfonyTransport();
                if (method_exists($transport, 'start')) {
                    $transport->start();
                    if (method_exists($transport, 'stop')) {
                        $transport->stop();
                    }
                }
            }
        } catch (TransportExceptionInterface $e) {
            throw new MailerAuthException(
                $this->buildFriendlySmtpError($resolvedConfig['from_email']),
                422,
                false,
                $e
            );
        }
    }

    public function sendInvitation(
        MailerContract $mailer,
        string $fromEmail,
        string $fromName,
        Event $event,
        Guest $guest,
        string $rsvpUrl
    ): void {
        try {
            $mailer->to((string) $guest->email)->send(
                new GuestInvitationMail(
                    event: $event,
                    guest: $guest,
                    rsvpUrl: $rsvpUrl,
                    fromEmail: $fromEmail,
                    fromName: $fromName,
                )
            );
        } catch (TransportExceptionInterface $e) {
            throw new MailerAuthException(
                $this->buildFriendlySmtpError($fromEmail),
                422,
                false,
                $e
            );
        }
    }

    private function buildFriendlySmtpError(string $email): string
    {
        $isMajorProvider = $this->detectServerForEmail($email) !== null;

        if ($isMajorProvider) {
            return 'Credenciales SMTP inválidas o conexión rechazada. Recuerda que Gmail, Outlook y Yahoo requieren una Contraseña de Aplicación (App Password), no tu contraseña habitual.';
        }

        return 'No se pudo autenticar o conectar con el servidor SMTP. Verifica tu correo, contraseña, host, puerto y tipo de encriptación.';
    }
}
