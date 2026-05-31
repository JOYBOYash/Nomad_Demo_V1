import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/src/components/ui/Button';
import { useAuth } from '@/src/lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

export function Landing() {
  const { user, persistedUser, confirmPersistedLogin } = useAuth();
  const [isResumingSession, setIsResumingSession] = useState(false);
  
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleContinueAs = () => {
    setIsResumingSession(true);
    setTimeout(() => {
      confirmPersistedLogin();
    }, 1500);
  };
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] opacity-[0.03] pointer-events-none mix-blend-multiply"></div>

      <AnimatePresence>
        {isResumingSession && persistedUser && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="fixed inset-0 z-50 bg-slate-50 p-8 flex flex-col justify-center items-center"
          >
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-brand-500 rounded-full animate-ping opacity-30"></div>
              <img src={persistedUser.avatarUrl} alt={persistedUser.name} className="w-24 h-24 rounded-full object-cover border-4 border-brand-500" />
            </div>
            <h2 className="text-3xl font-bebas text-slate-900 tracking-wider">LOGGING IN AS {persistedUser.name.toUpperCase()}</h2>
            <div className="w-64 h-2 bg-slate-100 mt-6 overflow-hidden">
              <motion.div 
                 initial={{ width: 0 }} 
                 animate={{ width: '100%' }} 
                 transition={{ duration: 1.5, ease: "circOut" }} 
                 className="h-full bg-brand-500 shadow-[0_0_15px_rgba(201,255,0,0.8)]" 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`z-10 text-center max-w-2xl mx-auto flex flex-col items-center transition-opacity duration-300 ${isResumingSession ? 'opacity-0' : 'opacity-100'}`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6 relative"
        >
           <h1 className="text-8xl md:text-[10rem] leading-none font-bebas text-transparent bg-clip-text bg-gradient-to-br from-brand-500 to-brand-300 drop-shadow-[0_0_20px_rgba(201,255,0,0.5)]">NOMAD</h1>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl md:text-7xl font-display font-black text-white mix-blend-difference whitespace-nowrap opacity-90">EVENTS.</div>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-700 mb-12 max-w-md mx-auto uppercase tracking-widest font-semibold border-y border-slate-300 py-3"
        >
          CREATE STUNNING EVENTS.
          <br/>
          MANAGE PARTICIPANTS.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full flex justify-center"
        >
          {persistedUser ? (
            <div className="w-full max-w-md bg-slate-100 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col gap-3 h-full relative z-10">
                <button 
                   onClick={handleContinueAs}
                   className="w-full py-4 bg-brand-500 hover:bg-brand-400 text-black font-bebas text-2xl tracking-widest transition-all cursor-pointer hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(201,255,0,0.3)] flex items-center justify-center gap-4 group rounded-xl"
                >
                  <img src={persistedUser.avatarUrl} alt={persistedUser.name} className="w-8 h-8 rounded-full border border-black grayscale group-hover:grayscale-0 transition-all" />
                  CONTINUE AS {persistedUser.name.split(' ')[0]}
                </button>
                <div className="text-center text-sm font-display tracking-widest text-slate-500 uppercase mt-2">
                   OR <Link to="/login" className="text-danger hover:text-red-400 border-b border-danger pb-0.5 ml-1 transition-colors">SWITCH ACCOUNT</Link>
                </div>
              </div>
            </div>
          ) : (
            <Link to="/login" className="w-full max-w-xs">
              <div className="bg-brand-500 rounded-xl text-black py-5 uppercase font-bebas text-2xl tracking-widest hover:scale-[1.02] active:scale-95 hover:bg-brand-400 transition-all cursor-pointer shadow-[0_0_20px_rgba(201,255,0,0.3)] text-center relative overflow-hidden">
                 ENTER STUDIO
              </div>
            </Link>
          )}
        </motion.div>
      </div>
    </div>
  );
}
