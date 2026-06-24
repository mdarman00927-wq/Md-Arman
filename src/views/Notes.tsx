import { Search, StickyNote, Plus, Tag, Pin, FolderOpen, Calendar, FileDown, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Note } from '../types';
import { useAuth } from '../services/AuthContext';
import { pdfService } from '../services/pdfService';
import { excelService } from '../services/excelService';

interface NotesProps {
  notes: Note[];
  onAddNote: () => void;
  onEditNote?: (note: Note) => void;
  onTogglePinNote?: (id: string) => void;
  onDeleteNote?: (id: string) => void;
}

const CATEGORIES = ['All', 'General', 'Work', 'Personal', 'Ideas', 'Study', 'Finance'];

export default function Notes({ notes, onAddNote, onEditNote, onTogglePinNote, onDeleteNote }: NotesProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const handleExportPDF = () => {
    // Export the filtered notes so the user gets exactly what they see!
    pdfService.exportNotes(filteredNotes, {
      userName: user?.displayName || 'Alex',
      userEmail: user?.email || '',
    });
  };

  const handleExportExcel = () => {
    // Export the filtered notes to Excel
    excelService.exportNotes(filteredNotes, {
      userName: user?.displayName || 'Alex',
      userEmail: user?.email || '',
    });
  };

  // Sort: Pinned notes first
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  // Filter notes based on both search query and category tab
  const filteredNotes = sortedNotes.filter((note) => {
    const matchesSearch = 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.category && note.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (note.tags && note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesCategory = selectedCategory === 'All' || note.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6 pb-24 font-sans relative">
      {/* Title Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end"
      >
        <div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">Notes</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Keep your mental space organized.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Notes Archive (PDF/Excel) */}
          <button 
            type="button"
            onClick={handleExportPDF}
            className="glass hover:bg-white/80 dark:hover:bg-slate-900/80 text-indigo-600 dark:text-indigo-400 p-3 rounded-2xl shadow-sm border border-white/40 dark:border-slate-800/20 active:scale-95 transition-all cursor-pointer"
            title="Export Notes to PDF Archive"
          >
            <FileDown size={20} />
          </button>

          <button 
            type="button"
            onClick={handleExportExcel}
            className="glass hover:bg-white/80 dark:hover:bg-slate-900/80 text-teal-600 dark:text-emerald-400 p-3 rounded-2xl shadow-sm border border-white/40 dark:border-slate-800/20 active:scale-95 transition-all cursor-pointer"
            title="Export Notes to Excel Spreadsheet"
          >
            <FileSpreadsheet size={20} />
          </button>
          
          <button 
            type="button"
            onClick={onAddNote}
            className="bg-gradient-to-r from-indigo-505 to-indigo-650 hover:from-indigo-605 hover:to-indigo-705 p-3 rounded-2xl text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
            title="Create a new note"
          >
            <Plus size={20} />
          </button>
        </div>
      </motion.div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={18} className="text-slate-400 dark:text-slate-500" />
        </div>
        <input
          type="text"
          placeholder="Search note titles, content, categories, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full glass-input py-3.5 pl-12 pr-4 text-xs font-semibold focus:outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Category Horizontal Scrolling Tabs */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Categories</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 leading-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-[9.5px] font-extrabold uppercase px-4 py-2.5 rounded-xl border transition-all duration-300 flex-shrink-0 active:scale-95 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 border-indigo-600 text-white shadow-sm shadow-indigo-550/15'
                  : 'glass border-white/40 dark:border-slate-800/30 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredNotes.length > 0 ? (
          <AnimatePresence>
            {filteredNotes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(index * 0.04, 0.3) }}
                id={`note-card-${note.id}`}
                onClick={() => onEditNote?.(note)}
                className={`p-4 rounded-[1.85rem] border shadow-xs space-y-3 relative overflow-hidden group hover:shadow-md transition-all duration-300 cursor-pointer ${
                  note.pinned 
                    ? 'border-indigo-200/50 dark:border-indigo-950/60 bg-gradient-to-tr from-white/90 via-white/80 to-indigo-50/20 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-indigo-950/20 backdrop-blur-md shadow-sm' 
                    : 'glass hover:bg-white/90 dark:hover:bg-slate-900/80 border-slate-200/40 dark:border-slate-800/30'
                }`}
              >
                {/* Note Indicator Color Line */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5" 
                  style={{ backgroundColor: note.color }}
                />

                {/* Top Actions: Pin Icon */}
                <div className="flex items-start justify-between pt-1">
                  {note.category && (
                    <span className="text-[8px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                      {note.category}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePinNote?.(note.id);
                    }}
                    className={`p-1.5 rounded-lg hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors ml-auto cursor-pointer ${
                      note.pinned ? 'text-amber-500 font-bold' : 'text-slate-350 dark:text-slate-600 opacity-60 group-hover:opacity-100 transition-opacity'
                    }`}
                    title={note.pinned ? "Unpin Note" : "Pin Note"}
                  >
                    <Pin size={12} className={note.pinned ? 'fill-amber-500 text-amber-500' : ''} />
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm line-clamp-1 leading-snug">{note.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium leading-relaxed line-clamp-4 select-none whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>

                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[7.5px] font-extrabold uppercase py-0.5 px-1.5 bg-slate-100/30 dark:bg-slate-950/65 text-slate-400 dark:text-slate-500 rounded-md border border-slate-200/20 dark:border-slate-800/20">
                        {tag}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="text-[7.5px] font-bold text-slate-350 dark:text-slate-600">+{note.tags.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pt-2 border-t border-slate-150/50 dark:border-slate-800/15">
                  <Calendar size={10} className="text-slate-400 dark:text-slate-500 animate-pulse" />
                  <span>{note.updatedAt}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="col-span-2 py-12 text-center bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-8 rounded-[2rem] shadow-sm flex flex-col items-center justify-center space-y-3">
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-500">
              <StickyNote size={28} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {searchQuery || selectedCategory !== 'All' ? 'No Matching Notes' : 'No Notes Captured'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                {searchQuery || selectedCategory !== 'All' 
                  ? 'Try modifying your search keywords or switching categories to find other notes.' 
                  : 'Start writing ideas, quick tasks, meeting summaries, or personal goals to clean up your mental space!'}
              </p>
            </div>
            {!(searchQuery || selectedCategory !== 'All') && (
              <button
                type="button"
                onClick={onAddNote}
                className="mt-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
              >
                Write First Note
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
