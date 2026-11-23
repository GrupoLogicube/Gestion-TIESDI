import { Calendar, CheckCircle2, MapPin, Sparkles, XCircle } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';
import type { PublicRsvpData } from '../../types/api';

export default function RsvpLandingPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicRsvpData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rsvpStatus, setRsvpStatus] = useState<'confirmed' | 'declined'>('confirmed');
  const [confirmedPasses, setConfirmedPasses] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchRsvp = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get<{ data: PublicRsvpData }>(`/rsvp/${token}`);
        setData(res.data.data);
        setConfirmedPasses(
          res.data.data.guest.confirmed_passes || res.data.data.guest.passes_count
        );
        setNotes(res.data.data.guest.notes || '');
        if (res.data.data.guest.rsvp_status === 'declined') {
          setRsvpStatus('declined');
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(
          axiosErr.response?.data?.message ||
            'Este enlace de invitación no es válido o ha expirado.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      void fetchRsvp();
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ data: PublicRsvpData['guest'] }>(`/rsvp/${token}/confirm`, {
        rsvp_status: rsvpStatus,
        confirmed_passes: rsvpStatus === 'confirmed' ? confirmedPasses : 0,
        notes: notes || null,
      });

      setData((prev) => (prev ? { ...prev, guest: res.data.data } : prev));
      setSubmitted(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'No se pudo guardar tu respuesta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-slate-50 p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">Enlace no disponible</h1>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50 px-4 py-10 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 px-6 py-8 text-white text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-90" />
          <p className="text-xs uppercase tracking-widest text-indigo-100 font-semibold">
            Estás invitado a
          </p>
          <h1 className="text-2xl font-bold mt-1">{data.event.title}</h1>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3 text-sm text-slate-600 bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Fecha y hora</p>
                <p>{new Date(data.event.starts_at).toLocaleString()}</p>
              </div>
            </div>

            {data.event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">Lugar</p>
                  <p>{data.event.location}</p>
                  {data.event.location_url && (
                    <a
                      href={data.event.location_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-indigo-600 hover:underline mt-0.5 inline-block"
                    >
                      Ver en el mapa →
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {data.event.description && (
            <p className="text-sm text-slate-600 text-center">{data.event.description}</p>
          )}

          {submitted ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h2 className="text-lg font-bold text-emerald-950">¡Respuesta registrada!</h2>
              <p className="text-sm text-emerald-800">
                {data.guest.rsvp_status === 'confirmed'
                  ? `Confirmaste ${data.guest.confirmed_passes} pase(s) para ${data.guest.name}.`
                  : `Lamentamos que no puedas acompañarnos, ${data.guest.name}.`}
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-xs font-semibold text-emerald-700 hover:underline mt-2 inline-block cursor-pointer"
              >
                Cambiar mi respuesta
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-slate-500">Invitado</p>
                <p className="text-lg font-bold text-slate-900">{data.guest.name}</p>
                <p className="text-xs text-indigo-600 font-medium mt-0.5">
                  Tienes {data.guest.passes_count} pase(s) asignado(s)
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRsvpStatus('confirmed')}
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    rsvpStatus === 'confirmed'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setRsvpStatus('declined')}
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    rsvpStatus === 'declined'
                      ? 'border-rose-600 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Rechazar
                </button>
              </div>

              {rsvpStatus === 'confirmed' && data.guest.passes_count > 1 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    ¿Cuántos pases utilizarás?
                  </label>
                  <select
                    value={confirmedPasses}
                    onChange={(e) => setConfirmedPasses(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    {Array.from({ length: data.guest.passes_count }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'persona' : 'personas'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Notas adicionales (alergias, menú, mensaje)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. 1 menú vegetariano, alergia a mariscos..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Respuesta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

