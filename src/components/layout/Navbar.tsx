import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, PlusSquare } from 'lucide-react';
import { useAuth } from '@/src/lib/AuthContext';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';

export function Navbar() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const links = [
    { to: '/', label: 'DISCOVER', icon: Compass },
    { to: '/my-events', label: 'MY EVENTS', icon: Home },
    { to: '/create-event', label: 'CREATE', icon: PlusSquare },
  ];

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center bg-slate-100/90 backdrop-blur-md px-6 py-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200/50">
      <Link to="/" className="flex items-center shrink-0 mr-8 hover:opacity-80 transition-opacity">
        <img src="https://www.dropbox.com/scl/fi/eez8in6tuf5mgf3b4scz1/Nomad.svg?rlkey=6x9d65a0tljcelq7n6gmiy9px&raw=1" alt="Nomad Logo" className="h-8" />
      </Link>

      <div className="flex items-center space-x-2 sm:space-x-8">
        {links.map(link => {
          const active = location.pathname === link.to;
          return (
            <Link key={link.to} to={link.to} className={cn("relative flex items-center space-x-2 px-2 py-1 text-xs font-bold tracking-wider transition-colors uppercase", active ? "text-slate-900" : "text-slate-500 hover:text-slate-900")}>
              <span className="hidden sm:block">{link.label}</span>
              <link.icon size={18} className="sm:hidden" />
              {active && <motion.div layoutId="nav-indicator" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />}
            </Link>
          )
        })}
      </div>

      <div className="flex items-center shrink-0 ml-8 pl-8 border-l border-slate-300/50">
        <Link to="/profile" className="flex items-center group">
          <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border-2 border-white shadow-sm object-cover group-hover:border-brand-500 transition-colors" />
        </Link>
      </div>
    </nav>
  );
}
