const MAX_HISTORY_ITEMS = 25;
let history = [];
let activeDocumentId = null;
let owner = null;
const chats = new Map();

export function setHistoryOwner(userId) {
  if (owner === userId) return;
  clearStoredAnalysisData();
  owner = userId;
}

export function getHistoryOwner() {
  return owner;
}

export function getAnalysisHistory() {
  return history;
}

export function saveAnalysisRecord(result, { activate = true } = {}) {
  const id = result.docId;
  const record = {
    ...getAnalysisRecord(id),
    ...result,
    id,
    preview: result.preview || String(result.simplified || '').replace(/^[-*]\s+/gm, '').slice(0, 220),
  };
  history = [record, ...history.filter((item) => item.id !== id)].slice(0, MAX_HISTORY_ITEMS);
  if (activate) setActiveDocumentId(id);
  return record;
}

export function deleteAnalysisRecord(id) {
  history = history.filter((record) => record.id !== id);
  chats.delete(`document-${id}`);
  if (activeDocumentId === id) setActiveDocumentId(history[0]?.id || null);
}

export function clearStoredAnalysisData() {
  history = [];
  activeDocumentId = null;
  chats.clear();
}

export function clearLegacyBrowserHistory() {
  try {
    const storage = window.localStorage;
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (/^(legal-simplifier|legalease)\.(analysisHistory|activeDocumentId|chat\.)/.test(key)) {
        storage.removeItem(key);
      }
    }
  } catch {
    // Browser storage can be disabled.
  }
}

export function getAnalysisRecord(id) {
  return history.find((record) => record.id === id) || null;
}

export function setActiveDocumentId(id) {
  activeDocumentId = id;
}

export function getActiveDocumentId() {
  return activeDocumentId;
}

export function getChatThread(threadId) {
  return chats.get(threadId) || [];
}

export function saveChatThread(threadId, messages) {
  chats.set(threadId, messages);
}
