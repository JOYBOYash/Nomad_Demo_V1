import { useEffect, useState } from 'react';
import { Outlet, useParams, Link, useLocation } from 'react-router-dom';
import { db } from '@/src/lib/db';
import { Event } from '@/src/types';
import { useAuth } from '@/src/lib/AuthContext';
import { motion } from 'motion/react';
import { LayoutDashboard, Target, Wallet as WalletIcon, Gift, Trophy, ShieldCheck, Settings, Newspaper } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Badge } from '../ui/Badge';

export function EventLayout() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const [event, setEvent] = useState<Event | null>(null);
  const [hasJoined, setHasJoined] = useState(false);

  const loadEvent = () => {
    if (eventId && user) {
      db.getEvent(eventId).then(e => setEvent(e || null));
    }
  };

  useEffect(() => {
    loadEvent();
    if (eventId && user) {
      db.hasJoined(eventId, user.id).then(setHasJoined);
    }
  }, [eventId, user]);

  if (!event) return <div className="p-8 text-center text-slate-500">Loading Event...</div>;

  const isCreator = event.creatorId === user?.id;
  const showWallet = !isCreator && hasJoined;

  const navItems = [
    { to: `/events/${eventId}`, label: 'Dashboard', icon: LayoutDashboard },
    { to: `/events/${eventId}/missions`, label: 'Missions', icon: Target },
  ];

  if (showWallet) {
    navItems.push({ to: `/events/${eventId}/wallet`, label: 'Wallet', icon: WalletIcon });
  }

  navItems.push({ to: `/events/${eventId}/rewards`, label: 'Rewards', icon: Gift });
  navItems.push({ to: `/events/${eventId}/leaderboard`, label: 'Leaderboard', icon: Trophy });
  navItems.push({ to: `/events/${eventId}/badge`, label: 'Badge', icon: ShieldCheck });
  navItems.push({ to: `/events/${eventId}/news`, label: 'News', icon: Newspaper });

  if (isCreator) {
    navItems.push({ to: `/events/${eventId}/manage`, label: 'Manage Event', icon: Settings });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 shrink-0 space-y-6">
        <div>
          <h2 className="font-display font-bold text-xl tracking-tight text-slate-900">{event.name}</h2>
          <div className="mt-2">
            <Badge variant={event.status === 'Live' ? 'success' : event.status === 'Ended' ? 'default' : event.status === 'Draft' ? 'warning' : 'secondary'}>{event.status}</Badge>
          </div>
        </div>
        
        <nav className="flex flex-col space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.to || (location.pathname === `/events/${eventId}` && item.to === `/events/${eventId}/`);
            return (
              <Link key={item.to} to={item.to} className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}>
                <Icon size={18} className={active ? "text-brand-600" : "text-slate-400"} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-h-[600px] pb-12 w-full">
        <motion.div
           key={location.pathname}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.2 }}
        >
          <Outlet context={{ event, hasJoined, setHasJoined, reloadEvent: loadEvent }} />
        </motion.div>
      </div>
    </div>
  );
}
