/* eslint-disable react/prop-types */
import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Virtuoso } from "react-virtuoso";
import { ArrowDown } from "lucide-react";

const MarkdownContent = memo(function MarkdownContent({ children }) {
  return (
    <div className="pd-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || ""}</ReactMarkdown>
    </div>
  );
});

const ChatReasoningDetails = memo(function ChatReasoningDetails({ reasoning }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!reasoning) return null;

  return (
    <details className="pd-chat-reasoning" open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>思考過程 / Reference</summary>
      {isOpen ? (
        <div className="pd-chat-reasoning-body display-linebreak">
          <MarkdownContent>{reasoning}</MarkdownContent>
        </div>
      ) : null}
    </details>
  );
});

export const MessageRow = memo(function MessageRow({ message }) {
  return (
    <div className={`pd-chat-message pd-chat-message-${message.role}`}>
      <div className="pd-chat-role">{message.role === "user" ? "あなた" : "AI"}</div>
      <div className="pd-chat-bubble display-linebreak">
        <MarkdownContent>{message.content}</MarkdownContent>
        {message.role === "assistant" ? <ChatReasoningDetails reasoning={message.reasoning} /> : null}
        {message.typing ? <span className="pd-chat-cursor" aria-hidden="true"></span> : null}
      </div>
    </div>
  );
});

export default function ChatMessageList({
  activeChatSession,
  messages,
  loadingInitial,
  loadingOlder,
  hasMore,
  historyError,
  onRetryHistory,
  loadingReply,
  chatTyping,
  listRef,
  extraClass = "",
  firstItemIndex,
  onLoadOlder,
  onBottomStateChange,
  followOutput,
  showJumpToLatest,
  onJumpToLatest,
  atBottomThreshold = 150,
}) {
  const isFullscreen = extraClass.includes("fullscreen");
  const listClassName = `pd-chat-list pd-chat-list-virtuoso ${extraClass}`.trim();

  if (!activeChatSession) {
    return <div className={`pd-chat-list ${extraClass}`.trim()}>「新規会話」をクリックして、この命局の AI 会話を始めてください。</div>;
  }

  if (loadingInitial) {
    return (
      <div className={`pd-chat-list ${extraClass}`.trim()}>
        <div className="pd-chat-loading-indicator">
          <span className="pd-spinner" aria-hidden="true"></span>
          <span>会話を読み込み中...</span>
        </div>
      </div>
    );
  }

  if (historyError && messages.length === 0) {
    return (
      <div className={`pd-chat-list ${extraClass}`.trim()}>
        <div className="pd-empty-state pd-chat-empty">
          <div>{historyError}</div>
          <button type="button" className="pd-action-button pd-chat-retry-button" onClick={onRetryHistory}>
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={`pd-chat-list ${extraClass}`.trim()}>
        <div className="pd-empty-state pd-chat-empty">
          例: この命局の格局定位をもう少し噛み砕いて説明してください。
        </div>
      </div>
    );
  }

  return (
    <div className={`pd-chat-list-shell${isFullscreen ? " pd-chat-list-shell-fullscreen" : ""}`}>
      <Virtuoso
        ref={listRef}
        className={listClassName}
        style={{ height: isFullscreen ? "100%" : "420px" }}
        data={messages}
        firstItemIndex={firstItemIndex}
        computeItemKey={(index, message) => message.id ?? `${message.role}-${index}`}
        startReached={onLoadOlder}
        atBottomThreshold={atBottomThreshold}
        atBottomStateChange={onBottomStateChange}
        followOutput={followOutput}
        increaseViewportBy={{ top: 400, bottom: 600 }}
        itemContent={(index, message) => (
          <div className="pd-chat-row" data-message-id={message.id ?? index}>
            <MessageRow message={message} />
          </div>
        )}
        components={{
          Header: () => {
            if (loadingOlder) {
              return (
                <div className="pd-chat-history-loading">
                  <span className="pd-spinner" aria-hidden="true"></span>
                  <span>過去の会話を読み込み中...</span>
                </div>
              );
            }

            if (historyError) {
              return (
                <div className="pd-chat-history-error">
                  <span>{historyError}</span>
                  <button type="button" className="pd-action-button pd-chat-retry-button" onClick={onRetryHistory}>
                    再試行
                  </button>
                </div>
              );
            }

            if (hasMore) {
              return <div className="pd-chat-history-hint">上へスクロールすると過去の会話を読み込みます。</div>;
            }

            return <div className="pd-chat-history-hint">これ以上古い会話はありません。</div>;
          },
          Footer: () =>
            loadingReply && !chatTyping ? (
              <div className="pd-chat-row">
                <div className="pd-chat-message pd-chat-message-assistant">
                  <div className="pd-chat-role">AI</div>
                  <div className="pd-chat-bubble pd-chat-loading">
                    <span className="pd-spinner" aria-hidden="true"></span>
                    <span>回答を生成中...</span>
                  </div>
                </div>
              </div>
            ) : null,
        }}
      />
      {showJumpToLatest ? (
        <button
          type="button"
          className="pd-action-button pd-chat-jump-latest"
          onClick={onJumpToLatest}
          aria-label="回到最新消息"
          title="回到最新消息"
        >
          <ArrowDown size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
