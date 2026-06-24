import { X, User as UserIcon, Image as ImageIcon, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { useAuth } from '../services/AuthContext';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80', // Female chic
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80', // Male design
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80', // Female bright
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=200&h=200&q=80', // Male clean 3D
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&h=200&q=80', // Male classic
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&h=200&q=80', // Designer portrait
];

export default function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, updateProfileDetails } = useAuth();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || PRESET_AVATARS[0]);
  const [customPhotoInput, setCustomPhotoInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display Name cannot be empty.');
      return;
    }
    
    setError(null);
    setLoading(true);
    try {
      const finalPhoto = customPhotoInput && customUrl ? customUrl : photoURL;
      await updateProfileDetails(displayName, finalPhoto);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile details.');
    } finally {
      setLoading(false);
    }
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 top-12 bg-white dark:bg-slate-900 rounded-t-[2.5rem] z-[90] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <button onClick={onClose} className="p-2 bg-slate-105 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
                <X size={20} />
              </button>
              <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">Edit User Profile</h2>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="text-brand-primary dark:text-indigo-400 font-bold text-sm uppercase tracking-wider disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Done'}
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {error && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-semibold p-3.5 rounded-2xl">
                  {error}
                </div>
              )}

              {/* Display Name Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <UserIcon size={12} /> Display name
                </label>
                <input
                  type="text"
                  placeholder="Your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-lg font-bold font-display text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none border-b border-slate-100 dark:border-slate-800 focus:border-brand-primary/40 pb-2 transition-all bg-transparent"
                />
              </div>

              {/* Avatar Picker */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <ImageIcon size={12} /> Avatar Selection
                </label>
                
                {/* Visual Preview */}
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl">
                  <img 
                    src={customPhotoInput && customUrl ? customUrl : photoURL} 
                    alt="Current Avatar" 
                    className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-800 shadow-md bg-slate-250 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80';
                    }}
                  />
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Avatar Live Preview</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-505 mt-0.5">Pick from our presets or define a custom photo URL below.</div>
                  </div>
                </div>

                {/* Preset Avatars Grid */}
                {!customPhotoInput && (
                  <div className="grid grid-cols-4 gap-3">
                    {PRESET_AVATARS.map((avatar) => {
                      const isSelected = photoURL === avatar;
                      return (
                        <button
                          type="button"
                          key={avatar}
                          onClick={() => setPhotoURL(avatar)}
                          className={`relative aspect-square rounded-2xl overflow-hidden active:scale-95 transition-all ${
                            isSelected ? 'ring-4 ring-brand-primary' : 'hover:scale-[1.02]'
                          }`}
                        >
                          <img src={avatar} alt="Avatar Preset" className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-brand-primary/25 flex items-center justify-center text-white">
                              <Check size={18} className="drop-shadow-sm font-bold" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Toggle option for custom Url */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Use custom Photo URL</span>
                  <button
                    type="button"
                    onClick={() => setCustomPhotoInput(!customPhotoInput)}
                    className="text-[10px] font-extrabold text-brand-primary dark:text-indigo-400 uppercase tracking-widest hover:underline"
                  >
                    {customPhotoInput ? 'Choose preset' : 'Enter URL'}
                  </button>
                </div>

                {customPhotoInput && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1.5 text-left"
                  >
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full pl-3 pr-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-805 focus:border-brand-primary/40 focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-650 focus:outline-none transition-all"
                    />
                  </motion.div>
                )}
              </div>
            </div>

            <div className="p-6">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-950 hover:bg-slate-850 text-white font-bold uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
              >
                {loading ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
