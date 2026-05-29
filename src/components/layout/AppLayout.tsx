import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { motion, AnimatePresence } from 'motion/react';

export function AppLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden font-sans">
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] opacity-[0.03] pointer-events-none mix-blend-multiply z-0"></div>

      <div className="relative z-10 w-full flex-1 flex flex-col">
        <Navbar />
        <AnimatePresence mode="wait">
          <motion.main 
            key={location.pathname.split('/')[1] || 'home'}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 w-full px-4 sm:px-6 lg:px-8 pt-28 pb-12 mx-auto max-w-7xl"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
