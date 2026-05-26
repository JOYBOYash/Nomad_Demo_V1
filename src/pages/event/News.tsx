import { useOutletContext } from 'react-router-dom';
import { Event } from '@/src/types';
import { useEffect, useState } from 'react';
import { db, EventUpdate } from '@/src/lib/db';
import { Newspaper } from 'lucide-react';
import { Card } from '@/src/components/ui/Card';

export function News() {
  const { event } = useOutletContext<{ event: Event }>();
  const [updates, setUpdates] = useState<EventUpdate[]>([]);

  useEffect(() => {
    db.getEventUpdates(event.id).then(setUpdates);
  }, [event.id]);

  return (
    <div className="space-y-8 w-full">
      <div className="flex items-center space-x-3 mb-8">
        <Newspaper className="text-brand-600" size={32} />
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Event News & Updates</h1>
          <p className="text-slate-500 mt-1">Stay up to date with the latest changes and announcements.</p>
        </div>
      </div>

      {updates.length === 0 ? (
        <div className="p-8 border border-dashed rounded-xl text-center text-slate-500">
          No news updates yet.
        </div>
      ) : (
        <div className="space-y-6">
          {updates.map(u => (
            <Card key={u.id} className="p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-500"></div>
              <div className="flex justify-between items-start mb-2 pl-2">
                 <h4 className="font-bold text-slate-900 text-lg">{u.title}</h4>
                 <span className="text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    {new Date(u.createdAt).toLocaleDateString()}
                 </span>
              </div>
              <p className="text-slate-600 mt-2 pl-2 text-base leading-relaxed">{u.description}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
