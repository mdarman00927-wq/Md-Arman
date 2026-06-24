import { ChevronLeft, ChevronRight, Clock, Repeat } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Task } from '../types';

interface CalendarProps {
  tasks: Task[];
  onToggleTask?: (id: string) => void;
}

export default function Calendar({ tasks, onToggleTask }: CalendarProps) {
  const [selectedDate, setSelectedDate] = useState(9);
  
  const daysInMonth = 31;
  const startDay = 5; // Friday for May 2026
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="p-6 space-y-8 pb-24 relative">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">Calendar</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">May 2026</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2.5 glass hover:bg-white/80 dark:hover:bg-slate-900/80 border border-white/40 dark:border-slate-850/30 rounded-xl transition-all cursor-pointer">
            <ChevronLeft size={18} className="text-slate-600 dark:text-slate-350" />
          </button>
          <button className="p-2.5 glass hover:bg-white/80 dark:hover:bg-slate-900/80 border border-white/40 dark:border-slate-850/30 rounded-xl transition-all cursor-pointer">
            <ChevronRight size={18} className="text-slate-600 dark:text-slate-350" />
          </button>
        </div>
      </motion.div>

      {/* Calendar Grid */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-4 rounded-[2rem] border border-white/50 dark:border-slate-800/40 shadow-xs"
      >
        <div className="grid grid-cols-7 mb-4">
          {weekDays.map((day, index) => (
            <div key={`${day}-${index}`} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {/* Empty cells for start of month */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isSelected = selectedDate === day;
            const isToday = day === 9;
            
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(day)}
                className={`aspect-square relative flex items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                  isSelected 
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                    : isToday 
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30' 
                      : 'hover:bg-slate-100/40 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                {day}
                {!isSelected && (day === 12 || day === 15 || day === 22) && (
                  <div className="absolute bottom-2 w-1.5 h-1.5 bg-indigo-500/70 dark:bg-indigo-400/70 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Schedule */}
      <div className="space-y-4">
        <h2 className="font-display font-bold text-lg text-slate-850 dark:text-white px-1">
          {selectedDate === 9 ? "Today's Schedule" : `Schedule for May ${selectedDate}`}
        </h2>

        {selectedDate === 9 ? (
          <div className="space-y-4">
            {tasks.filter(t => t.dueTime).map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-4 group"
              >
                <div className="w-12 text-right pt-2">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{event.dueTime}</span>
                </div>
                <div className="flex-1 relative pb-5">
                  {/* Timeline rail */}
                  <div className="absolute left-0 top-6 bottom-0 w-px bg-slate-200 dark:bg-slate-800 pb-5" />
                  
                  <div 
                    onClick={() => onToggleTask?.(event.id)}
                    className={`bg-white/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-white/40 dark:border-slate-800/20 shadow-xs flex items-center gap-4 hover:border-indigo-400/40 dark:hover:border-indigo-500/30 transition-all duration-305 cursor-pointer ${
                      event.completed ? 'opacity-50 grayscale' : ''
                    }`}
                  >
                    <div className={`w-1 h-8 rounded-full ${
                      event.priority === 'high' ? 'bg-rose-500' : event.priority === 'medium' ? 'bg-orange-400' : 'bg-emerald-400'
                    }`} />
                    <div>
                      <h3 className={`font-bold text-sm text-slate-800 dark:text-slate-200 ${event.completed ? 'line-through text-slate-400 dark:text-text-500' : ''}`}>{event.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">{event.category}</span>
                        {event.recurrence && event.recurrence.interval !== 'none' && (
                          <span className="text-[8px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold uppercase tracking-wider">
                            <Repeat size={8} /> {event.recurrence.interval}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-3xl p-8 text-center border-dashed border-slate-200/50 dark:border-slate-800/40">
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">No events scheduled for this day.</p>
          </div>
        )}
      </div>
    </div>
  );
}
