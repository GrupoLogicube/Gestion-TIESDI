import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

function formatPhoneWithCountryCode(countryCode: string, rawNumber: string): string | undefined {
  const digits = rawNumber.replace(/\D/g, '');
  if (!digits) return undefined;
  const normalizedLocal = digits.startsWith('0') ? digits.slice(1) : digits;
  const cleanCode = `+${countryCode.replace(/\D/g, '')}`;
  return `${cleanCode}${normalizedLocal}`;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+593');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add('register-page', 'bg-body-secondary');
    return () => {
      document.body.classList.remove('register-page', 'bg-body-secondary');
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
        phone: formatPhoneWithCountryCode(countryCode, phone),
      });
      navigate('/admin/events', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Error al registrar la cuenta.');
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
        axiosErr.response?.data?.message || `No se pudo conectar con ${provider}.`
      );
    }
  };

  return (
    <div className="register-box">
      <div className="card card-outline card-primary shadow-sm">
        <div className="card-header text-center py-3">
          <Link to="/register" className="link-dark text-decoration-none">
            <h1 className="mb-0 fs-3">
              <i className="bi bi-calendar2-event-fill text-primary me-2" />
              <b>Tiesdi</b> Events
            </h1>
          </Link>
        </div>

        <div className="card-body register-card-body">
          <p className="register-box-msg">Crear cuenta de Organizador</p>

          {error && (
            <div className="alert alert-danger py-2 px-3 small" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group mb-3">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-control"
                placeholder="Nombre completo"
              />
              <div className="input-group-text">
                <i className="bi bi-person" />
              </div>
            </div>

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
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Código de país"
                className="form-control"
                style={{ maxWidth: '80px' }}
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-control"
                placeholder="0999123456 (opcional)"
              />
              <div className="input-group-text">
                <i className="bi bi-telephone" />
              </div>
            </div>

            <div className="input-group mb-3">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                placeholder="Contraseña (mín. 8 caracteres)"
              />
              <div className="input-group-text">
                <i className="bi bi-lock-fill" />
              </div>
            </div>

            <div className="input-group mb-3">
              <input
                type="password"
                required
                minLength={8}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="form-control"
                placeholder="Confirmar contraseña"
              />
              <div className="input-group-text">
                <i className="bi bi-shield-lock-fill" />
              </div>
            </div>

            <div className="d-grid gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary cursor-pointer"
              >
                {isLoading ? 'Creando cuenta...' : 'Registrarme'}
              </button>
            </div>
          </form>

          <div className="social-auth-links text-center my-3 d-grid gap-2">
            <p className="text-body-secondary small mb-1">- O regístrate con -</p>
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="btn btn-danger btn-sm d-flex align-items-center justify-content-center gap-2 cursor-pointer"
            >
              <i className="bi bi-google" />
              <span>Continuar con Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('apple')}
              className="btn btn-dark btn-sm d-flex align-items-center justify-content-center gap-2 cursor-pointer"
            >
              <i className="bi bi-apple" />
              <span>Continuar con Apple</span>
            </button>
          </div>

          <p className="mb-0 text-center small">
            <Link to="/login" className="text-decoration-none">
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
