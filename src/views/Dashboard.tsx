import { useState } from 'react';
import { CheckCircle2, Circle, Clock, Plus, Target, Clock as TimeIcon, Sparkles, Bell, Mic, FileDown, FileSpreadsheet, Repeat, ChevronDown, ChevronUp, Trash2, ListTodo } from 'lucide-react';
import { motion } from 'motion/react';
import { Task, OnboardingState } from '../types';
import QuickCreateWidget from '../components/QuickCreateWidget';
import { useAuth } from '../services/AuthContext';
import { useNotification } from '../services/NotificationContext';
import NotificationPanel from '../components/NotificationPanel';
import { pdfService } from '../services/pdfService';
import { excelService } from '../services/excelService';
import OnboardingChecklist from '../components/OnboardingChecklist';

interface DashboardProps {
  tasks: Task[];
  onAddTask?: () => void;
  onOpenAI?: (tab?: 'copilot' | 'planner' | 'coach', voiceActive?: boolean) => void;
  onSaveTask?: (task: Partial<Task>) => void;
  onToggleTask?: (id: string) => void;
  onUpdateTask?: (task: Task) => void;
  onboarding?: OnboardingState | null;
  onUpdateOnboarding?: (updates: Partial<OnboardingState>) => void;
  onCreateNote?: () => void;
  onGoToSettings?: () => void;
}

export default function Dashboard({ 
  tasks, 
  onAddTask, 
  onOpenAI, 
  onSaveTask, 
  onToggleTask, 
  onUpdateTask,
  onboarding,
  onUpdateOnboarding,
  onCreateNote,
  onGoToSettings
}: DashboardProps) {
  const { user } = useAuth();
  const { unreadCount } = useNotification();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Expanded card tracking & inline subtask creation inputs
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [newSubtaskTexts, setNewSubtaskTexts] = useState<Record<string, string>>({});

  const toggleExpand = (id: string) => {
    setExpandedTasks(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSubtask = (task: Task, subtaskId: string) => {
    if (!onUpdateTask) return;
    const updatedSubtasks = task.subtasks?.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    ) || [];
    onUpdateTask({
      ...task,
      subtasks: updatedSubtasks
    });
  };

  const handleDeleteSubtask = (task: Task, subtaskId: string) => {
    if (!onUpdateTask) return;
    const updatedSubtasks = task.subtasks?.filter(st => st.id !== subtaskId) || [];
    onUpdateTask({
      ...task,
      subtasks: updatedSubtasks.length > 0 ? updatedSubtasks : undefined
    });
  };

  const handleCreateInlineSubtask = (task: Task) => {
    if (!onUpdateTask) return;
    const text = newSubtaskTexts[task.id]?.trim();
    if (!text) return;

    const newSub = {
      id: Math.random().toString(36).substr(2, 9),
      title: text,
      completed: false
    };

    onUpdateTask({
      ...task,
      subtasks: [...(task.subtasks || []), newSub]
    });

    setNewSubtaskTexts(prev => ({ ...prev, [task.id]: '' }));
  };

  // Dynamic user matching name
  const userName = user?.displayName ? user.displayName.split(' ')[0] : 'Alex';

  const handleExportTasksPDF = () => {
    pdfService.exportTasks(tasks, {
      userName: user?.displayName || 'Alex',
      userEmail: user?.email || '',
    });
  };

  const handleExportTasksExcel = () => {
    excelService.exportTasks(tasks, {
      userName: user?.displayName || 'Alex',
      userEmail: user?.email || '',
    });
  };

  // Format today's date dynamically
  const formatToday = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  // Dynamic task statistics calculation
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const pendingTasksCount = tasks.filter(t => !t.completed).length;

  return (
    <div className="p-6 space-y-8 pb-24 relative">
      {/* Header section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] font-display">{formatToday()}</span>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">Good morning, {userName}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            You have <span className="font-bold text-indigo-650 dark:text-indigo-400">{pendingTasksCount}</span> pending tasks today.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Bell Icon Button Container with Badge */}
          <button 
            onClick={() => setIsNotifOpen(true)}
            className="glass hover:bg-white/80 dark:hover:bg-slate-905/80 border border-white/40 dark:border-slate-800/20 p-3 rounded-2xl text-slate-600 dark:text-slate-350 shadow-sm transition-all duration-300 active:scale-95 relative outline-none cursor-pointer"
            title="Notification Center"
          >
            <Bell size={20} className="text-slate-600 dark:text-slate-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-sans font-extrabold text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-50 dark:border-slate-950 animate-pulse shadow-md">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Microphone Voice Command Trigger */}
          <button 
            onClick={() => onOpenAI?.('copilot', true)}
            className="bg-indigo-50/80 dark:bg-indigo-950/45 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-indigo-100/50 dark:border-indigo-900/30 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400 transition-all duration-300 active:scale-95 outline-none cursor-pointer shadow-sm"
            title="Voice Commands"
          >
            <Mic size={20} className="text-indigo-600 dark:text-indigo-400" />
          </button>

          {/* Sparkles AI button wrapper */}
          <button 
            onClick={() => onOpenAI?.('copilot', false)}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-500/25 dark:shadow-none transition-all duration-300 active:scale-95 outline-none cursor-pointer"
            title="NexTask Co-pilot"
          >
            <Sparkles size={20} className="animate-pulse" />
          </button>
        </div>
      </motion.div>
  
      {/* NEW: Quick Create Widget */}
      <QuickCreateWidget onSave={onSaveTask || (() => {})} />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        {/* Progress ring card */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-gradient-to-br from-indigo-550 to-indigo-650 dark:from-indigo-900 dark:to-indigo-950 p-5 rounded-3xl text-white space-y-4 shadow-xl shadow-indigo-500/10 dark:shadow-none border border-indigo-500/25 dark:border-indigo-800/30"
        >
          <div className="bg-white/20 dark:bg-white/10 w-10 h-10 rounded-2xl flex items-center justify-center">
            <Target size={20} className="text-indigo-100" />
          </div>
          <div>
            <div className="text-2xl font-bold font-display">{progressPercentage}%</div>
            <div className="text-[10px] uppercase font-bold tracking-widest opacity-80 mt-0.5">Completion Rate</div>
          </div>
        </motion.div>

        {/* Task counter card */}
        <motion.div
          whileHover={{ y: -2 }}
          className="glass hover:bg-white/80 dark:hover:bg-slate-900/80 p-5 rounded-3xl border border-white/50 dark:border-slate-800/40 space-y-4 shadow-sm"
        >
          <div className="bg-slate-100 dark:bg-slate-800 w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700">
            <TimeIcon size={20} className="text-indigo-550 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-white">{pendingTasksCount}</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">Pending Tasks</div>
          </div>
        </motion.div>
      </div>

      {onboarding && (
        <OnboardingChecklist 
          onboarding={onboarding}
          onUpdateOnboarding={onUpdateOnboarding || (() => {})}
          onCreateTask={onAddTask || (() => {})}
          onCreateNote={onCreateNote || (() => {})}
          onGenerateSchedule={() => onOpenAI?.('copilot')}
          onGeneratePlanner={() => onOpenAI?.('planner')}
          onGoToSettings={onGoToSettings || (() => {})}
        />
      )}

      {/* AI Workspace Co-pilot Hub Block */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 space-y-4 border border-white/40 dark:border-slate-800/20 bg-gradient-to-br from-white/40 via-indigo-50/25 to-white/40 dark:from-slate-900/30 dark:via-indigo-950/15 dark:to-slate-900/30 shadow-[0_8px_32px_0_rgba(99,102,241,0.02)]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-2 rounded-xl">
              <Sparkles size={16} />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">NexTask AI Workspace</h4>
              <p className="text-[9px] uppercase tracking-widest font-extrabold text-[#6366f1] dark:text-indigo-400 font-display">Real-time automation</p>
            </div>
          </div>
          <span className="text-[8px] font-bold bg-indigo-50 dark:bg-indigo-950 text-[#6366f1] dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
            Active
          </span>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
          Automatically convert loose descriptions into custom tasks, compose comfortable focus schedules, or parse productivity index metrics.
        </div>

        {/* Action triggers */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <button
            onClick={() => onOpenAI?.('planner')}
            className="bg-white/80 dark:bg-slate-900/55 hover:bg-white dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 rounded-2xl p-2.5 text-left transition-all duration-200 active:scale-[0.98] shadow-xs group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">Schedule</span>
              <span className="text-[11px] group-hover:translate-x-0.5 transition-transform">📅</span>
            </div>
            <p className="text-[8px] text-slate-400 dark:text-slate-500 font-medium mt-1 leading-normal">Plan hours.</p>
          </button>

          <button
            onClick={() => onOpenAI?.('coach')}
            className="bg-white/80 dark:bg-slate-900/55 hover:bg-white dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 rounded-2xl p-2.5 text-left transition-all duration-200 active:scale-[0.98] shadow-xs group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">Coach</span>
              <span className="text-[11px] group-hover:translate-x-0.5 transition-transform">🧠</span>
            </div>
            <p className="text-[8px] text-slate-400 dark:text-slate-500 font-medium mt-1 leading-normal">Workloads.</p>
          </button>

          <button
            onClick={() => onOpenAI?.('copilot', true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-2.5 text-left transition-all duration-200 active:scale-[0.98] shadow-xs group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-indigo-100 uppercase">Speak</span>
              <span className="text-[11px] group-hover:scale-110 transition-transform">🎙️</span>
            </div>
            <p className="text-[8px] text-indigo-200 dark:text-indigo-100/80 font-medium mt-1 leading-normal">Dictate.</p>
          </button>
        </div>
      </motion.div>

      {/* Task Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="font-display font-bold text-lg text-slate-800 dark:text-white">Tasks</h2>
          <div className="flex items-center gap-1.5">
            {/* Export Task Agenda PDF */}
            <button
              onClick={handleExportTasksPDF}
              className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-transform cursor-pointer border border-indigo-100/30 dark:border-indigo-900/40"
              title="Download Task Agenda as PDF"
            >
              <FileDown size={12} /> PDF
            </button>
            {/* Export Task Agenda Excel */}
            <button
              onClick={handleExportTasksExcel}
              className="text-teal-600 dark:text-emerald-400 bg-teal-50 dark:bg-emerald-950/40 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-transform cursor-pointer border border-teal-100/30 dark:border-emerald-900/40"
              title="Download Task Agenda as Excel Spreadsheet"
            >
              <FileSpreadsheet size={12} /> Excel
            </button>
            <button 
              onClick={onAddTask}
              className="text-brand-primary dark:text-indigo-400 bg-brand-primary/10 dark:bg-indigo-950/40 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
            >
              <Plus size={12} /> Add New
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-[2rem] shadow-sm flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-500">
                <ListTodo size={28} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">All Captured</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                  You don't have any tasks scheduled. Tap below to create your first task or use AI Copilot to outline your day!
                </p>
              </div>
              <button
                type="button"
                onClick={onAddTask}
                className="mt-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
              >
                Create First Task
              </button>
            </div>
          ) : (
            tasks.slice(0, 5).map((task, index) => {
              const hasSubtasks = task.subtasks && task.subtasks.length > 0;
              const subtasksCount = task.subtasks?.length || 0;
              const subtasksCompleted = task.subtasks?.filter(st => st.completed).length || 0;
              const subtaskPercent = subtasksCount > 0 ? Math.round((subtasksCompleted / subtasksCount) * 100) : 0;
              const isExpanded = expandedTasks.includes(task.id);

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  id={`task-item-${task.id}`}
                  className={`p-4 rounded-[2rem] border transition-all duration-300 ${
                    task.completed 
                      ? 'bg-slate-50/40 dark:bg-slate-900/30 border-slate-100 dark:border-slate-900/40 opacity-60' 
                      : 'glass hover:bg-white/85 dark:hover:bg-slate-900/80 border-slate-200/40 dark:border-slate-800/40 shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* Rest of mapping code remains intact */}
                {/* Main Task Header Section */}
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => onToggleTask?.(task.id)}
                    className={`cursor-pointer shrink-0 ${task.completed ? 'text-brand-primary dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`}
                  >
                    {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>

                  <div 
                    onClick={() => toggleExpand(task.id)} 
                    className="flex-1 cursor-pointer min-w-0"
                  >
                    <h3 className={`font-medium text-sm truncate ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                      {task.title}
                    </h3>
                    
                    {/* Progress tracking display */}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {task.category}
                      </span>
                      {task.dueDate && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                          <Clock size={10} /> {task.dueDate}
                        </span>
                      )}
                      {task.recurrence && task.recurrence.interval !== 'none' && (
                        <span className="text-[9px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold uppercase tracking-wider">
                          <Repeat size={10} /> {task.recurrence.interval}
                        </span>
                      )}
                      
                      {/* Subtask Tracker Pill Badge */}
                      {hasSubtasks && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold uppercase tracking-wider">
                          <ListTodo size={10} /> {subtasksCompleted}/{subtasksCount} ({subtaskPercent}%)
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {hasSubtasks && (
                      <div className="mt-2 w-full bg-slate-50 dark:bg-slate-800/50 h-1.5 rounded-full overflow-hidden border border-slate-100/35">
                        <div 
                          className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-full transition-all duration-300" 
                          style={{ width: `${subtaskPercent}%` }} 
                        />
                      </div>
                    )}
                  </div>

                  {/* Expand Chevron / Priority Pin side */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => toggleExpand(task.id)}
                      className="p-1 px-1.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <div className={`w-1.5 h-8 rounded-full ${
                      task.priority === 'high' ? 'bg-rose-500' : task.priority === 'medium' ? 'bg-orange-400' : 'bg-emerald-400'
                    }`} />
                  </div>
                </div>

                {/* Collapsible Subtasks and Inline Adder */}
                {isExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pl-9 pt-2 border-t border-slate-50 dark:border-slate-850 space-y-3"
                  >
                    {/* Render existing subtasks */}
                    {task.subtasks && task.subtasks.length > 0 ? (
                      <div className="space-y-2">
                        {task.subtasks.map((st) => (
                          <div 
                            key={st.id} 
                            className="flex items-center justify-between bg-slate-50/45 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-850/60 p-2 rounded-xl text-xs"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleSubtask(task, st.id)}
                                className={`cursor-pointer shrink-0 transition-colors ${
                                  st.completed ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                  st.completed 
                                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                                    : 'border-slate-300 dark:border-slate-705 bg-white dark:bg-slate-900'
                                }`}>
                                  {st.completed && <span className="text-[9px] font-bold">✓</span>}
                                </div>
                              </button>
                              <span className={`text-slate-700 dark:text-slate-300 truncate font-semibold ${st.completed ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : ''}`}>
                                {st.title}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubtask(task, st.id)}
                              className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/25 transition-colors cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 py-1">
                        No subtasks added yet
                      </div>
                    )}

                    {/* Inline subtask creation field */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add quick subtask..."
                        value={newSubtaskTexts[task.id] || ''}
                        onChange={(e) => setNewSubtaskTexts(prev => ({ ...prev, [task.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateInlineSubtask(task);
                          }
                        }}
                        className="flex-1 bg-slate-50/70 dark:bg-slate-950 border-none rounded-xl py-2 px-3 text-xs font-semibold text-slate-750 dark:text-slate-200 outline-none focus:ring-1 focus:ring-slate-100 placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleCreateInlineSubtask(task)}
                        className="bg-brand-primary dark:bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          }))}
        </div>
      </div>

      {/* Slide-over Notification Center alerts tray */}
      <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </div>
  );
}
