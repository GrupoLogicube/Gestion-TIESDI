import { Plus, X } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LocationPickerMap from '../../components/events/LocationPickerMap';
import api from '../../lib/api';
import type { EventItem, ModuleKey } from '../../types/api';

const MODULE_LABELS: Record<ModuleKey, string> = {
  providers: 'Proveedores',
  inventory: 'Inventario',
  rsvp: 'Invitados (RSVP)',
  schedule: 'Cronograma',
  budget: 'Presupuesto',
  tasks: 'Tareas (Kanban)',
};

const ALL_MODULES: ModuleKey[] = [
  'providers',
  'inventory',
  'rsvp',
  'schedule',
  'budget',
  'tasks',
];

const STATUS_BADGE_CLASS: Record<EventItem['status'], string> = {
  active: 'text-bg-success',
  draft: 'text-bg-warning',
  completed: 'text-bg-secondary',
  cancelled: 'text-bg-danger',
};

export default function EventsListPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [selectedModules, setSelectedModules] = useState<Record<ModuleKey, boolean>>({
    providers: true,
    inventory: true,
    rsvp: true,
    schedule: true,
    budget: true,
    tasks: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<{ data: EventItem[] }>('/events');
      setEvents(data.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const modules = ALL_MODULES.map((key) => ({
        module_key: key,
        is_enabled: selectedModules[key],
      }));

      const { data } = await api.post<{ data: EventItem }>('/events', {
        title,
        description: description || null,
        location: location || null,
        location_url: locationUrl || null,
        starts_at: new Date(startsAt).toISOString(),
        status: 'active',
        modules,
      });

      setEvents((prev) => [...prev, data.data]);
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setLocation('');
      setLocationUrl('');
      setStartsAt('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'No se pudo crear el evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeEventsCount = events.filter((e) => e.status === 'active').length;
  const draftEventsCount = events.filter((e) => e.status === 'draft').length;
  const totalEnabledModules = events.reduce(
    (sum, e) => sum + (e.modules?.filter((m) => m.is_enabled).length ?? 0),
    0
  );

  return (
    <>
      {/* AdminLTE Content Header */}
      <div className="app-content-header">
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col-sm-6">
              <h3 className="mb-0">Mis Eventos</h3>
            </div>
            <div className="col-sm-6 d-flex justify-content-sm-end mt-2 mt-sm-0">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary d-inline-flex align-items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Nuevo Evento</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AdminLTE Main Content */}
      <div className="app-content">
        <div className="container-fluid">
          {/* Small Boxes (AdminLTE KPIs) */}
          <div className="row mb-4">
            <div className="col-lg-3 col-6">
              <div className="small-box text-bg-primary">
                <div className="inner">
                  <h3>{events.length}</h3>
                  <p>Total de Eventos</p>
                </div>
                <i className="small-box-icon bi bi-calendar-event" />
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box text-bg-success">
                <div className="inner">
                  <h3>{activeEventsCount}</h3>
                  <p>Eventos Activos</p>
                </div>
                <i className="small-box-icon bi bi-check-circle" />
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box text-bg-warning">
                <div className="inner">
                  <h3>{draftEventsCount}</h3>
                  <p>Borradores</p>
                </div>
                <i className="small-box-icon bi bi-pencil-square" />
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box text-bg-info">
                <div className="inner">
                  <h3>{totalEnabledModules}</h3>
                  <p>Módulos Activos</p>
                </div>
                <i className="small-box-icon bi bi-grid-3x3-gap" />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="row g-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="col-md-6 col-lg-4">
                  <div className="card h-44 animate-pulse" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="card card-outline card-primary">
              <div className="card-body text-center py-5">
                <i className="bi bi-calendar2-plus fs-1 text-secondary d-block mb-3" />
                <h5 className="fw-semibold">No tienes eventos todavía</h5>
                <p className="text-body-secondary mb-4">
                  Crea tu primer evento para activar proveedores, invitados e inventario.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary d-inline-flex align-items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Crear primer evento</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="row g-4">
              {events.map((event) => {
                const activeCount = event.modules?.filter((m) => m.is_enabled).length ?? 0;
                return (
                  <div key={event.id} className="col-md-6 col-lg-4">
                    <div className="card card-outline card-primary h-100">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h5 className="card-title mb-0 fw-semibold text-truncate">{event.title}</h5>
                        <span className={`badge ${STATUS_BADGE_CLASS[event.status]} text-capitalize`}>
                          {event.status}
                        </span>
                      </div>
                      <div className="card-body">
                        {event.description && (
                          <p className="card-text text-body-secondary small line-clamp-2 mb-3">
                            {event.description}
                          </p>
                        )}
                        <div className="small text-body-secondary space-y-1.5">
                          <div>
                            <i className="bi bi-clock me-2 text-primary" />
                            {new Date(event.starts_at).toLocaleString()}
                          </div>
                          {event.location && (
                            <div className="text-truncate">
                              <i className="bi bi-geo-alt me-2 text-primary" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="card-footer d-flex justify-content-between align-items-center bg-transparent">
                        <span className="small text-body-secondary">
                          <i className="bi bi-sliders me-1" />
                          {activeCount} módulos activos
                        </span>
                        <Link
                          to={`/admin/events/${event.id}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          Administrar <i className="bi bi-arrow-right ms-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[1055] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Nuevo Evento</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="alert alert-danger py-2 px-3 small" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="row g-3">
                <div className="col-md-7">
                  <label className="form-label small fw-semibold">Título</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Boda Pérez - Gómez"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-md-5">
                  <label className="form-label small fw-semibold">Fecha y hora</label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="form-control form-control-sm"
                  />
                </div>
              </div>

              <div>
                <label className="form-label small fw-semibold">Nombre del lugar / dirección</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej. Hacienda El Bosque, Av. Principal 123"
                  className="form-control form-control-sm"
                />
              </div>

              <div>
                <label className="form-label small fw-semibold">
                  Ubicación en el mapa (genera enlace de Google Maps para invitados y proveedores)
                </label>
                <LocationPickerMap
                  locationUrl={locationUrl}
                  onLocationSelect={({ locationUrl: nextUrl, suggestedAddress }) => {
                    setLocationUrl(nextUrl);
                    if (!location.trim() && suggestedAddress) {
                      setLocation(suggestedAddress);
                    }
                  }}
                />
              </div>

              <div>
                <label className="form-label small fw-semibold">Descripción</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-control form-control-sm"
                />
              </div>

              <div>
                <label className="form-label small fw-semibold d-block mb-2">Módulos activos</label>
                <div className="row g-2">
                  {ALL_MODULES.map((key) => (
                    <div key={key} className="col-6">
                      <div className="form-check form-switch border rounded px-3 py-2 bg-light">
                        <input
                          id={`new-mod-${key}`}
                          type="checkbox"
                          className="form-check-input ms-0 me-2"
                          checked={selectedModules[key]}
                          onChange={(e) =>
                            setSelectedModules((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                        />
                        <label htmlFor={`new-mod-${key}`} className="form-check-label small">
                          {MODULE_LABELS[key]}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary btn-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-sm cursor-pointer"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
