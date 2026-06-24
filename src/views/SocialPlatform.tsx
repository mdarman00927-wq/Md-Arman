import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Upload, 
  File, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  BarChart2, 
  Folder, 
  Grid, 
  List, 
  ArrowUpDown, 
  User, 
  Camera, 
  RefreshCw, 
  ExternalLink,
  ShieldAlert,
  Sliders,
  Check,
  CheckCircle,
  FileDown
} from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { fileService, FileRecord, FileCategory, getFileCategory } from '../services/fileService';

type SubView = 'feed' | 'my-files' | 'stats' | 'profile';

export default function SocialPlatform() {
  const { user, updateProfileDetails } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<SubView>('feed');
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit State
  const [editingName, setEditingName] = useState(user?.displayName || '');
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileProgress, setProfileProgress] = useState(0);
  const profileInputRef = useRef<HTMLInputElement>(null);

  // Search & Sorting States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<FileCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const data = await fileService.fetchAllFiles();
      setFiles(data);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to fetch shared files feed.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  // File Upload Core Logic (Cloudinary Unsigned Preset + Firestore Metadata)
  const handleFileUpload = async (file: File) => {
    if (!user) {
      showToast("Authentication required to upload media files.", "error");
      return;
    }

    // Size Validations (Image < 10MB, PDF < 15MB, Videos < 50MB)
    const category = getFileCategory(file.type, file.name);
    const sizeInMB = file.size / (1024 * 1024);

    if (category === 'image' && sizeInMB > 10) {
      showToast("Image size exceeds the 10MB maximum limit.", "warning");
      return;
    }
    if (category === 'video' && sizeInMB > 50) {
      showToast("Video size exceeds the 50MB maximum limit.", "warning");
      return;
    }
    if (category === 'pdf' && sizeInMB > 15) {
      showToast("PDF document size exceeds the 15MB maximum limit.", "warning");
      return;
    }
    if (category === 'other' && sizeInMB > 10) {
      showToast("File size exceeds 10MB limit.", "warning");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload directly to Cloudinary via unsigned preset mapping
      const uploadResult = await fileService.uploadToCloudinary(file, (progress) => {
        setUploadProgress(progress);
      });

      // 2. Persist media metadata in Firestore collection 'files'
      const fileId = Math.random().toString(36).substr(2, 9);
      await fileService.saveFileMetadata(user.uid, {
        id: fileId,
        fileName: file.name,
        fileType: category,
        fileUrl: uploadResult.fileUrl,
        cloudinaryPublicId: uploadResult.publicId,
      });

      showToast(`Successfully uploaded "${file.name}" to Cloudinary!`, "success");
      
      // Reload matching lists
      await loadFiles(true);
      setActiveTab('feed');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed uploading file. Please check settings.", "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Avatar profile picture upload using Cloudinary
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const file = e.target.files[0];
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > 5) {
        showToast("Profile image must be under 5MB.", "warning");
        return;
      }

      setProfileUploading(true);
      setProfileProgress(0);

      try {
        const uploadResult = await fileService.uploadToCloudinary(file, (progress) => {
          setProfileProgress(progress);
        });

        // Update profile in Auth and FireStore
        await updateProfileDetails(user.displayName || 'Alex', uploadResult.fileUrl);
        showToast("Profile picture updated successfully!", "success");
        await loadFiles(true);
      } catch (err: any) {
        console.error(err);
        showToast(err.message || "Avatar upload failed.", "error");
      } finally {
        setProfileUploading(false);
        setProfileProgress(0);
      }
    }
  };

  // Save updated Name
  const handleSaveProfileName = async () => {
    if (!user) return;
    const name = editingName.trim();
    if (!name) {
      showToast("Display name cannot be empty.", "warning");
      return;
    }
    try {
      setLoading(true);
      await updateProfileDetails(name, user.photoURL || undefined);
      showToast("Display name updated!", "success");
      await loadFiles(true);
    } catch (err) {
      showToast("Failed to save display name.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Delete matching owned files
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${fileName}"?`)) return;

    try {
      showToast("Deleting file...", "info");
      await fileService.deleteFile(user.uid, fileId);
      showToast("File permanently deleted.", "success");
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err: any) {
      showToast(err.message || "Failed deleting file from platform.", "error");
    }
  };

  // Handle direct file downloading in browser
  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      showToast("Initializing secure download...", "info");
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      showToast("Download started!", "success");
    } catch (e) {
      // Fallback direct link opening
      window.open(fileUrl, '_blank');
      showToast("Opening direct file preview download.", "success");
    }
  };

  // Filtering + Searching + Sorting matching lists
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (file.userName && file.userName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === 'all' ? true : file.fileType === selectedType;
    return matchesSearch && matchesType;
  });

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === 'name') {
      return a.fileName.localeCompare(b.fileName);
    }
    return 0;
  });

  const myUploadedFiles = sortedFiles.filter(f => f.uid === user?.uid);

  // Statistics Computations
  const statsCounts = files.reduce((acc, f) => {
    acc[f.fileType] = (acc[f.fileType] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { image: 0, video: 0, pdf: 0, other: 0, total: 0 });

  const myStatsCounts = files.filter(f => f.uid === user?.uid).reduce((acc, f) => {
    acc[f.fileType] = (acc[f.fileType] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { image: 0, video: 0, pdf: 0, other: 0, total: 0 });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-28 relative">
      
      {/* Decorative Neon Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-indigo-900/30 px-6 py-4.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Compass size={18} className="animate-spin-slow text-indigo-100" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">Social Hub</h1>
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block mt-0.5">Media Ecosystem</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'feed' && (
            <button 
              onClick={() => loadFiles(true)}
              className="p-2 bg-slate-800/85 border border-slate-700/50 text-slate-350 hover:text-white rounded-xl transition-all cursor-pointer hover:bg-slate-750 active:scale-95 flex items-center justify-center"
              title="Refresh Feed"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin text-indigo-400" : ""} />
            </button>
          )}

          <button
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Me" className="w-5 h-5 rounded-full object-cover border border-indigo-400/40" referrerPolicy="no-referrer" />
            ) : (
              <User size={12} />
            )}
            <span className="truncate max-w-[60px]">{user?.displayName?.split(' ')[0] || 'Me'}</span>
          </button>
        </div>
      </header>

      {/* Unsigned Preset Connection Guard Display */}
      {(!(import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET || (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET === '<UPLOAD_PRESET_NAME>') && (
        <div className="mx-6 mt-4 p-4.5 bg-rose-500/10 border border-rose-500/30 rounded-2.5xl flex items-start gap-3.5">
          <ShieldAlert size={20} className="text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Cloudinary Upload Locked</h4>
            <p className="text-[11px] text-rose-300/85 leading-relaxed">
              VITE_CLOUDINARY_UPLOAD_PRESET is currently unconfigured. Set up local credentials in .env file to enable high-fidelity media hosting.
            </p>
          </div>
        </div>
      )}

      {/* Main Body Stage */}
      <main className="p-6 space-y-6">

        {/* Global Progress Indicators (Floating style to keep user informed) */}
        <AnimatePresence>
          {uploading && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RefreshCw size={12} className="animate-spin text-indigo-400" />
                  <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Uploading to Cloudinary</span>
                </div>
                <span className="text-xs font-black font-mono text-indigo-400">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-150" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Segment Categories Switches */}
        <div className="grid grid-cols-4 bg-slate-900 border border-slate-800/60 p-1 rounded-2xl">
          {[
            { id: 'feed', label: 'Feed', icon: Compass },
            { id: 'my-files', label: 'My Files', icon: Folder },
            { id: 'stats', label: 'Stats', icon: BarChart2 },
            { id: 'profile', label: 'Profile', icon: User }
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as SubView)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  active 
                    ? 'bg-indigo-500 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={15} />
                <span className="text-[9px] font-extrabold uppercase tracking-widest">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Inner Sub-Views rendering */}
        <div className="space-y-6">

          {/* ================= SOCIAL FEED VIEW ================= */}
          {activeTab === 'feed' && (
            <div className="space-y-5">
              
              {/* Dynamic Filtering Panel */}
              <div className="space-y-3 bg-slate-900/60 border border-slate-800/50 p-4 rounded-3xl">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files or creators..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                    <Filter size={10} /> Type:
                  </span>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'image', label: 'Images' },
                    { id: 'video', label: 'Videos' },
                    { id: 'pdf', label: 'PDFs' },
                    { id: 'other', label: 'Others' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedType(t.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        selectedType === t.id 
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' 
                          : 'bg-slate-950 text-slate-400 border border-slate-805/50 hover:text-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/40 pt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSortBy(prev => prev === 'newest' ? 'oldest' : 'newest')}
                      className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowUpDown size={10} />
                      <span>Sort: {sortBy === 'newest' ? 'Newest' : 'Oldest'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-350'}`}
                    >
                      <Grid size={12} />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === 'list' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-350'}`}
                    >
                      <List size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Feed Grid & list rendering */}
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="animate-spin text-indigo-500" size={24} />
                  <p className="text-xs text-slate-500 font-medium">Re-syncing files social feed...</p>
                </div>
              ) : sortedFiles.length === 0 ? (
                <div className="py-20 bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl text-center space-y-3.5 px-6">
                  <Compass size={32} className="text-slate-700 mx-auto" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Shared Media Found</h3>
                    <p className="text-[11px] text-slate-550 max-w-xs mx-auto mt-1 leading-relaxed">
                      Be the first creator to share media items! Toggle to the "My Files" sub-tab to configure and start uploads.
                    </p>
                  </div>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'}>
                  {sortedFiles.map((file) => {
                    const isMyFile = file.uid === user?.uid;
                    return (
                      <motion.div
                        layout
                        key={file.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-slate-805/60 rounded-[1.8rem] overflow-hidden flex flex-col justify-between shadow-lg"
                      >
                        {/* Media Preview Stage */}
                        <div className="relative aspect-square w-full bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800/40">
                          {file.fileType === 'image' ? (
                            <img 
                              src={file.fileUrl} 
                              alt={file.fileName} 
                              className="w-full h-full object-cover select-none cursor-zoom-in"
                              onClick={() => {
                                window.open(file.fileUrl, '_blank');
                              }}
                            />
                          ) : file.fileType === 'video' ? (
                            <video 
                              src={file.fileUrl} 
                              controls 
                              playsInline 
                              className="w-full h-full object-contain"
                            />
                          ) : file.fileType === 'pdf' ? (
                            <div className="flex flex-col items-center gap-3.5 p-6 animate-pulse">
                              <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                                <FileText size={22} />
                              </div>
                              <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">PDF Book</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3.5 p-6">
                              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <File size={22} />
                              </div>
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">Binary raw</span>
                            </div>
                          )}

                          {/* Quick File type Badge overlay */}
                          <div className="absolute top-3 right-3 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md rounded-lg text-[8px] font-bold text-indigo-400 uppercase tracking-widest border border-indigo-500/20 shadow-sm leading-none flex items-center gap-1">
                            {file.fileType === 'image' && <ImageIcon size={8} />}
                            {file.fileType === 'video' && <Video size={8} />}
                            {file.fileType === 'pdf' && <FileText size={8} />}
                            {file.fileType === 'other' && <File size={8} />}
                            <span>{file.fileType}</span>
                          </div>
                        </div>

                        {/* Description & metadata panel */}
                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-white tracking-tight leading-snug line-clamp-1 hover:underline cursor-pointer" title={file.fileName} onClick={() => window.open(file.fileUrl, '_blank')}>
                              {file.fileName}
                            </h4>
                            <span className="text-[9px] text-slate-500 block leading-none font-medium">
                              {new Date(file.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>

                          {/* Publisher Details (ShareChat-like Social branding) */}
                          <div className="flex items-center justify-between gap-1 border-t border-slate-800/40 pt-3 mt-1">
                            <div className="flex items-center gap-2 min-w-0">
                              {file.userPhotoURL ? (
                                <img src={file.userPhotoURL} alt={file.userName} className="w-5.5 h-5.5 rounded-full object-cover shrink-0 border border-slate-800" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-5.5 h-5.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {file.userName?.charAt(0).toUpperCase() || 'A'}
                                </div>
                              )}
                              <span className="text-[10px] font-bold text-slate-300 truncate leading-none">
                                {isMyFile ? 'Me' : file.userName || 'Anonymous'}
                              </span>
                            </div>

                            {/* Download & self deletion triggers */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleDownloadFile(file.fileUrl, file.fileName)}
                                className="p-1.5 bg-slate-950 hover:bg-slate-800 hover:text-white rounded-lg text-slate-400 transition-all cursor-pointer flex items-center justify-center border border-slate-805/50"
                                title="Download File"
                              >
                                <Download size={11} />
                              </button>
                              
                              {isMyFile && (
                                <button
                                  onClick={() => handleDeleteFile(file.id, file.fileName)}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center border border-rose-500/20"
                                  title="Delete File"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= MY FILES TAB AND UPLOADER ================= */}
          {activeTab === 'my-files' && (
            <div className="space-y-6">
              
              {/* Complex Drag and Drop Upload container Area */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[2.2rem] p-8 text-center space-y-4 cursor-pointer transition-all duration-300 ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-500/5 shadow-2xl scale-[1.01]' 
                    : 'border-slate-800 bg-slate-900/20 hover:border-slate-700/80 hover:bg-slate-900/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,video/*,application/pdf"
                />

                <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-indigo-400 shadow-md">
                  <Upload size={21} className="animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Upload New File</h3>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Drag and drop your file here, or click to browse local folders.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-805 flex items-center gap-1.5 shadow-sm">
                    <ImageIcon size={11} className="text-indigo-400" /> Image (10M)
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850 flex items-center gap-1.5 shadow-sm">
                    <Video size={11} className="text-pink-400" /> Video (50M)
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-805 flex items-center gap-1.5 shadow-sm">
                    <FileText size={11} className="text-emerald-400" /> PDF Document (15M)
                  </span>
                </div>
              </div>

              {/* Uploading progress overlay list */}
              {uploading && (
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <RefreshCw size={11} className="animate-spin text-indigo-500" />
                      Uploading queue file...
                    </span>
                    <span className="text-xs font-extrabold font-mono text-indigo-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1">
                    <div className="bg-indigo-500 h-1 rounded-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* User specifically owned Shared files list */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Folder size={12} />
                    <span>My Uploaded Files ({myUploadedFiles.length})</span>
                  </h3>
                </div>

                {myUploadedFiles.length === 0 ? (
                  <div className="py-14 bg-slate-900/10 border border-slate-850 rounded-3xl text-center px-6 text-slate-500 space-y-2.5">
                    <File size={26} className="text-slate-800 mx-auto" />
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">No uploads recorded yet</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">Your Cloudinary uploads will be compiled in this view.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {myUploadedFiles.map((file) => (
                      <div 
                        key={file.id}
                        className="bg-slate-900 border border-slate-805/50 p-3.5 rounded-2.5xl flex items-center justify-between gap-3 shadow-md border-l-2 border-l-indigo-500"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {file.fileType === 'image' && (
                            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-slate-950 border border-slate-800 flex items-center justify-center">
                              <img src={file.fileUrl} alt={file.fileName} className="w-full h-full object-cover" />
                            </div>
                          )}
                          {file.fileType === 'video' && (
                            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-slate-950 border border-slate-800 flex items-center justify-center text-pink-400">
                              <Video size={16} />
                            </div>
                          )}
                          {file.fileType === 'pdf' && (
                            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-slate-950 border border-slate-800 flex items-center justify-center text-rose-500">
                              <FileText size={16} />
                            </div>
                          )}
                          {file.fileType === 'other' && (
                            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-slate-950 border border-slate-850 flex items-center justify-center text-slate-400">
                              <File size={16} />
                            </div>
                          )}

                          <div className="min-w-0 space-y-1">
                            <h4 className="text-xs font-semibold text-white truncate leading-none hover:underline cursor-pointer" onClick={() => window.open(file.fileUrl, '_blank')}>
                              {file.fileName}
                            </h4>
                            <span className="text-[9px] text-slate-500 block leading-none">
                              {new Date(file.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleDownloadFile(file.fileUrl, file.fileName)}
                            className="p-2 bg-slate-950 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-850/60"
                            title="Download File"
                          >
                            <Download size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id, file.fileName)}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-450 hover:text-white border border-rose-500/20 rounded-lg transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ================= STATISTICS DASHBOARD ================= */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                  <BarChart2 size={12} className="text-indigo-400" />
                  <span>File Statistics Dashboard</span>
                </h3>
              </div>

              {/* Multi-source statistical summary cards widget */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-805/60 p-4 rounded-3xl space-y-1 shadow-md">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Ecosystem Shared</span>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-black text-white">{statsCounts.total}</span>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide">Files</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-805/60 p-4 rounded-3xl space-y-1 shadow-md">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Your Contributions</span>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-black text-indigo-400">{myStatsCounts.total}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Files</span>
                  </div>
                </div>
              </div>

              {/* Categorized detailed distributions breakdown list */}
              <div className="bg-slate-900 border border-slate-805 p-5 rounded-[1.8rem] space-y-4 shadow-lg">
                <h4 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest border-b border-slate-800/60 pb-2 flex items-center justify-between">
                  <span>File Categories Breakdown</span>
                  <span className="text-[9px] font-bold text-slate-500 capitalize font-sans">(Ecosystem vs Me)</span>
                </h4>

                <div className="space-y-4">
                  {[
                    { id: 'image', label: 'Images', icon: ImageIcon, color: 'bg-indigo-500', text: 'text-indigo-400' },
                    { id: 'video', label: 'Videos', icon: Video, color: 'bg-pink-500', text: 'text-pink-400' },
                    { id: 'pdf', label: 'PDF Documents', icon: FileText, color: 'bg-rose-500', text: 'text-rose-400' },
                    { id: 'other', label: 'Other/Raw Binary', icon: File, color: 'bg-slate-500', text: 'text-slate-400' },
                  ].map((cat) => {
                    const countAll = statsCounts[cat.id as FileCategory] || 0;
                    const countMine = myStatsCounts[cat.id as FileCategory] || 0;
                    const pctAll = statsCounts.total > 0 ? Math.round((countAll / statsCounts.total) * 100) : 0;
                    const Icon = cat.icon;

                    return (
                      <div key={cat.id} className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2 text-slate-200">
                            <Icon size={12} className={cat.text} />
                            <span>{cat.label}</span>
                          </div>
                          <div className="font-mono text-[10px] space-x-2">
                            <span className="text-white font-bold">{countAll} shared</span>
                            <span className="text-slate-500">·</span>
                            <span className={`${cat.text} font-bold`}>{countMine} mine</span>
                          </div>
                        </div>

                        {/* Visual nested progress bar */}
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex shadow-inner">
                          <div className={`${cat.color} h-full rounded-full`} style={{ width: `${pctAll}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clean diagnostic info panel */}
              <div className="bg-slate-905 border border-indigo-950 p-4 rounded-3xl flex items-start gap-3 bg-indigo-500/5">
                <CheckCircle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Active Storage Guard</h5>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Media files are verified automatically for virus signatures and structure integrity during direct uploads to Cloudinary storage buckets.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ================= EDIT PROFILE & PARAMS ================= */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                  <User size={12} className="text-indigo-400" />
                  <span>My Social Profile Settings</span>
                </h3>
              </div>

              <div className="bg-slate-900 border border-slate-805 p-6 rounded-[2rem] space-y-6 flex flex-col items-center">
                
                {/* Avatar Photo Editor with Cloudinary Upload */}
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-950 border-2 border-indigo-500 flex items-center justify-center shadow-lg relative">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={36} className="text-slate-600" />
                    )}

                    {profileUploading && (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-indigo-400 gap-1 rounded-full">
                        <RefreshCw size={14} className="animate-spin" />
                        <span className="text-[8px] font-bold font-mono">{profileProgress}%</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => profileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-2 bg-indigo-600 border border-slate-950 hover:bg-indigo-500 text-white rounded-full shadow-md transition-all scale-95 cursor-pointer flex items-center justify-center active:scale-90"
                    title="Change Photos"
                  >
                    <Camera size={13} />
                  </button>

                  <input
                    type="file"
                    ref={profileInputRef}
                    onChange={handleAvatarChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>

                <div className="w-full space-y-1.5 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Connected Email Account</span>
                  <span className="text-xs font-semibold text-slate-300 font-mono select-all bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-850 inline-block leading-none">{user?.email || 'offline-guest@nextask.com'}</span>
                </div>

                <div className="w-full border-t border-slate-800/40 my-1" />

                {/* Account Settings Forms */}
                <div className="w-full space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Display Nickname</label>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="My nickname name"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    onClick={handleSaveProfileName}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md mt-2 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check size={11} />
                    <span>Save Profile Settings</span>
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>

      </main>

    </div>
  );
}
