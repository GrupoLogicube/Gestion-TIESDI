import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types/api';

interface ProtectedRouteProps {
  allowedRole: UserRole;
}

export default function ProtectedRoute({ allowedRole }: ProtectedRouteProps) {
  const { user, isInitialized, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      void initialize();
    }
  }, [isInitialized, initialize]);

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.roles.includes(allowedRole)) {
    if (user.roles.includes('organizer')) {
      return <Navigate to="/admin/events" replace />;
    }
    if (user.roles.includes('provider')) {
      return <Navigate to="/provider/events" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

