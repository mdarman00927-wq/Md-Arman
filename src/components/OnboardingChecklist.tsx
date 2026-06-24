import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  StickyNote, 
  ListTodo, 
  Settings, 
  CalendarRange,
  PartyPopper,
  Info
} from 'lucide-react';
import { OnboardingState } from '../types';

interface OnboardingChecklistProps {
  onboarding: OnboardingState;
  onUpdateOnboarding: (updates: Partial<OnboardingState>) => void;
  onCreateTask: () => void;
  onCreateNote: () => void;
  onGenerateSchedule: () => void;
  onGeneratePlanner: () => void;
  onGoToSettings: () => void;
}

export default function OnboardingChecklist({
  onboarding,
  onUpdateOnboarding,
  onCreateTask,
  onCreateNote,
  onGenerateSchedule,
  onGeneratePlanner,
  onGoToSettings
}: OnboardingChecklistProps) {
  const {
    step1Completed,
    step2Completed,
    step3Completed,
    step4Completed,
    step5Completed,
    collapsed
  } = onboarding;

  const steps = [
    {
      id: 1,
      title: 'Create your first task',
      description: 'Add a high priority task to your checklist',
      completed: step1Completed,
      action: onCreateTask,
      icon: ListTodo,
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
    },
    {
      id: 2,
      title: 'Create your first note',
      description: 'Jot down an idea or draft a quick thought',
      completed: step2Completed,
      action: onCreateNote,
      icon: StickyNote,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
    },
    {
      id: 3,
      title: 'Generate an AI Schedule',
      description: 'Let Gemini optimize your daily routine',
      completed: step3Completed,
      action: onGenerateSchedule,
      icon: Sparkles,
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40'
    },
    {
      id: 4,
      title: 'Generate an AI Planner',
      description: 'Plan out a detailed deep-work schedule with AI',
      completed: step4Completed,
      action: onGeneratePlanner,
      icon: CalendarRange,
      color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40'
    },
    {
      id: 5,
      title: 'Customize app settings',
      description: 'Tailor the workspace preferences to your style',
      completed: step5Completed,
      action: onGoToSettings,
      icon: Settings,
      color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40'
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const isAllCompleted = completedCount === 5;
  const progressPercent = Math.round((completedCount / 5) * 100);

  // If all are completed, we can show a special completion banner or fade out, but it remains visible until they dismissed it or we show congratulation
  // Wait, requirement: "Checklist can be collapsed but should remain visible until all steps are completed."
  // So if they are all completed, we can show a beautiful congratulation message with smooth check animation!
  if (isAllCompleted && onboarding.completedAt) {
    // If we want to allow it to disappear or just show congratulation, the prompt says:
    // "Checklist can be collapsed but should remain visible until all steps are completed."
    // This implies once all steps are completed, we show a gorgeous congratulation message!
  }

  const toggleCollapsed = () => {
    onUpdateOnboarding({ collapsed: !collapsed });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      id="onboarding-welcome-card"
      className="p-5 rounded-3xl border border-indigo-100/60 dark:border-slate-800/40 bg-gradient-to-br from-white via-indigo-50/15 to-white dark:from-slate-900/40 dark:via-indigo-950/10 dark:to-slate-900/40 shadow-md relative overflow-hidden"
    >
      {/* Decorative top background blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title and Collapsed Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            {isAllCompleted ? <PartyPopper size={18} className="animate-bounce" /> : <Info size={18} />}
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 font-display">
              {isAllCompleted ? 'Onboarding Completed!' : 'Getting Started Checklist'}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {isAllCompleted ? 'All set! You have mastered NexTask basics' : `${completedCount} of 5 steps completed`}
            </p>
          </div>
        </div>

        <button 
          onClick={toggleCollapsed}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-all duration-200"
          title={collapsed ? "Expand Checklist" : "Collapse Checklist"}
        >
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {/* Modern Progress Bar at Top */}
      <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden mb-4">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
        />
      </div>

      {/* List of Steps (Hidden when collapsed unless all completed and we show a summary) */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {isAllCompleted ? (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-4 text-center space-y-3 flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <Check size={26} strokeWidth={3} className="animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-850 dark:text-slate-50 font-display">Congratulations, pathfinder!</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    You have successfully completed all the core onboarding steps and configured NexTask workspace like a pro. Your journey to ultimate productivity has officially begun!
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-2.5 pt-1">
                {steps.map((step) => {
                  const StepIcon = step.icon;
                  return (
                    <button
                      key={step.id}
                      onClick={step.action}
                      className="w-full text-left flex items-center justify-between p-3 rounded-2xl border border-slate-100/60 dark:border-slate-800/15 bg-white/70 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/85 transition-all duration-200 group active:scale-[0.99] relative overflow-hidden cursor-pointer"
                    >
                      {/* Left Side: Icon & Title */}
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl transition-transform duration-200 group-hover:scale-105 ${step.color}`}>
                          <StepIcon size={16} />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className={`text-xs font-bold transition-all duration-200 font-display ${
                            step.completed 
                              ? 'line-through text-slate-400 dark:text-slate-500' 
                              : 'text-slate-750 dark:text-slate-200 group-hover:text-indigo-650 dark:group-hover:text-indigo-400'
                          }`}>
                            {step.title}
                          </h4>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      {/* Right Side: Checkbox / Status Circle */}
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 border ${
                        step.completed 
                          ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/15' 
                          : 'border-slate-200 dark:border-slate-750 group-hover:border-indigo-400 text-transparent'
                      }`}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
