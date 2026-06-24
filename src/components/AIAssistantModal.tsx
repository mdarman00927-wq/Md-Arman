import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  Loader2, 
  CheckCircle2, 
  Calendar, 
  Zap, 
  Coffee, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  FileText, 
  Check, 
  ArrowRight,
  Target,
  Mic,
  MicOff,
  Volume2,
  RefreshCw
} from 'lucide-react';
import { chatWithAI, generateDailyPlan, getProductivitySuggestions, DailySchedulePlan, ProductivityAudit } from '../services/aiService';
import { useSpeechToText } from '../services/useSpeechToText';
import { useToast } from '../services/ToastContext';
import { Task, Note } from '../types';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
  status?: 'processing' | 'success';
}

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (type: 'task' | 'note' | 'event' | 'view', data: any) => void;
  tasks: Task[];
  notes: Note[];
  initialTab?: 'copilot' | 'planner' | 'coach';
  initialVoiceActive?: boolean;
  onScheduleGenerated?: () => void;
  onPlannerGenerated?: () => void;
}

export default function AIAssistantModal({ 
  isOpen, 
  onClose, 
  onAction, 
  tasks, 
  notes, 
  initialTab = 'copilot', 
  initialVoiceActive = false,
  onScheduleGenerated,
  onPlannerGenerated
}: AIAssistantModalProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'copilot' | 'planner' | 'coach'>(initialTab);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Speech to Text hook handlers
  const {
    isListening,
    transcript,
    interimTranscript,
    supported,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechToText();

  // Load transcript into conversational input
  useEffect(() => {
    if (transcript) {
      setInput(prev => {
        // Only append if it's not already at the end of the text
        const trimmed = prev.trim();
        const transTrimmed = transcript.trim();
        if (trimmed.endsWith(transTrimmed)) return prev;
        return trimmed + (trimmed ? ' ' : '') + transTrimmed;
      });
    }
  }, [transcript]);

  // Trigger auto listening on open if initialVoiceActive is declared
  useEffect(() => {
    if (isOpen && initialVoiceActive && supported) {
      setActiveTab('copilot');
      const timer = setTimeout(() => {
        startListening();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialVoiceActive, supported]);

  // Cleanup microphones on component dismissals
  useEffect(() => {
    if (!isOpen && isListening) {
      stopListening();
    }
  }, [isOpen, isListening]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Network Connectivity / Offline State Support
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Planner States
  const [schedulePlan, setSchedulePlan] = useState<DailySchedulePlan | null>(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerInput, setPlannerInput] = useState('');
  const [plannerError, setPlannerError] = useState<string | null>(null);

  // Coach States
  const [productivityAudit, setProductivityAudit] = useState<ProductivityAudit | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === 'copilot') {
      scrollToBottom();
    }
  }, [messages, isChatLoading, activeTab]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;

    const userText = input;
    const userMessage: Message = { role: 'user', parts: [{ text: userText }] };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsChatLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, parts: m.parts }));
      const response = await chatWithAI(userText, history, tasks, notes);
      
      const modelMessage: Message = { 
        role: 'model', 
        parts: [{ text: response.text || "I've updated your workspace." }] 
      };

      if (response.functionCalls) {
        for (const call of response.functionCalls) {
          if (call.name === 'create_task') {
            onAction('task', call.args);
            modelMessage.status = 'success';
          } else if (call.name === 'create_note') {
            onAction('note', call.args);
            modelMessage.status = 'success';
          } else if (call.name === 'create_event') {
            onAction('event', call.args);
            modelMessage.status = 'success';
          }
        }
      }

      setMessages(prev => [...prev, modelMessage]);
      onScheduleGenerated?.();
    } catch (error: any) {
      console.error("AI Copilot Error:", error);
      showToast(error?.message || "Failed to communicate with AI Assistant. Please check your network.", "error");
      setMessages(prev => [...prev, { 
        role: 'model', 
        parts: [{ text: `Sorry, I encountered an error: ${error?.message || "Please check your connectivity and try again."}` }] 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Automated Schedule Builder
  const handleBuildSchedule = async (customMessage?: string) => {
    setPlannerLoading(true);
    setPlannerError(null);
    try {
      const plan = await generateDailyPlan(tasks, customMessage || plannerInput);
      setSchedulePlan(plan);
      if (customMessage) setPlannerInput('');
      showToast("Daily structured schedule generated successfully!", "success");
      onPlannerGenerated?.();
    } catch (error: any) {
      console.error("AI Planner Error:", error);
      const errMsg = error?.message || "Failed to organize daily structured schedule. Check connection.";
      setPlannerError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setPlannerLoading(false);
    }
  };

  // Automated Workload & Productivity analysis
  const handleProductivityAudit = async () => {
    setCoachLoading(true);
    setCoachError(null);
    try {
      const audit = await getProductivitySuggestions(tasks, notes);
      setProductivityAudit(audit);
      showToast("Productivity insights loaded successfully!", "success");
    } catch (error: any) {
      console.error("AI Coach Error:", error);
      const errMsg = error?.message || "Failed to compile productivity insights audit. Verify API keys.";
      setCoachError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setCoachLoading(false);
    }
  };

  // Quick Chat Suggestion Trigger
  const handleSuggestionClick = (suggestionText: string) => {
    setInput(suggestionText);
  };

  // Convert timeline plan object into a note
  const handleSavePlanToNotes = () => {
    if (!schedulePlan) return;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    const content = `### AI Generated Structured Daily Schedule - ${dateStr}\n\n` +
      `**Overview:** ${schedulePlan.summary}\n\n` + 
      schedulePlan.plan.map(p => `- **${p.time}** (${p.duration}): **_${p.title}_**\n  _${p.description}_ [Category: ${p.type}]`).join('\n\n');
    
    onAction('note', {
      title: `Daily Schedule Plan (${dateStr})`,
      content,
      color: '#6366f1'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[80]"
          />
          
          {/* Main Board Drawer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 240 }}
            className="fixed inset-x-4 top-16 bottom-20 max-w-lg mx-auto bg-white rounded-[3rem] z-[90] shadow-2xl flex flex-col overflow-hidden border border-slate-100"
          >
            {/* Elegant Header Layout */}
            <div className="p-6 pb-4 border-b border-slate-50 bg-gradient-to-r from-brand-primary/5 via-white to-brand-secondary/5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-primary p-2.5 rounded-2xl text-white shadow-md shadow-brand-primary/10">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-display text-slate-800">NexTask Co-pilot</h2>
                    <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest">Autonomous Assistant</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-400 active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              {/* High-polish Slide tabs menu */}
              <div className="flex bg-slate-100/70 p-1 rounded-2xl mt-5 text-xs font-bold text-slate-600 relative">
                <button
                  onClick={() => setActiveTab('copilot')}
                  className={`flex-1 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    activeTab === 'copilot' ? 'bg-white text-slate-950 shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  <Bot size={14} />
                  Co-pilot
                </button>
                <button
                  onClick={() => setActiveTab('planner')}
                  className={`flex-1 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    activeTab === 'planner' ? 'bg-white text-slate-950 shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  <Calendar size={14} />
                  Scheduler
                </button>
                <button
                  onClick={() => setActiveTab('coach')}
                  className={`flex-1 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    activeTab === 'coach' ? 'bg-white text-slate-950 shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  <TrendingUp size={14} />
                  Coach
                </button>
              </div>
            </div>

            {/* TAB CONTAINER BODY */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30">
              
              {/* TAB 1: CO-PILOT CHAT */}
              {activeTab === 'copilot' && (
                <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
                  {messages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 px-4 py-8">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-brand-primary shadow-sm">
                          <Bot size={28} />
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 bg-indigo-500 w-3 h-3 rounded-full border-2 border-white animate-ping" />
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-extrabold text-slate-800 font-display">How can I assist your workflow today?</p>
                        <p className="text-xs text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                          Ask me to create task records, build calendar schedules, suggest productivity tips, or summarize notes.
                        </p>
                      </div>

                      {/* Quick Conversational suggestion pills */}
                      <div className="w-full max-w-sm pt-4 space-y-2">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Suggested prompts</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <button 
                            onClick={() => handleSuggestionClick("Create a high priority task for my client presentation tomorrow at 10:00 AM")}
                            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-100 text-[11px] font-medium px-3.5 py-2 rounded-2xl shadow-sm transition-all text-left active:scale-95"
                          >
                            ➕ "Create task details for client pitch..."
                          </button>
                          <button 
                            onClick={() => handleSuggestionClick("Read through my active tasks and synthesize a quick summary of what I should focus on first.")}
                            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-100 text-[11px] font-medium px-3.5 py-2 rounded-2xl shadow-sm transition-all text-left active:scale-95"
                          >
                            🎯 "Review task burdens & prioritize..."
                          </button>
                          <button 
                            onClick={() => handleSuggestionClick("Synthesize a short personal note containing a quick brain dump for gym routine setup.")}
                            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-100 text-[11px] font-medium px-3.5 py-2 rounded-2xl shadow-sm transition-all text-left active:scale-95"
                          >
                            📝 "Draft notes details for Gym routing..."
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i}
                      className={`flex gap-3.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user' ? 'bg-slate-900 border border-slate-900 text-white' : 'bg-brand-primary/10 text-brand-primary border border-brand-primary/5'
                      }`}>
                        {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                      </div>
                      
                      <div className={`max-w-[78%] p-4 rounded-[1.5rem] text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-slate-950 text-white rounded-tr-none shadow-sm' 
                          : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-sm'
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.parts[0].text}</div>
                        {msg.status === 'success' && (
                          <div className="mt-3 pt-2.5 border-t border-brand-primary/10 flex items-center gap-1.5 text-[9px] font-bold text-brand-primary uppercase tracking-wider">
                            <CheckCircle2 size={11} className="text-brand-primary" /> Workspace records synced
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  
                  {isChatLoading && (
                    <div className="flex gap-3.5">
                      <div className="w-8 h-8 rounded-xl bg-brand-primary/5 border border-brand-primary/10 text-brand-primary flex items-center justify-center animate-pulse">
                        <Bot size={15} />
                      </div>
                      <div className="bg-white border border-slate-100 p-4 rounded-3xl rounded-tl-none flex items-center gap-2.5 shadow-sm">
                        <Loader2 size={13} className="animate-spin text-brand-primary" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Parsing Workspace Context...</span>
                      </div>
                    </div>
                  )}

                  {/* Voice command status visual panels */}
                  {isListening && (
                    <div className="bg-gradient-to-tr from-indigo-50/70 via-white to-violet-50/70 border border-indigo-100/60 rounded-[2rem] p-5.5 space-y-4 shadow-sm relative overflow-hidden animate-fade-in">
                      <div className="absolute top-3.5 right-4 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-[8px] font-extrabold uppercase text-rose-600 tracking-widest">Listening</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-md shadow-indigo-600/20 flex-shrink-0 animate-pulse">
                          <Volume2 size={15} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Voice Command Assistant</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Capturing microphone signal...</p>
                        </div>
                      </div>

                      {/* Moving Sound Wave Visual Equalisers */}
                      <div className="flex gap-1.5 items-end justify-center h-8 py-2 bg-slate-50/40 rounded-2xl">
                        {[0.4, 0.9, 0.5, 0.8, 0.6, 1, 0.4].map((scale, ind) => (
                          <motion.div
                            key={ind}
                            animate={{ height: ["25%", "100%", "25%"] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.8,
                              delay: ind * 0.12,
                              ease: "easeInOut"
                            }}
                            className="w-1.5 bg-indigo-500 rounded-full"
                            style={{ height: "35%" }}
                          />
                        ))}
                      </div>

                      {/* Real-time speech result text preview */}
                      <div className="p-4 bg-white/90 border border-indigo-50/60 rounded-2xl min-h-[50px] flex items-center justify-center text-center">
                        {interimTranscript || input ? (
                          <p className="text-xs font-medium text-slate-800 leading-relaxed italic">
                            "{input} <span className="text-indigo-500 font-semibold">{interimTranscript}</span>"
                          </p>
                        ) : (
                          <p className="text-[11px] font-bold text-slate-400 animate-pulse uppercase tracking-wider">
                            Start speaking now...
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2.5 justify-center pt-1 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={stopListening}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-extrabold text-[9px] px-6 py-2.5 rounded-xl uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-indigo-600/10"
                        >
                          Finish Dictating
                        </button>
                        <button
                          type="button"
                          onClick={() => { stopListening(); resetTranscript(); setInput(''); }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 px-5 py-2.5 rounded-xl uppercase tracking-wider active:scale-95 transition-all"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}

                  {voiceError && (
                    <div className="bg-rose-50 border border-rose-100 p-4.5 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold shadow-xs">
                      <AlertCircle size={15} className="flex-shrink-0 text-rose-500" />
                      <div className="space-y-0.5">
                        <span className="block font-extrabold uppercase tracking-wider text-[9px]">Microphone Trouble</span>
                        <p className="text-[10px] font-medium text-rose-600 leading-normal">{voiceError}</p>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* TAB 2: DAILY SCHEDULE PLANNER */}
              {activeTab === 'planner' && (
                <div className="p-6 space-y-6">
                  {/* Explanatory introduction card */}
                  <div className="bg-white border border-slate-100/80 p-5 rounded-[2rem] shadow-sm flex items-start gap-4">
                    <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-2xl text-indigo-500">
                      <Calendar size={20} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800">Dynamic Schedule Planning</h4>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Let NexTask AI evaluate your current <strong>{tasks.length} active tasks</strong> to build an optimized, hour-by-hour pacing system.
                      </p>
                    </div>
                  </div>

                  {isOffline ? (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 text-center space-y-6 shadow-sm">
                      <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
                        <AlertCircle size={24} />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-800">Offline Mode Active</h4>
                        <p className="text-xs text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                          AI elements are currently unavailable because your device is offline. Make sure you are connected to the internet and try again.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setIsOffline(!navigator.onLine);
                          if (navigator.onLine) {
                            handleBuildSchedule();
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-3 px-5 rounded-xl shadow-md flex items-center justify-center gap-1.5 mx-auto active:scale-95 transition-transform uppercase tracking-widest cursor-pointer"
                      >
                        <RefreshCw size={12} />
                        <span>Retry Connection</span>
                      </button>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 text-center space-y-6 shadow-sm">
                      <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                        <AlertCircle size={28} />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-800">Your Task List is Empty</h4>
                        <p className="text-xs text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                          We need at least one task to generate AI schedule budgets. Please add some active tasks in your workspace first!
                        </p>
                      </div>
                    </div>
                  ) : plannerLoading ? (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 text-center space-y-4 shadow-sm animate-pulse">
                      <Loader2 size={36} className="animate-spin mx-auto text-brand-primary" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800">Compiling Task Calendar...</h4>
                        <p className="text-[10px] text-slate-400 max-w-[250px] mx-auto leading-relaxed">
                          Gemini is budgeting break times and focus blocks targeting key priorities.
                        </p>
                      </div>
                    </div>
                  ) : schedulePlan ? (
                    <div className="space-y-5">
                      {/* Summary Banner Card */}
                      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-[2rem] p-5 shadow-lg shadow-indigo-500/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 opacity-10">
                          <Calendar size={120} />
                        </div>
                        <div className="space-y-1 relative">
                          <span className="text-[8px] uppercase tracking-widest font-extrabold text-indigo-200">AI Daily Forecast</span>
                          <h4 className="text-xs font-bold text-white leading-relaxed">{schedulePlan.summary}</h4>
                        </div>
                        <div className="flex justify-between items-center bg-white/10 rounded-2xl p-2.5 mt-4 text-[10px] font-bold">
                          <span className="text-indigo-100">Plan Ready for Action</span>
                          <button 
                            onClick={handleSavePlanToNotes}
                            className="bg-white text-indigo-600 hover:bg-slate-50 px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-95 transition-all text-[9px]"
                          >
                            <FileText size={11} /> Save to Notes
                          </button>
                        </div>
                      </div>

                      {/* Schedule Timeline Block Grid */}
                      <div className="space-y-4 relative pl-4 border-l border-slate-200 ml-4 pt-1 pb-1">
                        {schedulePlan.plan.map((item, index) => {
                          let typeStyles = {
                            bg: 'bg-white border-slate-100',
                            bar: 'bg-slate-300',
                            text: 'text-slate-500',
                            icon: Clock
                          };
                          
                          if (item.type === 'focus') {
                            typeStyles = {
                              bg: 'bg-violet-50/70 border-violet-100 text-violet-950',
                              bar: 'bg-violet-500',
                              text: 'text-violet-600',
                              icon: Target
                            };
                          } else if (item.type === 'break') {
                            typeStyles = {
                              bg: 'bg-emerald-50/60 border-emerald-100 text-emerald-950',
                              bar: 'bg-emerald-500',
                              text: 'text-emerald-600',
                              icon: Coffee
                            };
                          } else if (item.type === 'task') {
                            typeStyles = {
                              bg: 'bg-blue-50/60 border-blue-100',
                              bar: 'bg-blue-500',
                              text: 'text-blue-600',
                              icon: Check
                            };
                          } else if (item.type === 'routine') {
                            typeStyles = {
                              bg: 'bg-amber-50/60 border-amber-100',
                              bar: 'bg-amber-500',
                              text: 'text-amber-600',
                              icon: Zap
                            };
                          }

                          const IconComponent = typeStyles.icon;

                          return (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              key={index} 
                              className={`p-4 rounded-2xl border ${typeStyles.bg} relative shadow-sm`}
                            >
                              {/* Connector left node bubble dot */}
                              <div className={`absolute -left-[24px] top-6 w-3 h-3 rounded-full ${typeStyles.bar} border-2 border-white`} />

                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 font-sans">
                                      <Clock size={11} /> {item.time} ({item.duration})
                                    </span>
                                    <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full ${typeStyles.bg} border`}>
                                      {item.type}
                                    </span>
                                  </div>
                                  <h5 className="text-xs font-bold text-slate-800">{item.title}</h5>
                                  <p className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-slate-500 leading-normal">
                                    {item.description}
                                  </p>
                                </div>

                                {item.type === 'focus' && (
                                  <button
                                    onClick={() => onAction('view', 'focus')}
                                    className="p-2 bg-white hover:bg-violet-50 rounded-xl text-violet-600 border border-violet-100 flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider transition-all active:scale-95"
                                    title="Start Focus Session"
                                  >
                                    <Clock size={11} /> Focus
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Re-generate scheduler controls */}
                      <div className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col gap-2 shadow-sm">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Tweak schedule parameters</p>
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            placeholder="Add rules, e.g. 'Keep afternoon light', 'gym at 5pm'..."
                            value={plannerInput}
                            onChange={(e) => setPlannerInput(e.target.value)}
                            className="flex-1 bg-slate-50 border-none outline-none font-medium p-2.5 rounded-xl text-[11px]"
                          />
                          <button
                            onClick={() => handleBuildSchedule()}
                            className="bg-slate-900 text-white rounded-xl px-4 py-2.5 font-bold text-[11px] hover:bg-slate-800 active:scale-95 transition-colors"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : plannerError ? (
                    <div className="bg-rose-50/75 border border-rose-150 rounded-[2.5rem] p-8 text-center space-y-6 shadow-sm">
                      <div className="w-14 h-14 bg-rose-100 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-650 mx-auto">
                        <AlertCircle size={24} />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-850">Scheduler API Failure</h4>
                        <p className="text-[10px] font-medium text-rose-700 max-w-[240px] mx-auto leading-relaxed break-words font-mono">
                          {plannerError}
                        </p>
                      </div>
                      <button
                        onClick={() => handleBuildSchedule()}
                        className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-[11px] py-3.2 px-5 rounded-2xl shadow-md flex items-center justify-center gap-1.5 mx-auto active:scale-95 transition-transform cursor-pointer font-sans uppercase tracking-widest"
                      >
                        <RefreshCw size={12} />
                        <span>Retry Connection</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 text-center space-y-6 shadow-sm">
                      <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                        <Calendar size={28} />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-850">Schedule is feeling blank</h4>
                        <p className="text-xs text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                          Click below to structure your workload of pending tasks into a comfortable list of pacing times!
                        </p>
                      </div>

                      {/* Optional instructions bar */}
                      <input 
                        type="text" 
                        placeholder="Add special instructions (optional, e.g. Sleep late)"
                        value={plannerInput}
                        onChange={(e) => setPlannerInput(e.target.value)}
                        className="w-full bg-slate-50 border-none font-medium text-center p-3 rounded-2xl text-[11px] placeholder:text-slate-300"
                      />

                      <button
                        onClick={() => handleBuildSchedule()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 mx-auto transition-transform active:scale-95 duration-100 cursor-pointer"
                      >
                        <Zap size={14} /> Structure Schedule Plan
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PRODUCTIVITY COACH AUDIT */}
              {activeTab === 'coach' && (
                <div className="p-6 space-y-6">
                  {/* Explanatory introduction card */}
                  <div className="bg-white border border-slate-100/80 p-5 rounded-[2rem] shadow-sm flex items-start gap-4">
                    <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-2xl text-amber-500">
                      <TrendingUp size={20} />
                    </div>
                    <div className="space-y-1 border-opacity-70">
                      <h4 className="text-xs font-bold text-slate-800">Dynamic Performance Coaching</h4>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Evaluate pending burden heat, review note layouts, and suggest productivity hacks to balance your day.
                      </p>
                    </div>
                  </div>

                  {isOffline ? (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 text-center space-y-6 shadow-sm">
                      <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
                        <AlertCircle size={24} />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-800">Offline Mode Active</h4>
                        <p className="text-xs text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                          Coaching recommendations are currently unavailable because your device is offline. Make sure you are connected to the internet and click below to try again.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setIsOffline(!navigator.onLine);
                          if (navigator.onLine) {
                            handleProductivityAudit();
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-3 px-5 rounded-xl shadow-md flex items-center justify-center gap-1.5 mx-auto active:scale-95 transition-transform uppercase tracking-widest cursor-pointer"
                      >
                        <RefreshCw size={12} />
                        <span>Retry Connection</span>
                      </button>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 text-center space-y-6 shadow-sm">
                      <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                        <AlertCircle size={28} />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-800">Your Task List is Empty</h4>
                        <p className="text-xs text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                          We cannot evaluate performance coaching insights without active tasks. Please add some active tasks in your work board!
                        </p>
                      </div>
                    </div>
                  ) : coachLoading ? (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 text-center space-y-4 shadow-sm animate-pulse">
                      <Loader2 size={36} className="animate-spin mx-auto text-brand-primary" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800">Running Workspace Audit...</h4>
                        <p className="text-[10px] text-slate-400 max-w-[250px] mx-auto leading-relaxed">
                          Gemini is cross-referencing task deadlines, workload density ratios, and priorities.
                        </p>
                      </div>
                    </div>
                  ) : coachError ? (
                    <div className="bg-rose-50/75 border border-rose-150 rounded-[2.5rem] p-8 text-center space-y-6 shadow-sm">
                      <div className="w-14 h-14 bg-rose-100 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-650 mx-auto">
                        <AlertCircle size={24} />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-850">Performance Coach Error</h4>
                        <p className="text-[10px] font-medium text-rose-700 max-w-[240px] mx-auto leading-relaxed break-words font-mono">
                          {coachError}
                        </p>
                      </div>
                      <button
                        onClick={handleProductivityAudit}
                        className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-[11px] py-3.2 px-5 rounded-2xl shadow-md flex items-center justify-center gap-1.5 mx-auto active:scale-95 transition-transform cursor-pointer font-sans uppercase tracking-widest animate-pulse"
                      >
                        <RefreshCw size={12} />
                        <span>Run Audit Again</span>
                      </button>
                    </div>
                  ) : productivityAudit ? (
                    <div className="space-y-5">
                      {/* Workload Heat Index Bar Card */}
                      <div className="bg-white border border-slate-100/95 rounded-[2rem] p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Workload Heat Index</span>
                          <span className="text-[10px] uppercase font-sans font-extrabold text-indigo-500 px-3 py-1 bg-indigo-50/50 rounded-full border border-indigo-100/50">
                            {productivityAudit.workloadRating}
                          </span>
                        </div>

                        {/* Gauge Progress scale */}
                        <div className="space-y-2">
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${productivityAudit.heatPercent}%` }}
                              transition={{ duration: 0.6 }}
                              className={`h-full rounded-full ${
                                productivityAudit.heatPercent > 70 
                                  ? 'bg-gradient-to-r from-orange-400 to-rose-500' 
                                  : 'bg-gradient-to-r from-emerald-400 to-indigo-500'
                              }`} 
                            />
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                            <span>0% Stress (Free)</span>
                            <span className="text-slate-800 font-extrabold">{productivityAudit.heatPercent}% Dense</span>
                            <span>100% (Overwhelmed)</span>
                          </div>
                        </div>
                      </div>

                      {/* Coaching block quote bubble */}
                      <div className="bg-amber-50/60 border border-amber-100/50 rounded-[2rem] p-5 relative">
                        <div className="flex gap-2.5 items-start">
                          <span className="text-lg">💡</span>
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase font-extrabold tracking-widest text-amber-600">Personalized Coaching Advice</p>
                            <p className="text-[11px] italic text-slate-700 leading-normal">
                              "{productivityAudit.coachingTip}"
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Insights List Cards */}
                      <div className="space-y-3">
                        <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 pl-1">Targeted Recommendations</p>
                        
                        {productivityAudit.insights.map((insight, idx) => {
                          let priorityColor = 'text-blue-500 bg-blue-50 border-blue-100';
                          if (insight.priority === 'high') {
                            priorityColor = 'text-rose-500 bg-rose-50 border-rose-100';
                          } else if (insight.priority === 'medium') {
                            priorityColor = 'text-amber-500 bg-amber-50 border-amber-100';
                          }

                          return (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              key={idx} 
                              className="bg-white border border-slate-100 rounded-3xl p-4.5 shadow-sm flex gap-4.5 relative"
                            >
                              <div className={`p-2 rounded-xl text-[9px] font-extrabold uppercase border align-self-start self-start min-w-[50px] text-center ${priorityColor}`}>
                                {insight.priority}
                              </div>
                              <div className="space-y-1">
                                <h5 className="text-xs font-bold text-slate-800">{insight.title}</h5>
                                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                  {insight.body}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleProductivityAudit}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-3.5 font-bold text-xs transition-transform active:scale-[0.98]"
                      >
                        Refreshing Analysis Index
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 text-center space-y-6 shadow-sm">
                      <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                        <TrendingUp size={28} />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-850">Rhythm Index is Uncalculated</h4>
                        <p className="text-xs text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                          Get an instantaneous smart evaluation of your task burdens, timelines, and organizational notes.
                        </p>
                      </div>

                      <button
                        onClick={handleProductivityAudit}
                        className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 mx-auto transition-transform active:scale-95 duration-100 cursor-pointer"
                      >
                        🧠 Run Productivity Audit
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Conversational Input area (Visible for Co-pilot chat) */}
            {activeTab === 'copilot' && (
              <div className="p-6 pt-3 border-t border-slate-50 flex-shrink-0 bg-white">
                <form 
                  onSubmit={handleChatSubmit}
                  className="bg-slate-50 p-2 rounded-2xl flex items-center gap-2 border border-slate-200 shadow-sm"
                >
                  {/* Speech to text toggle dictating buttons */}
                  {supported ? (
                    <button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      className={`p-2.5 rounded-xl transition-all flex items-center justify-center border ${
                        isListening 
                          ? 'bg-rose-500 border-rose-400 text-white shadow-md' 
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700'
                      }`}
                      title={isListening ? "Stop listening voice command" : "Dictate voice command"}
                    >
                      {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                  ) : null}

                  <input
                    type="text"
                    placeholder={isListening ? "Listening... Speak now..." : "Create a task to buy groceries, draft a gym note, etc..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-xs p-2.5 font-semibold text-slate-800 placeholder:text-slate-350 outline-none"
                    disabled={isListening}
                  />
                  <button 
                    type="submit"
                    disabled={!input.trim() || isChatLoading || isListening}
                    className={`p-2.5 rounded-xl transition-all ${
                      input.trim() && !isChatLoading && !isListening
                        ? 'bg-slate-950 text-white shadow-lg active:scale-95' 
                        : 'text-slate-300'
                    }`}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
