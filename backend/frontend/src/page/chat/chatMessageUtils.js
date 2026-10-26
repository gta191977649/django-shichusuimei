const buildFallbackMessageKey = (message, index) =>
  `${message?.role || "message"}:${message?.createdAt || message?.created_at || "unknown"}:${index}`;

export const getChatMessageKey = (message, index = 0) =>
  message?.uiKey ?? (message?.id != null ? `server:${message.id}` : buildFallbackMessageKey(message, index));

export const areChatMessagesEqual = (left, right) => {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    left.id === right.id &&
    left.uiKey === right.uiKey &&
    left.role === right.role &&
    left.content === right.content &&
    left.reasoning === right.reasoning &&
    left.createdAt === right.createdAt &&
    left.status === right.status &&
    left.error === right.error &&
    Boolean(left.typing) === Boolean(right.typing)
  );
};

const getLookupKeys = (message, index) => {
  const keys = [getChatMessageKey(message, index)];
  if (message?.id != null) keys.push(`id:${message.id}`);
  return keys;
};

export const mergeMessagesById = (existingMessages, incomingMessages, { position = "append" } = {}) => {
  const existing = Array.isArray(existingMessages) ? existingMessages : [];
  const incoming = Array.isArray(incomingMessages) ? incomingMessages.filter(Boolean) : [];

  if (position === "replace") {
    const previousById = new Map();
    existing.forEach((message, index) => {
      getLookupKeys(message, index).forEach((key) => previousById.set(key, message));
    });
    const nextMessages = [];
    const seen = new Set();

    incoming.forEach((message, index) => {
      const keys = getLookupKeys(message, index);
      if (keys.some((key) => seen.has(key))) return;
      keys.forEach((key) => seen.add(key));

      const previous = keys.map((key) => previousById.get(key)).find(Boolean);
      nextMessages.push(previous && areChatMessagesEqual(previous, message) ? previous : message);
    });

    return {
      messages: nextMessages,
      addedCount: nextMessages.length,
    };
  }

  const previousById = new Map();
  existing.forEach((message, index) => {
    getLookupKeys(message, index).forEach((key) => previousById.set(key, message));
  });
  const existingKeys = new Set(previousById.keys());
  const orderedSource = position === "prepend" ? [...incoming, ...existing] : [...existing, ...incoming];
  const nextMessages = [];
  const seen = new Set();
  let addedCount = 0;

  orderedSource.forEach((message, index) => {
    const keys = getLookupKeys(message, index);
    if (keys.some((key) => seen.has(key))) return;
    keys.forEach((key) => seen.add(key));

    const previous = keys.map((key) => previousById.get(key)).find(Boolean);
    if (!keys.some((key) => existingKeys.has(key))) {
      addedCount += 1;
    }

    nextMessages.push(previous && areChatMessagesEqual(previous, message) ? previous : message);
  });

  return {
    messages: nextMessages,
    addedCount,
  };
};

export const replaceChatMessageById = (messages, messageId, updater) => {
  if (!Array.isArray(messages) || messageId == null) return Array.isArray(messages) ? messages : [];

  let changed = false;
  const nextMessages = [];

  messages.forEach((message) => {
    if (message?.id !== messageId && message?.uiKey !== messageId) {
      nextMessages.push(message);
      return;
    }

    const updated =
      typeof updater === "function"
        ? updater(message)
        : updater && typeof updater === "object"
          ? { ...message, ...updater }
          : message;

    if (updated == null) {
      changed = true;
      return;
    }

    if (areChatMessagesEqual(message, updated)) {
      nextMessages.push(message);
      return;
    }

    changed = true;
    nextMessages.push(updated);
  });

  return changed ? nextMessages : messages;
};

export const reconcileChatMessage = (messages, messageKey, persistedMessage, fallback = {}) => {
  if (!Array.isArray(messages) || messageKey == null) return Array.isArray(messages) ? messages : [];

  const persistedId = persistedMessage?.id ?? null;
  let found = false;
  const nextMessages = [];

  messages.forEach((message) => {
    const isTarget = message?.uiKey === messageKey || message?.id === messageKey;
    if (!isTarget && persistedId != null && message?.id === persistedId) return;
    if (!isTarget) {
      nextMessages.push(message);
      return;
    }

    found = true;
    nextMessages.push({
      ...message,
      ...fallback,
      ...(persistedMessage || {}),
      uiKey: message.uiKey ?? String(messageKey),
      status: persistedMessage ? "complete" : (fallback.status ?? "complete"),
      typing: false,
      error: fallback.error ?? null,
    });
  });

  if (!found && persistedMessage) nextMessages.push(persistedMessage);
  return nextMessages;
};

export const removeChatMessagesById = (messages, messageIds) => {
  if (!Array.isArray(messages) || !Array.isArray(messageIds) || messageIds.length === 0) {
    return Array.isArray(messages) ? messages : [];
  }

  const removeIds = new Set(messageIds);
  let changed = false;
  const nextMessages = messages.filter((message) => {
    const shouldKeep = !removeIds.has(message?.id);
    if (!shouldKeep) changed = true;
    return shouldKeep;
  });

  return changed ? nextMessages : messages;
};
