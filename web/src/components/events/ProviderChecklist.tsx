import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import api from '../../lib/api';
import type { EventProvider, ProviderChecklistItem } from '../../types/api';

interface ProviderChecklistProps {
  eventId: number;
  assignment: EventProvider;
  onUpdated: (updated: EventProvider) => void;
  onRemoved: (assignmentId: number) => void;
}

export default function ProviderChecklist({
  eventId,
  assignment,
  onUpdated,
  onRemoved,
}: ProviderChecklistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const [agreedCost, setAgreedCost] = useState(String(assignment.agreed_cost ?? 0));
  const [setupAt, setSetupAt] = useState(
    assignment.setup_at ? assignment.setup_at.slice(0, 16) : ''
  );
  const [showAt, setShowAt] = useState(
    assignment.show_at ? assignment.show_at.slice(0, 16) : ''
  );
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const handleSaveDetails = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingDetails(true);
    try {
      const { data } = await api.put<{ data: EventProvider }>(
        `/events/${eventId}/providers/${assignment.id}`,
        {
          agreed_cost: Number(agreedCost) || 0,
          setup_at: setupAt ? new Date(setupAt).toISOString() : null,
          show_at: showAt ? new Date(showAt).toISOString() : null,
        }
      );
      onUpdated(data.data);
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    setIsAddingItem(true);
    try {
      const { data } = await api.post<{ data: ProviderChecklistItem }>(
        `/events/${eventId}/providers/${assignment.id}/checklist`,
        {
          item_name: itemName.trim(),
          quantity,
        }
      );
      onUpdated({
        ...assignment,
        checklist_items: [...assignment.checklist_items, data.data],
      });
      setItemName('');
      setQuantity(1);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    await api.delete(`/events/${eventId}/providers/${assignment.id}/checklist/${itemId}`);
    onUpdated({
      ...assignment,
      checklist_items: assignment.checklist_items.filter((i) => i.id !== itemId),
    });
  };

  const handleUnassign = async () => {
    await api.delete(`/events/${eventId}/providers/${assignment.id}`);
    onRemoved(assignment.id);
  };

  const preparedCount = assignment.checklist_items.filter((i) => i.is_prepared).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div
        onClick={() => setIsOpen((v) => !v)}
        className="px-4 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-slate-900 truncate">
              {assignment.provider.business_name}
            </h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              {assignment.provider.category}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Costo: ${Number(assignment.agreed_cost).toFixed(2)} · Checklist: {preparedCount}/
            {assignment.checklist_items.length} preparado(s)
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleUnassign();
            }}
            title="Quitar proveedor del evento"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-5">
          {/* Costo y Horarios */}
          <form onSubmit={handleSaveDetails} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Costo acordado ($)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={agreedCost}
                onChange={(e) => setAgreedCost(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hora Set-up</label>
              <input
                type="datetime-local"
                value={setupAt}
                onChange={(e) => setSetupAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hora Show</label>
              <input
                type="datetime-local"
                value={showAt}
                onChange={(e) => setShowAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingDetails}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50 cursor-pointer"
            >
              {isSavingDetails && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Guardar Ficha</span>
            </button>
          </form>

          {/* Checklist "Qué lleva" */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Responsabilidades (&quot;Qué lleva&quot;)
            </h4>

            <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Ej. Parlantes JBL, consola DMX..."
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              />
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={isAddingItem}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                {isAddingItem ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span>Agregar</span>
              </button>
            </form>

            {assignment.checklist_items.length === 0 ? (
              <p className="text-xs text-slate-400">Sin ítems asignados todavía.</p>
            ) : (
              <ul className="space-y-1.5">
                {assignment.checklist_items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2
                        className={`h-4 w-4 ${
                          item.is_prepared ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      <span className="text-slate-800">
                        <strong>{item.quantity}x</strong> {item.item_name}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          item.is_prepared
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {item.is_prepared ? 'Preparado' : 'Pendiente'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteItem(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

