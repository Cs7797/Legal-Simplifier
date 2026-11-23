import React, { useMemo } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getDisplayName(user) {
  if (!user) return 'there';
  return user.user_metadata?.username || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'there';
}

function DashboardPage({ history, onOpenDocument, onOpenAssistant, onDeleteDocument, user, onSignOut }) {
  const displayName = getDisplayName(user);

  const stats = useMemo(() => {
    const clauses = history.reduce((sum, record) => sum + (record.clauses?.length || 0), 0);
    const highRiskDocs = history.filter((record) => (record.clauses || []).some((clause) => clause.riskLevel === 'HIGH')).length;
    return [
      { label: 'Saved analyses', value: history.length },
      { label: 'Clause items', value: clauses },
      { label: 'High-risk docs', value: highRiskDocs },
      { label: 'Chat-ready docs', value: history.length },
    ];
  }, [history]);

  if (!user) {
    return (
      <section className="py-6">
        <GlassCard className="mx-auto max-w-3xl p-8 text-center">
          <Badge variant="indigo">Secure workspace</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Sign in to view your dashboard</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Your review history and saved document context are available after login.</p>
          <div className="mt-6">
            <Button as="a" href="#/login?redirect=%23%2Fdashboard&reason=auth">
              Go to login
            </Button>
          </div>
        </GlassCard>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Welcome, {displayName}</h1>
          </div>
          <div className="flex gap-2">
            <Button as="a" href="#/analyze">New analysis</Button>
            <Button variant="secondary" onClick={onSignOut}>Sign out</Button>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <GlassCard key={stat.label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{stat.value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">History</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Recent document analyses</h2>
            </div>
            <Badge>{history.length}</Badge>
          </div>

          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No analyses yet. Upload a document to start building your workspace.
              </div>
            ) : (
              history.map((record) => (
                <article key={record.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-slate-950 dark:text-white">{record.filename}</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(record.createdAt)}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{record.preview || 'No preview available.'}</p>
                    </div>
                    <Badge variant="indigo">{String(record.language || 'en').toUpperCase()}</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => onOpenDocument(record.id)}>Open analysis</Button>
                    <Button variant="secondary" onClick={() => onOpenAssistant(record.id)}>Open chat</Button>
                    <Button variant="ghost" onClick={() => onDeleteDocument(record.id)}>Delete</Button>
                  </div>
                </article>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

export default DashboardPage;
