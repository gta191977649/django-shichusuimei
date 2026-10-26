import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePaginatedChatMessages } from "./usePaginatedChatMessages";

const buildMessage = (id, overrides = {}) => ({
  id,
  role: id % 2 === 0 ? "assistant" : "user",
  content: `message-${id}`,
  reasoning: "",
  createdAt: `2026-02-${String(id).padStart(2, "0")}T00:00:00.000Z`,
  ...overrides,
});

describe("usePaginatedChatMessages", () => {
  it("loads the latest page and prepends older messages without duplicates", async () => {
    const loadPage = vi.fn(async (_sessionId, { beforeId }) => {
      if (beforeId) {
        return {
          messages: [buildMessage(1), buildMessage(2), buildMessage(3)],
          hasMoreOlder: false,
        };
      }

      return {
        messages: [buildMessage(3), buildMessage(4)],
        hasMoreOlder: true,
      };
    });

    const { result } = renderHook(() =>
      usePaginatedChatMessages({
        sessionId: 10,
        enabled: true,
        messageCount: 4,
        pageSize: 2,
        loadPage,
      })
    );

    await waitFor(() => expect(result.current.loadingInitial).toBe(false));
    expect(result.current.messages.map((message) => message.id)).toEqual([3, 4]);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadOlderMessages();
    });

    expect(result.current.messages.map((message) => message.id)).toEqual([1, 2, 3, 4]);
    expect(result.current.hasMore).toBe(false);

    await act(async () => {
      await result.current.loadOlderMessages();
    });

    expect(loadPage).toHaveBeenCalledTimes(2);
  });

  it("ignores stale responses when switching conversations", async () => {
    let resolveSession1;
    let resolveSession2;

    const loadPage = vi.fn((sessionId) => {
      if (sessionId === 1) {
        return new Promise((resolve) => {
          resolveSession1 = resolve;
        });
      }

      return new Promise((resolve) => {
        resolveSession2 = resolve;
      });
    });

    const { result, rerender } = renderHook(
      ({ sessionId }) =>
        usePaginatedChatMessages({
          sessionId,
          enabled: true,
          messageCount: 1,
          pageSize: 40,
          loadPage,
        }),
      {
        initialProps: { sessionId: 1 },
      }
    );

    rerender({ sessionId: 2 });

    act(() => {
      resolveSession2({
        messages: [buildMessage(20)],
        hasMoreOlder: false,
      });
    });

    await waitFor(() => expect(result.current.messages.map((message) => message.id)).toEqual([20]));

    act(() => {
      resolveSession1({
        messages: [buildMessage(10)],
        hasMoreOlder: false,
      });
    });

    await waitFor(() => expect(result.current.messages.map((message) => message.id)).toEqual([20]));
  });

  it("does not reload history when the session message count changes", async () => {
    const loadPage = vi.fn(async () => ({ messages: [buildMessage(1)], hasMoreOlder: false }));
    const { rerender } = renderHook(
      ({ messageCount }) =>
        usePaginatedChatMessages({
          sessionId: 10,
          enabled: true,
          messageCount,
          pageSize: 40,
          loadPage,
        }),
      { initialProps: { messageCount: 1 } }
    );

    await waitFor(() => expect(loadPage).toHaveBeenCalledTimes(1));
    rerender({ messageCount: 2 });
    await act(async () => Promise.resolve());

    expect(loadPage).toHaveBeenCalledTimes(1);
  });

  it("keeps an optimistic message added while the initial history request is pending", async () => {
    let resolvePage;
    const loadPage = vi.fn(
      () =>
        new Promise((resolve) => {
          resolvePage = resolve;
        })
    );
    const { result } = renderHook(() =>
      usePaginatedChatMessages({ sessionId: 10, enabled: true, pageSize: 40, loadPage })
    );

    await waitFor(() => expect(loadPage).toHaveBeenCalledTimes(1));
    act(() => {
      result.current.setMessages([
        buildMessage(null, {
          uiKey: "client:user:1",
          role: "user",
          content: "optimistic",
          status: "sending",
        }),
      ]);
    });
    act(() => {
      resolvePage({ messages: [buildMessage(1)], hasMoreOlder: false });
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages.map((message) => message.content)).toEqual(["message-1", "optimistic"]);
  });
});
