import React, { useEffect, useMemo, useState } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import { supabase } from '../lib/supabase';

function AuthPage({ initialMode = 'login', redirectTo = '#/dashboard', message = '' }) {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(message);

  const title = useMemo(
    () => (mode === 'signup' ? 'Create your secure legal review workspace' : 'Sign in to continue your reviews'),
    [mode]
  );

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setNotice(message);
  }, [initialMode, message]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!supabase) {
      setError('Supabase client is not configured on the frontend.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              username: username.trim(),
              full_name: username.trim(),
              name: username.trim(),
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          window.location.hash = redirectTo;
          return;
        }

        setNotice('Check your email for a confirmation link, then sign in.');
        setMode('login');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        window.location.hash = redirectTo;
      }
    } catch (submitError) {
      setError(submitError.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1.05fr)_420px]">
      <GlassCard className="p-8">
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h1>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            'Secure authentication',
            'Saved review history per user',
            'Document-aware AI assistant',
            'Clean dashboard for legal analysis',
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              {item}
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${mode === 'login' ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${mode === 'signup' ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Username</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. sukhe"
                minLength={2}
                required
              />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
              minLength={6}
              required
            />
          </label>

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? 'Working...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        {notice && <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}
        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </GlassCard>
    </section>
  );
}

export default AuthPage;
