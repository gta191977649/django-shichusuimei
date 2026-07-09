import { describe, expect, it } from "vitest";
import {
  mergeMessagesById,
  removeChatMessagesById,
  replaceChatMessageById,
} from "./chatMessageUtils";

const buildMessage = (id, overrides = {}) => ({
  id,
  role: "assistant",
  content: `message-${id}`,
  reasoning: "",
  createdAt: `2026-01-0${id}T00:00:00.000Z`,
  ...overrides,
});

describe("chatMessageUtils", () => {
  it("prepends older messages without duplicates and preserves unchanged references", () => {
    const message3 = buildMessage(3);
    const existing = [message3, buildMessage(4)];
    const incoming = [buildMessage(1), buildMessage(2), buildMessage(3)];

    const result = mergeMessagesById(existing, incoming, { position: "prepend" });

    expect(result.messages.map((message) => message.id)).toEqual([1, 2, 3, 4]);
    expect(result.addedCount).toBe(2);
    expect(result.messages[2]).toBe(message3);
  });

  it("updates only the targeted message and keeps other references stable", () => {
    const first = buildMessage(1);
    const second = buildMessage(2);
    const messages = [first, second];

    const result = replaceChatMessageById(messages, 2, (message) => ({
      ...message,
      content: "streaming-update",
      typing: true,
    }));

    expect(result[0]).toBe(first);
    expect(result[1]).not.toBe(second);
    expect(result[1].content).toBe("streaming-update");
    expect(result[1].typing).toBe(true);
  });

  it("removes only the requested message ids", () => {
    const messages = [buildMessage(1), buildMessage(2), buildMessage(3)];

    const result = removeChatMessagesById(messages, [2, 999]);

    expect(result.map((message) => message.id)).toEqual([1, 3]);
  });
});
