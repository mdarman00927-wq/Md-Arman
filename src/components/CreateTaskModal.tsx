import { X, Tag, Folder, Flag, Calendar as CalendarIcon, Clock, Plus, MapPin, Repeat, ListTodo, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { Task, RepeatInterval, SubTask } from '../types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
}

export default function CreateTaskModal({ isOpen, onClose, onSave }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [category, setCategory] = useState('Personal');
  const [folder, setFolder] = useState('Inbox');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  
  // Subtask States
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');

  // Recurrence States
  const [repeatInterval, setRepeatInterval] = useState<RepeatInterval>('none');
  const [customInterval, setCustomInterval] = useState(1);
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks' | 'months'>('days');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [endMode, setEndMode] = useState<'never' | 'date' | 'count'>('never');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState(1);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleToggleDay = (day: number) => {
    setDaysOfWeek(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleAddSubtask = () => {
    if (subtaskInput.trim()) {
      setSubtasks([...subtasks, {
        id: Math.random().toString(36).substr(2, 9),
        title: subtaskInput.trim(),
        completed: false
      }]);
      setSubtaskInput('');
    }
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(st => st.id === id ? { ...st, completed: !st.completed } : st));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const recurrence = repeatInterval !== 'none' ? {
      interval: repeatInterval,
      customInterval: repeatInterval === 'custom' ? customInterval : undefined,
      customUnit: repeatInterval === 'custom' ? customUnit : undefined,
      daysOfWeek: (repeatInterval === 'weekly' || (repeatInterval === 'custom' && customUnit === 'weeks')) && daysOfWeek.length > 0 ? daysOfWeek : undefined,
      endDate: endMode === 'date' && recurrenceEndDate ? recurrenceEndDate : undefined,
      count: endMode === 'count' ? recurrenceCount : undefined,
    } : undefined;

    onSave({
      title,
      details,
      priority,
      category,
      folder,
      tags,
      completed: false,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      recurrence,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
    });
    
    // Reset form
    setTitle('');
    setDetails('');
    setPriority('medium');
    setCategory('Personal');
    setFolder('Inbox');
    setTags([]);
    setDueDate('');
    setDueTime('');
    setRepeatInterval('none');
    setCustomInterval(1);
    setCustomUnit('days');
    setDaysOfWeek([]);
    setEndMode('never');
    setRecurrenceEndDate('');
    setRecurrenceCount(1);
    setSubtasks([]);
    setSubtaskInput('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 top-12 bg-white rounded-t-[2.5rem] z-[70] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-slate-100">
              <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
              <h2 className="text-lg font-bold font-display text-slate-900">New Task</h2>
              <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
              {/* Title Section */}
              <div className="space-y-4">
                <input
                  autoFocus
                  type="text"
                  placeholder="What needs to be done?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-2xl font-bold font-display text-slate-900 placeholder:text-slate-300 focus:outline-none"
                />
                <textarea
                  placeholder="Add additional details..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full text-slate-600 placeholder:text-slate-300 focus:outline-none resize-none min-h-[100px] text-sm leading-relaxed"
                />
              </div>

              {/* Advanced Options Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <Flag size={12} /> Priority
                  </label>
                  <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                    {(['low', 'medium', 'high'] as Task['priority'][]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${
                          priority === p 
                            ? p === 'high' ? 'bg-rose-500 text-white shadow-md shadow-rose-200' 
                            : p === 'medium' ? 'bg-orange-400 text-white shadow-md shadow-orange-200'
                            : 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <Folder size={12} /> Folder
                  </label>
                  <select 
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-2.5 text-xs font-semibold text-slate-700 focus:ring-0 appearance-none"
                  >
                    <option>Inbox</option>
                    <option>Work</option>
                    <option>Personal</option>
                    <option>Shopping</option>
                    <option>Create New +</option>
                  </select>
                </div>
              </div>

              {/* Tags & Location Section */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <Tag size={12} /> Tags
                  </label>
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-1">
                    {tags.map((tag) => (
                      <motion.span
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={tag}
                        className="bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase py-1.5 px-3 rounded-full flex items-center gap-2 group"
                      >
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-rose-500">
                          <X size={10} />
                        </button>
                      </motion.span>
                    ))}
                    <div className="flex-1 min-w-[60px]">
                      <input
                        type="text"
                        placeholder="Add tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        className="w-full text-xs font-medium text-slate-600 focus:outline-none placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <MapPin size={12} /> Location
                  </label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="text"
                      placeholder="Add place..."
                      className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-9 pr-4 text-xs font-semibold text-slate-700 focus:ring-0"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Category Side by Side */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <CalendarIcon size={12} /> Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-3 text-xs font-semibold text-slate-600 focus:ring-1 focus:ring-indigo-200 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={12} /> Time
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-3 text-xs font-semibold text-slate-600 focus:ring-1 focus:ring-indigo-200 outline-none"
                  />
                </div>
              </div>

              {/* Subtasks Section */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-2">
                  <ListTodo size={14} className="text-brand-primary" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">Subtasks</span>
                </div>

                {/* Subtask additions list */}
                {subtasks.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {subtasks.map((st) => (
                      <div 
                        key={st.id} 
                        className="flex items-center justify-between bg-slate-50/70 border border-slate-100/50 p-2.5 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleSubtask(st.id)}
                            className="text-slate-400 hover:text-brand-primary transition-colors cursor-pointer shrink-0"
                          >
                            <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center ${
                              st.completed 
                                ? 'bg-brand-primary border-brand-primary text-white' 
                                : 'border-slate-300 bg-white'
                            }`}>
                              {st.completed && <span className="text-[10px] font-bold">✓</span>}
                            </div>
                          </button>
                          <span className={`text-slate-700 truncate font-semibold ${st.completed ? 'line-through text-slate-400' : ''}`}>
                            {st.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(st.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtask Input field */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Add subtask title..."
                      value={subtaskInput}
                      onChange={(e) => setSubtaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubtask();
                        }
                      }}
                      className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-100 placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="bg-brand-primary/10 text-brand-primary px-4 rounded-2xl flex items-center justify-center font-bold text-xs uppercase tracking-wider hover:bg-brand-primary hover:text-white transition-all active:scale-[0.97]"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Recurrence Section */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-2">
                  <Repeat size={14} className="text-brand-primary" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">Recurrence Schedule</span>
                </div>
                
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    Repeat
                  </label>
                  <select 
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(e.target.value as RepeatInterval)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-3 text-xs font-semibold text-slate-700 focus:ring-0 appearance-none"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily (Every day)</option>
                    <option value="weekly">Weekly (Every week)</option>
                    <option value="monthly">Monthly (Every month)</option>
                    <option value="custom">Custom repeat...</option>
                  </select>
                </div>

                {/* Conditional Weekly Days multi-select */}
                {repeatInterval === 'weekly' && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                      Repeat on (Days of Week)
                    </label>
                    <div className="flex gap-2 justify-between">
                      {[{ label: 'S', val: 0 }, { label: 'M', val: 1 }, { label: 'T', val: 2 }, { label: 'W', val: 3 }, { label: 'T', val: 4 }, { label: 'F', val: 5 }, { label: 'S', val: 6 }].map((d) => {
                        const active = daysOfWeek.includes(d.val);
                        return (
                          <button
                            type="button"
                            key={d.val}
                            onClick={() => handleToggleDay(d.val)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              active 
                                ? 'bg-brand-primary text-white shadow-md shadow-indigo-100' 
                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Conditional Custom Settings */}
                {repeatInterval === 'custom' && (
                  <div className="space-y-4 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Repeat Every
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={customInterval}
                          onChange={(e) => setCustomInterval(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-white border border-slate-100 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Unit
                        </label>
                        <select
                          value={customUnit}
                          onChange={(e) => setCustomUnit(e.target.value as any)}
                          className="w-full bg-white border border-slate-100 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none"
                        >
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                          <option value="months">Months</option>
                        </select>
                      </div>
                    </div>

                    {customUnit === 'weeks' && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Repeat on
                        </label>
                        <div className="flex gap-1.5 justify-between">
                          {[{ label: 'S', val: 0 }, { label: 'M', val: 1 }, { label: 'T', val: 2 }, { label: 'W', val: 3 }, { label: 'T', val: 4 }, { label: 'F', val: 5 }, { label: 'S', val: 6 }].map((d) => {
                            const active = daysOfWeek.includes(d.val);
                            return (
                              <button
                                type="button"
                                key={d.val}
                                onClick={() => handleToggleDay(d.val)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                                  active 
                                    ? 'bg-brand-primary text-white' 
                                    : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
                                }`}
                              >
                                {d.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* End Settings */}
                {repeatInterval !== 'none' && (
                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                      Ends
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { mode: 'never', label: 'Never' },
                        { mode: 'date', label: 'On Date' },
                        { mode: 'count', label: 'After N' }
                      ].map((option) => (
                        <button
                          key={option.mode}
                          type="button"
                          onClick={() => setEndMode(option.mode as any)}
                          className={`py-2 text-[10px] font-bold uppercase rounded-xl border transition-all ${
                            endMode === option.mode
                              ? 'bg-indigo-50 border-brand-primary text-brand-primary font-bold'
                              : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {endMode === 'date' && (
                      <div className="space-y-1 pt-1 animate-fadeIn">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">End Date</label>
                        <input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-2xl p-3 text-xs font-semibold text-slate-600 outline-none"
                        />
                      </div>
                    )}

                    {endMode === 'count' && (
                      <div className="space-y-1 pt-1 animate-fadeIn">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">Number of Occurrences</label>
                        <input
                          type="number"
                          min="1"
                          value={recurrenceCount}
                          onChange={(e) => setRecurrenceCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-slate-50 border-none rounded-2xl p-3 text-xs font-semibold text-slate-700 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>

            {/* Bottom Actions */}
            <div className="p-6 pt-2 bg-gradient-to-t from-white via-white to-white/80 border-t border-slate-100 absolute bottom-0 inset-x-0">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-brand-primary text-white py-4 rounded-[1.5rem] font-bold text-sm tracking-wide shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Create Task
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ChevronRight({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
