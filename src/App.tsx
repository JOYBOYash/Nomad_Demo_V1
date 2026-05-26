import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { CreateEvent } from './pages/CreateEvent';
import { MyEvents } from './pages/MyEvents';
import { Profile } from './pages/Profile';
import { EventLayout } from './components/layout/EventLayout';
import { Dashboard } from './pages/event/Dashboard';
import { Manage } from './pages/event/Manage';
import { Missions } from './pages/event/Missions';
import { Wallet } from './pages/event/Wallet';
import { Rewards } from './pages/event/Rewards';
import { Leaderboard } from './pages/event/Leaderboard';
import { Badge } from './pages/event/Badge';
import { News } from './pages/event/News';

import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-brand-500 rounded-full animate-ping opacity-20"></div>
          <img src="https://www.dropbox.com/scl/fi/eez8in6tuf5mgf3b4scz1/Nomad.svg?rlkey=6x9d65a0tljcelq7n6gmiy9px&raw=1" alt="Nomad Logo Loader" className="w-16 h-16 animate-pulse drop-shadow-lg" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#1e293b', color: '#fff' } }} />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Home />} />
            <Route path="/my-events" element={<MyEvents />} />
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/profile" element={<Profile />} />
            
            <Route path="/events/:eventId" element={<EventLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="manage" element={<Manage />} />
              <Route path="missions" element={<Missions />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="rewards" element={<Rewards />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="badge" element={<Badge />} />
              <Route path="news" element={<News />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
