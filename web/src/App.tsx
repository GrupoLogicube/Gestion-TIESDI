import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ProviderLayout from './components/ProviderLayout';
import EventDetailPage from './pages/admin/EventDetailPage';
import EventsListPage from './pages/admin/EventsListPage';
import LoginPage from './pages/auth/LoginPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProviderEventsPage from './pages/provider/ProviderEventsPage';
import RsvpLandingPage from './pages/public/RsvpLandingPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/oauth/:provider/callback" element={<OAuthCallbackPage />} />

        {/* Public RSVP Magic Link */}
        <Route path="/rsvp/:token" element={<RsvpLandingPage />} />

        {/* Organizer Protected Routes */}
        <Route element={<ProtectedRoute allowedRole="organizer" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/events" replace />} />
            <Route path="events" element={<EventsListPage />} />
            <Route path="events/:eventId" element={<EventDetailPage />} />
          </Route>
        </Route>

        {/* Provider Protected Routes */}
        <Route element={<ProtectedRoute allowedRole="provider" />}>
          <Route path="/provider" element={<ProviderLayout />}>
            <Route index element={<Navigate to="/provider/events" replace />} />
            <Route path="events" element={<ProviderEventsPage />} />
          </Route>
        </Route>

        {/* Default fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
