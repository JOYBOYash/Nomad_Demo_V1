import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Event } from '@/src/types';
import { useAuth } from '@/src/lib/AuthContext';
import { db } from '@/src/lib/db';
import { Trophy, Ban } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '@/src/components/ui/Badge';

export function Leaderboard() {
  const { event } = useOutletContext<{ event: Event }>();
  const { user } = useAuth();
  
  const [leaderboard, setLeaderboard] = useState<{userId: string, name: string, score: number, rank: number}[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);

  useEffect(() => {
    db.getLeaderboard(event.id).then(setLeaderboard);
    db.getBannedUsers(event.id).then(setBannedUsers);
  }, [event.id]);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center">
        <Trophy size={48} className="mx-auto text-amber-500 mb-4" />
        <h1 className="text-3xl font-display font-bold text-slate-900">Leaderboard</h1>
        <p className="text-slate-500 mt-2">Ranked by total tokens earned from missions.</p>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        {leaderboard.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No participants have earned tokens yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {leaderboard.map((u, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: i * 0.05 }}
                key={u.userId} 
                className={`flex items-center p-4 sm:p-6 ${u.userId === user?.id ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
              >
                <div className="w-8 font-bold font-display text-slate-400 shrink-0">
                  {u.rank <= 3 ? ['🥇','🥈','🥉'][u.rank-1] : `#${u.rank}`}
                </div>
                <div className="flex-1 px-4 flex items-center">
                  <div className="font-medium text-slate-900 flex items-center gap-2">
                    {u.name}
                    {u.userId === user?.id && <span className="text-xs bg-brand-200 text-brand-800 px-2 py-0.5 rounded-full ml-2">You</span>}
                  </div>
                </div>
                <div className="font-bold text-brand-600 font-display shrink-0">
                  {u.score} <span className="text-brand-400 text-sm">TKN</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {bannedUsers.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center space-x-2 text-red-600 mb-4">
            <Ban size={24} />
            <h2 className="text-2xl font-display font-bold text-slate-900">Banned & Disqualified</h2>
          </div>
          <p className="text-slate-500 mb-6 text-sm">The following participants have been permanently removed from this event for violating our community guidelines.</p>
          
          <div className="bg-red-50/50 border border-red-100 rounded-xl overflow-hidden">
            <div className="divide-y divide-red-100">
              {bannedUsers.map((b) => (
                <div key={b.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div className="flex items-center space-x-4">
                      <div className="relative">
                         <img src={b.user?.avatarUrl} alt={b.user?.name} className="w-10 h-10 rounded-full bg-slate-200 grayscale opacity-80" />
                         <div className="absolute -bottom-1 -right-1 bg-white rounded-full"><Ban size={14} className="text-red-500" /></div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 line-through text-slate-500 flex items-center gap-2">
                          {b.user?.name}
                        </div>
                        <div className="text-sm text-red-700 mt-0.5 font-medium">Reason: {b.reason}</div>
                        <div className="text-xs text-slate-400 mt-1">Disqualified on {new Date(b.createdAt).toLocaleDateString()}</div>
                      </div>
                   </div>
                   <Badge variant="destructive" className="sm:ml-auto w-fit">Permanently Banned</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
