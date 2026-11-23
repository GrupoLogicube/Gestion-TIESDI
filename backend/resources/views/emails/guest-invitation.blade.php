<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitación a {{ $event->title }}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.08);">
                    <tr>
                        <td style="background:#0d6efd;padding:28px 24px;text-align:center;color:#ffffff;">
                            <p style="margin:0 0 6px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:0.9;">
                                Estás invitado a
                            </p>
                            <h1 style="margin:0;font-size:24px;font-weight:700;">{{ $event->title }}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 24px;">
                            <p style="margin:0 0 14px;font-size:16px;">
                                Hola <strong>{{ $guest->name }}</strong>,
                            </p>
                            <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#475569;">
                                Nos encantaría contar contigo en este evento. Tienes <strong>{{ $guest->passes_count }} pase(s)</strong> asignado(s).
                            </p>

                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:22px;font-size:14px;line-height:1.6;">
                                <div><strong>Fecha y hora:</strong> {{ $event->starts_at?->format('d/m/Y H:i') }}</div>
                                @if($event->location)
                                    <div><strong>Lugar:</strong> {{ $event->location }}</div>
                                @endif
                                @if($event->location_url)
                                    <div style="margin-top:6px;">
                                        <a href="{{ $event->location_url }}" style="color:#0d6efd;text-decoration:none;font-weight:600;">
                                            Ver ubicación en Google Maps →
                                        </a>
                                    </div>
                                @endif
                            </div>

                            <div style="text-align:center;margin:24px 0;">
                                <a href="{{ $rsvpUrl }}" style="display:inline-block;background:#0d6efd;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:10px;">
                                    Confirmar Asistencia
                                </a>
                            </div>

                            <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
                                Si el botón no funciona, copia este enlace en tu navegador:<br>
                                <a href="{{ $rsvpUrl }}" style="color:#0d6efd;word-break:break-all;">{{ $rsvpUrl }}</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

