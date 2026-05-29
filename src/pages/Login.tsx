import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/src/lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { auth, provider } from '@/src/lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { toast } from 'react-hot-toast';

export function Login() {
  const { user, persistedUser, login, confirmPersistedLogin, clearPersistedLogin } = useAuth();
  const navigate = useNavigate();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResumingSession, setIsResumingSession] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      const result = await signInWithPopup(auth, provider);
      if (result.user.email && result.user.displayName) {
        await login(result.user.email, result.user.displayName, result.user.photoURL || undefined);
      }
      setIsGoogleLoading(false);
    } catch (error: any) {
      console.error("Google login failed", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setIsGoogleLoading(false);
      } else {
        toast.error(error.message || "Authentication failed.");
        setIsGoogleLoading(false);
      }
    }
  };

  const handleContinueAs = () => {
    setIsResumingSession(true);
    setTimeout(() => {
      confirmPersistedLogin();
    }, 1500); 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] opacity-[0.03] pointer-events-none mix-blend-multiply"></div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="w-full max-w-md relative z-10">
          
        <AnimatePresence>
          {isResumingSession && persistedUser && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="absolute inset-0 z-20 bg-slate-50 p-8 flex flex-col justify-center items-center rounded-xl"
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

        <div className={`transition-opacity duration-300 ${isResumingSession ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex flex-col items-center text-center mb-8 relative">
            <h1 className="text-7xl font-bebas text-transparent bg-clip-text bg-gradient-to-br from-brand-500 to-brand-300 drop-shadow-[0_0_10px_rgba(201,255,0,0.5)]">ACCESS.</h1>
            <p className="text-slate-500 font-display uppercase tracking-widest mt-2 border-y border-slate-300 py-1 inline-block">AUTHENTICATE IDENTITY</p>
          </div>

          <div className="bg-slate-100 rounded-2xl p-8 mb-4 shadow-2xl relative overflow-hidden">
             <div className="flex flex-col items-center relative z-10">
                
                {persistedUser ? (
                  <div className="w-full flex flex-col gap-4">
                     <button
                        onClick={handleContinueAs}
                        className="w-full py-4 bg-brand-500 hover:bg-brand-400 text-black font-bebas text-2xl tracking-widest transition-colors flex items-center justify-center gap-4 group"
                      >
                        <img src={persistedUser.avatarUrl} alt={persistedUser.name} className="w-8 h-8 rounded-full border border-black grayscale group-hover:grayscale-0 transition-all" />
                        CONTINUE AS {persistedUser.name.split(' ')[0]}
                      </button>
                      <button 
                        onClick={clearPersistedLogin}
                        className="w-full py-3 border border-slate-400 text-slate-600 font-display uppercase tracking-wider text-sm hover:text-danger hover:border-danger transition-colors"
                      >
                        NOT YOU? CLEAR DEVICE
                      </button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <button 
                      disabled={isGoogleLoading} 
                      onClick={handleGoogleLogin} 
                      className="w-full py-4 bg-brand-500 hover:bg-brand-400 text-black font-bebas text-2xl tracking-widest transition-colors flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 group hover:scale-[1.02] shadow-[0_0_20px_rgba(201,255,0,0.2)]"
                    >
                      <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#000" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#000" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                      {isGoogleLoading ? 'CONNECTING...' : 'LOGIN VIA GOOGLE'}
                    </button>
                    
                    <div className="mt-8 text-center max-w-[200px] border-t border-slate-300 pt-4">
                       <Link to="/welcome" className="text-slate-500 font-display text-xs uppercase tracking-widest hover:text-brand-500 transition-colors">
                          &larr; BACK TO TERMINAL
                       </Link>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
