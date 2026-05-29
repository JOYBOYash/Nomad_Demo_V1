import { useEffect, useState, FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Event, Mission } from '@/src/types';
import { useAuth } from '@/src/lib/AuthContext';
import { db } from '@/src/lib/db';
import { Card, CardHeader, CardContent } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Coins, X, QrCode, Target } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function Missions() {
  const { event, hasJoined, setHasJoined, isBanned } = useOutletContext<{ event: Event, hasJoined: boolean, setHasJoined: any, isBanned: boolean }>();
  const { user } = useAuth();
  
  const [missions, setMissions] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'latest' | 'most_completed'>('latest');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanningMissionId, setScanningMissionId] = useState<string | null>(null);
  const [qrModalMission, setQrModalMission] = useState<any | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(false);

  const isCreator = event.creatorId === user?.id;

  useEffect(() => {
    loadMissions();
  }, [event.id, user, isCreator]);

  const loadMissions = async () => {
    if (user) {
      if (isCreator) {
        const dbMissions = await db.getCreatorMissions(event.id);
        setMissions(dbMissions);
      } else {
        const dbMissions = await db.getMissions(event.id, user.id);
        setMissions(dbMissions as any);
      }
    }
  };

  const startScanning = (missionId: string) => {
    if (event.status === 'Ended' || event.status === 'Canceled') {
      toast.error("Event is over. Missions can no longer be completed.");
      return;
    }
    if (!hasJoined) {
       toast.error("You must join the event first to complete missions.");
       return;
    }
    setScanningMissionId(missionId);
    setIsScanningActive(true);
  };

  const handleScanResult = async (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes.length > 0 && isScanningActive) {
      setIsScanningActive(false); // Stop scanning immediately to prevent multiple scans
      const text = detectedCodes[0].rawValue;
      if (text === `MISSION_COMPLETION:${event.id}:${scanningMissionId}`) {
        const mId = scanningMissionId;
        setScanningMissionId(null);
        try {
          await db.completeMission(event.id, mId!, user!.id);
          loadMissions();
          toast.success("Mission completed successfully!");
        } catch (e: any) {
          toast.error(e.message);
        }
      } else {
        toast.error("Invalid QR Code for this mission.");
        setScanningMissionId(null);
      }
    }
  };

  const sortedMissions = [...missions].sort((a, b) => {
    if (sortBy === 'most_completed' && isCreator) {
      return b.completionsCount - a.completionsCount;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleAddMission = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (event.status === 'Ended' || event.status === 'Canceled') {
      toast.error("Event is over. New missions cannot be added.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      await db.addMission(
        event.id, user!.id,
        (formData.get('title') as string).trim(),
        (formData.get('description') as string).trim(),
        Number(formData.get('tokenReward')),
        true
      );
      form.reset();
      loadMissions();
      toast.success("Mission successfully saved! A news update has been sent to participants.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">{isCreator ? 'Mission Performance' : 'Missions'}</h1>
          <p className="text-slate-500 mt-2">{isCreator ? 'Manage and track how users are engaging with missions.' : 'Complete tasks to earn tokens for this event.'}</p>
        </div>
        {isCreator && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-500">Sort by:</span>
            <select className="bg-white border text-sm rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-brand-500" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="latest">Latest Created</option>
              <option value="most_completed">Most Completed</option>
            </select>
          </div>
        )}
      </div>

      {isCreator && event.status !== 'Ended' && event.status !== 'Canceled' && (
        <Card className="p-6 bg-slate-50 border-brand-200">
          <h3 className="font-bold font-display text-lg mb-4">Add New Mission</h3>
          <form onSubmit={handleAddMission} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Mission Title</label>
              <input type="text" name="title" required className="w-full rounded-lg border-slate-200 p-2 border" placeholder="e.g., Follow us on Twitter"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea name="description" required className="w-full rounded-lg border-slate-200 p-2 border" rows={2} placeholder="Instructions..."></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Token Reward</label>
              <input type="number" name="tokenReward" min="1" required className="w-full rounded-lg border-slate-200 p-2 border" placeholder="e.g., 50"/>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Mission'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {(event.status === 'Ended' || event.status === 'Canceled') && !isCreator && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
          This event has {event.status.toLowerCase()}. Missions are locked.
        </div>
      )}

      {sortedMissions.length === 0 ? (
        <div className="p-8 border border-dashed rounded-xl text-center text-slate-500">No missions available yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedMissions.map(m => (
            <Card key={m.id} className="flex flex-col h-full">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                {isCreator ? (
                   <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mission</span>
                ) : (
                   <Badge variant={m.status === 'Completed' ? 'success' : 'default'}>{m.status}</Badge>
                )}
                <div className="font-bold text-brand-600 font-display">+{m.tokenReward} TKN</div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <h3 className="font-bold font-display text-lg mb-2">{m.title}</h3>
                <p className="text-slate-600 text-sm flex-1">{m.description}</p>
                <div className="mt-6">
                  {isCreator ? (
                    <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-slate-500 block mb-1 flex items-center"><Users size={12} className="mr-1"/> Completed</span>
                          <span className="font-bold text-slate-900">{m.completionsCount}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block mb-1 flex items-center"><Coins size={12} className="mr-1"/> Issued</span>
                          <span className="font-bold text-brand-600">{m.totalTokensEarned} TKN</span>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => setQrModalMission(m)}>
                        <QrCode className="mr-2" size={16} /> View QR Code
                      </Button>
                    </div>
                  ) : m.status === 'Completed' ? (
                    <Button variant="outline" className="w-full text-green-700 bg-green-50 border-green-200 cursor-default" disabled>Completed</Button>
                  ) : (
                    <Button 
                      className={`w-full ${isBanned ? 'bg-danger/10 text-danger border border-danger hover:bg-danger/20 hover:text-danger hover:border-danger hover:cursor-not-allowed' : ''}`} 
                      onClick={() => {
                        if (!isBanned) startScanning(m.id);
                      }}
                      disabled={event.status === 'Ended' || m.status === 'Completed' || isBanned}
                    >
                      <QrCode className="mr-2" size={16} />
                      {isBanned ? 'Banned from Event' : hasJoined ? 'Scan QR to Complete' : 'Join Event to Complete'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {qrModalMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="max-w-sm w-full relative">
            <button 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
              onClick={() => setQrModalMission(null)}
            >
              <X size={24} />
            </button>
            <CardHeader className="text-center pb-2">
              <h2 className="text-xl font-display font-bold">Mission QR Code</h2>
              <p className="text-sm text-slate-500">Show this to participants to let them complete "{qrModalMission.title}"</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center p-8 pt-4">
              <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm inline-block">
                <QRCodeSVG 
                  value={`MISSION_COMPLETION:${event.id}:${qrModalMission.id}`} 
                  size={200}
                  level="Q"
                />
              </div>
              <div className="mt-6 flex items-center text-sm font-medium text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                <Target size={16} className="text-brand-500 mr-2" />
                Reward: {qrModalMission.tokenReward} TKN
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {scanningMissionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <div className="max-w-md w-full relative">
            <button 
              className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors bg-white/10 rounded-full p-2"
              onClick={() => {
                setScanningMissionId(null);
                setIsScanningActive(false);
              }}
            >
              <X size={24} />
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-display font-bold text-white">Scan QR Code</h2>
              <p className="text-white/70 mt-2">Scan the mission QR code to mark it as completed.</p>
            </div>
            <div className="bg-black rounded-2xl overflow-hidden border border-white/20 aspect-square flex items-center justify-center">
              <Scanner 
                onScan={handleScanResult} 
                formats={['qr_code']}
                components={{
                   audio: false,
                   zoom: false,
                }}
                styles={{
                   container: { width: '100%', height: '100%', aspectRatio: '1/1' },
                   video: { objectFit: 'cover' }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
