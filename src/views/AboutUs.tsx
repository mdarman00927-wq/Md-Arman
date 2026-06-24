import React from 'react';
import { motion } from 'motion/react';
import { Info, ArrowLeft, Target, Award, Heart, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';
import { View } from '../types';

interface AboutUsProps {
  onNavigate: (view: View) => void;
}

export default function AboutUs({ onNavigate }: AboutUsProps) {
  return (
    <div className="p-6 space-y-6 pb-24 relative">
      {/* Upper Navigation Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="p-2.5 glass hover:bg-white/80 dark:hover:bg-slate-900/80 border border-white/40 dark:border-slate-850/30 rounded-xl transition-all cursor-pointer text-slate-600 dark:text-slate-350 active:scale-95 flex items-center justify-center"
          title="Back to Settings"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] font-display">Who We Are</span>
          <h1 className="text-2xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">About Us</h1>
        </div>
      </div>

      {/* Hero Header Presentation container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-6 border border-white/45 dark:border-slate-800/35 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-[2rem] text-left relative overflow-hidden shadow-xl"
      >
        <div className="absolute right-0 bottom-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative space-y-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-indigo-400 shadow-md">
            <Sparkles size={18} className="animate-spin-slow text-indigo-300" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight font-display">NexTask Organizer</h2>
            <p className="text-[9.5px] font-extrabold uppercase tracking-widest text-indigo-300">Modern Digital Hub. Built Beautifully.</p>
          </div>
          <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
            NexTask Organizer is a cutting-edge Progressive Web Application crafted to harmonize schedules, organize daily reminders, stream analytical insights, and persist secure personal thoughts. We remove clutter from task management, bringing visual beauty and ultimate focus home.
          </p>
        </div>
      </motion.div>

      {/* Pillars of NexTask */}
      <div className="space-y-4 text-left">
        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
          <Target size={12} /> Core Pillars
        </h3>

        <div className="grid grid-cols-1 gap-3.5">
          {/* Pillar 1 */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass p-4.5 rounded-3xl border border-white/40 dark:border-slate-800/25 flex gap-4"
          >
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 flex-shrink-0 h-11 w-11 flex items-center justify-center">
              <Award size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Aesthetic Distinction</h4>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-404 font-medium leading-relaxed">
                We believe software should elevate your digital environment. NexTask is designed around luxurious glassmorphism layering, rich negative space, and smooth physics-driven motion curves.
              </p>
            </div>
          </motion.div>

          {/* Pillar 2 */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="glass p-4.5 rounded-3xl border border-white/40 dark:border-slate-800/25 flex gap-4"
          >
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400 flex-shrink-0 h-11 w-11 flex items-center justify-center">
              <Smartphone size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Offline-First Reliability</h4>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-404 font-medium leading-relaxed">
                Never let dropping signals impede your concentration. Service workers build automatic local cache nodes so you can access, manipulate, edit, and export everything even when completely disconnected.
              </p>
            </div>
          </motion.div>

          {/* Pillar 3 */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass p-4.5 rounded-3xl border border-white/40 dark:border-slate-800/25 flex gap-4"
          >
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 flex-shrink-0 h-11 w-11 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Encryption & Privacy First</h4>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-404 font-medium leading-relaxed">
                We operate on an ethical metadata footprint. Security PIN code locks, storage diagnostic monitors, and direct Google Firebase database authentications guarantee that your life stays your business.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Crafted with love footer signature */}
      <div className="glass-card p-5 border border-white/40 dark:border-slate-805 text-center flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
          <Heart size={14} className="animate-pulseFill" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Designed & Crafted by NexTask Team</span>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
          Inspired by Swiss minimalism, high-reliability engineering, and the clean aesthetics of beautiful typography. Thank you for making us your daily task companion.
        </p>
      </div>

      {/* Navigate back */}
      <button
        onClick={() => onNavigate('settings')}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-650 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-indigo-600/10"
      >
        Go Back To Settings
      </button>
    </div>
  );
}
