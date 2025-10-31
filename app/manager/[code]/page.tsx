'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { motion } from 'framer-motion';

export default function ManagerCodePage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    verifyCode();
  }, [code]);

  const verifyCode = async () => {
    try {
      const response = await fetch('/api/manager/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError('Invalid manager code');
        setLoading(false);
        return;
      }

      if (data.hasManager) {
        // Manager already exists, redirect to dashboard
        router.push('/manager/dashboard');
      } else {
        // Need to set up manager account
        setNeedsSetup(true);
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to verify code');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/manager/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, ...formData }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to setup manager');
        setLoading(false);
        return;
      }

      // Store in localStorage
      localStorage.setItem('football_user_id', data.userId);
      localStorage.setItem('football_username', data.username);

      // Redirect to manager dashboard
      router.push('/manager/dashboard');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (loading && !needsSetup) {
    return (
      <AuroraBackground>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl text-gray-900 dark:text-white font-medium"
        >
          Verifying manager code...
        </motion.div>
      </AuroraBackground>
    );
  }

  if (error && !needsSetup) {
    return (
      <AuroraBackground>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-zinc-700 text-center max-w-md"
        >
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Invalid Code</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-blue-500/50"
          >
            Go Home
          </motion.button>
        </motion.div>
      </AuroraBackground>
    );
  }

  if (needsSetup) {
    return (
      <AuroraBackground>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: 'easeInOut',
          }}
          className="relative z-10 w-full max-w-md px-4"
        >
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-zinc-700">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-center mb-8"
            >
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent mb-2">
                Manager Setup
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-2">Create your manager account</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                💡 Bookmark this page to access manager features
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-all duration-200"
                  placeholder="John"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-all duration-200"
                  placeholder="Smith"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-all duration-200"
                  placeholder="johnsmith"
                />
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
                >
                  <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                </motion.div>
              )}

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold py-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/50"
              >
                {loading ? 'Setting up...' : 'Create Manager Account'}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </AuroraBackground>
    );
  }

  return null;
}
