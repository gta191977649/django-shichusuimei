const STORAGE_PREFIX = "ai_chat_state:v1";
const MAX_TITLE_LENGTH = 30;

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getStorageKey(userId) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function normalizeMessage(message) {
  if (!message || typeof message !== "object") return null;
  const role = message.role === "assistant" ? "assistant" : message.role === "user" ? "user" : null;
  const content = typeof message.content === "string" ? message.content : "";
  const reasoning = typeof message.reasoning === "string" ? message.reasoning : "";
  if (!role || (!content.trim() && !reasoning.trim())) return null;
  return { role, content, reasoning };
}

function normalizeSession(session) {
  if (!session || typeof session !== "object") return null;
  const id = typeof session.id === "string" && session.id ? session.id : null;
  if (!id) return null;

  const messages = Array.isArray(session.messages) ? session.messages.map(normalizeMessage).filter(Boolean) : [];
  return {
    id,
    title: typeof session.title === "string" && session.title.trim() ? session.title : "新会話",
    createdAt: typeof session.createdAt === "string" && session.createdAt ? session.createdAt : new Date().toISOString(),
    updatedAt: typeof session.updatedAt === "string" && session.updatedAt ? session.updatedAt : new Date().toISOString(),
    draftInput: typeof session.draftInput === "string" ? session.draftInput : "",
    messages,
  };
}

function normalizeProfileChats(profileChats) {
  if (!profileChats || typeof profileChats !== "object") {
    return {
      profileSnapshot: null,
      lastActiveSessionId: null,
      sessions: [],
    };
  }

  const sessions = Array.isArray(profileChats.sessions)
    ? profileChats.sessions.map(normalizeSession).filter(Boolean)
    : [];

  const lastActiveSessionId =
    typeof profileChats.lastActiveSessionId === "string" && profileChats.lastActiveSessionId
      ? profileChats.lastActiveSessionId
      : null;

  const snapshot = profileChats.profileSnapshot;
  const profileSnapshot =
    snapshot && typeof snapshot === "object" && snapshot.id != null
      ? {
          id: snapshot.id,
          name: typeof snapshot.name === "string" ? snapshot.name : "",
          birthDate: typeof snapshot.birthDate === "string" ? snapshot.birthDate : null,
        }
      : null;

  return {
    profileSnapshot,
    lastActiveSessionId: sessions.some((session) => session.id === lastActiveSessionId) ? lastActiveSessionId : null,
    sessions,
  };
}

function normalizeState(rawState) {
  if (!rawState || typeof rawState !== "object") {
    return { lastActiveProfileId: null, profiles: {} };
  }

  const profiles = {};
  const rawProfiles = rawState.profiles && typeof rawState.profiles === "object" ? rawState.profiles : {};

  Object.entries(rawProfiles).forEach(([profileId, profileChats]) => {
    profiles[String(profileId)] = normalizeProfileChats(profileChats);
  });

  return {
    lastActiveProfileId:
      rawState.lastActiveProfileId == null || rawState.lastActiveProfileId === ""
        ? null
        : String(rawState.lastActiveProfileId),
    profiles,
  };
}

function readState(userId) {
  if (!userId || !hasLocalStorage()) {
    return { lastActiveProfileId: null, profiles: {} };
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return { lastActiveProfileId: null, profiles: {} };
    return normalizeState(JSON.parse(raw));
  } catch {
    return { lastActiveProfileId: null, profiles: {} };
  }
}

function isQuotaExceededError(error) {
  return error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
}

function getSessionTimestamp(session) {
  const value = Date.parse(session.updatedAt || session.createdAt || "");
  return Number.isFinite(value) ? value : 0;
}

function pruneOldestInactiveSession(state, activeProfileId, activeSessionId) {
  let candidate = null;

  Object.entries(state.profiles).forEach(([profileId, profileChats]) => {
    profileChats.sessions.forEach((session, index) => {
      if (profileId === String(activeProfileId) && session.id === activeSessionId) return;
      const timestamp = getSessionTimestamp(session);
      if (!candidate || timestamp < candidate.timestamp) {
        candidate = { profileId, sessionId: session.id, index, timestamp };
      }
    });
  });

  if (!candidate) return false;

  const nextProfile = state.profiles[candidate.profileId];
  nextProfile.sessions.splice(candidate.index, 1);
  if (nextProfile.lastActiveSessionId === candidate.sessionId) {
    nextProfile.lastActiveSessionId = nextProfile.sessions[0]?.id || null;
  }
  if (nextProfile.sessions.length === 0) {
    delete state.profiles[candidate.profileId];
  }

  return true;
}

function writeState(userId, nextState, { activeProfileId = null, activeSessionId = null } = {}) {
  if (!userId || !hasLocalStorage()) return;

  const stateToWrite = normalizeState(nextState);

  while (true) {
    try {
      window.localStorage.setItem(getStorageKey(userId), JSON.stringify(stateToWrite));
      return;
    } catch (error) {
      if (!isQuotaExceededError(error) || !pruneOldestInactiveSession(stateToWrite, activeProfileId, activeSessionId)) {
        const wrappedError = new Error("CHAT_STORAGE_QUOTA_EXCEEDED");
        wrappedError.code = "CHAT_STORAGE_QUOTA_EXCEEDED";
        throw wrappedError;
      }
    }
  }
}

export function buildSessionTitle(firstQuestion = "") {
  const trimmed = String(firstQuestion || "").trim();
  if (!trimmed) return "新会話";
  return trimmed.slice(0, MAX_TITLE_LENGTH);
}

export function createChatSession() {
  const now = new Date().toISOString();
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    id,
    title: "新会話",
    createdAt: now,
    updatedAt: now,
    draftInput: "",
    messages: [],
  };
}

export function getLastActiveProfileId(userId) {
  return readState(userId).lastActiveProfileId;
}

export function setLastActiveProfile(userId, profile) {
  if (!userId || !profile?.id) return;
  const state = readState(userId);
  state.lastActiveProfileId = String(profile.id);

  const profileKey = String(profile.id);
  const existing = normalizeProfileChats(state.profiles[profileKey]);
  state.profiles[profileKey] = {
    ...existing,
    profileSnapshot: {
      id: profile.id,
      name: profile.name || "",
      birthDate: profile.birthDate || null,
    },
  };

  writeState(userId, state, { activeProfileId: profileKey, activeSessionId: existing.lastActiveSessionId });
}

export function clearLastActiveProfile(userId, profileId = null) {
  if (!userId) return;
  const state = readState(userId);
  if (profileId == null || state.lastActiveProfileId === String(profileId)) {
    state.lastActiveProfileId = null;
    writeState(userId, state);
  }
}

export function getProfileChats(userId, profileId) {
  if (!userId || !profileId) {
    return {
      profileSnapshot: null,
      lastActiveSessionId: null,
      sessions: [],
    };
  }

  const state = readState(userId);
  return normalizeProfileChats(state.profiles[String(profileId)]);
}

export function saveProfileChats(userId, profile, sessions, lastActiveSessionId) {
  if (!userId || !profile?.id) return;

  const state = readState(userId);
  const profileKey = String(profile.id);
  const normalizedSessions = Array.isArray(sessions) ? sessions.map(normalizeSession).filter(Boolean) : [];

  if (normalizedSessions.length === 0) {
    delete state.profiles[profileKey];
  } else {
    state.profiles[profileKey] = {
      profileSnapshot: {
        id: profile.id,
        name: profile.name || "",
        birthDate: profile.birthDate || null,
      },
      lastActiveSessionId:
        typeof lastActiveSessionId === "string" && normalizedSessions.some((session) => session.id === lastActiveSessionId)
          ? lastActiveSessionId
          : normalizedSessions[0]?.id || null,
      sessions: normalizedSessions,
    };
  }

  writeState(userId, state, {
    activeProfileId: profileKey,
    activeSessionId: lastActiveSessionId,
  });
}
