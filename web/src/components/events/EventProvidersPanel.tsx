import { Loader2, Plus, Truck, X } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import api from '../../lib/api';
import type { EventProvider, Provider } from '../../types/api';
import ProviderChecklist from './ProviderChecklist';

interface EventProvidersPanelProps {
  eventId: number;
}

export default function EventProvidersPanel({ eventId }: EventProvidersPanelProps) {
  const [assignments, setAssignments] = useState<EventProvider[]>([]);
  const [directory, setDirectory] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [agreedCost, setAgreedCost] = useState('0');
  const [setupAt, setSetupAt] = useState('');
  const [showAt, setShowAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const [assignRes, dirRes] = await Promise.all([
          api.get<{ data: EventProvider[] }>(`/events/${eventId}/providers`),
          api.get<{ data: Provider[] }>('/providers'),
        ]);
        setAssignments(assignRes.data.data);
        setDirectory(dirRes.data.data);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchAll();
  }, [eventId]);

  const availableDirectory = directory.filter(
    (p) => !assignments.some((a) => a.provider_id === p.id)
  );

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      let providerId = Number(selectedProviderId);

      if (selectedProviderId === 'new') {
        const { data: created } = await api.post<{ data: Provider }>('/providers', {
          business_name: newBusinessName,
          category: newCategory,
        });
        providerId = created.data.id;
        setDirectory((prev) => [...prev, created.data]);
      }

      const { data } = await api.post<{ data: EventProvider }>(`/events/${eventId}/providers`, {
        provider_id: providerId,
        agreed_cost: Number(agreedCost) || 0,
        setup_at: setupAt ? new Date(setupAt).toISOString() : null,
        show_at: showAt ? new Date(showAt).toISOString() : null,
        status: 'confirmed',
      });

      setAssignments((prev) => [...prev, data.data]);
      setShowAssignModal(false);
      setSelectedProviderId('');
      setNewBusinessName('');
      setNewCategory('');
      setAgreedCost('0');
      setSetupAt('');
      setShowAt('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'No se pudo asignar el proveedor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Proveedores del Evento</h2>
          <p className="text-xs text-slate-500">
            Asigna contratistas y gestiona su checklist de equipos y horarios.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedProviderId(availableDirectory[0] ? String(availableDirectory[0].id) : 'new');
            setShowAssignModal(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Asignar Proveedor</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center">
          <Truck className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No hay proveedores asignados a este evento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <ProviderChecklist
              key={assignment.id}
              eventId={eventId}
              assignment={assignment}
              onUpdated={(updated) =>
                setAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
              }
              onRemoved={(id) => setAssignments((prev) => prev.filter((a) => a.id !== id))}
            />
          ))}
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Asignar Proveedor</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Proveedor del directorio
                </label>
                <select
                  required
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {availableDirectory.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.business_name} ({p.category})
                    </option>
                  ))}
                  <option value="new">+ Crear nuevo proveedor en directorio</option>
                </select>
              </div>

              {selectedProviderId === 'new' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Empresa / Nombre</label>
                    <input
                      type="text"
                      required
                      value={newBusinessName}
                      onChange={(e) => setNewBusinessName(e.target.value)}
                      placeholder="Ej. DJ Master"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
                    <input
                      type="text"
                      required
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Ej. Música"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Costo acordado ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={agreedCost}
                  onChange={(e) => setAgreedCost(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Set-up</label>
                  <input
                    type="datetime-local"
                    value={setupAt}
                    onChange={(e) => setSetupAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Show</label>
                  <input
                    type="datetime-local"
                    value={showAt}
                    onChange={(e) => setShowAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Asignar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

