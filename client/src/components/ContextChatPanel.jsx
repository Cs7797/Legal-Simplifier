import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatWithAssistant } from '../services/api';
import { getChatThread, getHistoryOwner, saveChatThread } from '../utils/historyStorage';
import Button from './ui/Button';
import GlassCard from './ui/GlassCard';

// Model-generated tables sometimes use HTML breaks inside a cell.
function remarkLineBreaks() {
  function visit(node) {
    if (node.type === 'html' && /^<br\s*\/?\s*>$/i.test(node.value)) {
      node.type = 'break';
      delete node.value;
    }
    node.children?.forEach(visit);
  }
  return visit;
}

const chatMarkdownPlugins = [remarkGfm, remarkLineBreaks];

function getInitialAssistantMessage(activeDocument) {
  if (activeDocument) {
    return {
      role: 'assistant',
      content: `Context loaded for "${activeDocument.filename}". Ask about clauses, risk, obligations, or next steps.`,
    };
  }

  return {
    role: 'assistant',
    content: 'Ask a legal-language question to begin.',
  };
}

function ContextChatPanel({ activeDocument, threadId, starters = [] }) {
  const initialMessage = useMemo(() => getInitialAssistantMessage(activeDocument), [activeDocument]);
  const [messages, setMessages] = useState(() => {
    const saved = getChatThread(threadId);
    return saved.length > 0 ? saved : [initialMessage];
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = getChatThread(threadId);
    setMessages(saved.length > 0 ? saved : [initialMessage]);
    setError('');
    setInput('');
  }, [initialMessage, threadId]);

  const persistMessages = (nextMessages) => {
    setMessages(nextMessages);
    saveChatThread(threadId, nextMessages);
  };

  const sendMessage = async (prefilledMessage) => {
    const userMessage = (prefilledMessage ?? input).trim();
    if (!userMessage || sending) {
      return;
    }

    const owner = getHistoryOwner();
    const nextMessages = [...messages, { role: 'user', content: userMessage }];
    persistMessages(nextMessages);
    setInput('');
    setError('');
    setSending(true);

    try {
      const response = await chatWithAssistant(nextMessages, activeDocument);
      if (getHistoryOwner() !== owner) return;
      persistMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: response.reply,
          sources: response.sources || [],
        },
      ]);
    } catch (err) {
      setError(err.message || 'Unable to get a response right now.');
    } finally {
      setSending(false);
    }
  };

  return (
    <GlassCard className="flex h-full flex-col p-5">
      <div className="mb-4">
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {activeDocument ? activeDocument.filename : ''}
        </p>
      </div>

      {starters.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {starters.map((starter) => (
            <motion.button
              key={starter}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              onClick={() => {
                void sendMessage(starter);
              }}
            >
              {starter}
            </motion.button>
          ))}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        {messages.map((message, index) => (
          <motion.article
            key={`${message.role}-${index}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
            className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${
              message.role === 'user'
                ? 'ml-auto bg-indigo-500 text-white'
                : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
            }`}
          >
            <div className={`mb-1 text-xs font-semibold uppercase tracking-[0.14em] ${message.role === 'user' ? 'text-indigo-100' : 'text-slate-400'}`}>
              {message.role === 'user' ? 'You' : ''}
            </div>
            {message.role === 'assistant' ? (
              <div className="chat-markdown">
                <Markdown remarkPlugins={chatMarkdownPlugins} skipHtml disallowedElements={['img']}>
                  {message.content}
                </Markdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
            {message.role === 'assistant' && Array.isArray(message.sources) && message.sources.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
              </div>
            )}
          </motion.article>
        ))}

        {sending && (
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
            className="max-w-[92%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            <div className="space-y-2">
              <div className="shimmer h-3 w-32 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="shimmer h-3 w-52 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
          </motion.article>
        )}
      </div>

      <div className="mt-4">
        <textarea
          id={`assistant-message-${threadId}`}
          className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Explain clause 5 and tell me whether it creates a tenant risk."
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <Button onClick={() => void sendMessage()} disabled={sending}>
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </GlassCard>
  );
}

export default ContextChatPanel;
