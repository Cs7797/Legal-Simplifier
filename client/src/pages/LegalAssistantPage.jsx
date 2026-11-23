import React from 'react';
import ContextChatPanel from '../components/ContextChatPanel';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';

const STARTERS = [
  'Explain what an indemnity clause means in simple terms.',
  'What should I check before signing a rental agreement?',
  'Help me understand termination clauses in an employment contract.',
];

function LegalAssistantPage({ activeDocument, user }) {
  if (!user) {
    return (
      <section className="py-6">
        <GlassCard className="mx-auto max-w-3xl p-8 text-center">
          <Badge variant="indigo">Secure workspace</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Sign in to use the assistant</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">The assistant keeps document context private inside your workspace.</p>
          <div className="mt-6">
            <Button as="a" href="#/login?redirect=%23%2Fassistant&reason=auth">
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
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">AI CHAT</h1>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ContextChatPanel
          activeDocument={activeDocument}
          threadId={activeDocument ? `document-${activeDocument.id}` : 'general-assistant'}
          starters={activeDocument ? ['Explain clause 4', 'What is the top risk?', 'Summarize this in 3 bullets'] : STARTERS}
        /> 
      </div>
    </section>
  );
}

export default LegalAssistantPage;
