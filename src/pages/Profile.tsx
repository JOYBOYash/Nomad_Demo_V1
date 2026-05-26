import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/db';
import { ParticipationBadge } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ShieldCheck, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDate } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ joinedCount: 0, createdCount: 0 });
  const [badges, setBadges] = useState<(ParticipationBadge & { eventName: string })[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      db.getParticipantStats(user.id).then(setStats);
      db.getBadges(user.id).then(setBadges);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <section className="flex flex-col md:flex-row items-center md:items-stretch gap-6">
        <Card className="flex-1 w-full bg-white shadow-sm border-slate-200">
          <CardContent className="p-8 flex flex-col md:flex-row items-center text-center md:text-left gap-6">
            <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 rounded-full border-4 border-slate-100 object-cover" />
            <div className="flex-1">
              <h1 className="text-3xl font-display font-bold text-slate-900">{user.name}</h1>
              <p className="text-slate-500 mt-1">{user.email}</p>
              <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                <div className="px-3 py-1 bg-slate-100 rounded-lg text-sm"><span className="font-bold text-slate-900">{stats.createdCount}</span> Hosted</div>
                <div className="px-3 py-1 bg-slate-100 rounded-lg text-sm"><span className="font-bold text-slate-900">{stats.joinedCount}</span> Joined</div>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowLogoutConfirm(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 shrink-0">
               <LogOut size={16} className="mr-2" /> Logout
            </Button>
          </CardContent>
        </Card>
      </section>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
             <div className="p-6">
               <h3 className="text-xl font-bold font-display text-slate-900 mb-2">Sign out</h3>
               <p className="text-slate-500 mb-6">Are you sure you want to log out of your account?</p>
               <div className="flex space-x-3">
                 <Button variant="outline" className="flex-1" onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
                 <Button variant="primary" className="flex-1 bg-red-600 hover:bg-red-700 text-white border-transparent" onClick={handleLogout}>Log Out</Button>
               </div>
             </div>
          </motion.div>
        </div>
      )}

      <section>
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Badge Gallery</h2>
          <p className="text-slate-500 mt-1">Verified credentials from events you've participated in.</p>
        </div>

        {badges.length === 0 ? (
          <div className="mt-6 p-8 border border-dashed rounded-xl text-center text-slate-500 bg-white">
            You haven't earned any event badges yet.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {badges.map((b, i) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={b.id}>
                <Card className="text-center p-6 bg-slate-900 text-white border-slate-800 shadow-xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <ShieldCheck size={48} className="mx-auto text-yellow-500 mb-4 relative z-10" />
                  <div className="relative z-10">
                    <h3 className="font-bold font-display leading-tight mb-2">{b.badgeTitle}</h3>
                    <p className="text-xs text-slate-400 mb-4">{b.eventName}</p>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">{formatDate(b.issueDate)}</div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
