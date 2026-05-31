import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Event, ParticipationBadge, BadgeTemplate } from '@/src/types';
import { useAuth } from '@/src/lib/AuthContext';
import { db } from '@/src/lib/db';
import { Card, CardHeader, CardContent } from '@/src/components/ui/Card';
import { ShieldCheck, CalendarCheck, CheckCircle2, Plus } from 'lucide-react';
import { formatDate } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { Badge as UiBadge} from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { toast } from 'react-hot-toast';

export function Badge() {
  const { event } = useOutletContext<{ event: Event }>();
  const { user } = useAuth();
  
  const [badge, setBadge] = useState<ParticipationBadge | null>(null);
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const isCreator = event.creatorId === user?.id;

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isAddingMode, setIsAddingMode] = useState(false);

  useEffect(() => {
    if (user && !isCreator) {
      db.getEventBadge(event.id, user.id).then(b => setBadge(b || null));
    }
    if (isCreator) {
      loadTemplates();
    }
  }, [event.id, user, isCreator]);

  const loadTemplates = async () => {
    const tpls = await db.getBadgeTemplates(event.id);
    setTemplates(tpls);
  };

  const handleUpdateTemplate = async (templateId: string, name: string, description: string) => {
    await db.updateBadgeTemplate(templateId, name, description);
    loadTemplates();
  };

  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, templateId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 400; // smaller for badges

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/png'); 
        
        if (templateId) {
           const t = templates.find(x => x.id === templateId);
           if (t) {
             db.updateBadgeTemplate(templateId, t.name, t.description, dataUrl).then(loadTemplates);
           }
        } else {
           setNewImagePreview(dataUrl);
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (event.status === 'Ended' || event.status === 'Canceled') {
      toast.error("Event is closed. New badges cannot be added.");
      return;
    }
    if (newTitle && newDesc) {
      try {
        await db.addCustomBadgeTemplate(event.id, newTitle, newDesc, newImagePreview || '');
        setNewTitle('');
        setNewDesc('');
        setNewImagePreview(null);
        setIsAddingMode(false);
        loadTemplates();
        toast.success("Badge template created!");
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  if (isCreator) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
             <h1 className="text-3xl font-display font-bold text-slate-900">Configure Badges</h1>
             <p className="text-slate-500 mt-2">Set up what badges will be awarded when the event ends.</p>
          </div>
          {event.status !== 'Ended' && event.status !== 'Canceled' && (
            <Button onClick={() => setIsAddingMode(!isAddingMode)}>
              <Plus size={16} className="mr-2" />
              Add Custom Badge
            </Button>
          )}
        </div>

        {isAddingMode && (
           <Card className="p-6 bg-slate-50 border-brand-200 shadow-sm">
             <h3 className="font-bold text-lg mb-4">Create Custom Badge</h3>
             <form onSubmit={handleAddCustom} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Badge Title</label>
                 <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} required className="w-full rounded-lg border-slate-200 p-2 border" placeholder="e.g., Hidden Objective Completed"/>
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Description / Condition text</label>
                 <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} required className="w-full rounded-lg border-slate-200 p-2 border" placeholder="e.g., Discovered the secret easter egg"/>
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Badge Image</label>
                 <div className="flex items-center space-x-4">
                   {newImagePreview ? (
                      <img src={newImagePreview} className="w-16 h-16 object-contain" />
                   ) : (
                      <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center text-slate-400">
                         <ShieldCheck size={24} />
                      </div>
                   )}
                   <div>
                     <input type="file" accept="image/*" onChange={(e) => handleImageChange(e)} className="text-sm block" />
                     <span className="text-xs text-slate-500 mt-1 block">Optimal dimensions: 400x400 (square)</span>
                   </div>
                 </div>
               </div>
               <div className="flex gap-2">
                 <Button type="submit">Save Badge</Button>
                 <Button type="button" variant="ghost" onClick={() => setIsAddingMode(false)}>Cancel</Button>
               </div>
             </form>
           </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map(t => (
            <Card key={t.id} className="relative overflow-hidden">
               <div className="absolute right-0 top-0 w-24 h-24 bg-slate-50 rounded-bl-full z-0 pointer-events-none" />
               <CardContent className="p-6 relative z-10 space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <UiBadge variant={t.tier === 'Top 1' ? 'default' : t.tier === 'Top 2-5' ? 'secondary' : 'outline'}>{t.tier} Tier</UiBadge>
                  </div>
                  
                  <div className="flex space-x-4">
                    <div className="w-16 h-16 shrink-0 relative group">
                      {t.imageUrl ? (
                        <img src={t.imageUrl} alt="Badge" className="w-16 h-16 object-contain" />
                      ) : (
                        <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center text-slate-400">
                           <ShieldCheck size={24} />
                        </div>
                      )}
                      {event.status !== 'Ended' && (
                        <label className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded text-xs font-medium text-center hover:bg-black/60 active:scale-95">
                           Edit
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, t.id)} />
                        </label>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Badge Name</label>
                        <input 
                          type="text" 
                          defaultValue={t.name}
                          onBlur={(e) => handleUpdateTemplate(t.id, e.target.value, t.description)}
                          className="text-xl font-bold font-display w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none transition-colors"
                          readOnly={event.status === 'Ended'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                        <input 
                          type="text" 
                          defaultValue={t.description}
                          onBlur={(e) => handleUpdateTemplate(t.id, t.name, e.target.value)}
                          className="text-sm text-slate-600 w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none transition-colors"
                          readOnly={event.status === 'Ended'}
                        />
                      </div>
                    </div>
                  </div>
               </CardContent>
            </Card>
          ))}
        </div>
        {event.status === 'Ended' && (
          <p className="text-sm text-slate-500">Event is ended. Badges are locked and have been distributed.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 flex flex-col items-center max-w-2xl mx-auto pt-8">
      <div className="text-center w-full">
        <h1 className="text-3xl font-display font-bold text-slate-900">Participation Badge</h1>
        <p className="text-slate-500 mt-2">Your verified credential for this event.</p>
      </div>

      {!badge && event.status !== 'Ended' ? (
        <Card className="w-full text-center p-12 border border-dashed border-sky-300 bg-sky-50">
          <ShieldCheck size={48} className="mx-auto text-sky-400 mb-4" />
          <h3 className="text-lg font-bold text-sky-900">Wait until the event ends</h3>
          <p className="text-sky-700 mt-2">Participation badges are minted automatically when the creator marks the event as ended.</p>
        </Card>
      ) : !badge && event.status === 'Ended' ? (
        <Card className="w-full text-center p-12 border border-dashed border-slate-300">
          <ShieldCheck size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No badge found</h3>
          <p className="text-slate-500 mt-2">No badge was issued for you in this event.</p>
        </Card>
      ) : badge ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full">
          <Card className="w-full p-8 sm:p-12 text-center bg-gradient-to-b from-brand-900 to-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
               <ShieldCheck size={200} />
            </div>
            
            {badge.imageUrl ? (
              <img src={badge.imageUrl} alt={badge.badgeTitle} className="w-24 h-24 mx-auto mb-6 relative z-10" />
            ) : (
              <ShieldCheck size={64} className="mx-auto text-yellow-400 mb-6 relative z-10" />
            )}
            
            <div className="relative z-10">
              <span className="text-brand-300 text-sm font-semibold tracking-widest uppercase mb-2 block">Official Credential</span>
              <h2 className="text-4xl font-display font-bold mb-4">{badge.badgeTitle}</h2>
              <p className="text-slate-300 mb-8">{event.name}</p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-8 border-t border-slate-700/50">
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <CheckCircle2 size={16} className="text-green-400" />
                  <span>{badge.confirmationText}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <CalendarCheck size={16} />
                  <span>Issued: {formatDate(badge.issueDate)}</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ) : null}
    </div>
  );
}
