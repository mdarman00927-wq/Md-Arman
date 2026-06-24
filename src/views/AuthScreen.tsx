import React, { useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User as UserIcon, Sparkles, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function AuthScreen() {
  const { 
    signInWithGoogle, 
    loginWithEmail, 
    signupWithEmail, 
    resetPassword, 
    signInAsGuest,
    isDemoMode 
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setError(null);
    setMessage(null);
  };

  const handleTabChange = (tab: 'login' | 'signup' | 'forgot') => {
    setActiveTab(tab);
    resetFields();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all standard credentials.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please double check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName || !confirmPassword) {
      setError('Please fill in all requested registration details.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await signupWithEmail(email, password, displayName);
      setMessage('Account registered successfully! A secure verification link was dispatched to your inbox. Please verify your email.');
      // Auto transition to login after sending email verification
      setTimeout(() => {
        setActiveTab('login');
      }, 4000);
    } catch (err: any) {
      setError(err?.message || 'Signup failed. Please try a different email.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your email address to build a reset link.');
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await resetPassword(email);
      setMessage('A secure password reset link has been dispatched to your inbox.');
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch reset request. Verify email.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Google authentication process was interrupted.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInAsGuest();
    } catch (err: any) {
      setError(err?.message || 'Guest session initialization was interrupted.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center px-6 py-12 relative overflow-hidden font-sans transition-colors duration-300">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-200/40 dark:bg-indigo-950/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-violet-200/35 dark:bg-violet-950/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto space-y-8 z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex bg-brand-primary p-3 rounded-2xl text-white shadow-xl shadow-brand-primary/20 mb-2"
          >
            <Sparkles size={28} />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white"
          >
            NexTask
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-sm text-slate-500 dark:text-slate-400 font-medium"
          >
            A high-efficiency personal planner and AI assistant.
          </motion.p>
        </div>

        {/* Demo Mode / Sandbox indicator */}
        {isDemoMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3.5 rounded-2xl flex items-start gap-2.5"
          >
            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-amber-850 dark:text-amber-300 leading-normal">
              <span className="font-bold uppercase tracking-wider block mb-0.5">Sandbox Preview Active</span>
              Sign in with Google, register a new profile, or log in instantly with the credentials:
              <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded mx-1 font-bold">demo@nextask.com</code> / 
              <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded mx-1 font-bold">password</code>
            </div>
          </motion.div>
        )}

        {/* Main interactive Card */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-[2.5rem] overflow-hidden p-8"
        >
          {/* Action Tabs Selector */}
          {activeTab !== 'forgot' && (
            <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl mb-8 border border-slate-100 dark:border-slate-800/60 select-none">
              <button
                onClick={() => handleTabChange('login')}
                className={`flex-1 text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-all ${
                  activeTab === 'login' 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md shadow-slate-200/50 dark:shadow-none border border-transparent dark:border-slate-800' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => handleTabChange('signup')}
                className={`flex-1 text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-all ${
                  activeTab === 'signup' 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md shadow-slate-200/50 dark:shadow-none border border-transparent dark:border-slate-800' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Form Content / Multi-View wrapper */}
          <AnimatePresence mode="wait">
             {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-medium p-3.5 rounded-2xl flex flex-col gap-2 mb-6"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                {(error.toLowerCase().includes('network') || error.toLowerCase().includes('internal') || error.toLowerCase().includes('restricted') || error.toLowerCase().includes('unauthorized')) && (
                  <button
                    type="button"
                    onClick={handleGuestSignIn}
                    className="mt-1.5 self-start px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Continue as Guest (Offline Fallback)
                  </button>
                )}
              </motion.div>
            )}

            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-400 text-xs font-medium p-3.5 rounded-2xl flex items-start gap-2.5 mb-6 text-left"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1.5 flex-shrink-0" />
                <span>{message}</span>
              </motion.div>
            )}

            {/* LOGIN STATE */}
            {activeTab === 'login' && (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleLogin}
                className="space-y-5 text-left"
              >
                <div className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email Connection</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Mail size={16} />
                      </div>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 focus:border-brand-primary/40 focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-brand-primary/20 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Password</label>
                      <button 
                        type="button"
                        onClick={() => handleTabChange('forgot')}
                        className="text-[10px] font-extrabold text-brand-primary dark:text-indigo-400 uppercase tracking-widest hover:underline"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Lock size={16} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 focus:border-brand-primary/40 focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-brand-primary/20 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 animate-none"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 active:scale-[0.98] text-white font-bold uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Processing...' : 'Secure Login'}
                  {!loading && <ArrowRight size={14} />}
                </button>
              </motion.form>
            )}

            {/* SIGNUP STATE */}
            {activeTab === 'signup' && (
              <motion.form
                key="signup-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleSignup}
                className="space-y-4 text-left"
              >
                {/* Display Name Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <UserIcon size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="Alex Johnson"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 focus:border-brand-primary/40 focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-brand-primary/20 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 focus:border-brand-primary/40 focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-brand-primary/20 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Define Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 focus:border-brand-primary/40 focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-brand-primary/20 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Verify Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 focus:border-brand-primary/40 focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-brand-primary/20 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-brand-primary hover:bg-brand-primary/95 active:scale-[0.98] text-white font-bold uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-brand-primary/10 disabled:opacity-50 mt-4 cursor-pointer"
                >
                  {loading ? 'Creating...' : 'Register Profile'}
                  {!loading && <ArrowRight size={14} />}
                </button>
              </motion.form>
            )}

            {/* FORGOT PASSWORD STATE */}
            {activeTab === 'forgot' && (
              <motion.form
                key="forgot-form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleForgotPassword}
                className="space-y-4 text-left"
              >
                <div className="space-y-2 mb-4">
                  <h3 className="text-md font-bold text-slate-800 dark:text-white">Password Recovery</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 leading-normal">
                    Enter your username or email address and we'll dispatch instructions to reset your passcode details securely.
                  </p>
                </div>

                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Account Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 focus:border-brand-primary/40 focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-brand-primary/20 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleTabChange('login')}
                    className="flex-1 py-4 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500 dark:text-slate-450 font-bold uppercase tracking-widest text-xs rounded-2xl transition-all cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold uppercase tracking-widest text-xs rounded-2xl transition-all disabled:opacity-50 shadow-xl shadow-brand-primary/10 cursor-pointer"
                  >
                    {loading ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Social Sign-In option */}
          {activeTab !== 'forgot' && (
            <div className="mt-8 space-y-4">
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-100 dark:border-slate-800/50"></div>
                <span className="flex-shrink mx-3 text-[9px] text-slate-300 dark:text-slate-600 font-extrabold uppercase tracking-widest">or continue with</span>
                <div className="flex-grow border-t border-slate-100 dark:border-slate-800/50"></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex items-center justify-center gap-2.5 py-3.5 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-200 text-[10.5px] font-bold uppercase tracking-widest rounded-2xl transition-all shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" width="100%" height="100%">
                    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.274 1.565-1.797 4.6-6.887 4.6-4.4 0-7.986-3.643-7.986-8.12S7.84 2.766 12.24 2.766c2.5 0 4.17 1.042 5.13 1.958l3.253-3.13C18.543.6 15.655 0 12.24 0 5.58 0 0 5.483 0 12.22s5.58 12.22 12.24 12.22c6.96 0 11.57-4.89 11.57-11.754 0-.79-.085-1.397-.188-1.936l-11.383-.005z"/>
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={handleGuestSignIn}
                  disabled={loading}
                  className="flex items-center justify-center gap-2.5 py-3.5 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-200 text-[10.5px] font-bold uppercase tracking-widest rounded-2xl transition-all shadow-xs cursor-pointer"
                >
                  <UserIcon size={14} className="text-slate-400 dark:text-slate-500" />
                  <span>Guest Mode</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
