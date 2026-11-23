import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Mail,
  MessageCircle,
  PlugZap,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { Guest } from '../../types/api';

interface SendInvitationModalProps {
  eventId: number;
  targetGuests: Guest[];
  isBulk: boolean;
  onClose: () => void;
}

type ModalStep = 'choose' | 'email_config' | 'email_sending' | 'email_done' | 'whatsapp';
type EmailViewMode = 'saved' | 'custom';

interface EmailSummary {
  sent: number;
  skipped: number;
  failed: number;
  total_targeted: number;
  smtp_mode: 'saved' | 'custom';
  sender_email: string;
  credentials_saved: boolean;
}

interface WhatsappStatusData {
  session_id: string;
  status: 'waiting_qr' | 'sending' | 'completed' | 'error' | 'expired' | 'cancelled';
  qr: string | null;
  total: number;
  sent: number;
  failed: number;
  session_closed: boolean;
  error: string | null;
}

interface SmtpPreset {
  host: string;
  port: number;
  encryption: 'tls' | 'ssl' | 'none';
  label: string;
  appPasswordUrl?: string;
}

function detectSmtpPreset(email: string): SmtpPreset | null {
  const domain = email.trim().toLowerCase().split('@')[1];
  if (!domain) return null;

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return {
      host: 'smtp.gmail.com',
      port: 587,
      encryption: 'tls',
      label: 'Gmail',
      appPasswordUrl: 'https://myaccount.google.com/apppasswords',
    };
  }
  if (
    domain === 'outlook.com' ||
    domain === 'hotmail.com' ||
    domain === 'live.com' ||
    domain === 'msn.com'
  ) {
    return {
      host: 'smtp-mail.outlook.com',
      port: 587,
      encryption: 'tls',
      label: 'Outlook / Hotmail',
    };
  }
  if (domain === 'yahoo.com' || domain === 'yahoo.es') {
    return {
      host: 'smtp.mail.yahoo.com',
      port: 587,
      encryption: 'tls',
      label: 'Yahoo Mail',
    };
  }
  return null;
}

export default function SendInvitationModal({
  eventId,
  targetGuests,
  isBulk,
  onClose,
}: SendInvitationModalProps) {
  const { user, setSmtpStatus, refreshUser } = useAuthStore();

  const [step, setStep] = useState<ModalStep>('choose');
  const [emailView, setEmailView] = useState<EmailViewMode>(
    user?.has_smtp_configured ? 'saved' : 'custom'
  );
  const [error, setError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [isDeletingSaved, setIsDeletingSaved] = useState(false);

  // Custom / Edit SMTP form state (pre-filled with user.email)
  const initialEmail = user?.smtp_email || user?.email || '';
  const initialPreset = detectSmtpPreset(initialEmail);

  const [smtpEmail, setSmtpEmail] = useState(initialEmail);
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState(initialPreset?.host || '');
  const [smtpPort, setSmtpPort] = useState(String(initialPreset?.port || 587));
  const [smtpEncryption, setSmtpEncryption] = useState<'tls' | 'ssl' | 'none'>(
    initialPreset?.encryption || 'tls'
  );
  const [advancedOpen, setAdvancedOpen] = useState(!initialPreset && Boolean(initialEmail));
  const [saveCredentials, setSaveCredentials] = useState(true);
  const [detectedPreset, setDetectedPreset] = useState<SmtpPreset | null>(initialPreset);

  const [emailSummary, setEmailSummary] = useState<EmailSummary | null>(null);

  // WhatsApp ephemeral state
  const [waSessionId, setWaSessionId] = useState<string | null>(null);
  const [waStatus, setWaStatus] = useState<WhatsappStatusData | null>(null);
  const [waSkipped, setWaSkipped] = useState(0);
  const pollRef = useRef<number | null>(null);

  const withPhoneCount = targetGuests.filter((g) => Boolean(g.phone?.trim())).length;
  const withEmailCount = targetGuests.filter((g) => Boolean(g.email?.trim())).length;
  const guestIds = isBulk ? undefined : targetGuests.map((g) => g.id);

  const stopPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const handleSmtpEmailChange = (value: string) => {
    setSmtpEmail(value);
    setTestSuccess(null);
    const preset = detectSmtpPreset(value);
    setDetectedPreset(preset);

    if (preset) {
      setSmtpHost(preset.host);
      setSmtpPort(String(preset.port));
      setSmtpEncryption(preset.encryption);
    } else if (value.includes('@') && value.split('@')[1]?.includes('.')) {
      setSmtpHost('');
      setAdvancedOpen(true);
    }
  };

  const handleClose = async () => {
    stopPolling();
    if (waSessionId && waStatus && !waStatus.session_closed) {
      try {
        await api.delete(`/events/${eventId}/guests/invitations/whatsapp/${waSessionId}`);
      } catch {
        // ignore
      }
    }
    onClose();
  };

  const handleTestSmtpConnection = async () => {
    setError(null);
    setTestSuccess(null);
    setIsTestingSmtp(true);
    try {
      const payload =
        emailView === 'saved'
          ? { use_saved: true }
          : {
              from_email: smtpEmail,
              password: smtpPassword,
              host: smtpHost || undefined,
              port: smtpPort ? Number(smtpPort) : undefined,
              encryption: smtpEncryption,
            };

      const { data } = await api.post<{ message: string }>('/user/smtp-settings/test', payload);
      setTestSuccess(data.message || 'Conexión SMTP verificada correctamente.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(
        axiosErr.response?.data?.message ||
          'No se pudo verificar la conexión SMTP. Revisa tus credenciales.'
      );
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleDeleteSavedSmtp = async () => {
    setError(null);
    setTestSuccess(null);
    setIsDeletingSaved(true);
    try {
      await api.delete('/user/smtp-settings');
      setSmtpStatus(false, null);
      setEmailView('custom');
    } catch {
      setError('No se pudo eliminar la configuración guardada.');
    } finally {
      setIsDeletingSaved(false);
    }
  };

  const sendEmailRequest = async (payload: Record<string, unknown>) => {
    setError(null);
    setTestSuccess(null);
    setStep('email_sending');
    try {
      const { data } = await api.post<{ data: EmailSummary }>(
        `/events/${eventId}/guests/invitations/email`,
        {
          ...(guestIds ? { guest_ids: guestIds } : {}),
          ...payload,
        }
      );

      setEmailSummary(data.data);

      if (data.data.credentials_saved) {
        setSmtpStatus(true, data.data.sender_email);
        void refreshUser();
      }

      setStep('email_done');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(
        axiosErr.response?.data?.message || 'Error al enviar las invitaciones por correo.'
      );
      setStep('email_config');
    }
  };

  const handleSendWithSavedSmtp = async () => {
    await sendEmailRequest({ smtp_mode: 'saved' });
  };

  const handleSendWithCustomSmtp = async (e: FormEvent) => {
    e.preventDefault();
    await sendEmailRequest({
      smtp_mode: 'custom',
      smtp_email: smtpEmail,
      smtp_password: smtpPassword,
      smtp_host: smtpHost || undefined,
      smtp_port: smtpPort ? Number(smtpPort) : undefined,
      smtp_encryption: smtpEncryption,
      save_credentials: saveCredentials,
    });
  };

  const handleStartWhatsapp = async () => {
    setError(null);
    setStep('whatsapp');
    setWaStatus(null);

    try {
      const { data } = await api.post<{
        data: {
          session_id: string;
          status: WhatsappStatusData['status'];
          total: number;
          skipped: number;
        };
      }>(
        `/events/${eventId}/guests/invitations/whatsapp/start`,
        guestIds ? { guest_ids: guestIds } : {}
      );

      const sessionId = data.data.session_id;
      setWaSessionId(sessionId);
      setWaSkipped(data.data.skipped || 0);
      setWaStatus({
        session_id: sessionId,
        status: data.data.status,
        qr: null,
        total: data.data.total,
        sent: 0,
        failed: 0,
        session_closed: false,
        error: null,
      });

      const poll = async () => {
        try {
          const res = await api.get<{ data: WhatsappStatusData }>(
            `/events/${eventId}/guests/invitations/whatsapp/${sessionId}`
          );
          setWaStatus(res.data.data);

          if (['completed', 'error', 'expired', 'cancelled'].includes(res.data.data.status)) {
            stopPolling();
          }
        } catch {
          stopPolling();
        }
      };

      void poll();
      pollRef.current = window.setInterval(() => {
        void poll();
      }, 1500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(
        axiosErr.response?.data?.message || 'No se pudo iniciar la sesión efímera de WhatsApp.'
      );
      setStep('choose');
    }
  };

  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center bg-slate-900/55 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-0">
              {isBulk
                ? `Enviar Invitación a Todos (${targetGuests.length})`
                : `Enviar Invitación a ${targetGuests[0]?.name}`}
            </h3>
            <p className="text-xs text-slate-500 mb-0">
              Se generará un enlace único (Magic Link) personalizado por invitado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleClose()}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
            {error}
          </div>
        )}

        {testSuccess && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{testSuccess}</span>
          </div>
        )}

        {/* Step 1: Choose Channel */}
        {step === 'choose' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-0">
              Elige el canal por el cual deseas enviar la invitación:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={withPhoneCount === 0}
                onClick={() => void handleStartWhatsapp()}
                className="flex flex-col items-center text-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-5 hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-45 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <div className="h-11 w-11 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <span className="font-semibold text-slate-900">WhatsApp</span>
                <span className="text-xs text-slate-600">
                  {withPhoneCount} con teléfono · Escaneo QR temporal
                </span>
              </button>

              <button
                type="button"
                disabled={withEmailCount === 0}
                onClick={() => {
                  setError(null);
                  setTestSuccess(null);
                  setEmailView(user?.has_smtp_configured ? 'saved' : 'custom');
                  setStep('email_config');
                }}
                className="flex flex-col items-center text-center gap-2 rounded-xl border-2 border-indigo-200 bg-indigo-50/40 p-5 hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-45 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <div className="h-11 w-11 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Mail className="h-6 w-6" />
                </div>
                <span className="font-semibold text-slate-900">Correo Electrónico</span>
                <span className="text-xs text-slate-600">
                  {withEmailCount} con correo · Desde tu propio SMTP
                </span>
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Control total:</strong> Los correos salen directamente desde tu propia
                cuenta SMTP (con encriptación AES si eliges guardarla), nunca desde un correo
                genérico del servidor.
              </span>
            </div>
          </div>
        )}

        {/* Step 2A: Email SMTP Configuration */}
        {step === 'email_config' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setTestSuccess(null);
                setStep('choose');
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 border-0 bg-transparent p-0 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Cambiar canal</span>
            </button>

            {user?.has_smtp_configured && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setTestSuccess(null);
                    setEmailView('saved');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border-0 cursor-pointer ${
                    emailView === 'saved'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'bg-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mi correo guardado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setTestSuccess(null);
                    setEmailView('custom');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border-0 cursor-pointer ${
                    emailView === 'custom'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'bg-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Usar otro correo / Editar
                </button>
              </div>
            )}

            {emailView === 'saved' && user?.has_smtp_configured ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold mb-0.5">
                      Configuración SMTP guardada
                    </p>
                    <p className="text-sm font-bold text-slate-900 truncate mb-0">
                      {user.smtp_email}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isDeletingSaved}
                    onClick={() => void handleDeleteSavedSmtp()}
                    title="Eliminar configuración guardada"
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                  >
                    {isDeletingSaved ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-600 mb-0">
                  Se enviarán <strong>{withEmailCount}</strong> invitación(es) directamente desde{' '}
                  <strong>{user.smtp_email}</strong> usando tus credenciales encriptadas.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    disabled={isTestingSmtp}
                    onClick={() => void handleTestSmtpConnection()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {isTestingSmtp ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <PlugZap className="h-3.5 w-3.5" />
                    )}
                    <span>Probar conexión</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSendWithSavedSmtp()}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer border-0"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Enviar desde mi correo guardado</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Custom / Initial SMTP Form */
              <form onSubmit={handleSendWithCustomSmtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Correo electrónico remitente
                  </label>
                  <input
                    type="email"
                    required
                    value={smtpEmail}
                    onChange={(e) => handleSmtpEmailChange(e.target.value)}
                    placeholder="tu@correo.com o eventos@tuempresa.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  {detectedPreset ? (
                    <p className="text-[11px] text-emerald-700 mt-1 mb-0">
                      Servidor auto-detectado: <strong>{detectedPreset.label}</strong> (
                      {detectedPreset.host}:{detectedPreset.port} · TLS)
                    </p>
                  ) : (
                    smtpEmail.includes('@') && (
                      <p className="text-[11px] text-amber-700 mt-1 mb-0">
                        Dominio corporativo detectado: completa Host y Puerto en Configuración
                        avanzada.
                      </p>
                    )
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {detectedPreset ? 'Contraseña de Aplicación (App Password)' : 'Contraseña SMTP'}
                  </label>
                  <input
                    type="password"
                    required
                    value={smtpPassword}
                    onChange={(e) => {
                      setSmtpPassword(e.target.value);
                      setTestSuccess(null);
                    }}
                    placeholder={detectedPreset ? 'xxxx xxxx xxxx xxxx' : 'Tu contraseña de correo'}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />

                  {detectedPreset && (
                    <div className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 p-2.5 flex items-start gap-2 text-[11px] text-amber-900">
                      <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>{detectedPreset.label}</strong> requiere una{' '}
                        <strong>Contraseña de Aplicación (App Password)</strong>, no tu contraseña
                        normal de inicio de sesión.
                        {detectedPreset.appPasswordUrl && (
                          <>
                            {' '}
                            <a
                              href={detectedPreset.appPasswordUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-700 underline font-semibold"
                            >
                              Generar en Google ↗
                            </a>
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Collapsible Advanced SMTP Config */}
                <div>
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 border-0 bg-transparent p-0 cursor-pointer"
                  >
                    {advancedOpen ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    <span>Configuración avanzada (Host / Puerto / Encriptación)</span>
                  </button>

                  {advancedOpen && (
                    <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="col-span-3 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Host SMTP {!detectedPreset && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="text"
                          required={!detectedPreset}
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="smtp.hostinger.com / smtp.zoho.com"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Puerto {!detectedPreset && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="number"
                          required={!detectedPreset}
                          min={1}
                          max={65535}
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Encriptación
                        </label>
                        <select
                          value={smtpEncryption}
                          onChange={(e) =>
                            setSmtpEncryption(e.target.value as 'tls' | 'ssl' | 'none')
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                        >
                          <option value="tls">TLS (STARTTLS - Puerto 587)</option>
                          <option value="ssl">SSL (SMTPS - Puerto 465)</option>
                          <option value="none">Sin encriptación</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save encrypted checkbox (checked by default) */}
                <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveCredentials}
                    onChange={(e) => setSaveCredentials(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <strong>Guardar esta configuración encriptada para próximos envíos</strong>{' '}
                    (podrás enviar en 1 clic la próxima vez).
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isTestingSmtp || !smtpEmail || !smtpPassword}
                    onClick={() => void handleTestSmtpConnection()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-45 transition-colors cursor-pointer"
                  >
                    {isTestingSmtp ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <PlugZap className="h-3.5 w-3.5" />
                    )}
                    <span>Probar conexión</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer border-0"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Enviar {withEmailCount} invitación(es)</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Step 2B: Sending Email */}
        {step === 'email_sending' && (
          <div className="py-10 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-sm font-medium text-slate-700">Enviando invitaciones por correo...</p>
          </div>
        )}

        {/* Step 2C: Email Done */}
        {step === 'email_done' && emailSummary && (
          <div className="py-4 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <div>
              <h4 className="text-lg font-bold text-slate-900">Envío por correo completado</h4>
              <p className="text-xs text-slate-500 mt-0.5 mb-2">
                Enviado desde <strong>{emailSummary.sender_email}</strong>
              </p>
              <p className="text-sm text-slate-600 mb-0">
                Enviados: <strong>{emailSummary.sent}</strong> · Omitidos (sin correo):{' '}
                <strong>{emailSummary.skipped}</strong> · Fallidos:{' '}
                <strong>{emailSummary.failed}</strong>
              </p>
            </div>

            {emailSummary.credentials_saved && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Configuración SMTP guardada encriptada para tus próximos envíos.</span>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={() => void handleClose()}
                className="btn btn-primary btn-sm px-4 cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        )}

        {/* Step 3: WhatsApp Ephemeral QR */}
        {step === 'whatsapp' && (
          <div className="space-y-4">
            {!waStatus || waStatus.status === 'waiting_qr' ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  {waStatus?.qr ? (
                    <img
                      src={waStatus.qr}
                      alt="Código QR de WhatsApp"
                      className="w-60 h-60 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
                    />
                  ) : (
                    <div className="w-60 h-60 flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                      <span className="text-xs">Generando código QR...</span>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-700 space-y-1.5">
                  <p className="font-semibold text-slate-900">
                    Cómo vincular tu WhatsApp para enviar ({waStatus?.total ?? withPhoneCount}{' '}
                    mensaje(s)):
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      Abre <strong>WhatsApp</strong> en tu teléfono.
                    </li>
                    <li>
                      Toca <strong>Menú (⋮)</strong> en Android o <strong>Configuración</strong> en
                      iPhone.
                    </li>
                    <li>
                      Selecciona <strong>Dispositivos vinculados</strong> y luego{' '}
                      <strong>Vincular un dispositivo</strong>.
                    </li>
                    <li>Apunta tu teléfono a esta pantalla para escanear el código QR.</li>
                  </ol>
                  <p className="text-emerald-700 font-medium pt-1 mb-0">
                    Al terminar de enviar, la sesión se cerrará y desvinculará automáticamente.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleClose()}
                    className="btn btn-outline-secondary btn-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : waStatus.status === 'sending' ? (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-slate-900">
                  Enviando invitaciones por WhatsApp...
                </h4>
                <p className="text-sm text-slate-600">
                  Progreso: <strong>{waStatus.sent + waStatus.failed}</strong> de{' '}
                  <strong>{waStatus.total}</strong>
                </p>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 transition-all"
                    style={{
                      width: `${Math.round(
                        ((waStatus.sent + waStatus.failed) / Math.max(1, waStatus.total)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ) : waStatus.status === 'completed' ? (
              <div className="py-4 text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                <div>
                  <h4 className="text-lg font-bold text-slate-900">¡Invitaciones enviadas!</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Enviadas: <strong>{waStatus.sent}</strong> · Fallidas:{' '}
                    <strong>{waStatus.failed}</strong>
                    {waSkipped > 0 && (
                      <>
                        {' '}
                        · Omitidas (sin teléfono): <strong>{waSkipped}</strong>
                      </>
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>Sesión de WhatsApp cerrada y credenciales eliminadas por seguridad.</span>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => void handleClose()}
                    className="btn btn-primary btn-sm px-4 cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-3">
                <XCircle className="h-12 w-12 text-rose-500 mx-auto" />
                <h4 className="text-base font-bold text-slate-900">No se pudo completar el envío</h4>
                <p className="text-sm text-slate-600">
                  {waStatus.error || 'La sesión expiró o fue cancelada.'}
                </p>
                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  className="btn btn-outline-primary btn-sm cursor-pointer"
                >
                  Intentar nuevamente
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
