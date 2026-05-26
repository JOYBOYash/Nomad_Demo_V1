import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Event, Reward } from '@/src/types';
import { useAuth } from '@/src/lib/AuthContext';
import { db } from '@/src/lib/db';
import { Card, CardHeader, CardContent } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Users, Coins } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function Rewards() {
  const { event, hasJoined } = useOutletContext<{ event: Event, hasJoined: boolean }>();
  const { user } = useAuth();
  
  const [rewards, setRewards] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [sortBy, setSortBy] = useState<'latest' | 'most_claimed'>('latest');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCreator = event.creatorId === user?.id;

  useEffect(() => {
    loadRewardsAndBalance();
  }, [event.id, user, isCreator, hasJoined]);

  const loadRewardsAndBalance = async () => {
    if (user) {
      if (isCreator) {
        setRewards(await db.getCreatorRewards(event.id));
      } else {
        setRewards(await db.getRewards(event.id));
        if (hasJoined) {
          const w = await db.getWallet(event.id, user.id);
          setBalance(w.balance);
        }
      }
    }
  };

  const handleRedeem = async (rewardId: string) => {
    if (event.status === 'Ended' || event.status === 'Canceled') {
      toast.error("Event is closed. Rewards can no longer be redeemed.");
      return;
    }
    if (!hasJoined) {
       toast.error("You must join the event first.");
       return;
    }
    try {
      await db.redeemReward(event.id, rewardId, user!.id);
      loadRewardsAndBalance();
      toast.success("Reward Redeemed Successfuly!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sortedRewards = [...rewards].sort((a, b) => {
    if (sortBy === 'most_claimed' && isCreator) {
      return b.claimsCount - a.claimsCount;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // reasonable size for reward image
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
        setNewImagePreview(canvas.toDataURL('image/jpeg', 0.6));
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddReward = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (event.status === 'Ended' || event.status === 'Canceled') {
      toast.error("Event is closed. New rewards cannot be added.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const imageUrl = newImagePreview || `https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=400&q=80`;
    try {
      await db.addReward(
        event.id, user!.id,
        (formData.get('name') as string).trim(),
        (formData.get('description') as string).trim(),
        Number(formData.get('tokenCost')),
        Number(formData.get('inventory')),
        imageUrl
      );
      form.reset();
      setNewImagePreview(null);
      loadRewardsAndBalance();
      toast.success("Reward successfully created! A news update has been sent to participants.");
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
          <h1 className="text-3xl font-display font-bold text-slate-900">{isCreator ? 'Reward Analytics & Management' : 'Rewards'}</h1>
          <p className="text-slate-500 mt-2">{isCreator ? 'Manage rewards and track which ones are claimed the most.' : 'Spend your tokens on exclusive event rewards.'}</p>
        </div>
        {isCreator ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-500">Sort by:</span>
            <select className="bg-white border text-sm rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-brand-500" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="latest">Latest</option>
              <option value="most_claimed">Most Claimed</option>
            </select>
          </div>
        ) : (
          <div className="bg-slate-100 rounded-lg px-4 py-2 w-fit flex items-center">
            <span className="text-sm font-medium text-slate-600 mr-2">Your Balance:</span>
            <span className="font-bold text-brand-600">{balance} TKN</span>
          </div>
        )}
      </div>

      {isCreator && event.status !== 'Ended' && event.status !== 'Canceled' && (
        <Card className="p-6 bg-slate-50 border-brand-200">
          <h3 className="font-bold font-display text-lg mb-4">Add New Reward</h3>
          <form onSubmit={handleAddReward} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Reward Name</label>
              <input type="text" name="name" required className="w-full rounded-lg border-slate-200 p-2 border" placeholder="e.g., VIP T-Shirt"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea name="description" required className="w-full rounded-lg border-slate-200 p-2 border" rows={2} placeholder="Reward details..."></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Token Cost</label>
              <input type="number" name="tokenCost" min="1" required className="w-full rounded-lg border-slate-200 p-2 border" placeholder="e.g., 200"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inventory (Quantity)</label>
              <input type="number" name="inventory" min="1" required className="w-full rounded-lg border-slate-200 p-2 border" placeholder="e.g., 50"/>
            </div>
            <div className="md:col-span-2">
               <label className="block text-sm font-medium text-slate-700 mb-1">Reward Image</label>
               <div className="flex items-center space-x-4 mt-2">
                 {newImagePreview ? (
                    <img src={newImagePreview} className="w-32 h-20 object-cover rounded shadow-sm border border-slate-200" />
                 ) : (
                    <div className="w-32 h-20 bg-slate-200 rounded flex items-center justify-center text-slate-400 border border-dashed border-slate-300">
                       <span className="text-xs">No Image</span>
                    </div>
                 )}
                 <div>
                   <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm block" />
                   <span className="text-xs text-slate-500 mt-1 block">Optimal dimensions: 800x450 (16:9 ratio)</span>
                 </div>
               </div>
            </div>
            <div className="mt-2 md:col-span-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Reward'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {sortedRewards.length === 0 ? (
        <div className="p-8 border border-dashed rounded-xl text-center text-slate-500">No rewards available yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedRewards.map(r => {
            const canAfford = balance >= r.tokenCost;
            const hasInventory = r.inventory > 0;
            return (
              <Card key={r.id} className={`flex flex-col h-full ${!isCreator && !hasInventory && 'opacity-60 grayscale'}`}>
                {r.imageUrl && (
                  <div className="h-40 bg-slate-100 overflow-hidden shrink-0">
                    <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardHeader className="pb-3 border-b border-slate-100 shrink-0 flex flex-row items-center justify-between">
                   <div className="font-bold text-brand-600 font-display flex items-center gap-1">
                     <Badge variant="outline">{r.tokenCost} TKN</Badge>
                   </div>
                   <span className="text-xs font-medium text-slate-500">{r.inventory} left</span>
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex flex-col">
                  <h3 className="font-bold font-display text-lg mb-2">{r.name}</h3>
                  <p className="text-slate-600 text-sm flex-1">{r.description}</p>
                  <div className="mt-6 shrink-0">
                    {isCreator ? (
                      <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-slate-500 block mb-1 flex items-center"><Users size={12} className="mr-1"/> Claimed</span>
                          <span className="font-bold text-slate-900">{r.claimsCount} times</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block mb-1 flex items-center"><Coins size={12} className="mr-1"/> Spent</span>
                          <span className="font-bold text-brand-600">{r.totalTokensSpent} TKN</span>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        className="w-full" 
                        disabled={!hasJoined || !canAfford || !hasInventory}
                        onClick={() => handleRedeem(r.id)}
                      >
                        {!hasJoined ? 'Join Event to Redeem' : !hasInventory ? 'Sold Out' : !canAfford ? 'Insufficent Tokens' : 'Redeem'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
}
