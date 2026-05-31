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
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center bg-black/90 backdrop-blur-md px-4 py-3 sm:px-8 border-b border-white/5 w-full justify-between shadow-[0_4px_30px_rgb(0,0,0,0.5)]">
      <Link to="/" className="flex items-center shrink-0 sm:mr-10 hover:opacity-80 transition-opacity">
        <h1 className="text-3xl font-bebas text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-white tracking-widest drop-shadow-[0_0_5px_rgba(201,255,0,0.5)] m-0">NOMAD</h1>
      </Link>

      <div className="flex flex-1 items-center space-x-1 sm:space-x-8 overflow-x-auto no-scrollbar mask-gradient">
        {links.map(link => {
          const active = location.pathname === link.to;
          return (
            <Link key={link.to} to={link.to} className={cn("relative flex items-center space-x-2 px-3 py-2 text-sm sm:text-base font-display font-medium tracking-widest transition-colors uppercase whitespace-nowrap", active ? "text-brand-500" : "text-slate-500 hover:text-white")}>
              <span className="hidden sm:block">{link.label}</span>
              <link.icon size={20} className="sm:hidden" />
              {active && <motion.div layoutId="nav-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-500 shadow-[0_0_10px_rgba(201,255,0,0.8)]" />}
            </Link>
          )
        })}
      </div>

      <div className="flex items-center shrink-0 ml-4 pl-4 sm:ml-8 sm:pl-8 border-l border-white/10">
        <Link to="/profile" className="flex items-center group relative cursor-pointer hover:scale-105 active:scale-95 transition-all">
          <div className="absolute inset-0 bg-brand-500 blur-sm rounded-full opacity-0 group-hover:opacity-50 transition-opacity"></div>
          <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full border-2 border-brand-500 shadow-sm object-cover relative z-10 grayscale group-hover:grayscale-0 transition-all font-sans bg-white" />
        </Link>
      </div>
    </nav>
  );
}
