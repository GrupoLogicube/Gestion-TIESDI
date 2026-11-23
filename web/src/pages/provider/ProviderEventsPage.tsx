import { Calendar, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../lib/api';

interface ChecklistItem {
  id: number;
  item_name: string;
  quantity: number;
  is_prepared: boolean;
}

interface ProviderAssignment {
  id: number;
  setup_at: string | null;
  show_at: string | null;
  status: string;
  event: {
    id: number;
    title: string;
    location: string | null;
    location_url: string | null;
    starts_at: string;
  };
  checklist_items: ChecklistItem[];
}

export default function ProviderEventsPage() {
  const [assignments, setAssignments] = useState<ProviderAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssigned = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get<{ data: ProviderAssignment[] }>('/provider/events');
        setAssignments(data.data);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchAssigned();
  }, []);

  const handleToggleItem = async (assignmentId: number, item: ChecklistItem) => {
    const nextState = !item.is_prepared;
    const { data } = await api.patch<{ data: ChecklistItem }>(
      `/provider/checklist/${item.id}/toggle`,
      { is_prepared: nextState }
    );

    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId
          ? {
              ...a,
              checklist_items: a.checklist_items.map((c) => (c.id === item.id ? data.data : c)),
            }
          : a
      )
    );
  };

  if (isLoading) {
    return <div className="h-48 rounded-2xl bg-white border border-slate-200 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Eventos Asignados</h1>
        <p className="text-sm text-slate-500 mt-1">
          Consulta tus horarios y marca los equipos preparados para cada evento.
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No tienes eventos asignados actualmente.
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{assignment.event.title}</h2>
                <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {new Date(assignment.event.starts_at).toLocaleString()}
                  </span>
                  {assignment.event.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {assignment.event.location}
                    </span>
                  )}
                  {assignment.event.location_url && (
                    <a
                      href={assignment.event.location_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 font-medium hover:underline"
                    >
                      Abrir en Google Maps ↗
                    </a>
                  )}
                  {assignment.setup_at && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                      <Clock className="h-4 w-4" />
                      Set-up: {new Date(assignment.setup_at).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">
                  Checklist de equipos (&quot;Qué lleva&quot;)
                </h3>
                <div className="space-y-2">
                  {assignment.checklist_items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => void handleToggleItem(assignment.id, item)}
                      className={`w-full flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                        item.is_prepared
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>
                        <strong>{item.quantity}x</strong> {item.item_name}
                      </span>
                      <CheckCircle2
                        className={`h-5 w-5 ${
                          item.is_prepared ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

