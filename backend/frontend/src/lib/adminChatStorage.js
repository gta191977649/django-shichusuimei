const STORAGE_PREFIX = "ai_chat_state:v1";

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getStorageKey(userId) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function normalizeState(rawState) {
  if (!rawState || typeof rawState !== "object") {
    return { lastActiveProfileId: null };
  }

  return {
    lastActiveProfileId:
      rawState.lastActiveProfileId == null || rawState.lastActiveProfileId === ""
        ? null
        : String(rawState.lastActiveProfileId),
  };
}

function readState(userId) {
  if (!userId || !hasLocalStorage()) {
    return { lastActiveProfileId: null };
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return { lastActiveProfileId: null };
    return normalizeState(JSON.parse(raw));
  } catch {
    return { lastActiveProfileId: null };
  }
}

function writeState(userId, nextState) {
  if (!userId || !hasLocalStorage()) return;
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(normalizeState(nextState)));
}

export function getLastActiveProfileId(userId) {
  return readState(userId).lastActiveProfileId;
}

export function setLastActiveProfile(userId, profile) {
  if (!userId || !profile?.id) return;
  const state = readState(userId);
  state.lastActiveProfileId = String(profile.id);
  writeState(userId, state);
}

export function clearLastActiveProfile(userId, profileId = null) {
  if (!userId) return;
  const state = readState(userId);
  if (profileId == null || state.lastActiveProfileId === String(profileId)) {
    state.lastActiveProfileId = null;
    writeState(userId, state);
  }
}
