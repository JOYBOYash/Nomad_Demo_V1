import { useState, useEffect, FormEvent } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Event } from '@/src/types';
import { useAuth } from '@/src/lib/AuthContext';
import { db } from '@/src/lib/db';
import { Card, CardHeader, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { toast } from 'react-hot-toast';

export function Manage() {
  const { event, reloadEvent } = useOutletContext<{ event: Event, reloadEvent: () => void }>();
  const { user } = useAuth();
  
  const [status, setStatus] = useState(event.status);
  const [participants, setParticipants] = useState<any[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ type: 'status' | 'ban', payload: any, message: string } | null>(null);

  if (event.creatorId !== user?.id) {
    return <div className="text-red-500">Unauthorized</div>;
  }

  const loadData = async () => {
    const p = await db.getEventParticipantsWithDetails(event.id);
    setParticipants(p);
    const b = await db.getBannedUsers(event.id);
    setBannedUsers(b);
  };

  useEffect(() => {
    setStatus(event.status);
    loadData();
  }, [event.id, event.status]);

  const requestStatusChange = (newStatus: 'Draft' | 'Upcoming' | 'Live' | 'Ended' | 'Canceled') => {
    if (status === 'Ended' || status === 'Canceled') {
      toast.error("Event has ended or is canceled. Status cannot be changed.");
      return;
    }
    setConfirmAction({
      type: 'status',
      payload: newStatus,
      message: `Are you sure you want to change the status to ${newStatus}? ${newStatus === 'Ended' || newStatus === 'Canceled' ? 'This action is irreversible.' : ''}`
    });
  };

  const executeStatusChange = async (newStatus: any) => {
    try {
      const updated = await db.setEventStatus(event.id, newStatus, user!.id);
      setStatus(updated.status);
      toast.success(`Event status successfully updated to ${updated.status}.`);
      reloadEvent();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const requestBan = (userId: string, userName: string) => {
    setConfirmAction({
      type: 'ban',
      payload: { userId, userName },
      message: `Are you sure you want to kick and ban ${userName}? They will no longer be able to access the event.`
    });
  };

  const executeBan = async ({ userId, userName }: any) => {
    try {
      const reason = "Violation of event rules";
      await db.banUser(event.id, userId, reason);
      toast.success(`User ${userName} has been banned.`);
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'status') executeStatusChange(confirmAction.payload);
    if (confirmAction.type === 'ban') executeBan(confirmAction.payload);
    setConfirmAction(null);
  };

  return (
    <div className="space-y-10">
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Action</h3>
            <p className="text-slate-600 mb-6">{confirmAction.message}</p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button onClick={handleConfirm} className={confirmAction.type === 'status' && (confirmAction.payload === 'Ended' || confirmAction.payload === 'Canceled') ? 'bg-red-600 hover:bg-red-700 text-white' : ''}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Manage Event</h1>
        <p className="text-slate-500 mt-2">Control event status and manage participants.</p>
      </div>

      <section>
        <h2 className="text-xl font-bold font-display mb-4 text-slate-900">Event Status</h2>
        <Card>
          <CardContent className="pt-6 flex flex-wrap gap-3 items-center">
            <Button variant={status === 'Draft' ? 'primary' : 'outline'} onClick={() => requestStatusChange('Draft')} disabled={status === 'Ended' || status === 'Canceled'}>Draft</Button>
            <Button variant={status === 'Upcoming' ? 'primary' : 'outline'} onClick={() => requestStatusChange('Upcoming')} disabled={status === 'Ended' || status === 'Canceled'}>Upcoming</Button>
            <Button variant={status === 'Live' ? 'primary' : 'outline'} className={status === 'Live' ? 'bg-green-600 hover:bg-green-700 text-white' : ''} onClick={() => requestStatusChange('Live')} disabled={status === 'Ended' || status === 'Canceled'}>Live</Button>
            <Button variant={status === 'Ended' ? 'primary' : 'outline'} onClick={() => requestStatusChange('Ended')} disabled={status === 'Ended' || status === 'Canceled'}>End Event</Button>
            <Button variant={status === 'Canceled' ? 'primary' : 'outline'} onClick={() => requestStatusChange('Canceled')} className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" disabled={status === 'Canceled' || status === 'Ended'}>Cancel Event</Button>
            <div className="ml-auto text-sm text-slate-500 w-full sm:w-auto mt-4 sm:mt-0">
              Current: <strong className="text-slate-900">{status}</strong>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-bold font-display mb-4 text-slate-900">Participants</h2>
        <Card className="overflow-hidden">
          {participants.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No participants yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {participants.map(p => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center space-x-3">
                     <img src={p.user?.avatarUrl} alt={p.user?.name} className="w-8 h-8 rounded-full bg-slate-200" />
                     <div>
                       <div className="font-medium text-slate-900">{p.user?.name}</div>
                       <div className="text-xs text-slate-500">{p.user?.email}</div>
                     </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => requestBan(p.userId, p.user?.name)} className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" disabled={status === 'Ended' || status === 'Canceled'}>
                    Kick / Ban
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {bannedUsers.length > 0 && (
        <section>
          <h2 className="text-xl font-bold font-display mb-4 text-slate-900">Banned Users</h2>
          <Card className="overflow-hidden bg-red-50/30">
            <div className="divide-y divide-red-100 max-h-96 overflow-y-auto">
              {bannedUsers.map(b => (
                <div key={b.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                     <img src={b.user?.avatarUrl} alt={b.user?.name} className="w-8 h-8 rounded-full bg-slate-200 opacity-50 grayscale" />
                     <div>
                       <div className="font-medium text-slate-900 line-through text-slate-500">{b.user?.name}</div>
                       <div className="text-xs text-red-600 font-medium">Reason: {b.reason}</div>
                     </div>
                  </div>
                  <Badge variant="destructive">Banned</Badge>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
