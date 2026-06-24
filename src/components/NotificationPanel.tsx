import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification } from '../services/NotificationContext';
import { useAuth } from '../services/AuthContext';
import { 
  X, 
  Trash2, 
  CheckCheck, 
  Info, 
  Target, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { user } = useAuth();
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    clearAll, 
    deleteNotification 
  } = useNotification();

  // Helper to obtain the correct visual theme per alert category
  const getTypeMeta = (type: string) => {
    switch (type) {
      case 'focus':
        return {
          icon: Target,
          bg: 'bg-amber-50 border-amber-100/65',
          text: 'text-amber-600',
          badge: 'Focus Sprint'
        };
      case 'task':
        return {
          icon: Clock,
          bg: 'bg-emerald-50 border-emerald-100/65',
          text: 'text-emerald-600',
          badge: 'Task Notice'
        };
      case 'reminder':
        return {
          icon: AlertCircle,
          bg: 'bg-rose-50 border-rose-100/65',
          text: 'text-rose-600',
          badge: 'Alert'
        };
      default:
        return {
          icon: Info,
          bg: 'bg-indigo-50 border-indigo-100/65',
          text: 'text-indigo-600',
          badge: 'System'
        };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 pointer-events-auto"
          />

          {/* Core Panel Content */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-white rounded-t-[3rem] border border-slate-100 min-h-[60vh] max-h-[85vh] overflow-y-auto z-50 flex flex-col shadow-2xl pb-6"
          >
            {/* Top Pull Handle */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-4 flex-shrink-0" />

            {/* Header section */}
            <div className="px-6 pb-4 flex items-center justify-between border-b border-slate-50 flex-shrink-0">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-800 font-display">Notification Center</h2>
                <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-500">
                  {notifications.filter(n => !n.read).length} Unread Alerts
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Control action buttons */}
            {notifications.length > 0 && (
              <div className="px-6 py-3 bg-slate-50/50 flex justify-between items-center border-b border-slate-50/70 text-xs flex-shrink-0">
                <button
                  onClick={markAllAsRead}
                  className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1.5 transition-colors active:scale-95"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
                <button
                  onClick={clearAll}
                  className="text-slate-400 hover:text-rose-500 font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
                >
                  <Trash2 size={14} /> Clear all
                </button>
              </div>
            )}

            {/* Scrollable Alerts Body List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-50/60 border border-indigo-100/50 flex items-center justify-center text-indigo-400">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-700">All caught up!</h3>
                    <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                      Everything is neat and organized. New alarms and timers will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map((notif) => {
                  const meta = getTypeMeta(notif.type);
                  const IconComponent = meta.icon;

                  return (
                    <motion.div
                      layout
                      key={notif.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => !notif.read && markAsRead(notif.id)}
                      className={`p-4 rounded-3xl border flex items-start gap-4 transition-all relative overflow-hidden group ${
                        notif.read 
                          ? 'bg-white border-slate-100 opacity-65 hover:bg-slate-50' 
                          : `${meta.bg} border-opacity-70 hover:scale-[1.01] hover:shadow-sm cursor-pointer`
                      }`}
                    >
                      {/* Left Dot Indicator for unread items */}
                      {!notif.read && (
                        <div className="absolute top-4 left-2 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      )}

                      {/* Icon Container */}
                      <div className={`p-2.5 rounded-2xl bg-white border border-slate-50 flex-shrink-0 ${meta.text} shadow-sm`}>
                        <IconComponent size={18} />
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 min-w-0 space-y-1 pr-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${meta.text}`}>
                            {meta.badge}
                          </span>
                          <span className="text-[8px] font-medium text-slate-400">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className={`text-xs font-bold leading-normal truncate ${notif.read ? 'text-slate-700' : 'text-slate-800'}`}>
                          {notif.title}
                        </h4>
                        <p className="text-[10px] font-medium text-slate-400 group-hover:text-slate-500 leading-normal">
                          {notif.body}
                        </p>
                      </div>

                      {/* Right actions (delete individual notification) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="p-1.5 bg-white/70 border border-slate-100/60 rounded-xl text-slate-300 hover:text-rose-500 hover:border-rose-100 hover:scale-105 opacity-0 group-hover:opacity-100 transition-all active:scale-95 flex-shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
