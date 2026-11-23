import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const body = document.body;
    body.classList.add('layout-fixed', 'sidebar-expand-lg', 'bg-body-tertiary');
    return () => {
      body.classList.remove(
        'layout-fixed',
        'sidebar-expand-lg',
        'bg-body-tertiary',
        'sidebar-collapse',
        'sidebar-open'
      );
    };
  }, []);

  useEffect(() => {
    const body = document.body;
    body.classList.toggle('sidebar-collapse', sidebarCollapsed);
    body.classList.toggle('sidebar-open', mobileSidebarOpen);
  }, [sidebarCollapsed, mobileSidebarOpen]);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 992) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-wrapper">
      {/* Top Navbar (AdminLTE 4) */}
      <nav className="app-header navbar navbar-expand bg-body">
        <div className="container-fluid">
          <ul className="navbar-nav">
            <li className="nav-item">
              <button
                type="button"
                onClick={handleToggleSidebar}
                className="nav-link border-0 bg-transparent cursor-pointer"
                aria-label="Alternar menú lateral"
              >
                <i className="bi bi-list fs-5" />
              </button>
            </li>
            <li className="nav-item d-none d-md-block">
              <Link to="/admin/events" className="nav-link">
                Mis Eventos
              </Link>
            </li>
          </ul>

          <ul className="navbar-nav ms-auto align-items-center gap-2">
            <li className="nav-item d-none sm:inline-block">
              <span className="nav-link text-body-secondary">
                <i className="bi bi-person-circle me-1.5" />
                <strong className="text-body">{user?.name}</strong>
                <span className="badge text-bg-primary ms-2">Organizador</span>
              </span>
            </li>
            <li className="nav-item">
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1.5 cursor-pointer"
              >
                <i className="bi bi-box-arrow-right" />
                <span>Salir</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Sidebar (AdminLTE 4 Dark) */}
      <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
        <div className="sidebar-brand">
          <Link to="/admin/events" className="brand-link text-decoration-none">
            <i className="bi bi-calendar2-event-fill text-primary fs-4 me-2" />
            <span className="brand-text fw-semibold">Tiesdi Events</span>
          </Link>
        </div>

        <div className="sidebar-wrapper">
          <nav className="mt-2">
            <ul className="nav sidebar-menu flex-column" role="menu">
              <li className="nav-header">GESTIÓN</li>
              <li className="nav-item">
                <NavLink
                  to="/admin/events"
                  end
                  onClick={() => setMobileSidebarOpen(false)}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <i className="nav-icon bi bi-speedometer2" />
                  <p>Mis Eventos</p>
                </NavLink>
              </li>

              <li className="nav-header">CUENTA</li>
              <li className="nav-item">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="nav-link w-100 text-start border-0 bg-transparent cursor-pointer"
                >
                  <i className="nav-icon bi bi-box-arrow-right" />
                  <p>Cerrar Sesión</p>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="app-main">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="app-footer d-flex justify-content-between align-items-center text-sm">
        <div>
          <strong>Tiesdi Events</strong> · Plataforma Modular de Gestión de Eventos
        </div>
        <div className="d-none d-sm-inline text-body-secondary">AdminLTE v4</div>
      </footer>
    </div>
  );
}
