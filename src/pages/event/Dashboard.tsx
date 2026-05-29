import { useOutletContext, Link } from 'react-router-dom';
import { Event } from '@/src/types';
import { useAuth } from '@/src/lib/AuthContext';
import { useEffect, useState } from 'react';
import { db } from '@/src/lib/db';
import { Card, CardContent } from '@/src/components/ui/Card';
import { Target, Wallet as WalletIcon, Gift, Trophy, ShieldCheck, Settings, Users, Coins, CheckSquare } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

export function Dashboard() {
  const { event, hasJoined, setHasJoined, isBanned } = useOutletContext<{ event: Event, hasJoined: boolean, isBanned: boolean, setHasJoined: any }>();
  const { user } = useAuth();
  
  const [balance, setBalance] = useState(0);
  const [rank, setRank] = useState<number | null>(null);

  const [participantsCount, setParticipantsCount] = useState(0);
  const [totalTokensEarned, setTotalTokensEarned] = useState(0);
  const [missionsCompletedCount, setMissionsCompletedCount] = useState(0);
  
  const [updates, setUpdates] = useState<any[]>([]);

  const isCreator = event.creatorId === user?.id;

  useEffect(() => {
    if (user && event) {
      if (isCreator) {
         db.getEventOverviewStats(event.id).then(stats => {
           setParticipantsCount(stats.participantsCount);
           setTotalTokensEarned(stats.totalTokensEarned);
           setMissionsCompletedCount(stats.missionsCompletedCount);
         });
      } else if (hasJoined) {
         db.getWallet(event.id, user.id).then(w => setBalance(w.balance));
         db.getLeaderboard(event.id).then(lb => {
           const myRank = lb.find(l => l.userId === user.id)?.rank;
           setRank(myRank || null);
         });
      }
      db.getEventUpdates(event.id).then(setUpdates);
    }
  }, [user, event, isCreator, hasJoined]);

  const handleJoin = async () => {
    if (event.status === 'Ended' || event.status === 'Canceled') return;
    if (user) {
      await db.joinEvent(event.id, user.id);
      setHasJoined(true);
    }
  };

  const cards = isCreator ? [
    { title: 'Total Participants', value: participantsCount.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Tokens Earned by Users', value: totalTokensEarned.toString(), icon: Coins, color: 'text-brand-600', bg: 'bg-brand-50' },
    { title: 'Missions Completed', value: missionsCompletedCount.toString(), icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-50' },
  ] : [
    { title: 'My Tokens', value: hasJoined ? balance.toString() : '-', icon: WalletIcon, color: 'text-brand-600', bg: 'bg-brand-50' },
    { title: 'Leaderboard Rank', value: rank ? `#${rank}` : '-', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Event Dashboard</h1>
            <p className="text-slate-500 mt-2">{event.description}</p>
          </div>
          {!isCreator && !hasJoined && (
            <Button onClick={handleJoin} className={`shrink-0 ${isBanned ? 'bg-danger/10 text-danger border border-danger hover:bg-danger/20 hover:text-danger hover:border-danger' : ''}`} size="lg" disabled={event.status === 'Ended' || event.status === 'Canceled' || isBanned}>
              {isBanned ? 'Banned from Event' : event.status === 'Ended' || event.status === 'Canceled' ? 'Event Closed' : 'Join Event'}
            </Button>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-${isCreator ? '3' : '2'} gap-6`}>
        {cards.map(c => (
          <Card key={c.title} className="flex items-center p-6">
            <div className={`p-4 rounded-xl ${c.bg} ${c.color} mr-6`}>
              <c.icon size={32} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{c.title}</p>
              <h3 className="text-3xl font-display font-bold text-slate-900">{c.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-6 mt-12 w-full">
         <h3 className="text-lg font-bold font-display text-slate-900 mb-4">Quick Links</h3>
         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
           <QuickLink to={`/events/${event.id}/missions`} icon={Target} label="Missions" />
           {!isCreator && hasJoined && <QuickLink to={`/events/${event.id}/wallet`} icon={WalletIcon} label="Wallet" />}
           <QuickLink to={`/events/${event.id}/rewards`} icon={Gift} label="Rewards" />
           <QuickLink to={`/events/${event.id}/leaderboard`} icon={Trophy} label="Leaderboard" />
           <QuickLink to={`/events/${event.id}/badge`} icon={ShieldCheck} label="Badges" />
           {isCreator && (
             <QuickLink to={`/events/${event.id}/manage`} icon={Settings} label="Manage" />
           )}
         </div>
      </div>

      <div className="space-y-6 mt-12 w-full pt-8 border-t border-slate-100">
         <div className="flex items-center justify-between mb-4">
           <h3 className="text-xl font-bold font-display text-slate-900">Event News & Updates</h3>
           <Link to={`/events/${event.id}/news`} className="text-sm font-medium text-brand-600 hover:text-brand-700">View All</Link>
         </div>
         {updates.length === 0 ? (
           <p className="text-slate-500 text-sm">No updates yet.</p>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
             {updates.slice(0, 6).map(u => (
               <Card key={u.id} className="p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-brand-500 rounded-l-md"></div>
                 <h4 className="font-semibold text-slate-900 text-base mb-2">{u.title}</h4>
                 <p className="text-slate-600 text-sm">{u.description}</p>
                 <span className="text-xs text-slate-400 mt-4 block">{new Date(u.createdAt).toLocaleDateString()}</span>
               </Card>
             ))}
           </div>
         )}
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string, icon: any, label: string }) {
  return (
    <Link to={to}>
      <Card className="hover:border-brand-500 hover:shadow-[0_0_15px_rgba(201,255,0,0.3)] transition-all duration-300 group p-4 flex flex-col items-center justify-center text-center h-full cursor-pointer hover:-translate-y-1">
        <Icon size={28} className="text-slate-400 group-hover:text-brand-500 mb-3 transition-colors duration-300" />
        <span className="font-display font-bold tracking-wider text-slate-700 group-hover:text-slate-900">{label}</span>
      </Card>
    </Link>
  );
}
