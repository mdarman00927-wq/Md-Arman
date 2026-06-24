import { LayoutDashboard, Calendar as CalendarIcon, Compass, StickyNote, Settings, BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';
import { View } from '../types';

interface BottomNavProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export default function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'calendar', label: 'Planner', icon: CalendarIcon },
    { id: 'social', label: 'Social', icon: Compass },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'analytics', label: 'Stats', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg glass border-t border-white/40 dark:border-slate-800/20 rounded-t-[2.2rem] safe-bottom z-50 shadow-[0_-8px_32px_rgba(99,102,241,0.04)]">
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id || (tab.id === 'settings' && ['privacy', 'terms', 'about', 'contact', 'deletion'].includes(activeView));

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onViewChange(tab.id as View)}
              className={`flex flex-col items-center justify-center w-full h-full relative transition-[color,transform] duration-250 cursor-pointer active:scale-95 ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-550 dark:hover:text-slate-300'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon size={21} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div
                    layoutId="activeTabIcon"
                    className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  />
                )}
              </div>
              <span className={`text-[9px] font-extrabold mt-1.5 uppercase tracking-wider ${isActive ? 'opacity-100 font-black' : 'opacity-65'}`}>
                {tab.label}
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-x-2 inset-y-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl -z-10"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
