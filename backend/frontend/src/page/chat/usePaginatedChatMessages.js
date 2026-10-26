import { useCallback, useEffect, useRef, useState } from "react";
import { mergeMessagesById } from "./chatMessageUtils";

export const CHAT_VIRTUOSO_BASE_INDEX = 100000;

export function usePaginatedChatMessages({
  sessionId,
  enabled,
  pageSize,
  loadPage,
}) {
  const [messages, setMessagesState] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [firstItemIndex, setFirstItemIndex] = useState(CHAT_VIRTUOSO_BASE_INDEX);

  const messagesRef = useRef([]);
  const requestIdRef = useRef(0);
  const initialAbortRef = useRef(null);
  const olderAbortRef = useRef(null);

  const setMessages = useCallback((nextValue) => {
    setMessagesState((current) => {
      const nextMessages = typeof nextValue === "function" ? nextValue(current) : nextValue;
      messagesRef.current = Array.isArray(nextMessages) ? nextMessages : [];
      return messagesRef.current;
    });
  }, []);

  const resetState = useCallback(
    ({ ready = false } = {}) => {
      initialAbortRef.current?.abort();
      olderAbortRef.current?.abort();
      messagesRef.current = [];
      setMessagesState([]);
      setHasMore(false);
      setLoadingInitial(false);
      setLoadingOlder(false);
      setIsReady(ready);
      setError(null);
      setFirstItemIndex(CHAT_VIRTUOSO_BASE_INDEX);
    },
    []
  );

  const loadLatestPage = useCallback(({ reset = false } = {}) => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    initialAbortRef.current?.abort();
    olderAbortRef.current?.abort();

    if (!enabled || !sessionId) {
      resetState({ ready: true });
      return () => {};
    }

    const controller = new AbortController();
    initialAbortRef.current = controller;
    if (reset) {
      messagesRef.current = [];
      setMessagesState([]);
      setHasMore(false);
      setFirstItemIndex(CHAT_VIRTUOSO_BASE_INDEX);
    }
    setLoadingOlder(false);
    setLoadingInitial(true);
    setIsReady(!reset && messagesRef.current.length > 0);
    setError(null);

    loadPage(sessionId, { limit: pageSize, signal: controller.signal })
      .then((page) => {
        if (requestId !== requestIdRef.current || controller.signal.aborted) return;
        const localMessages = messagesRef.current.filter(
          (message) => message?.status && message.status !== "complete"
        );
        const serverMessages = mergeMessagesById([], page.messages, { position: "replace" }).messages;
        const merged = mergeMessagesById(serverMessages, localMessages, { position: "append" });
        messagesRef.current = merged.messages;
        setMessagesState(merged.messages);
        setHasMore(Boolean(page.hasMoreOlder));
        setFirstItemIndex(CHAT_VIRTUOSO_BASE_INDEX - serverMessages.length);
      })
      .catch((errorValue) => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        console.error(errorValue);
        if (messagesRef.current.length === 0) {
          setHasMore(false);
        }
        setError("会話メッセージの読み込みに失敗しました。");
      })
      .finally(() => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setLoadingInitial(false);
        setIsReady(true);
      });

    return () => {
      controller.abort();
    };
  }, [enabled, loadPage, pageSize, resetState, sessionId]);

  useEffect(() => loadLatestPage({ reset: true }), [loadLatestPage]);

  useEffect(
    () => () => {
      initialAbortRef.current?.abort();
      olderAbortRef.current?.abort();
    },
    []
  );

  const loadOlderMessages = useCallback(async () => {
    if (!enabled || !sessionId || loadingInitial || loadingOlder || !hasMore || messagesRef.current.length === 0) {
      return;
    }

    const beforeId = messagesRef.current[0]?.id;
    if (!beforeId || typeof beforeId !== "number") {
      setHasMore(false);
      return;
    }

    olderAbortRef.current?.abort();
    const controller = new AbortController();
    olderAbortRef.current = controller;

    setLoadingOlder(true);
    setError(null);

    try {
      const page = await loadPage(sessionId, {
        beforeId,
        limit: pageSize,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (!page.messages.length) {
        setHasMore(false);
        return;
      }

      const merged = mergeMessagesById(messagesRef.current, page.messages, { position: "prepend" });
      if (merged.addedCount > 0) {
        setFirstItemIndex((current) => current - merged.addedCount);
      }
      if (merged.messages !== messagesRef.current) {
        messagesRef.current = merged.messages;
        setMessagesState(merged.messages);
      }
      setHasMore(Boolean(page.hasMoreOlder));
    } catch (errorValue) {
      if (controller.signal.aborted) return;
      console.error(errorValue);
      setError("過去メッセージの読み込みに失敗しました。");
    } finally {
      if (!controller.signal.aborted) {
        setLoadingOlder(false);
      }
    }
  }, [enabled, hasMore, loadPage, loadingInitial, loadingOlder, pageSize, sessionId]);

  return {
    messages,
    setMessages,
    hasMore,
    loadingInitial,
    loadingOlder,
    isReady,
    error,
    setError,
    firstItemIndex,
    loadOlderMessages,
    reload: () => loadLatestPage({ reset: messagesRef.current.length === 0 }),
  };
}
