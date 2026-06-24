import { Play, Pause, RotateCcw, Timer, Zap, Coffee, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../services/NotificationContext';

type TimerMode = 'focus' | 'short-break' | 'long-break';

const MODES: Record<TimerMode, { label: string; duration: number; icon: any; color: string }> = {
  'focus': { label: 'Focus', duration: 25 * 60, icon: Target, color: 'bg-brand-primary' },
  'short-break': { label: 'Short Break', duration: 5 * 60, icon: Coffee, color: 'bg-emerald-500' },
  'long-break': { label: 'Long Break', duration: 15 * 60, icon: Zap, color: 'bg-amber-500' },
};

export default function FocusTimer() {
  const { triggerFocusComplete } = useNotification();
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES['focus'].duration);
  const [isActive, setIsActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      handleTimerComplete();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
    
    if (mode === 'focus') {
      setSessionCount(prev => prev + 1);
    }
    
    triggerFocusComplete(mode);
    
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODES[mode].duration);
  };

  const changeMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(MODES[newMode].duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / MODES[mode].duration) * 100;
  const strokeDashoffset = 440 - (440 * progress) / 100;

  return (
    <div className="p-6 space-y-8 pb-24 min-h-screen flex flex-col">
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 backdrop-blur-md"
          >
            <div className="bg-brand-primary p-1.5 rounded-lg">
              <Zap size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold font-display uppercase tracking-wider">Time's up!</span>
              <span className="text-[10px] text-slate-400 font-medium">{mode === 'focus' ? 'Great session!' : 'Break over!'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">Focus</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Be present, be productive.</p>
      </motion.div>

      {/* Mode Selector */}
      <div className="flex gap-2 p-1.5 glass border-white/40 dark:border-slate-800/20 rounded-[2rem] shadow-xs">
        {(Object.keys(MODES) as TimerMode[]).map((m) => {
          const Icon = MODES[m].icon;
          const isSelected = mode === m;
          return (
            <button
              key={m}
              onClick={() => changeMode(m)}
              className={`flex-1 py-3 rounded-[1.5rem] flex flex-col items-center gap-1.5 transition-all duration-300 cursor-pointer ${
                isSelected 
                  ? `${MODES[m].color} text-white shadow-md shadow-indigo-500/10` 
                  : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 hover:bg-slate-100/40 dark:hover:bg-slate-800/40'
              }`}
            >
              <Icon size={17} />
              <span className="text-[9.5px] font-extrabold uppercase tracking-widest">{MODES[m].label}</span>
            </button>
          );
        })}
      </div>

      {/* Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center py-6">
        <div className="relative w-72 h-72 flex items-center justify-center">
          {/* Progress Circle Wrapper */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="144"
              cy="144"
              r="120"
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              className="text-slate-100 dark:text-slate-900/60"
            />
            <motion.circle
              cx="144"
              cy="144"
              r="120"
              stroke="currentColor"
              strokeWidth="9"
              strokeDasharray="753.98" // 2 * pi * 120
              animate={{ strokeDashoffset: (timeLeft / MODES[mode].duration) * 753.98 }}
              strokeLinecap="round"
              fill="transparent"
              className={mode === 'focus' ? 'text-indigo-600 dark:text-indigo-400' : mode === 'short-break' ? 'text-emerald-500' : 'text-amber-500'}
            />
          </svg>

          {/* Time Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <motion.span 
              key={timeLeft}
              initial={{ scale: 0.95, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-display font-black text-slate-900 dark:text-white tracking-widest"
            >
              {formatTime(timeLeft)}
            </motion.span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-2">
              {isActive ? 'Keep going' : 'Ready?'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-8 mt-10">
          <button 
            type="button"
            onClick={resetTimer}
            className="p-4 bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800 rounded-full text-slate-400 dark:text-slate-500 shadow-xs hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer active:scale-90"
          >
            <RotateCcw size={22} />
          </button>
          
          <button 
            type="button"
            onClick={toggleTimer}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-90 cursor-pointer ${
              isActive ? 'bg-slate-900 dark:bg-slate-800 shadow-slate-200 dark:shadow-none' : `${MODES[mode].color} shadow-indigo-550/20`
            }`}
          >
            {isActive ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
          </button>

          <button 
            type="button"
            className="p-4 bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800 rounded-full text-slate-400 dark:text-slate-500 shadow-xs hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer active:scale-90"
          >
            <Timer size={22} />
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="glass-card p-4 flex items-center justify-between border-white/40 dark:border-slate-800/10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 dark:bg-indigo-950/50 p-2 rounded-xl text-indigo-650 dark:text-indigo-400">
            <Target size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Sessions Today</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{sessionCount} tasks focused</div>
          </div>
        </div>
        <div className="h-8 w-px bg-slate-150 dark:bg-slate-850" />
        <div className="text-right">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Rank</div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-widest">Achiever</div>
        </div>
      </div>
    </div>
  );
}
