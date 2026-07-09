const buildFallbackMessageKey = (message, index) =>
  `${message?.role || "message"}:${message?.createdAt || message?.created_at || "unknown"}:${index}`;

export const areChatMessagesEqual = (left, right) => {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    left.id === right.id &&
    left.role === right.role &&
    left.content === right.content &&
    left.reasoning === right.reasoning &&
    left.createdAt === right.createdAt &&
    Boolean(left.typing) === Boolean(right.typing)
  );
};

export const mergeMessagesById = (existingMessages, incomingMessages, { position = "append" } = {}) => {
  const existing = Array.isArray(existingMessages) ? existingMessages : [];
  const incoming = Array.isArray(incomingMessages) ? incomingMessages.filter(Boolean) : [];

  if (position === "replace") {
    const previousById = new Map(existing.map((message, index) => [message.id ?? buildFallbackMessageKey(message, index), message]));
    const nextMessages = [];
    const seen = new Set();

    incoming.forEach((message, index) => {
      const key = message.id ?? buildFallbackMessageKey(message, index);
      if (seen.has(key)) return;
      seen.add(key);

      const previous = previousById.get(key);
      nextMessages.push(previous && areChatMessagesEqual(previous, message) ? previous : message);
    });

    return {
      messages: nextMessages,
      addedCount: nextMessages.length,
    };
  }

  const previousById = new Map(existing.map((message, index) => [message.id ?? buildFallbackMessageKey(message, index), message]));
  const existingKeys = new Set(previousById.keys());
  const orderedSource = position === "prepend" ? [...incoming, ...existing] : [...existing, ...incoming];
  const nextMessages = [];
  const seen = new Set();
  let addedCount = 0;

  orderedSource.forEach((message, index) => {
    const key = message.id ?? buildFallbackMessageKey(message, index);
    if (seen.has(key)) return;
    seen.add(key);

    const previous = previousById.get(key);
    if (!existingKeys.has(key)) {
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
    if (message?.id !== messageId) {
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
