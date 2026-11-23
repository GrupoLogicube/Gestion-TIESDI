import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add('login-page', 'bg-body-secondary');
    return () => {
      document.body.classList.remove('login-page', 'bg-body-secondary');
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(email, password);
      if (user.roles.includes('provider') && !user.roles.includes('organizer')) {
        navigate('/provider/events', { replace: true });
      } else {
        navigate('/admin/events', { replace: true });
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Credenciales inválidas. Intenta nuevamente.');
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError(null);
    try {
      const { data } = await api.get<{ url: string }>(`/auth/oauth/${provider}/redirect`);
      window.location.href = data.url;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(
        axiosErr.response?.data?.message || `No se pudo iniciar sesión con ${provider}.`
      );
    }
  };

  return (
    <div className="login-box">
      <div className="card card-outline card-primary shadow-sm">
        <div className="card-header text-center py-3">
          <Link to="/login" className="link-dark text-decoration-none">
            <h1 className="mb-0 fs-3">
              <i className="bi bi-calendar2-event-fill text-primary me-2" />
              <b>Tiesdi</b> Events
            </h1>
          </Link>
        </div>

        <div className="card-body login-card-body">
          <p className="login-box-msg">Inicia sesión para administrar tus eventos</p>

          {error && (
            <div className="alert alert-danger py-2 px-3 small" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group mb-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                placeholder="Correo electrónico"
              />
              <div className="input-group-text">
                <i className="bi bi-envelope" />
              </div>
            </div>

            <div className="input-group mb-3">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                placeholder="Contraseña"
              />
              <div className="input-group-text">
                <i className="bi bi-lock-fill" />
              </div>
            </div>

            <div className="d-grid gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary cursor-pointer"
              >
                {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>

          <div className="social-auth-links text-center my-3 d-grid gap-2">
            <p className="text-body-secondary small mb-1">- O continúa con -</p>
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="btn btn-danger btn-sm d-flex align-items-center justify-content-center gap-2 cursor-pointer"
            >
              <i className="bi bi-google" />
              <span>Ingresar con Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('apple')}
              className="btn btn-dark btn-sm d-flex align-items-center justify-content-center gap-2 cursor-pointer"
            >
              <i className="bi bi-apple" />
              <span>Ingresar con Apple</span>
            </button>
          </div>

          <p className="mb-0 text-center small">
            <Link to="/register" className="text-decoration-none">
              ¿No tienes cuenta? Regístrate como organizador
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
