import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  HelpCircle, 
  Search, 
  BookOpen, 
  Key, 
  Database, 
  Settings, 
  ChevronDown, 
  MessageSquare, 
  Sparkles,
  CheckCircle2,
  Lock,
  Plus
} from 'lucide-react';
import { View } from '../types';

interface HelpCenterProps {
  onNavigate: (view: View) => void;
}

interface FAQItem {
  id: string;
  category: 'getting-started' | 'sync' | 'security' | 'features';
  question: string;
  answer: string;
}

export default function HelpCenter({ onNavigate }: HelpCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Articles', icon: <BookOpen size={13} /> },
    { id: 'getting-started', label: 'Getting Started', icon: <Plus size={13} /> },
    { id: 'features', label: 'Core Features', icon: <Sparkles size={13} /> },
    { id: 'sync', label: 'Cloud Sync', icon: <Database size={13} /> },
    { id: 'security', label: 'Security & PIN', icon: <Lock size={13} /> },
  ];

  const faqs: FAQItem[] = [
    {
      id: 'gs1',
      category: 'getting-started',
      question: 'What is NexTask Organizer and how does it work?',
      answer: 'NexTask Organizer is a highly optimized client-focused Progressive Web Application (PWA). It provides task tracking, smart scheduling, secure custom notes, and automatic offline productivity utilities. Your data is cached locally on your device and synchronized instantly with Google Firebase Cloud Firestore when online.'
    },
    {
      id: 'gs2',
      category: 'getting-started',
      question: 'How do I install NexTask as an application on my device?',
      answer: 'You can install NexTask directly on iOS, Android, or desktop. Open NexTask in Safari or Chrome, tap the share icon or click the "Install App" button in the Settings menu, and select "Add to Home Screen". This allows NexTask to operate full-screen with native execution.'
    },
    {
      id: 'ft1',
      category: 'features',
      question: 'How do I schedule a recurring task?',
      answer: 'When creating or editing a task, open the recurrence options. You can schedule tasks to repeat Daily, Weekly, Monthly, or customize exact repeat intervals (e.g., "Every 3 days" or specified days of the week). When you mark a recurring task as completed, NexTask automatically generates the next sequential occurrence at the correct interval.'
    },
    {
      id: 'ft2',
      category: 'features',
      question: 'What is the focus session block and how does it work?',
      answer: 'The Focus Tracker is configured using the traditional Pomodoro Technique. Standard sessions consist of 25 minutes of deep focus followed by a 5-minute short break, with a 15-minute long break after four sessions. Chimes and browser notifications signal timers. You can customize active session durations in settings.'
    },
    {
      id: 'sy1',
      category: 'sync',
      question: 'How does NexTask load and sync data when offline?',
      answer: 'NexTask operates under an Offline-First architectural pattern. Every action (creating tasks, checking subtasks, editing notes) is written to local storage cache hooks instantly. When a stable internet connection is established, the synchronization engine publishes local mutations safely back to your Firebase account Cloud Firestore.'
    },
    {
      id: 'sy2',
      category: 'sync',
      question: 'How do I download physical spreadsheets/PDF logs?',
      answer: 'Navigate to Settings -> Backups tab. Here, you can format other reports. Click the Spreadsheet or PDF icons to compile raw charts directly into local device storage downloads. Secure offline file backups can be exported at any time.'
    },
    {
      id: 'se1',
      category: 'security',
      question: 'How do I lock my NexTask workspace with a PIN passcode?',
      answer: 'Go to Settings -> Privacy & Lock tab. Click "Set PIN" and configure a secure 4-digit code. Once active, NexTask checks this PIN upon browser refreshes or when unlocking session logs. To remove the lock, navigate back to the PIN sub-form, enter your valid current passcode, and click Disable.'
    },
    {
      id: 'se2',
      category: 'security',
      question: 'What happens to my data in case the system fails?',
      answer: 'All active task databases and note boards are saved in client-side secure caches. If a critical script crash occurs, our System Integrity Error Boundary intercepts the exception, giving you options to copy the raw diagnostic traces or run manual re-cache triggers so you never lose workspace files.'
    }
  ];

  // Filtering FAQs based on query and category
  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      const matchesSearch = 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="p-6 space-y-6 pb-24 text-slate-800 dark:text-slate-200">
      
      {/* Navigation Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="p-2.5 glass hover:bg-white/80 dark:hover:bg-slate-900/80 border border-white/40 dark:border-slate-850/30 rounded-xl transition-all cursor-pointer text-slate-600 dark:text-slate-350 active:scale-95 flex items-center justify-center animate-fadeIn"
          title="Back to Settings"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-left">
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] font-display">Resolution Hub</span>
          <h1 className="text-2xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">Help Center</h1>
        </div>
      </div>

      {/* Hero Welcome Intro Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-850 text-white rounded-[2rem] p-6 text-left shadow-lg">
        <div className="absolute right-0 top-0 w-36 h-36 bg-white/5 rounded-full blur-xl pointer-events-none" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-white/10 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-indigo-200">Knowledge Base v1.2</span>
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight font-display">How can we assist your flow?</h2>
            <p className="text-xs text-indigo-100 font-medium leading-relaxed max-w-[320px] mt-1">
              Find instant solutions for task scheduling, Offline-First operations, privacy PIN structures, and custom spreadsheet diagnostics.
            </p>
          </div>
          
          {/* Native Text Search Box */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={15} />
            <input
              type="text"
              placeholder="Search guides, FAQs, error triggers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 hover:bg-white/15 focus:bg-white focus:text-slate-950 border border-white/10 focus:border-white pl-11 pr-4 py-3 rounded-2xl text-[11.5px] font-medium placeholder-white/50 font-sans outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Filter Category Segment List Tabs */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5 text-left">
          <BookOpen size={12} /> Search by Workspace Area
        </h3>
        
        <div className="flex gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar select-none text-left">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-500 dark:text-slate-400'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Expandable Accordion List */}
      <div className="space-y-3.5 text-left">
        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
          <HelpCircle size={12} /> Frequently Asked Questions
        </h3>

        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => {
                const isExpanded = expandedId === faq.id;
                return (
                  <motion.div
                    key={faq.id}
                    layout="position"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[1.75rem] overflow-hidden shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(faq.id)}
                      className="w-full flex items-center justify-between p-4.5 text-left focus:outline-none cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0">
                          <HelpCircle size={13} />
                        </span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 leading-snug">{faq.question}</span>
                      </div>
                      <ChevronDown 
                        size={14} 
                        className={`text-slate-400 ml-4 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180 text-indigo-500' : ''}`} 
                      />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: 'easeInOut' }}
                        >
                          <div className="px-4.5 pb-4.5 pt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium pl-[44px]">
                            <p className="border-t border-slate-50 dark:border-slate-850/60 pt-3 flex-1">{faq.answer}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-[2rem] p-10 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                  <Search size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-850 dark:text-slate-300">No matching articles found</h4>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium leading-relaxed max-w-[220px] mx-auto">
                    Try adjusting your search terms or select an alternative category tab.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Still need help callout */}
      <div className="glass-card p-5 border border-white/40 dark:border-slate-850/30 rounded-[2rem] flex flex-col items-center text-center gap-3 space-y-1">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-505 dark:text-indigo-400 flex items-center justify-center shadow-xs">
          <MessageSquare size={16} />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white">Did not find your solution?</h4>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold leading-relaxed max-w-[240px] mx-auto">
            Our support desk is operational 24/7. Transmit a ticket regarding exceptions, account transfers, or missing items.
          </p>
        </div>
        
        <button
          onClick={() => onNavigate('contact')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-650 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all cursor-pointer shadow-xs"
        >
          Contact Help Desk
        </button>
      </div>

      {/* Back button to return to safely */}
      <button
        onClick={() => onNavigate('settings')}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-650 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-indigo-600/10"
      >
        Go Back To Settings
      </button>

    </div>
  );
}
