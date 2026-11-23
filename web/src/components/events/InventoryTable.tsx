import { Loader2, Minus, Package, Plus, Trash2, X } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import api from '../../lib/api';
import type { InventoryItem, InventoryStatus } from '../../types/api';

interface InventoryTableProps {
  eventId: number;
}

const INVENTORY_BADGE: Record<InventoryStatus, { label: string; className: string }> = {
  checked_in: {
    label: 'Completo',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  partial: {
    label: 'Parcial',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  pending: {
    label: 'Pendiente',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  checked_out: {
    label: 'Retirado',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
};

export default function InventoryTable({ eventId }: InventoryTableProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('unidad');
  const [plannedQty, setPlannedQty] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get<{ data: InventoryItem[] }>(`/events/${eventId}/inventory`);
        setItems(data.data);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchInventory();
  }, [eventId]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data } = await api.post<{ data: InventoryItem }>(`/events/${eventId}/inventory`, {
        name,
        category: category || null,
        unit,
        planned_qty: plannedQty,
      });
      setItems((prev) => [...prev, data.data]);
      setShowModal(false);
      setName('');
      setCategory('');
      setUnit('unidad');
      setPlannedQty(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustQty = async (item: InventoryItem, delta: number) => {
    const nextQty = Math.max(0, item.actual_qty + delta);
    if (nextQty === item.actual_qty) return;

    setUpdatingId(item.id);
    try {
      const { data } = await api.patch<{ data: InventoryItem }>(
        `/events/${eventId}/inventory/${item.id}/check-in`,
        { actual_qty: nextQty }
      );
      setItems((prev) => prev.map((i) => (i.id === item.id ? data.data : i)));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (itemId: number) => {
    await api.delete(`/events/${eventId}/inventory/${itemId}`);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Inventario del Evento</h2>
          <p className="text-xs text-slate-500">
            Control de cantidades planificadas vs. ingreso real en vivo.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Agregar Ítem</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center">
          <Package className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No hay ítems de inventario registrados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Planificado</th>
                <th className="px-4 py-3">Real (Check-in)</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item) => {
                const badge = INVENTORY_BADGE[item.status];
                const isUpdating = updatingId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.category || 'General'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.planned_qty} {item.unit}
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isUpdating || item.actual_qty <= 0}
                          onClick={() => void handleAdjustQty(item, -1)}
                          className="h-7 w-7 rounded-md border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center font-semibold text-slate-900">
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto text-indigo-600" />
                          ) : (
                            item.actual_qty
                          )}
                        </span>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => void handleAdjustQty(item, 1)}
                          className="h-7 w-7 rounded-md border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Nuevo Ítem de Inventario</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Producto</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Cajas de Agua"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Bebidas, Mobiliario..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="cajas, sillas..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cantidad planificada
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={plannedQty}
                  onChange={(e) => setPlannedQty(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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

