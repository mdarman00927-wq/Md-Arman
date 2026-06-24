import { Plus, Tag, MapPin, Flag, ChevronDown, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState } from 'react';
import { Task } from '../types';

interface QuickCreateWidgetProps {
  onSave: (task: Partial<Task>) => void;
}

export default function QuickCreateWidget({ onSave }: QuickCreateWidgetProps) {
  const [title, setTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [priority, setPriority] = useState<Task['priority']>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSave({
      title,
      priority,
      completed: false,
      category: 'General'
    });
    
    setTitle('');
    setIsExpanded(false);
  };

  return (
    <motion.div 
      layout
      className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-primary/10 p-2 rounded-xl text-brand-primary">
            <Plus size={20} />
          </div>
          <input
            type="text"
            placeholder="Add a quick task..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-800 placeholder:text-slate-300"
          />
          {isExpanded && (
            <button 
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-slate-300 hover:text-slate-500 transition-colors"
            >
              <ChevronDown size={20} />
            </button>
          )}
        </div>

        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-slate-50 space-y-4"
          >
            <div className="flex flex-wrap gap-2">
              <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-100 transition-colors">
                <Tag size={12} /> Tags
              </button>
              <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-100 transition-colors">
                <MapPin size={12} /> Location
              </button>
              <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-100 transition-colors">
                <Clock size={12} /> Time
              </button>
              <div className="flex-1" />
              <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
                {(['low', 'medium', 'high'] as const).map((p) => (
                   <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${
                      priority === p 
                        ? p === 'high' ? 'bg-rose-500 text-white shadow-sm' 
                        : p === 'medium' ? 'bg-orange-400 text-white shadow-sm'
                        : 'bg-emerald-500 text-white shadow-sm'
                        : 'text-slate-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            
            <button 
              type="submit"
              className="w-full bg-slate-900 text-white py-3 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-200 active:scale-[0.98] transition-all"
            >
              Save Task
            </button>
          </motion.div>
        )}
      </form>
    </motion.div>
  );
}
