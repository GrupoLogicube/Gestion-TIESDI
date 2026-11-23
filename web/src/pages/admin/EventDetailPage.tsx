import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EventProvidersPanel from '../../components/events/EventProvidersPanel';
import GuestsTable from '../../components/events/GuestsTable';
import InventoryTable from '../../components/events/InventoryTable';
import api from '../../lib/api';
import type { EventItem, EventModule, ModuleKey } from '../../types/api';

type TabKey = 'core' | ModuleKey;

interface ModuleTabConfig {
  key: ModuleKey;
  label: string;
  iconClass: string;
  description: string;
}

const MODULE_TABS: ModuleTabConfig[] = [
  {
    key: 'rsvp',
    label: 'Invitados (RSVP)',
    iconClass: 'bi-people',
    description: 'Gestión de invitados, pases y generación de Magic Links.',
  },
  {
    key: 'providers',
    label: 'Proveedores',
    iconClass: 'bi-truck',
    description: 'Contratación, horarios de montaje y checklist de responsabilidades.',
  },
  {
    key: 'inventory',
    label: 'Inventario',
    iconClass: 'bi-box-seam',
    description: 'Control de cantidades planificadas vs. reales en tiempo real.',
  },
  {
    key: 'schedule',
    label: 'Cronograma',
    iconClass: 'bi-clock-history',
    description: 'Línea de tiempo general del evento sincronizada con proveedores.',
  },
  {
    key: 'budget',
    label: 'Presupuesto',
    iconClass: 'bi-cash-stack',
    description: 'Control de gastos estimados, reales y anticipos.',
  },
  {
    key: 'tasks',
    label: 'Tareas',
    iconClass: 'bi-kanban',
    description: 'Tablero Kanban de pendientes previos al evento.',
  },
];

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('core');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingModules, setIsSavingModules] = useState(false);
  const [showModuleSettings, setShowModuleSettings] = useState(false);

  useEffect(() => {
    const loadEvent = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get<{ data: EventItem }>(`/events/${eventId}`);
        setEvent(data.data);
      } finally {
        setIsLoading(false);
      }
    };
    void loadEvent();
  }, [eventId]);

  const isModuleEnabled = (key: ModuleKey): boolean => {
    return event?.modules?.some((m) => m.module_key === key && m.is_enabled) ?? false;
  };

  const handleToggleModule = async (moduleKey: ModuleKey, nextValue: boolean) => {
    if (!event) return;
    setIsSavingModules(true);
    try {
      const { data } = await api.put<{ data: EventModule[] }>(`/events/${event.id}/modules`, {
        modules: [{ module_key: moduleKey, is_enabled: nextValue }],
      });

      setEvent((prev) => (prev ? { ...prev, modules: data.data } : prev));

      if (!nextValue && activeTab === moduleKey) {
        setActiveTab('core');
      }
    } finally {
      setIsSavingModules(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-content pt-4">
        <div className="container-fluid">
          <div className="card h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="app-content pt-4">
        <div className="container-fluid">
          <div className="card">
            <div className="card-body text-center py-5">
              <p className="text-body-secondary">Evento no encontrado.</p>
              <Link to="/admin/events" className="btn btn-primary btn-sm">
                ← Volver a mis eventos
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const enabledTabs = MODULE_TABS.filter((tab) => isModuleEnabled(tab.key));

  return (
    <>
      {/* AdminLTE Content Header */}
      <div className="app-content-header">
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col-sm-8">
              <ol className="breadcrumb mb-1 small">
                <li className="breadcrumb-item">
                  <Link to="/admin/events">Mis Eventos</Link>
                </li>
                <li className="breadcrumb-item active">{event.title}</li>
              </ol>
              <h3 className="mb-1">{event.title}</h3>
              <div className="small text-body-secondary d-flex flex-wrap gap-3">
                <span>
                  <i className="bi bi-calendar-event me-1" />
                  {new Date(event.starts_at).toLocaleString()}
                </span>
                {event.location && (
                  <span>
                    <i className="bi bi-geo-alt me-1" />
                    {event.location}
                  </span>
                )}
                {event.location_url && (
                  <a
                    href={event.location_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-decoration-none fw-medium"
                  >
                    <i className="bi bi-map me-1" />
                    Ver en Google Maps
                  </a>
                )}
              </div>
            </div>
            <div className="col-sm-4 d-flex justify-content-sm-end mt-2 mt-sm-0">
              <button
                type="button"
                onClick={() => setShowModuleSettings((v) => !v)}
                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1.5 cursor-pointer"
              >
                <i className="bi bi-sliders" />
                <span>Configurar Módulos</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AdminLTE Content */}
      <div className="app-content">
        <div className="container-fluid space-y-4">
          {showModuleSettings && (
            <div className="card card-outline card-info mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 fs-6 fw-semibold">
                  <i className="bi bi-toggles me-2" />
                  Parametrización Modular del Evento
                </h5>
                {isSavingModules && <span className="badge text-bg-info">Guardando...</span>}
              </div>
              <div className="card-body">
                <div className="row g-3">
                  {MODULE_TABS.map((mod) => {
                    const enabled = isModuleEnabled(mod.key);
                    return (
                      <div key={mod.key} className="col-sm-6 col-lg-4">
                        <div className="form-check form-switch border rounded p-3 d-flex justify-content-between align-items-center bg-body-tertiary">
                          <label
                            htmlFor={`mod-switch-${mod.key}`}
                            className="form-check-label fw-medium mb-0 cursor-pointer"
                          >
                            <i className={`bi ${mod.iconClass} me-2 text-primary`} />
                            {mod.label}
                          </label>
                          <input
                            id={`mod-switch-${mod.key}`}
                            type="checkbox"
                            className="form-check-input m-0 cursor-pointer"
                            checked={enabled}
                            disabled={isSavingModules}
                            onChange={(e) => void handleToggleModule(mod.key, e.target.checked)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* AdminLTE Card with Modular Tabs */}
          <div className="card card-primary card-outline card-tabs">
            <div className="card-header p-0 pt-1 border-bottom-0">
              <ul className="nav nav-tabs flex-nowrap overflow-x-auto" role="tablist">
                <li className="nav-item">
                  <button
                    type="button"
                    onClick={() => setActiveTab('core')}
                    className={`nav-link text-nowrap cursor-pointer ${
                      activeTab === 'core' ? 'active fw-semibold' : ''
                    }`}
                  >
                    <i className="bi bi-speedometer2 me-1.5" />
                    Resumen (Core)
                  </button>
                </li>

                {enabledTabs.map((tab) => (
                  <li key={tab.key} className="nav-item">
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`nav-link text-nowrap cursor-pointer ${
                        activeTab === tab.key ? 'active fw-semibold' : ''
                      }`}
                    >
                      <i className={`bi ${tab.iconClass} me-1.5`} />
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-body">
              {activeTab === 'core' ? (
                <div className="space-y-4">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="info-box shadow-none border">
                        <span className="info-box-icon text-bg-primary">
                          <i className="bi bi-flag" />
                        </span>
                        <div className="info-box-content">
                          <span className="info-box-text">Estado</span>
                          <span className="info-box-number text-capitalize">{event.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="info-box shadow-none border">
                        <span className="info-box-icon text-bg-success">
                          <i className="bi bi-grid-3x3-gap" />
                        </span>
                        <div className="info-box-content">
                          <span className="info-box-text">Módulos Activos</span>
                          <span className="info-box-number">
                            {enabledTabs.length} / {MODULE_TABS.length}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="info-box shadow-none border">
                        <span className="info-box-icon text-bg-info">
                          <i className="bi bi-calendar-check" />
                        </span>
                        <div className="info-box-content">
                          <span className="info-box-text">Fecha de Inicio</span>
                          <span className="info-box-number fs-6">
                            {new Date(event.starts_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded p-3 bg-body-tertiary">
                    <h6 className="fw-semibold mb-1">Descripción</h6>
                    <p className="mb-0 small text-body-secondary">
                      {event.description || 'Sin descripción registrada.'}
                    </p>
                  </div>
                </div>
              ) : activeTab === 'rsvp' ? (
                <GuestsTable eventId={event.id} />
              ) : activeTab === 'providers' ? (
                <EventProvidersPanel eventId={event.id} />
              ) : activeTab === 'inventory' ? (
                <InventoryTable eventId={event.id} />
              ) : (
                (() => {
                  const activeConfig = MODULE_TABS.find((t) => t.key === activeTab);
                  return (
                    <div className="py-5 text-center">
                      <i className={`bi ${activeConfig?.iconClass} fs-1 text-primary d-block mb-2`} />
                      <h5 className="fw-semibold">Módulo: {activeConfig?.label}</h5>
                      <p className="text-body-secondary small mx-auto max-w-md">
                        {activeConfig?.description}
                      </p>
                      <span className="badge text-bg-light border">
                        API lista: /api/events/{event.id}/{activeTab}
                      </span>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
