import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { Event } from '../types';
import { useAuth } from '../lib/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Calendar, Users, ArrowRight, Settings, Compass } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { motion } from 'motion/react';

export function Home() {
  const { user } = useAuth();
  const [events, setEvents] = useState<{ event: Event, hasJoined: boolean, isCreator: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadEvents = async () => {
      setLoading(true);
      try {
        const allEvents = await db.getEvents();
        const liveEvents = allEvents.filter(e => e.status === 'Live' || e.status === 'Upcoming');
        
        const mapped = await Promise.all(liveEvents.map(async e => {
          const hasJoined = await db.hasJoined(e.id, user!.id);
          const isCreator = e.creatorId === user!.id;
          return { event: e, hasJoined, isCreator };
        }));
        if (active) setEvents(mapped);
      } finally {
        if (active) setLoading(false);
      }
    };
    if (user) loadEvents();
    return () => { active = false; };
  }, [user]);

  const joinEvent = async (id: string) => {
    await db.joinEvent(id, user!.id);
    const updated = await Promise.all(events.map(async e => {
      if (e.event.id === id) return { ...e, hasJoined: true };
      return e;
    }));
    setEvents(updated);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Discover Events</h1>
        <p className="text-slate-500 mt-2">Find and explore upcoming and live events to earn rewards.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-[460px] flex flex-col bg-white overflow-hidden shadow-sm">
              <Skeleton className="h-56 w-full rounded-none" />
              <CardContent className="flex-1 flex flex-col p-6">
                <Skeleton className="h-7 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <Skeleton className="h-10 w-full mt-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="text-center py-16 bg-white border-dashed border-2">
          <div className="text-slate-400 mb-4 flex justify-center"><Compass size={48} className="text-brand-300" /></div>
          <h3 className="text-lg font-medium text-slate-900">No Events Found</h3>
          <p className="text-slate-500 mt-1">Check back later or host your own.</p>
          <Link to="/create-event" className="inline-block mt-4 text-brand-600 font-medium hover:underline">Create an event &rarr;</Link>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-8">
          {events.map(({ event, hasJoined, isCreator }) => (
            <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}>
              <Card className="h-[460px] flex flex-col hover:border-brand-300 transition-all duration-300 hover:shadow-xl shadow-sm bg-white overflow-hidden">
                {event.imageUrl ? (
                  <div className="h-56 bg-slate-100 overflow-hidden relative group shrink-0">
                    <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-4 right-4"><Badge variant={event.status === 'Live' ? 'success' : event.status === 'Upcoming' ? 'warning' : 'secondary'} className="shadow-sm backdrop-blur-md bg-white/90">{event.status}</Badge></div>
                  </div>
                ) : (
                  <div className="h-56 bg-gradient-to-tr from-brand-100 to-brand-50 flex items-center justify-center shrink-0 relative">
                    <Compass size={48} className="text-brand-300" />
                    <div className="absolute top-4 right-4"><Badge variant={event.status === 'Live' ? 'success' : event.status === 'Upcoming' ? 'warning' : 'secondary'} className="shadow-sm backdrop-blur-md bg-white/90">{event.status}</Badge></div>
                  </div>
                )}
                <CardContent className="flex-1 flex flex-col p-6">
                  <h3 className="text-xl font-bold font-display leading-tight">{event.name}</h3>
                  <p className="text-slate-600 text-sm line-clamp-2 mt-2 leading-relaxed flex-1">{event.description}</p>
                  
                  <div className="mt-4 space-y-2 text-sm text-slate-500 shrink-0">
                    <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-md">
                      <Calendar size={15} className="text-brand-500" />
                      <span className="font-medium">{formatDate(event.startDate)}</span>
                      <span>&rarr;</span>
                      <span className="font-medium">{formatDate(event.endDate)}</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 shrink-0">
                    <Link to={`/events/${event.id}`} className="w-full">
                      <Button variant={hasJoined || isCreator ? "secondary" : "primary"} className="w-full group rounded-full font-bold shadow-sm">
                        {isCreator ? <Settings size={16} className="mr-2" /> : null}
                        <span>{isCreator ? 'Manage Event' : (hasJoined ? 'Open Event' : 'View Details')}</span>
                        {!isCreator && <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
