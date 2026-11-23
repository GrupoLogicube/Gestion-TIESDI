import { Loader2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { AuthResponse } from '../../types/api';

export default function OAuthCallbackPage() {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const hasExchangedRef = useRef(false);

  useEffect(() => {
    if (!provider || hasExchangedRef.current) return;
    hasExchangedRef.current = true;

    const exchangeCode = async () => {
      const oauthError = searchParams.get('error');
      if (oauthError) {
        setError(`Autenticación cancelada o rechazada por ${provider}.`);
        return;
      }

      try {
        const query = window.location.search;
        const { data } = await api.get<AuthResponse>(
          `/auth/oauth/${provider}/callback${query}`
        );
        setSession(data.token, data.user);

        const returnTo = sessionStorage.getItem('oauth_return_to');
        if (returnTo) {
          sessionStorage.removeItem('oauth_return_to');
          navigate(returnTo, { replace: true });
          return;
        }

        if (data.user.roles.includes('provider') && !data.user.roles.includes('organizer')) {
          navigate('/provider/events', { replace: true });
        } else {
          navigate('/admin/events', { replace: true });
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(
          axiosErr.response?.data?.message || 'No se pudo completar el inicio de sesión OAuth.'
        );
      }
    };

    void exchangeCode();
  }, [provider, searchParams, navigate, setSession]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm space-y-4">
          <XCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Error de autenticación</h1>
          <p className="text-sm text-slate-600">{error}</p>
          <Link
            to="/login"
            className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Volver al Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-600">Completando inicio de sesión con {provider}...</p>
      </div>
    </div>
  );
}
