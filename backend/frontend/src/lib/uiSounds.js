import mouseDownUrl from "../../sfx/UI_Operation_MouseDown.wav";
import mouseUpUrl from "../../sfx/UI_Operation_MouseUp.wav";
import linkHoverUrl from "../../sfx/UI_Notif_Text_link.wav";
import sendChatUrl from "../../sfx/UI_Notif_SendChatMessage.wav";
import keyDown1Url from "../../sfx/Object_Interact_NKeyDown_1.wav";
import keyDown8Url from "../../sfx/Object_Interact_NKeyDown_8.wav";
import keyDown9Url from "../../sfx/Object_Interact_NKeyDown_9.wav";
import keyDown10Url from "../../sfx/Object_Interact_NKeyDown_10.wav";

const CLICKABLE_SELECTOR = [
  "a[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "summary",
  "label[for]",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='menuitem']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[data-clickable]",
].join(",");

const CHAT_INPUT_SELECTOR = ".pd-chat-input, [data-chat-input='true']";
const TYPING_URLS = [keyDown1Url, keyDown8Url, keyDown10Url, keyDown9Url];
const audioPools = new Map();
const lastPlayedAt = new Map();
let typingAudioContext = null;
let typingGainNode = null;
let typingBuffers = [];
let typingLoadPromise = null;
let scheduledTypingHandle = null;
let scheduledTypingChannel = null;
const activeTypingSources = new Set();
let lastTypingIndex = -1;
let lastUserInputAt = 0;

const isCoarsePointer = () =>
  typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

const hasPendingInput = () =>
  typeof navigator !== "undefined" &&
  typeof navigator.scheduling?.isInputPending === "function" &&
  navigator.scheduling.isInputPending();

const getTypingAudioContext = () => {
  if (typingAudioContext || typeof window === "undefined") return typingAudioContext;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    typingAudioContext = new AudioContextClass({ latencyHint: "interactive" });
  } catch {
    typingAudioContext = new AudioContextClass();
  }
  typingGainNode = typingAudioContext.createGain();
  typingGainNode.gain.value = 0.2;
  typingGainNode.connect(typingAudioContext.destination);
  return typingAudioContext;
};

const loadTypingAudioBuffers = () => {
  if (typingBuffers.length === TYPING_URLS.length) return Promise.resolve(typingBuffers);
  if (typingLoadPromise) return typingLoadPromise;
  const context = getTypingAudioContext();
  if (!context || typeof fetch === "undefined") return Promise.resolve([]);
  typingLoadPromise = Promise.all(
    TYPING_URLS.map(async (url) => {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) throw new Error(`Unable to load typing sound: ${response.status}`);
      return context.decodeAudioData(await response.arrayBuffer());
    })
  )
    .then((buffers) => {
      typingBuffers = buffers;
      return buffers;
    })
    .catch(() => []);
  return typingLoadPromise;
};

const unlockTypingAudio = () => {
  const context = getTypingAudioContext();
  loadTypingAudioBuffers();
  if (context?.state === "suspended") context.resume().catch(() => {});
};

const playDecodedTypingSound = () => {
  const context = typingAudioContext;
  if (!context || context.state !== "running" || !typingGainNode || !typingBuffers.length) return;
  if (activeTypingSources.size >= 2) return;
  let index = Math.floor(Math.random() * typingBuffers.length);
  if (typingBuffers.length > 1 && index === lastTypingIndex) {
    index = (index + 1 + Math.floor(Math.random() * (typingBuffers.length - 1))) % typingBuffers.length;
  }
  lastTypingIndex = index;
  const source = context.createBufferSource();
  source.buffer = typingBuffers[index];
  source.connect(typingGainNode);
  activeTypingSources.add(source);
  source.onended = () => {
    activeTypingSources.delete(source);
    source.disconnect();
  };
  source.start();
};

const getAudioPool = (url, volume, size = 4) => {
  if (typeof Audio === "undefined") return null;
  const key = `${url}:${volume}:${size}`;
  if (!audioPools.has(key)) {
    audioPools.set(
      key,
      Array.from({ length: size }, () => {
        const audio = new Audio(url);
        audio.preload = "auto";
        audio.volume = volume;
        return audio;
      })
    );
  }
  return audioPools.get(key);
};

const playFromPool = (url, { volume, size = 4 } = {}) => {
  const pool = getAudioPool(url, volume, size);
  if (!pool) return;
  const audio = pool.find((item) => item.paused || item.ended) || pool[0];
  try {
    audio.currentTime = 0;
    const result = audio.play();
    result?.catch?.(() => {});
  } catch {
    // Browsers can temporarily reject audio before the first user gesture.
  }
};

const isDisabled = (element) =>
  element.matches(":disabled") ||
  element.getAttribute("aria-disabled") === "true" ||
  element.closest("[inert]");

const getClickableTarget = (eventTarget) => {
  if (!(eventTarget instanceof Element)) return null;
  const clickable = eventTarget.closest(CLICKABLE_SELECTOR);
  if (clickable) return clickable;
  return getComputedStyle(eventTarget).cursor === "pointer" ? eventTarget : null;
};

const isTypingInputType = (inputType = "") =>
  inputType.startsWith("insert") ||
  inputType === "deleteContentBackward" ||
  inputType === "deleteContentForward";

export const playChatTypingSound = (channel = "user") => {
  const now = performance.now();
  const minimumInterval = isCoarsePointer()
    ? channel === "stream" ? 150 : 95
    : channel === "stream" ? 100 : 55;
  if (now - (lastPlayedAt.get(channel) || 0) < minimumInterval) return;
  if (!typingBuffers.length) {
    loadTypingAudioBuffers();
    return;
  }
  if (scheduledTypingHandle !== null) {
    if (channel === "user") scheduledTypingChannel = "user";
    return;
  }
  lastPlayedAt.set(channel, now);
  scheduledTypingChannel = channel;
  const play = () => {
    const pendingChannel = scheduledTypingChannel;
    scheduledTypingHandle = null;
    scheduledTypingChannel = null;
    if (document.hidden || hasPendingInput()) return;
    if (pendingChannel === "stream" && performance.now() - lastUserInputAt < 400) return;
    playDecodedTypingSound();
  };
  scheduledTypingHandle = window.requestAnimationFrame(play);
};

export const playSendChatSound = () => {
  playFromPool(sendChatUrl, { volume: 0.3, size: 1 });
};

export const installGlobalUiSounds = () => {
  if (typeof document === "undefined") return () => {};
  const activePointers = new Map();
  let isComposing = false;
  let lastCompositionEndAt = 0;

  const warmAudioPools = () => {
    getAudioPool(mouseDownUrl, 0.28, 2);
    getAudioPool(mouseUpUrl, 0.28, 2);
    getAudioPool(linkHoverUrl, 0.2, 1);
    getAudioPool(sendChatUrl, 0.3, 1);
    loadTypingAudioBuffers();
  };
  const idleHandle =
    typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback(warmAudioPools, { timeout: 1500 })
      : window.setTimeout(warmAudioPools, 500);

  const handlePointerDown = (event) => {
    unlockTypingAudio();
    if (event.button !== 0) return;
    const target = getClickableTarget(event.target);
    if (!target || isDisabled(target)) return;
    if (target.matches(CHAT_INPUT_SELECTOR)) return;
    activePointers.set(event.pointerId, target);
    playFromPool(mouseDownUrl, { volume: 0.28, size: 2 });
  };

  const handlePointerUp = (event) => {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.delete(event.pointerId);
    playFromPool(mouseUpUrl, { volume: 0.28, size: 2 });
  };

  const handlePointerCancel = (event) => {
    activePointers.delete(event.pointerId);
  };

  const handleLinkHover = (event) => {
    if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
    const link = event.target.closest("a[href], [role='link']");
    if (!link || isDisabled(link)) return;
    if (event.relatedTarget instanceof Node && link.contains(event.relatedTarget)) return;
    playFromPool(linkHoverUrl, { volume: 0.2, size: 1 });
  };

  const handleInput = (event) => {
    if (
      !(event.target instanceof Element) ||
      !event.target.matches(CHAT_INPUT_SELECTOR) ||
      !isTypingInputType(event.inputType)
    ) {
      return;
    }
    lastUserInputAt = performance.now();
    if (isComposing || event.isComposing) return;
    if (lastUserInputAt - lastCompositionEndAt < 40) return;
    playChatTypingSound("user");
  };

  const handleCompositionStart = (event) => {
    if (!(event.target instanceof Element) || !event.target.matches(CHAT_INPUT_SELECTOR)) return;
    isComposing = true;
    lastUserInputAt = performance.now();
  };

  const handleCompositionUpdate = (event) => {
    if (!(event.target instanceof Element) || !event.target.matches(CHAT_INPUT_SELECTOR)) return;
    lastUserInputAt = performance.now();
    playChatTypingSound("user");
  };

  const handleCompositionEnd = (event) => {
    if (!(event.target instanceof Element) || !event.target.matches(CHAT_INPUT_SELECTOR)) return;
    isComposing = false;
    lastUserInputAt = performance.now();
    lastCompositionEndAt = lastUserInputAt;
    playChatTypingSound("user");
  };

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("pointerup", handlePointerUp, true);
  document.addEventListener("pointercancel", handlePointerCancel, true);
  document.addEventListener("pointerover", handleLinkHover, true);
  document.addEventListener("input", handleInput, true);
  document.addEventListener("compositionstart", handleCompositionStart, true);
  document.addEventListener("compositionupdate", handleCompositionUpdate, true);
  document.addEventListener("compositionend", handleCompositionEnd, true);
  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("pointerup", handlePointerUp, true);
    document.removeEventListener("pointercancel", handlePointerCancel, true);
    document.removeEventListener("pointerover", handleLinkHover, true);
    document.removeEventListener("input", handleInput, true);
    document.removeEventListener("compositionstart", handleCompositionStart, true);
    document.removeEventListener("compositionupdate", handleCompositionUpdate, true);
    document.removeEventListener("compositionend", handleCompositionEnd, true);
    if (scheduledTypingHandle !== null) {
      window.cancelAnimationFrame(scheduledTypingHandle);
      scheduledTypingHandle = null;
      scheduledTypingChannel = null;
    }
    if (typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(idleHandle);
    } else {
      window.clearTimeout(idleHandle);
    }
    activePointers.clear();
  };
};
