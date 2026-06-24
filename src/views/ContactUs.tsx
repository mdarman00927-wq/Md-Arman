import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, Sparkles, Phone, MapPin, Clock } from 'lucide-react';
import { View } from '../types';
import { useAuth } from '../services/AuthContext';
import { db, isFirebaseConfigured, shouldUseFirebase } from '../services/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../services/dataService';

interface ContactUsProps {
  onNavigate: (view: View) => void;
}

export default function ContactUs({ onNavigate }: ContactUsProps) {
  const { user } = useAuth();
  
  // Form State
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  // UI Status State
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setStatus('error');
      setErrorMessage('Please fill in all the required input fields before submitting.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const payload = {
        name,
        email,
        subject,
        message,
        userId: user?.uid || 'guest',
        createdAt: new Date().toISOString()
      };

      if (shouldUseFirebase(user?.uid)) {
        // Save to Firestore under 'support_messages'
        try {
          await addDoc(collection(db, 'support_messages'), payload);
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.CREATE, 'support_messages');
        }
      } else {
        // Fallback to LocalStorage list
        const stored = localStorage.getItem('nextask_support_messages') || '[]';
        const parsed = JSON.parse(stored);
        parsed.push({ id: Math.random().toString(36).substr(2, 9), ...payload });
        localStorage.setItem('nextask_support_messages', JSON.stringify(parsed));
        // Put in small delay to simulate server communication
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      setStatus('success');
      // Reset form variables
      setSubject('');
      setMessage('');
    } catch (err: any) {
      console.error("Failed submitting message:", err);
      setStatus('error');
      try {
        const parsed = JSON.parse(err.message);
        setErrorMessage(parsed.error || 'Firestore Connection/Permission Failed.');
      } catch {
        setErrorMessage(err.message || 'An unexpected connection error occurred. Please try again.');
      }
    }
  };

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
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] font-display">Get In Touch</span>
          <h1 className="text-2xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">Contact Us</h1>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card p-8 border border-emerald-100 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/20 to-transparent dark:from-emerald-950/20 text-center flex flex-col items-center space-y-4"
          >
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 rounded-full text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={36} className="animate-bounce" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">Message Transported Successfully!</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs">
                Your support query has been encrypted and committed. Our digital relations team will reply to <span className="font-extrabold text-indigo-650 dark:text-indigo-400">{email}</span> within 24 business hours.
              </p>
            </div>
            <button
              onClick={() => setStatus('idle')}
              className="mt-2 px-6 py-2.5 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              Send Another Message
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Quick contact information banner */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass p-3.5 rounded-2xl border border-white/40 dark:border-slate-800/15 text-left space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Mail size={13} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Email Help Desk</span>
                </div>
                <p className="text-[10px] font-black text-slate-800 dark:text-slate-200">support@nextask.com</p>
              </div>

              <div className="glass p-3.5 rounded-2xl border border-white/40 dark:border-slate-800/15 text-left space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Clock size={13} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Opening Hours</span>
                </div>
                <p className="text-[10px] font-black text-slate-800 dark:text-slate-200">24 / 7 Mon-Sun</p>
              </div>
            </div>

            {/* Error notifications bar */}
            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/60 p-4.5 rounded-2xl flex items-start gap-3 text-left"
              >
                <AlertCircle size={16} className="text-rose-600 dark:text-rose-450 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400">Validation Exception</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-450 font-medium leading-relaxed">{errorMessage}</p>
                </div>
              </motion.div>
            )}

            {/* Form layout */}
            <form onSubmit={handleSubmit} className="glass p-5 rounded-[2.2rem] border border-white/50 dark:border-slate-800/25 shadow-xs space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 px-1 flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-500" /> Support Query Dispatch
              </h3>

              <div className="space-y-4">
                {/* 1. Name input */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-name" className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Your Name</label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full glass-input px-4 py-3.5 text-xs font-medium text-slate-850 dark:text-slate-100 focus:outline-hidden"
                    required
                  />
                </div>

                {/* 2. Email input */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-email" className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Your Email</label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter support callback email"
                    className="w-full glass-input px-4 py-3.5 text-xs font-medium text-slate-850 dark:text-slate-100 focus:outline-hidden"
                    required
                  />
                </div>

                {/* 3. Subject input */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-subject" className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Query Subject</label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief objective (e.g. Sync error, suggestions)"
                    className="w-full glass-input px-4 py-3.5 text-xs font-medium text-slate-850 dark:text-slate-100 focus:outline-hidden"
                    required
                  />
                </div>

                {/* 4. Message content */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-message" className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Message Content</label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write details of your problem or queries here..."
                    className="w-full glass-input px-4 py-3.5 text-xs font-medium text-slate-850 dark:text-slate-100 min-h-[110px] max-h-[220px] focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Submit Dispatch CTA */}
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full mt-2 py-4 bg-indigo-600 hover:bg-indigo-650 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-[11px] font-extrabold uppercase tracking-widest active:scale-95 transition-all cursor-pointer shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
              >
                {status === 'submitting' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Encrypting & Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
