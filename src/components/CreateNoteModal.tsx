import { X, Tag, Palette, Check, Pin, Trash2, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { Note } from '../types';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Partial<Note>) => void;
  editingNote?: Note | null;
  onDelete?: (id: string) => void;
}

const COLORS = [
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

const CATEGORIES = ['General', 'Work', 'Personal', 'Ideas', 'Study', 'Finance'];

export default function CreateNoteModal({ isOpen, onClose, onSave, editingNote, onDelete }: CreateNoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[1]);

  useEffect(() => {
    if (isOpen) {
      if (editingNote) {
        setTitle(editingNote.title || '');
        setContent(editingNote.content || '');
        setColor(editingNote.color || COLORS[0]);
        setTags(editingNote.tags || []);
        setPinned(editingNote.pinned || false);
        setCategory(editingNote.category || CATEGORIES[1]);
      } else {
        setTitle('');
        setContent('');
        setColor(COLORS[0]);
        setTags([]);
        setPinned(false);
        setCategory(CATEGORIES[1]);
      }
    }
  }, [isOpen, editingNote]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleDelete = () => {
    if (editingNote && onDelete) {
      onDelete(editingNote.id);
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    onSave({
      id: editingNote?.id,
      title: title || 'Untitled Note',
      content,
      color,
      tags,
      pinned,
      category,
    });
    
    setTitle('');
    setContent('');
    setColor(COLORS[0]);
    setTags([]);
    setPinned(false);
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
              <h2 className="text-lg font-bold font-display text-slate-900">
                {editingNote ? 'Edit Note' : 'New Note'}
              </h2>
              <button 
                onClick={handleSubmit}
                className="text-brand-primary font-bold text-sm uppercase tracking-wider"
              >
                Done
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="space-y-4">
                <input
                  autoFocus
                  type="text"
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-2xl font-bold font-display text-slate-900 placeholder:text-slate-300 focus:outline-none"
                />
                <textarea
                  placeholder="Start typing your thoughts..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full text-slate-600 placeholder:text-slate-300 focus:outline-none resize-none min-h-[220px] text-sm leading-relaxed"
                />
              </div>

              {/* Customization Grid */}
              <div className="space-y-6">
                {/* Pin Toggle */}
                <button
                  type="button"
                  onClick={() => setPinned(!pinned)}
                  className={`flex items-center justify-between w-full p-4 rounded-2xl border transition-all ${
                    pinned 
                      ? 'bg-amber-50/50 border-amber-200/60 text-amber-900' 
                      : 'bg-slate-50/60 border-slate-150 text-slate-600 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Pin size={15} className={pinned ? 'text-amber-500 fill-amber-500' : 'text-slate-400'} />
                    <div className="text-left font-sans">
                      <p className="text-xs font-bold">Pin Note to Top</p>
                      <p className="text-[9px] text-slate-400 font-medium">Keep this note pinned above others.</p>
                    </div>
                  </div>
                  <div className={`w-8 h-4 rounded-full transition-colors flex items-center p-0.5 ${pinned ? 'bg-amber-500' : 'bg-slate-200'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-xs transform duration-200 ${pinned ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>

                {/* Category Picker */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <FolderOpen size={12} /> Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border transition-all ${
                          category === cat
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Picker */}
                <div className="space-y-3 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <Palette size={12} /> Note Color
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
                          color === c ? 'ring-4 ring-slate-100 scale-110' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {color === c && <Check size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags Picker */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1 font-sans">
                    <Tag size={12} /> Tags
                  </label>
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-50 rounded-2xl">
                    {tags.map((tag) => (
                      <motion.span
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={tag}
                        className="bg-white text-slate-600 text-[10px] font-bold uppercase py-1.5 px-3 rounded-full border border-slate-100 flex items-center gap-2 shadow-sm"
                      >
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-rose-500">
                          <X size={10} />
                        </button>
                      </motion.span>
                    ))}
                    <input
                      type="text"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 bg-transparent text-xs font-medium text-slate-600 focus:outline-none placeholder:text-slate-300 px-2"
                    />
                  </div>
                </div>
              </div>

              {/* Danger / Delete Section */}
              {editingNote && (
                <div className="pt-6 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full py-4 bg-rose-50 hover:bg-rose-100/80 border border-rose-100 text-rose-600 rounded-2xl text-[10px] font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                  >
                    <Trash2 size={13} /> Delete Note
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Saving Footer */}
            <div className="p-6 pt-0">
               <div className="text-[9px] text-center text-slate-300 font-bold uppercase tracking-widest">
                  Changes sync and save automatically
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
