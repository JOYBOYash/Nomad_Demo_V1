import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Event, TokenTransaction } from '@/src/types';
import { useAuth } from '@/src/lib/AuthContext';
import { db } from '@/src/lib/db';
import { Card, CardContent } from '@/src/components/ui/Card';
import { formatDate } from '@/src/lib/utils';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function Wallet() {
  const { event } = useOutletContext<{ event: Event }>();
  const { user } = useAuth();
  
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);

  useEffect(() => {
    if (user) {
      db.getWallet(event.id, user.id).then(w => {
        setBalance(w.balance);
        setTransactions(w.transactions);
      });
    }
  }, [event.id, user]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Wallet</h1>
        <p className="text-slate-500 mt-2">Manage your event tokens.</p>
      </div>

      <Card className="bg-brand-600 text-white border-none shadow-lg">
        <CardContent className="pt-6 text-center py-10">
          <p className="text-brand-100 font-medium mb-2">Available Balance</p>
          <div className="text-5xl font-display font-bold">{balance} TKN</div>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-xl font-bold font-display mb-4 text-slate-900">Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="p-8 border border-dashed rounded-xl text-center text-slate-500">No transactions yet.</div>
        ) : (
          <div className="space-y-3">
            {transactions.map(t => (
              <Card key={t.id} className="last:border-b-0 border-b-slate-100 shadow-none">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${t.type === 'Earned' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {t.type === 'Earned' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{t.reason}</p>
                      <p className="text-xs text-slate-500">{formatDate(t.createdAt)}</p>
                    </div>
                  </div>
                  <div className={`font-bold font-display ${t.type === 'Earned' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'Earned' ? '+' : '-'}{t.amount}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
