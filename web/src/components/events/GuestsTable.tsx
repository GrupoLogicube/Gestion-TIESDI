import { Loader2, Plus, Send, Trash2, Users, X } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import api from '../../lib/api';
import type { Guest, RsvpStatus } from '../../types/api';
import SendInvitationModal from './SendInvitationModal';

interface GuestsTableProps {
  eventId: number;
}

const STATUS_BADGE: Record<RsvpStatus, { label: string; className: string }> = {
  confirmed: {
    label: 'Confirmado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  pending: {
    label: 'Pendiente',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  declined: {
    label: 'Rechazado',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

function formatPhoneWithCountryCode(countryCode: string, rawNumber: string): string | null {
  const digits = rawNumber.replace(/\D/g, '');
  if (!digits) return null;
  const normalizedLocal = digits.startsWith('0') ? digits.slice(1) : digits;
  const cleanCode = countryCode.startsWith('+')
    ? `+${countryCode.replace(/\D/g, '')}`
    : `+${countryCode.replace(/\D/g, '')}`;
  return `${cleanCode}${normalizedLocal}`;
}

export default function GuestsTable({ eventId }: GuestsTableProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+593');
  const [phone, setPhone] = useState('');
  const [passesCount, setPassesCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [inviteModalState, setInviteModalState] = useState<{
    guests: Guest[];
    isBulk: boolean;
  } | null>(null);

  const fetchGuests = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<{ data: Guest[] }>(`/events/${eventId}/guests`);
      setGuests(data.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchGuests();
  }, [eventId]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formattedPhone = formatPhoneWithCountryCode(countryCode, phone);
      const { data } = await api.post<{ data: Guest }>(`/events/${eventId}/guests`, {
        name,
        email: email || null,
        phone: formattedPhone,
        passes_count: passesCount,
        notes: notes || null,
      });
      setGuests((prev) => [...prev, data.data]);
      setShowCreateModal(false);
      setName('');
      setEmail('');
      setCountryCode('+593');
      setPhone('');
      setPassesCount(1);
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (guestId: number) => {
    await api.delete(`/events/${eventId}/guests/${guestId}`);
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
  };

  const confirmedCount = guests.filter((g) => g.rsvp_status === 'confirmed').length;
  const pendingCount = guests.filter((g) => g.rsvp_status === 'pending').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900 mb-0">Lista de Invitados</h2>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            Total: {guests.length}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
            Confirmados: {confirmedCount}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
            Pendientes: {pendingCount}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            type="button"
            disabled={guests.length === 0}
            onClick={() => setInviteModalState({ guests, isBulk: true })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer border-0"
          >
            <Send className="h-4 w-4" />
            <span>Enviar a todos</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer border-0"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Invitado</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : guests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center">
          <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aún no hay invitados registrados en este evento.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm mb-0">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Invitado</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Pases</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {guests.map((guest) => {
                const badge = STATUS_BADGE[guest.rsvp_status];

                return (
                  <tr key={guest.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 mb-0">{guest.name}</p>
                      {guest.notes && (
                        <p className="text-xs text-slate-500 truncate max-w-xs mb-0">
                          {guest.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p className="mb-0">{guest.phone || '—'}</p>
                      <p className="text-xs text-slate-400 mb-0">{guest.email || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {guest.rsvp_status === 'confirmed'
                        ? `${guest.confirmed_passes} / ${guest.passes_count}`
                        : guest.passes_count}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInviteModalState({ guests: [guest], isBulk: false })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Enviar Invitación</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDelete(guest.id)}
                          title="Eliminar invitado"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {inviteModalState && (
        <SendInvitationModal
          eventId={eventId}
          targetGuests={inviteModalState.guests}
          isBulk={inviteModalState.isBulk}
          onClose={() => setInviteModalState(null)}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[1060] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Nuevo Invitado</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. María López"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Celular
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      aria-label="Código de país"
                      className="w-20 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0999123456"
                      className="flex-1 min-w-0 rounded-r-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  {phone.trim() && (
                    <p className="text-[11px] text-slate-500 mt-1 mb-0">
                      Se guardará como:{' '}
                      <span className="font-mono font-medium text-slate-700">
                        {formatPhoneWithCountryCode(countryCode, phone)}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pases</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={passesCount}
                    onChange={(e) => setPassesCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maria@correo.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mesa VIP, alergias..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer border-0 bg-transparent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 cursor-pointer border-0"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
