import { Key, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { Event } from '../types';
import { useAuth } from '../lib/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { ArrowRight, Settings } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';

const EventCard = ({ event, manage = false }: { event: Event, manage?: boolean, key?: Key }) => (
  <motion.div whileHover={{ y: -4 }}>
    <Card className="h-[400px] flex flex-col hover:border-brand-300 transition-all duration-300 hover:shadow-xl shadow-sm bg-white overflow-hidden">
      {event.imageUrl ? (
        <div className="h-44 bg-slate-100 overflow-hidden relative group shrink-0">
          <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute top-4 right-4"><Badge variant={event.status === 'Live' ? 'success' : event.status === 'Upcoming' ? 'warning' : 'secondary'} className="shadow-sm backdrop-blur-md bg-white/90">{event.status}</Badge></div>
        </div>
      ) : (
        <div className="h-44 bg-gradient-to-tr from-brand-100 to-brand-50 flex items-center justify-center shrink-0 relative">
          <div className="absolute top-4 right-4"><Badge variant={event.status === 'Live' ? 'success' : event.status === 'Upcoming' ? 'warning' : 'secondary'} className="shadow-sm backdrop-blur-md bg-white/90">{event.status}</Badge></div>
        </div>
      )}
      <CardContent className="pt-5 flex-1 flex flex-col px-6">
        <h3 className="font-display font-bold text-xl leading-tight line-clamp-1">{event.name}</h3>
        <span className="text-xs text-slate-400 mt-2 block shrink-0">Created {formatDate(event.createdAt)}</span>
        <div className="flex-1 mt-3">
          <div className="flex items-center text-sm text-slate-600 bg-slate-50 p-2 rounded-md">
            <span>{formatDate(event.startDate)} &rarr; {formatDate(event.endDate)}</span>
          </div>
        </div>
        <div className="mt-4 shrink-0">
          <Link to={`/events/${event.id}`}>
            <Button variant={manage ? "secondary" : "primary"} className="w-full group rounded-full font-bold shadow-sm">
              {manage ? <Settings size={16} className="mr-2" /> : null}
              <span>{manage ? 'Manage Event' : 'Open Event'}</span>
              {!manage && <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export function MyEvents() {
  const { user } = useAuth();
  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const allEvents = await db.getEvents();
        setCreatedEvents(allEvents.filter(e => e.creatorId === user!.id));
        setJoinedEvents(await db.getJoinedEvents(user!.id));
      } finally {
        setLoading(false);
      }
    };
    if (user) loadEvents();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-12">
        <section>
          <div className="flex justify-between items-end mb-6">
             <div>
               <h2 className="text-2xl font-display font-bold text-slate-900">Created Events</h2>
               <p className="text-slate-500 mt-1">Events you host and manage.</p>
             </div>
             <Skeleton className="h-9 w-24" />
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-8">
            {[1, 2].map((i) => (
              <Card key={i} className="h-[400px] flex flex-col bg-white overflow-hidden shadow-sm">
                <Skeleton className="h-44 w-full rounded-none" />
                <CardContent className="flex-1 flex flex-col p-6 pt-5">
                  <Skeleton className="h-7 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-10 w-full mb-6" />
                  <Skeleton className="h-10 w-full mt-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-display font-bold text-slate-900">Joined Events</h2>
            <p className="text-slate-500 mt-1">Events you are participating in.</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-8">
            {[1, 2].map((i) => (
              <Card key={`joined-${i}`} className="h-[400px] flex flex-col bg-white overflow-hidden shadow-sm">
                <Skeleton className="h-44 w-full rounded-none" />
                <CardContent className="flex-1 flex flex-col p-6 pt-5">
                  <Skeleton className="h-7 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-10 w-full mb-6" />
                  <Skeleton className="h-10 w-full mt-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      <section>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Created Events</h2>
            <p className="text-slate-500 mt-1">Events you host and manage.</p>
          </div>
          <Link to="/create-event"><Button variant="outline" size="sm">Create New</Button></Link>
        </div>
        
        {createdEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            You haven't created any events yet.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-8">
            {createdEvents.map(e => <EventCard key={e.id} event={e} manage />)}
          </div>
        )}
      </section>

      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-display font-bold text-slate-900">Joined Events</h2>
          <p className="text-slate-500 mt-1">Events you are participating in.</p>
        </div>

        {joinedEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            You haven't joined any events yet. <Link to="/" className="text-brand-600 hover:underline">Discover events.</Link>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-8">
            {joinedEvents.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>
    </motion.div>
  );
}
