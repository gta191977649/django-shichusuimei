import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChatMessageList from "./ChatMessageList";

vi.mock("react-virtuoso", async () => {
  const ReactModule = await import("react");

  return {
    Virtuoso: ReactModule.forwardRef(function VirtuosoMock(props, ref) {
      ReactModule.useImperativeHandle(ref, () => ({
        scrollToIndex: vi.fn(),
      }));

      const { data, itemContent, components } = props;
      const visibleItems = data.slice(0, 8);

      return (
        <div data-testid="virtuoso">
          {components?.Header ? <components.Header /> : null}
          {visibleItems.map((message, index) => (
            <div key={message.id}>{itemContent(index, message)}</div>
          ))}
          {components?.Footer ? <components.Footer /> : null}
        </div>
      );
    }),
  };
});

const buildMessage = (id, overrides = {}) => ({
  id,
  role: id % 2 === 0 ? "assistant" : "user",
  content: `message-${id}`,
  reasoning: "",
  createdAt: `2026-03-${String(id).padStart(2, "0")}T00:00:00.000Z`,
  ...overrides,
});

describe("ChatMessageList", () => {
  it("shows a jump-to-latest action when the user is reading history", async () => {
    const onJumpToLatest = vi.fn();
    const user = userEvent.setup();

    render(
      <ChatMessageList
        activeChatSession={{ id: 1, title: "session" }}
        messages={[buildMessage(1)]}
        loadingInitial={false}
        loadingOlder={false}
        hasMore={false}
        historyError={null}
        onRetryHistory={vi.fn()}
        loadingReply={false}
        chatTyping={false}
        listRef={{ current: null }}
        firstItemIndex={100}
        onLoadOlder={vi.fn()}
        onBottomStateChange={vi.fn()}
        followOutput={vi.fn()}
        showJumpToLatest={true}
        onJumpToLatest={onJumpToLatest}
      />
    );

    await user.click(screen.getByRole("button", { name: "Back to latest" }));
    expect(onJumpToLatest).toHaveBeenCalledTimes(1);
  });

  it("keeps mounted rows bounded by delegating rendering to the virtual list", () => {
    const messages = Array.from({ length: 50 }, (_, index) => buildMessage(index + 1));

    render(
      <ChatMessageList
        activeChatSession={{ id: 1, title: "session" }}
        messages={messages}
        loadingInitial={false}
        loadingOlder={false}
        hasMore={true}
        historyError={null}
        onRetryHistory={vi.fn()}
        loadingReply={false}
        chatTyping={false}
        listRef={{ current: null }}
        firstItemIndex={100}
        onLoadOlder={vi.fn()}
        onBottomStateChange={vi.fn()}
        followOutput={vi.fn()}
        showJumpToLatest={false}
        onJumpToLatest={vi.fn()}
      />
    );

    expect(screen.getByTestId("virtuoso")).toBeTruthy();
    expect(screen.getByText("message-1")).toBeTruthy();
    expect(screen.getByText("message-8")).toBeTruthy();
    expect(screen.queryByText("message-20")).toBeNull();
  });
});
