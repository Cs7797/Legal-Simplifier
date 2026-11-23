import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AuthPage from './pages/AuthPage';
import DocumentAnalyzerPage from './pages/DocumentAnalyzerPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import LegalAssistantPage from './pages/LegalAssistantPage';
import ThemeToggle from './components/ui/ThemeToggle';
import { deleteAnalysis, fetchAnalysisFileUrl, fetchAnalysisHistory } from './services/api';
import { supabase } from './lib/supabase';
import { applyTheme, getStoredTheme, persistTheme } from './utils/theme';
import {
  clearLegacyBrowserHistory,
  getHistoryOwner,
  setHistoryOwner,
  deleteAnalysisRecord,
  getActiveDocumentId,
  getAnalysisHistory,
  getAnalysisRecord,
  saveAnalysisRecord,
  setActiveDocumentId,
} from './utils/historyStorage';

const ROUTES = {
  home: '#/',
  analyze: '#/analyze',
  assistant: '#/assistant',
  dashboard: '#/dashboard',
  login: '#/login',
  docs: '#/docs',
  about: '#/about',
  signup: '#/signup',
};

const PROTECTED_ROUTES = new Set([ROUTES.analyze, ROUTES.assistant, ROUTES.dashboard]);

const NAV_ITEMS = [
  { href: ROUTES.home, label: 'Overview' },
  { href: ROUTES.analyze, label: 'Analyze' },
  { href: ROUTES.assistant, label: 'Assistant' },
  { href: ROUTES.dashboard, label: 'Dashboard' },
  { href: ROUTES.docs, label: 'Docs' },
];

function cn(...values) {
  return values.filter(Boolean).join(' ');
}

function parseHash(hash) {
  if (!hash || hash === '#') {
    return { path: ROUTES.home, params: new URLSearchParams() };
  }

  const rawValue = hash.startsWith('#') ? hash.slice(1) : hash;
  const [rawPath = '/', queryString = ''] = rawValue.split('?');
  const normalizedPath = `#${rawPath}`;
  const path = normalizedPath === ROUTES.about ? ROUTES.docs : Object.values(ROUTES).includes(normalizedPath) ? normalizedPath : ROUTES.home;

  return {
    path,
    params: new URLSearchParams(queryString),
  };
}

function buildLoginRedirect(targetPath, reason = 'auth') {
  const params = new URLSearchParams({
    redirect: targetPath,
    reason,
  });

  return `${ROUTES.login}?${params.toString()}`;
}

function App() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  const [history, setHistory] = useState(() => getAnalysisHistory());
  const [activeDocumentId, setActiveDocumentState] = useState(() => getActiveDocumentId());
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [workspaceError, setWorkspaceError] = useState('');
  const userId = user?.id || null;
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    const syncRoute = () => {
      setRoute(parseHash(window.location.hash));
      setHistory(getAnalysisHistory());
      setActiveDocumentState(getActiveDocumentId());
    };

    if (!window.location.hash) {
      window.location.hash = ROUTES.home;
    }

    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  useEffect(() => {
    clearLegacyBrowserHistory();
    if (!supabase) return undefined;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      const nextOwner = nextUser?.id || null;
      if (nextOwner !== getHistoryOwner()) {
        setHistoryOwner(nextOwner);
        setHistory([]);
        setActiveDocumentState(null);
        setWorkspaceError('');
      }
      setUser(nextUser);
      setAuthReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();

    async function loadRemoteHistory() {
      try {
        const records = await fetchAnalysisHistory(userId, controller.signal);
        if (controller.signal.aborted || getHistoryOwner() !== userId) return;

        [...records].reverse().forEach((record) => {
          if (!getAnalysisRecord(record.id)) saveAnalysisRecord(record, { activate: false });
        });
        setHistory(getAnalysisHistory());
        if (!getActiveDocumentId() && records.length > 0) {
          setActiveDocumentId(records[0].id);
          setActiveDocumentState(records[0].id);
        }
      } catch {
        if (!controller.signal.aborted && getHistoryOwner() === userId) {
          setWorkspaceError('Could not load your saved history. Reload the page to try again.');
        }
      }
    }

    void loadRemoteHistory();
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!user && PROTECTED_ROUTES.has(route.path)) {
      window.location.hash = buildLoginRedirect(route.path, 'auth');
    }
  }, [authReady, route.path, user]);

  const activeDocument = useMemo(() => getAnalysisRecord(activeDocumentId), [activeDocumentId, history]);

  const syncLocalState = () => {
    setHistory(getAnalysisHistory());
    setActiveDocumentState(getActiveDocumentId());
  };

  const handleAnalysisSaved = (result) => {
    if (getHistoryOwner() !== userId) return;
    const record = saveAnalysisRecord(result);
    setHistory(getAnalysisHistory());
    setActiveDocumentState(record.id);
  };

  const hydrateRemoteFileIfNeeded = async (documentId) => {
    const record = getAnalysisRecord(documentId);

    if (!record?.cloudSaved || record.fileData || record.fileType !== 'pdf') {
      return;
    }

    try {
      const fileUrl = await fetchAnalysisFileUrl(documentId, userId);
      if (getHistoryOwner() !== userId) return;
      if (fileUrl) {
        saveAnalysisRecord({ ...record, fileUrl }, { activate: false });
        setHistory(getAnalysisHistory());
      }
    } catch {
      if (getHistoryOwner() === userId) setWorkspaceError('Could not open the original PDF. Try reopening the document.');
    }
  };

  useEffect(() => {
    if (route.path === ROUTES.analyze && activeDocument?.cloudSaved && !activeDocument.fileUrl) {
      void hydrateRemoteFileIfNeeded(activeDocument.id);
    }
  }, [activeDocument?.id, route.path, userId]);
  const handleOpenDocument = async (documentId) => {
    setWorkspaceError('');
    await hydrateRemoteFileIfNeeded(documentId);
    if (getHistoryOwner() !== userId) return;
    setActiveDocumentId(documentId);
    setActiveDocumentState(documentId);
    window.location.hash = ROUTES.analyze;
  };

  const handleOpenAssistant = (documentId) => {
    setActiveDocumentId(documentId);
    setActiveDocumentState(documentId);
    window.location.hash = ROUTES.assistant;
  };

  const handleDeleteDocument = async (documentId) => {
    setWorkspaceError('');
    const record = getAnalysisRecord(documentId);
    try {
      if (record?.cloudSaved) await deleteAnalysis(documentId, userId);
      if (getHistoryOwner() !== userId) return;
      deleteAnalysisRecord(documentId);
      syncLocalState();
    } catch {
      if (getHistoryOwner() === userId) setWorkspaceError('Could not delete this document. Try again.');
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      setWorkspaceError('Sign-out failed. Try again.');
      return;
    }
    window.location.hash = ROUTES.home;
  };

  const page = useMemo(() => {
    if (PROTECTED_ROUTES.has(route.path) && (!authReady || !user)) {
      return <p className="py-10 text-center text-sm">Checking your session…</p>;
    }
    switch (route.path) {
      case ROUTES.analyze:
        return (
          <DocumentAnalyzerPage
            key={userId}
            initialRecord={activeDocument}
            onAnalysisSaved={handleAnalysisSaved}
            user={user}
            history={history}
            onOpenDocument={handleOpenDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        );
      case ROUTES.assistant:
        return <LegalAssistantPage key={userId} activeDocument={activeDocument} user={user} />;
      case ROUTES.dashboard:
        return (
          <DashboardPage
            history={history}
            onOpenDocument={handleOpenDocument}
            onOpenAssistant={handleOpenAssistant}
            onDeleteDocument={handleDeleteDocument}
            user={user}
            onSignOut={handleSignOut}
          />
        );
      case ROUTES.login:
        return (
          <AuthPage
            initialMode="login"
            redirectTo={PROTECTED_ROUTES.has(route.params.get('redirect')) ? route.params.get('redirect') : ROUTES.dashboard}
            message={route.params.get('reason') === 'auth' ? 'Please sign in to continue.' : ''}
          />
        );
      case ROUTES.signup:
        return (
          <AuthPage
            initialMode="signup"
            redirectTo={PROTECTED_ROUTES.has(route.params.get('redirect')) ? route.params.get('redirect') : ROUTES.dashboard}
            message={route.params.get('reason') === 'auth' ? 'Please create an account or sign in to continue.' : ''}
          />
        );
      case ROUTES.docs:
      case ROUTES.about:
        return <HomePage mode="docs" user={user} />;
      case ROUTES.home:
      default:
        return <HomePage mode="home" user={user} />;
    }
  }, [activeDocument, authReady, history, route, user]);

  return (
    <div className="app-background relative flex min-h-screen flex-col overflow-hidden text-slate-950 transition-colors dark:text-slate-50">
      <div className="premium-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute left-[-10rem] top-[-12rem] h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl dark:bg-indigo-500/10" />
      <div className="pointer-events-none absolute right-[-8rem] top-20 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl dark:bg-purple-500/10" />

      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#05050a]/75">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <motion.a
            className="flex items-center gap-3"
            href={ROUTES.home}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25">
              LS
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Document Analyzer</div>
            </div>
          </motion.a>

          <nav className="hidden items-center gap-2 md:flex" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                className={cn(
                  'rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition duration-200 ease-in-out hover:bg-white/70 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
                  route.path === item.href && 'bg-white/80 text-slate-950 shadow-sm dark:bg-white/10 dark:text-white'
                )}
                href={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle
              theme={theme}
              onToggle={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            />
            {user ? (
              <button
                className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition duration-200 ease-in-out hover:bg-white/70 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            ) : (
              <a
                className={cn(
                  'rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition duration-200 ease-in-out hover:bg-white/70 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
                  route.path === ROUTES.login && 'bg-white/80 text-slate-950 shadow-sm dark:bg-white/10 dark:text-white'
                )}
                href={ROUTES.login}
              >
                Login
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={route.path}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
          >
            {workspaceError && <p role="alert" className="my-3 text-sm text-red-700 dark:text-red-300">{workspaceError}</p>}
            {page}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative z-10 mt-auto border-t border-white/50 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-[#05050a]/70">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-4 py-4 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 dark:text-slate-400">
          <p>Legal Simplifier helps people review legal documents in plain language.</p>
          <p>Informational only. Not a substitute for licensed legal advice.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
