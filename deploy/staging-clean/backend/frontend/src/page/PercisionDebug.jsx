import { useEffect, useMemo, useRef, useState } from "react";
import api, { ACCESS_TOKEN, refreshAccessToken } from "../api";
import Modal from "react-bootstrap/Modal";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import ReactMarkdown from "react-markdown";
import html2canvas from "html2canvas";
import PrecisionMeishikiBoard from "./subpage/PrecisionMeishikiBoard";
import GoukaAnlysis from "../components/GoukaAnlysis";
import ElementFlow from "../components/ElementFlow";
import {
  buildBirthDateIso,
  getBirthTimeDisplay,
  getProfileBirthTimeState,
  getQueryTimeValue,
} from "../lib/birthTime";
import {
  buildSessionTitle,
  createChatSession,
  getProfileChats,
  saveProfileChats,
} from "../lib/adminChatStorage";
import "./PercisionDebug.css";

const getElementColor = (element) => {
  const colorTable = {
    forestgreen: ["甲", "乙", "寅", "卯"],
    "#E64841": ["丙", "丁", "巳", "午"],
    saddlebrown: ["戌", "戊", "己", "未", "丑", "辰"],
    darkorange: ["庚", "辛", "申", "酉"],
    royalblue: ["壬", "癸", "亥", "子"],
  };

  for (const color in colorTable) {
    if (colorTable[color].includes(element)) return color;
  }

  return "black";
};

export default function PercisionDebug({
  profile,
  setSelectedProfile,
  isAuthenticated = false,
  isAdmin = false,
  authUserId = null,
}) {
  const [response, setResponse] = useState(false);
  const [aiResponse, setAIResponse] = useState(null);
  const [showReason, setShowReason] = useState(false);
  const [aiStatus, setAIStatus] = useState(null);
  const [aiLoading, setAILoading] = useState(false);
  const [aiProgress, setAIProgress] = useState(0);
  const [aiProgressLabel, setAIProgressLabel] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatSessions, setChatSessions] = useState([]);
  const [activeChatSessionId, setActiveChatSessionId] = useState(null);
  const [chatStatus, setChatStatus] = useState(null);
  const [chatStorageStatus, setChatStorageStatus] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatTyping, setChatTyping] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [isProfileBaziOpen, setIsProfileBaziOpen] = useState(false);
  const [selectedElementInsight, setSelectedElementInsight] = useState(null);
  const [isElementInsightOpen, setIsElementInsightOpen] = useState(false);
  const [isInlineChatCollapsed, setIsInlineChatCollapsed] = useState(true);
  const [isInlineChatSessionsCollapsed, setIsInlineChatSessionsCollapsed] = useState(true);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  const [isChatSidebarCollapsed, setIsChatSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("meishiki");
  const [exportingType, setExportingType] = useState(null);
  const exportRef = useRef(null);
  const inlineChatListRef = useRef(null);
  const fullscreenChatListRef = useRef(null);
  const fullscreenChatInputRef = useRef(null);
  const aiAutoLoadRequestRef = useRef(0);
  const chatStorageReadyRef = useRef(false);
  const chatStorageProfileRef = useRef(null);

  const initial = useMemo(() => {
    const { date, time, birthTimeUnknown } = getProfileBirthTimeState(profile);

    return {
      name: profile?.name || "",
      date,
      time,
      birthTimeUnknown,
      gender: profile?.gender || "M",
    };
  }, [profile]);

  const [form, setForm] = useState(initial);
  const [saveMode, setSaveMode] = useState("保存");
  const [isDirty, setIsDirty] = useState(false);

  const clearChatTypingTimer = () => {
    setChatTyping(false);
  };

  const closeChatFullscreen = () => {
    setIsChatFullscreen(false);
    setIsChatSidebarOpen(false);
  };

  const buildApiUrl = (path) => `${api.defaults.baseURL || ""}${path}`;
  const chatStorageEnabled = Boolean(isAuthenticated && isAdmin && authUserId);

  const sortChatSessions = (sessions) =>
    [...sessions].sort((left, right) => Date.parse(right.updatedAt || 0) - Date.parse(left.updatedAt || 0));

  const updateChatSession = (sessionId, updater) => {
    let nextSession = null;

    setChatSessions((current) =>
      current.map((session) => {
        if (session.id !== sessionId) return session;
        nextSession = updater(session);
        return nextSession;
      })
    );

    return nextSession;
  };

  const createAndActivateSession = () => {
    const session = createChatSession();
    setChatSessions((current) => sortChatSessions([session, ...current]));
    setActiveChatSessionId(session.id);
    setChatInput("");
    setChatStatus(null);
    return session;
  };

  const updateAssistantMessage = (sessionId, updater) => {
    updateChatSession(sessionId, (session) => {
      if (!session.messages.length) return session;
      return {
        ...session,
        updatedAt: new Date().toISOString(),
        messages: session.messages.map((message, index) =>
          index === session.messages.length - 1 ? updater(message) : message
        ),
      };
    });
  };

  const applyChatStreamEvent = (sessionId, event) => {
    if (!event || typeof event !== "object") return;

    if (event.type === "reasoning") {
      updateAssistantMessage(sessionId, (message) => ({
        ...message,
        reasoning: `${message.reasoning || ""}${event.delta || ""}`,
      }));
      return;
    }

    if (event.type === "content") {
      updateAssistantMessage(sessionId, (message) => ({
        ...message,
        content: `${message.content || ""}${event.delta || ""}`,
      }));
      return;
    }

    if (event.type === "error") {
      throw new Error(event.detail || "AI会話に失敗しました。");
    }
  };

  const processSseEventBuffer = (buffer, onEvent) => {
    let pending = buffer;
    let boundary = pending.indexOf("\n\n");

    while (boundary !== -1) {
      const rawEvent = pending.slice(0, boundary);
      pending = pending.slice(boundary + 2);
      boundary = pending.indexOf("\n\n");

      const data = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("");

      if (!data) continue;
      onEvent(JSON.parse(data));
    }

    return pending;
  };

  const readChatStream = async ({
    question,
    history,
    chartContext,
    sessionId,
    accessToken,
    retry = true,
  }) => {
    const response = await fetch(buildApiUrl("/api/gpt/chat/stream"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        meishiki_id: profile.id,
        question,
        history,
        chart_context: chartContext,
      }),
    });

    if (response.status === 401 && retry) {
      const nextAccessToken = await refreshAccessToken();
      return readChatStream({
        question,
        history,
        chartContext,
        sessionId,
        accessToken: nextAccessToken,
        retry: false,
      });
    }

    if (!response.ok) {
      let detail = `AI会話に失敗しました。(${response.status})`;
      try {
        const payload = await response.json();
        detail = payload?.detail || detail;
      } catch {
        const text = await response.text();
        if (text) detail = text;
      }
      throw new Error(detail);
    }

    if (!response.body) {
      throw new Error("AI会話のストリームを読み込めませんでした。");
    }

    clearChatTypingTimer();
    setChatLoading(false);
    setChatTyping(true);

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = processSseEventBuffer(buffer, (event) => applyChatStreamEvent(sessionId, event));
    }

    buffer += decoder.decode();
    buffer = processSseEventBuffer(buffer, (event) => applyChatStreamEvent(sessionId, event));
    if (buffer.trim()) {
      throw new Error("AI会話ストリームの解析に失敗しました。");
    }
    setChatTyping(false);
  };

  const readAIInterpretationStream = async ({ meishikiId, force = false, accessToken, retry = true }) => {
    const response = await fetch(buildApiUrl("/api/gpt/stream"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        meishiki_id: meishikiId,
        ...(force ? { force: true } : {}),
      }),
    });

    if (response.status === 401 && retry) {
      const nextAccessToken = await refreshAccessToken();
      return readAIInterpretationStream({
        meishikiId,
        force,
        accessToken: nextAccessToken,
        retry: false,
      });
    }

    if (!response.ok) {
      let detail = `AI解読に失敗しました。(${response.status})`;
      try {
        const payload = await response.json();
        detail = payload?.detail || detail;
      } catch {
        const text = await response.text();
        if (text) detail = text;
      }
      throw new Error(detail);
    }

    if (!response.body) {
      throw new Error("AI解読のストリームを読み込めませんでした。");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let resultPayload = null;

    const handleEvent = (event) => {
      if (!event || typeof event !== "object") return;
      if (event.type === "progress") {
        setAIProgress(Number(event.progress) || 0);
        setAIProgressLabel(event.label || "");
        setAIStatus(event.label || "AI解読を生成中…");
        return;
      }
      if (event.type === "result") {
        resultPayload = event.payload || null;
        return;
      }
      if (event.type === "error") {
        throw new Error(event.detail || "AI解読に失敗しました。");
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = processSseEventBuffer(buffer, handleEvent);
    }

    buffer += decoder.decode();
    buffer = processSseEventBuffer(buffer, handleEvent);

    if (buffer.trim()) {
      throw new Error("AI解読ストリームの解析に失敗しました。");
    }

    if (!resultPayload) {
      throw new Error("AI解読結果を受け取れませんでした。");
    }

    return resultPayload;
  };

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const sortedChatSessions = useMemo(() => sortChatSessions(chatSessions), [chatSessions]);
  const activeChatSession = useMemo(
    () => sortedChatSessions.find((session) => session.id === activeChatSessionId) || null,
    [activeChatSessionId, sortedChatSessions]
  );
  const visibleChatMessages = useMemo(() => {
    const messages = activeChatSession?.messages || [];
    if (!chatTyping || messages.length === 0) return messages;

    return messages.map((message, index) =>
      index === messages.length - 1 && message.role === "assistant" ? { ...message, typing: true } : message
    );
  }, [activeChatSession, chatTyping]);

  useEffect(() => {
    const nameChanged = (form.name ?? "").trim() !== (initial.name ?? "");
    const dateChanged =
      (form.date ?? "") !== (initial.date ?? "") ||
      (form.time ?? "") !== (initial.time ?? "") ||
      Boolean(form.birthTimeUnknown) !== Boolean(initial.birthTimeUnknown);
    const genderChanged = (form.gender ?? "") !== (initial.gender ?? "M");

    const dirty = nameChanged || dateChanged || genderChanged;
    setIsDirty(dirty);

    if (nameChanged) setSaveMode("保存");
    else if (dateChanged || genderChanged) setSaveMode("更新");
    else setSaveMode("保存");
  }, [form, initial]);

  const onChange = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }));

  const query = ({ date, time, gender, birthTimeUnknown = false }) => {
    api
      .post("/api/query", {
        date,
        time: getQueryTimeValue(time, birthTimeUnknown),
        time_unknown: birthTimeUnknown,
        gender,
      })
      .then((res) => res.data)
      .then((data) => {
        setResponse(data);
        setActiveTab("meishiki");
      })
      .catch((err) => {
        console.error(err);
        alert("照会失敗");
      });
  };

  const queryProfile = (targetProfile = profile) => {
    if (!targetProfile?.birthDate || !targetProfile?.gender) return;

    const { date, time, birthTimeUnknown } = getProfileBirthTimeState(targetProfile);
    const gender = targetProfile.gender === "M" ? 1 : 0;

    query({ date, time, gender, birthTimeUnknown });
  };

  const queryForm = () => {
    if (!form.date || (!form.birthTimeUnknown && !form.time) || !form.gender) {
      alert("誕生日・時間・性別を入力してください。");
      return;
    }

    query({
      date: form.date,
      time: form.time,
      birthTimeUnknown: Boolean(form.birthTimeUnknown),
      gender: form.gender === "M" ? 1 : 0,
    });
  };

  const loadExistingAI = async (targetProfile, requestId) => {
    if (!isAuthenticated || !targetProfile?.id) return;

    try {
      const res = await api.get("/api/gpt", {
        params: {
          meishiki_id: targetProfile.id,
          existing_only: 1,
        },
      });

      if (aiAutoLoadRequestRef.current !== requestId) return;
      if (res.status === 204 || !res.data) {
        setAIResponse(null);
        setAIStatus(null);
        setAIProgress(0);
        setAIProgressLabel("");
        return;
      }
      setAIResponse(res.data);
      setAIStatus(null);
      setAIProgress(0);
      setAIProgressLabel("");
    } catch (err) {
      if (aiAutoLoadRequestRef.current !== requestId) return;
      if (err?.response?.status === 404) return;
      console.error(err);
      setAIStatus("既存のAI解読を読み込めませんでした。");
    } finally {
      if (aiAutoLoadRequestRef.current === requestId) {
        setAILoading(false);
        setAIProgress(0);
        setAIProgressLabel("");
      }
    }
  };

  useEffect(() => {
    if (!profile) {
      chatStorageReadyRef.current = false;
      chatStorageProfileRef.current = null;
      setResponse(false);
      setAIResponse(null);
      setAIStatus(null);
      setAILoading(false);
      setAIProgress(0);
      setAIProgressLabel("");
      setShowReason(false);
      setIsElementInsightOpen(false);
      setSelectedElementInsight(null);
      setChatSessions([]);
      setActiveChatSessionId(null);
      setChatInput("");
      setChatStatus(null);
      setChatStorageStatus(null);
      setChatLoading(false);
      clearChatTypingTimer();
      return;
    }

    const requestId = aiAutoLoadRequestRef.current + 1;
    aiAutoLoadRequestRef.current = requestId;
    chatStorageReadyRef.current = false;
    chatStorageProfileRef.current = profile.id;

    setResponse(false);
    setActiveTab("meishiki");
    queryProfile(profile);
    setAIResponse(null);
    setAIStatus(null);
    setAILoading(false);
    setAIProgress(0);
    setAIProgressLabel("");
    setShowReason(false);
    setIsElementInsightOpen(false);
    setSelectedElementInsight(null);
    setChatStatus(null);
    setChatStorageStatus(null);
    setChatLoading(false);
    clearChatTypingTimer();

    if (chatStorageEnabled && profile?.id) {
      const storedChats = getProfileChats(authUserId, profile.id);
      const nextSessions = sortChatSessions(storedChats.sessions || []);
      const hasActiveSession = nextSessions.some((session) => session.id === storedChats.lastActiveSessionId);
      const nextActiveSessionId = hasActiveSession ? storedChats.lastActiveSessionId : nextSessions[0]?.id || null;
      const nextActiveSession = nextSessions.find((session) => session.id === nextActiveSessionId) || null;

      setChatSessions(nextSessions);
      setActiveChatSessionId(nextActiveSessionId);
      setChatInput(nextActiveSession?.draftInput || "");
    } else {
      setChatSessions([]);
      setActiveChatSessionId(null);
      setChatInput("");
    }

    Promise.resolve().then(() => {
      if (chatStorageProfileRef.current === profile.id) {
        chatStorageReadyRef.current = true;
      }
    });

    if (isAuthenticated) {
      loadExistingAI(profile, requestId);
    }
  }, [authUserId, chatStorageEnabled, isAuthenticated, profile]);

  useEffect(() => {
    if (!chatStorageEnabled || !profile?.id || !chatStorageReadyRef.current) return;

    try {
      saveProfileChats(authUserId, profile, chatSessions, activeChatSessionId);
      setChatStorageStatus(null);
    } catch (error) {
      if (error?.code === "CHAT_STORAGE_QUOTA_EXCEEDED") {
        setChatStorageStatus("ローカル会話ストレージが上限に達したため、最新の会話を完全には保存できませんでした。");
        return;
      }
      setChatStorageStatus("ローカル会話の保存に失敗しました。");
    }
  }, [activeChatSessionId, authUserId, chatSessions, chatStorageEnabled, profile]);

  useEffect(() => {
    if (!activeChatSession) {
      if (chatInput) {
        setChatInput("");
      }
      return;
    }

    if (chatInput !== activeChatSession.draftInput) {
      setChatInput(activeChatSession.draftInput || "");
    }
  }, [activeChatSession, chatInput]);

  const aiQuery = async ({ force = false, targetProfile = profile } = {}) => {
    if (!isAuthenticated || !targetProfile?.id) return;

    setShowReason(false);
    setIsElementInsightOpen(false);
    setSelectedElementInsight(null);
    setAILoading(true);
    setAIProgress(0);
    setAIProgressLabel("");
    setAIStatus(force ? "AI\u89e3\u8aad\u3092\u66f4\u65b0\u4e2d\u2026" : "AI\u89e3\u8aad\u3092\u6e96\u5099\u4e2d\u2026");
    setActiveTab("ai");

    try {
      const payload = await readAIInterpretationStream({
        meishikiId: targetProfile.id,
        force,
        accessToken: localStorage.getItem(ACCESS_TOKEN),
      });
      setAIResponse(payload);
      setAIProgress(100);
      setAIProgressLabel("AI\u89e3\u8aad\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002");
      setAIStatus(null);
      setAILoading(false);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "\u89e3\u8aad\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u3057\u3070\u3089\u304f\u3057\u3066\u304b\u3089\u518d\u8a66\u884c\u3057\u3066\u304f\u3060\u3055\u3044\u3002";
      setAIStatus(detail);
      setAILoading(false);
    }
  };

  const buildBirthDate = () => {
    if (form.date) return buildBirthDateIso(form, profile?.birthDate ?? "");
    if (initial.date) return buildBirthDateIso(initial, profile?.birthDate ?? "");
    return profile?.birthDate ?? "";
  };

  const save = async () => {
    if (!isAuthenticated) return;

    try {
      const initialName = initial.name ?? "";
      const initialDate = initial.date ?? "";
      const initialTime = initial.time ?? "";
      const initialBirthTimeUnknown = Boolean(initial.birthTimeUnknown);
      const initialGender = initial.gender ?? "M";

      const nameChanged = (form.name ?? "").trim() !== initialName;
      const dateChanged =
        (form.date ?? "") !== initialDate ||
        (form.time ?? "") !== initialTime ||
        Boolean(form.birthTimeUnknown) !== initialBirthTimeUnknown;
      const genderChanged = (form.gender ?? "") !== initialGender;

      if (!nameChanged && !dateChanged && !genderChanged) return profile;

      if (nameChanged) {
        const created = await api
          .post("/api/meishiki/", {
            name: form.name,
            birthDate: buildBirthDate(),
            gender: form.gender,
            birthTimeUnknown: Boolean(form.birthTimeUnknown),
          })
          .then((r) => r.data);

        setSelectedProfile(created);
        return created;
      }

      if (profile?.id) {
        const patchData = {};
        if (dateChanged) patchData.birthDate = buildBirthDate();
        if (dateChanged) patchData.birthTimeUnknown = Boolean(form.birthTimeUnknown);
        if (genderChanged) patchData.gender = form.gender;

        if (Object.keys(patchData).length > 0) {
          const updated = await api.patch(`/api/meishiki/${profile.id}/`, patchData).then((r) => r.data);
          setSelectedProfile(updated);
          return updated;
        }
        return profile;
      } else {
        const created = await api
          .post("/api/meishiki/", {
            name: form.name,
            birthDate: buildBirthDate(),
            gender: form.gender,
            birthTimeUnknown: Boolean(form.birthTimeUnknown),
          })
          .then((r) => r.data);
        setSelectedProfile(created);
        return created;
      }
    } catch (err) {
      console.error(err);
      alert("保存失敗");
      return null;
    }
  };

  const refreshAiQuery = async () => {
    if (!isAdmin) return;

    const savedProfile = await save();
    if (!savedProfile?.id) return;
    await aiQuery({ force: true, targetProfile: savedProfile });
  };

  useEffect(() => {
    if (!sortedChatSessions.length) {
      if (activeChatSessionId !== null) {
        setActiveChatSessionId(null);
      }
      return;
    }

    if (!sortedChatSessions.some((session) => session.id === activeChatSessionId)) {
      setActiveChatSessionId(sortedChatSessions[0].id);
    }
  }, [activeChatSessionId, sortedChatSessions]);

  const handleChatInputChange = (event) => {
    const nextValue = event.target.value;
    setChatInput(nextValue);
    setChatStorageStatus(null);

    if (!activeChatSessionId) return;

    updateChatSession(activeChatSessionId, (session) => ({
      ...session,
      draftInput: nextValue,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleCreateChatSession = () => {
    createAndActivateSession();
    setIsChatSidebarOpen(false);
  };

  const handleSelectChatSession = (sessionId) => {
    clearChatTypingTimer();
    setChatLoading(false);
    setChatStatus(null);
    setChatStorageStatus(null);
    setActiveChatSessionId(sessionId);
    setIsChatSidebarOpen(false);
  };

  const handleDeleteChatSession = (sessionId) => {
    setChatSessions((current) => {
      const remaining = sortChatSessions(current.filter((session) => session.id !== sessionId));
      const nextActiveSessionId =
        activeChatSessionId === sessionId ? remaining[0]?.id || null : activeChatSessionId;
      setActiveChatSessionId(nextActiveSessionId);
      if (nextActiveSessionId === null) {
        setChatInput("");
      }
      return remaining;
    });
    setChatStatus(null);
    setChatStorageStatus(null);
  };

  const sendAIChat = async (event) => {
    event.preventDefault();

    const question = chatInput.trim();
    if (!isAuthenticated || !profile?.id || !question || chatLoading || chatTyping) return;

    const session = activeChatSession || createAndActivateSession();
    const sessionId = session.id;
    const existingMessages = session.messages || [];
    const timestamp = new Date().toISOString();
    const nextMessages = [
      ...existingMessages,
      { role: "user", content: question },
      { role: "assistant", content: "", reasoning: "" },
    ];
    clearChatTypingTimer();
    setChatInput("");
    setChatStatus(null);
    setChatStorageStatus(null);
    setChatLoading(true);
    setActiveChatSessionId(sessionId);
    updateChatSession(sessionId, (currentSession) => ({
      ...currentSession,
      title: currentSession.messages.length === 0 ? buildSessionTitle(question) : currentSession.title,
      updatedAt: timestamp,
      draftInput: "",
      messages: nextMessages,
    }));

    try {
      await readChatStream({
        question,
        history: existingMessages.slice(-8),
        chartContext: chatContext,
        sessionId,
        accessToken: localStorage.getItem(ACCESS_TOKEN),
      });
    } catch (err) {
      clearChatTypingTimer();
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "AI会話に失敗しました。しばらくしてから再試行してください。";
      updateChatSession(sessionId, (currentSession) => ({
        ...currentSession,
        updatedAt: new Date().toISOString(),
        messages: currentSession.messages.filter((_, index) => index !== currentSession.messages.length - 1),
      }));
      setChatStatus(detail);
    } finally {
      setChatLoading(false);
    }
  };

  const toJapaneseEra = (isoDate) => {
    if (!isoDate) return "";

    const [year, month, day] = isoDate.split("-").map(Number);
    let era = "令和";
    let eraYear = year - 2018;

    if (year < 2019 && year >= 1989) {
      era = "平成";
      eraYear = year - 1988;
    } else if (year < 1989 && year >= 1926) {
      era = "昭和";
      eraYear = year - 1925;
    } else if (year < 1926 && year >= 1912) {
      era = "大正";
      eraYear = year - 1911;
    } else if (year < 1912) {
      era = "明治";
      eraYear = year - 1867;
    }

    const yearLabel = eraYear === 1 ? "元" : eraYear;
    return `${era}${yearLabel}年${month}月${day}日`;
  };

  const updateBirthTimeUnknown = (nextValue) => {
    setForm((current) => ({
      ...current,
      birthTimeUnknown: nextValue,
      time: nextValue ? "" : (current.time || "00:00"),
    }));
  };

  const reasonCards = useMemo(() => {
    const reasonData = aiResponse?.reason;
    if (!reasonData) return [];

    const toCard = (value) => {
      if (value == null) return null;
      if (typeof value === "string") return { title: "思考過程 / Reference", text: value };
      if (Array.isArray(value)) return value.map((nested) => toCard(nested)).filter(Boolean);
      if (typeof value === "object") {
        return {
          title: value.title || value.step || "思考過程 / Reference",
          text: value.text || value.detail || value.description || JSON.stringify(value, null, 2),
        };
      }
      return { title: "思考過程 / Reference", text: String(value) };
    };

    const cards = Array.isArray(reasonData)
      ? reasonData.flatMap((item) => {
          const result = toCard(item);
          return Array.isArray(result) ? result : [result];
        })
      : [toCard(reasonData)];

    return cards.filter(Boolean);
  }, [aiResponse]);
  const elementInsights = useMemo(() => {
    const insights = aiResponse?.element_insights;
    if (!insights || typeof insights !== "object" || Array.isArray(insights)) {
      return {};
    }
    return insights;
  }, [aiResponse]);
  const hasElementInsights = Object.keys(elementInsights).length > 0;

  useEffect(() => {
    if (hasElementInsights) return;
    setIsElementInsightOpen(false);
    setSelectedElementInsight(null);
  }, [hasElementInsights]);

  const displayName = (form.name || profile?.name || "未命名の命式").trim() || "未命名の命式";
  const displayDescription = profile?.description || "説明がまだありません。";
  const displayId = profile?.id ? `#${profile.id}` : "ID 未設定";
  const aiCreatedAt = aiResponse?.created_at ? new Date(aiResponse.created_at).toLocaleString() : null;
  const aiProgressValue = Math.max(0, Math.min(100, Number(aiProgress) || 0));
  const profileAvatar = displayName.slice(0, 1) || "?";
  const profileBirthDate = form.date || initial.date || "";
  const profileBirthTimeUnknown = Boolean(form.birthTimeUnknown ?? initial.birthTimeUnknown);
  const profileBirthTime = getBirthTimeDisplay(form.time || initial.time, profileBirthTimeUnknown);
  const profileGenderLabel = form.gender === "F" ? "女" : "男";
  const compactBaziPillars = useMemo(() => {
    const labels = ["年柱", "月柱", "日柱", "時柱"];
    const tenkan = Array.isArray(response?.tenkan) ? response.tenkan : [];
    const chishi = Array.isArray(response?.chishi) ? response.chishi : [];
    const stemNotes = Array.isArray(response?.junshi?.tenkan) ? response.junshi.tenkan : [];
    const branchNotes = Array.isArray(response?.junshi?.zoukan_honki) ? response.junshi.zoukan_honki : [];

    return labels.map((label, index) => ({
      label,
      stem: tenkan[index] || "・",
      branch: chishi[index] || "・",
      stemNote: stemNotes[index] || "",
      branchNote: branchNotes[index] || "",
    }));
  }, [response]);
  const compactBaziReady = compactBaziPillars.some((pillar) => pillar.stem !== "・" || pillar.branch !== "・");
  const chatContext = useMemo(
    () => ({
      profile: profile
        ? {
            id: profile.id,
            name: profile.name,
            birthDate: profile.birthDate,
            gender: profile.gender,
            birthTimeUnknown: profile.birthTimeUnknown,
          }
        : null,
      form: {
        date: form.date,
        time: getQueryTimeValue(form.time, form.birthTimeUnknown),
        birthTimeUnknown: Boolean(form.birthTimeUnknown),
        gender: form.gender,
      },
      chart: response
        ? {
            tenkan: response.tenkan,
            chishi: response.chishi,
            junshi: response.junshi,
            juniunshi: response.juniunshi,
            zoukan: response.zoukan,
            kubou: response.kubou,
            shi_type: response.shi_type,
            shi_type_ratio: response.shi_type_ratio,
            shi_type_adjusted: response.shi_type_adjusted,
            shi_type_ratio_adjusted: response.shi_type_ratio_adjusted,
            element_energy: response.element_energy,
            element_energy_adjusted: response.element_energy_adjusted,
            gouka: response.gouka,
            precision_chart: response.precision_chart
              ? {
                  current_date: response.precision_chart.current_date,
                  active_daiun: response.precision_chart.active_daiun,
                  active_year: response.precision_chart.active_year,
                  flow_year: response.precision_chart.flow_year,
                  flow_month: response.precision_chart.flow_month,
                  flow_day: response.precision_chart.flow_day,
                  natal: response.precision_chart.natal,
                }
              : null,
          }
        : null,
      ai_interpretation: Array.isArray(aiResponse?.content) ? aiResponse.content : [],
    }),
    [aiResponse, form, profile, response]
  );
  const exportFileBase = `${displayName}-${form.date || "export"}`
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");

  useEffect(() => {
    if (!visibleChatMessages.length && !chatLoading) return;

    [inlineChatListRef, fullscreenChatListRef].forEach((ref) => {
      if (!ref.current) return;
      ref.current.scrollTop = ref.current.scrollHeight;
    });
  }, [activeChatSessionId, chatLoading, chatTyping, isChatFullscreen, visibleChatMessages]);

  useEffect(() => {
    if (!isChatFullscreen) return;

    const focusInput = () => {
      fullscreenChatInputRef.current?.focus();
      fullscreenChatInputRef.current?.setSelectionRange?.(
        fullscreenChatInputRef.current.value.length,
        fullscreenChatInputRef.current.value.length
      );
    };

    const frameId = window.requestAnimationFrame(focusInput);
    return () => window.cancelAnimationFrame(frameId);
  }, [activeChatSessionId, isChatFullscreen]);

  useEffect(() => {
    if (profile?.id) return;
    closeChatFullscreen();
    setIsProfileBaziOpen(false);
    setIsElementInsightOpen(false);
    setSelectedElementInsight(null);
  }, [profile?.id]);

  useEffect(() => {
    setIsInlineChatSessionsCollapsed(true);
    setIsInlineChatCollapsed(true);
  }, [profile?.id]);

  useEffect(() => {
    if (chatStorageEnabled) return;
    closeChatFullscreen();
    setIsProfileBaziOpen(false);
    setIsElementInsightOpen(false);
    setSelectedElementInsight(null);
  }, [chatStorageEnabled]);

  const waitForExportLayout = async () => {
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // ignore font readiness failure and continue exporting
      }
    }

    if (exportRef.current) {
      const images = Array.from(exportRef.current.querySelectorAll("img"));
      await Promise.all(
        images
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              })
          )
      );
    }

    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
  };

  const captureExportCanvas = async () => {
    if (!exportRef.current || !response) {
      alert("命式データがまだありません。");
      return null;
    }

    setExportingType("image");

    try {
      await waitForExportLayout();
      return await html2canvas(exportRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
    } catch (err) {
      console.error(err);
      alert("出力に失敗しました。");
      return null;
    } finally {
      setExportingType(null);
    }
  };

  const exportAsImage = async () => {
    const canvas = await captureExportCanvas();
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${exportFileBase}.png`;
    link.click();
  };

  const exportAsPdf = async () => {
    if (!response) {
      alert("命式データがまだありません。");
      return;
    }

    await waitForExportLayout();

    const printHtml = exportRef.current?.innerHTML || "";
    const printStyles = `
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #000000;
        font-family: "BIZ UDGothic","Noto Serif JP","A1 Mincho","YuMincho","Hiragino Mincho ProN","Yu Mincho","MS PMincho",serif;
      }

      * {
        box-sizing: border-box;
      }

      .pd-print-root {
        width: min(100%, 430px);
        margin: 0 auto;
        padding: 16px 14px 24px;
        background: #fff;
      }

      .pd-panel {
        border: 1px solid #000;
        background: #fff;
      }

      .pd-panel + .pd-panel {
        margin-top: 12px;
      }

      .pd-panel-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        background: #ccffcc;
        border-bottom: 1px solid #000;
      }

      .pd-panel-title {
        font-weight: 700;
        font-size: 19px;
        line-height: 1.25;
      }

      .pd-panel-caption {
        margin-top: 4px;
        font-size: 14px;
      }

      .pd-export-header {
        border: 1px solid #000;
        padding: 12px;
        background: #fff;
      }

      .pd-export-title {
        font-size: 20px;
        font-weight: 700;
      }

      .pd-export-subtitle {
        margin-top: 4px;
      }

      .pd-export-meta {
        margin-top: 12px;
        border: 1px solid #000;
        background: #fff;
      }

      .pd-export-meta-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 8px 10px;
        border-bottom: 1px solid #000;
      }

      .pd-export-meta-row:last-child {
        border-bottom: none;
      }

      .pd-export-meta-label {
        width: 72px;
        flex-shrink: 0;
        font-weight: 700;
      }

      .pd-export-meta-value {
        flex: 1;
        word-break: break-word;
      }

      .pd-export-panel {
        margin-top: 12px;
      }

      .pd-export-shell {
        padding: 0;
      }

      .pd-export-list {
        padding-top: 0;
      }

      .pd-export-meishiki {
        border: 1px solid #000;
        border-bottom: none;
        background: #fff;
      }

      .pd-export-meishiki-row {
        display: grid;
        grid-template-columns: 64px repeat(4, minmax(0, 1fr));
        border-bottom: 1px solid #000;
      }

      .pd-export-meishiki-label,
      .pd-export-meishiki-col,
      .pd-export-meishiki-wide {
        min-width: 0;
        padding: 8px 6px;
        border-right: 1px solid #000;
        text-align: center;
      }

      .pd-export-meishiki-label {
        background: #ccffcc;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        writing-mode: vertical-rl;
        text-orientation: upright;
        letter-spacing: 1px;
        line-height: 1.1;
        text-align: center;
        white-space: nowrap;
        padding: 0;
      }

      .pd-export-meishiki-col:last-child,
      .pd-export-meishiki-wide:last-child {
        border-right: none;
      }

      .pd-export-meishiki-head .pd-export-meishiki-col,
      .pd-export-meishiki-head .pd-export-meishiki-label {
        background: #eeebde;
        font-weight: 700;
      }

      .pd-export-meishiki-wide {
        grid-column: 2 / 6;
        border-right: none;
      }

      .pd-export-pillar-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .pd-export-pillar-main {
        font-size: 26px;
        line-height: 1.1;
        font-weight: 700;
      }

      .pd-export-pillar-sub {
        min-height: 18px;
        font-size: 11px;
        line-height: 1.25;
        word-break: break-word;
      }

      .pd-export-zoukan-cell {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .pd-export-zoukan-line {
        display: flex;
        justify-content: center;
        align-items: baseline;
        gap: 2px;
        line-height: 1.3;
      }

      .pd-export-zoukan-main {
        font-weight: 700;
      }

      .pd-export-zoukan-sub {
        font-size: 11px;
        word-break: break-word;
      }

      .pd-ai-list,
      .pd-reason-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
      }

      .pd-ai-row {
        border: 1px solid #000;
        background: #fff;
        margin: 0;
        padding: 12px;
      }

      .pd-ai-entity {
        display: inline-block;
        margin: 0;
        padding: 0 8px;
        border: 1px solid #000;
        background: #ccffcc;
        font-weight: 700;
        width: auto;
      }

      .pd-ai-row-reason .pd-ai-entity {
        background: #eeebde;
      }

      .pd-ai-content {
        padding: 4px 0 0;
      }

      .pd-ai-content p,
      .pd-ai-content ul,
      .pd-ai-content ol {
        margin: 0 0 0.75em;
      }

      .pd-ai-content p:last-child,
      .pd-ai-content ul:last-child,
      .pd-ai-content ol:last-child {
        margin-bottom: 0;
      }

      .pd-empty-state,
      .pd-ai-status {
        margin: 12px;
        padding: 12px;
        border: 1px solid #000;
        background: #fff;
      }

      .pd-export-ai-card {
        border: 1px solid #000;
        background: #fff;
        padding: 12px;
      }

      .pd-export-ai-title {
        display: inline-block;
        margin: 0 0 8px;
        padding: 2px 10px 3px;
        border: 1px solid #000;
        background: #ccffcc;
        font-weight: 700;
        font-size: 18px;
        line-height: 1.25;
        vertical-align: top;
      }

      .pd-export-ai-card-reason .pd-export-ai-title {
        background: #eeebde;
      }

      .pd-export-ai-body {
        padding-top: 2px;
        line-height: 1.6;
      }

      .pd-export-ai-body p,
      .pd-export-ai-body ul,
      .pd-export-ai-body ol {
        margin: 0 0 0.75em;
      }

      .pd-export-ai-body p:last-child,
      .pd-export-ai-body ul:last-child,
      .pd-export-ai-body ol:last-child {
        margin-bottom: 0;
      }

      @page {
        size: A4;
        margin: 12mm;
      }

      @media print {
        html, body {
          width: auto;
          overflow: visible;
        }

        .pd-print-root {
          width: auto;
          max-width: none;
          padding: 0;
        }

        .pd-panel,
        .pd-export-meta,
        .pd-export-header,
        .pd-ai-row {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    `;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const printDocument = iframe.contentDocument || iframe.contentWindow?.document;
    const printWindow = iframe.contentWindow;
    if (!printDocument || !printWindow) {
      iframe.remove();
      alert("印刷プレビューの準備に失敗しました。");
      return;
    }

    printDocument.open();
    printDocument.write(`
      <!doctype html>
      <html lang="ja">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${exportFileBase}</title>
          <style>${printStyles}</style>
        </head>
        <body>
          <div class="pd-print-root">${printHtml}</div>
        </body>
      </html>
    `);
    printDocument.close();

    const cleanup = () => {
      window.setTimeout(() => {
        iframe.remove();
      }, 500);
    };

    printWindow.onafterprint = cleanup;
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 120);
  };

  const handleElementInsightClick = ({ key }) => {
    if (!hasElementInsights) {
      setSelectedElementInsight({
        title: "命式要素解読",
        pillarLabel: "-",
        partLabel: "-",
        symbol: "",
        tsuhen: "",
        content: "この機能を使うには、先に「AI解読開始」または「解読更新」を実行してください。",
        isNotice: true,
      });
      setIsElementInsightOpen(true);
      return;
    }

    const insight = elementInsights[key];
    if (!insight) return;
    setSelectedElementInsight(insight);
    setIsElementInsightOpen(true);
  };

  const elementInsightTitle = selectedElementInsight?.title || "命式要素解読";
  const elementInsightPartLabel = selectedElementInsight?.partLabel || "-";
  const elementInsightPillarLabel = selectedElementInsight?.pillarLabel || "-";

  const renderAiSections = (items, extraClass = "") =>
    items.map((item, index) => (
      <fieldset key={`${item.entity}-${index}`} className={`pd-ai-row ${extraClass}`.trim()}>
        <legend className="pd-ai-entity">{item.entity}</legend>
        <div className="pd-ai-content display-linebreak">
          <ReactMarkdown>{item.content || ""}</ReactMarkdown>
        </div>
      </fieldset>
    ));

  const exportReasonSections = reasonCards.map((card, index) => ({
    entity: card.title,
    content: card.text || "",
    key: `${card.title}-${index}`,
  }));

  const renderExportAiCards = (items, extraClass = "") =>
    items.map((item, index) => (
      <div key={item.key || `${item.entity}-${index}`} className={`pd-export-ai-card ${extraClass}`.trim()}>
        <div className="pd-export-ai-title">{item.entity}</div>
        <div className="pd-export-ai-body display-linebreak">
          <ReactMarkdown>{item.content || ""}</ReactMarkdown>
        </div>
      </div>
    ));

  const renderTsuhenRuby = (value, className = "") =>
    value ? (
      <ruby className={`pd-tsuhen-ruby ${className}`.trim()}>
        <span>{value}</span>
        <rt aria-hidden="true">&nbsp;</rt>
      </ruby>
    ) : (
      " "
    );

  const renderExportPillarCell = (name, tsuhen = "") => (
    <div className="pd-export-pillar-cell">
      <div className="pd-export-pillar-main" style={{ color: getElementColor(name) }}>
        {name ?? "・"}
      </div>
      <div className="pd-export-pillar-sub">{renderTsuhenRuby(tsuhen)}</div>
    </div>
  );

  const renderExportZoukanCell = (index) => (
    <div className="pd-export-zoukan-cell">
      {[2, 1, 0].map((subIndex, lineIndex) => {
        const tsuhenKeys = ["zoukan_yoki", "zoukan_chuki", "zoukan_honki"];
        const tsuhenKey = tsuhenKeys[subIndex];
        const name = response?.zoukan?.[index]?.[subIndex];
        const tsuhen = response?.junshi?.[tsuhenKey]?.[index];
        return (
          <div key={`${index}-${lineIndex}`} className="pd-export-zoukan-line">
            <span className="pd-export-zoukan-main" style={{ color: getElementColor(name) }}>
              {name ?? "・"}
            </span>
            <span className="pd-export-zoukan-sub">{renderTsuhenRuby(tsuhen)}</span>
          </div>
        );
      })}
    </div>
  );

  const renderExportMeishiki = () => (
    <div className="pd-export-meishiki">
      <div className="pd-export-meishiki-row pd-export-meishiki-head">
        <div className="pd-export-meishiki-label">-</div>
        <div className="pd-export-meishiki-col">年柱</div>
        <div className="pd-export-meishiki-col">月柱</div>
        <div className="pd-export-meishiki-col">日柱</div>
        <div className="pd-export-meishiki-col">時柱</div>
      </div>

      <div className="pd-export-meishiki-row">
        <div className="pd-export-meishiki-label">十神</div>
        <div className="pd-export-meishiki-col">{response?.junshi?.tenkan?.[0] || " "}</div>
        <div className="pd-export-meishiki-col">{response?.junshi?.tenkan?.[1] || " "}</div>
        <div className="pd-export-meishiki-col">{response?.gender === 1 ? "男" : "女"}</div>
        <div className="pd-export-meishiki-col">{response?.junshi?.tenkan?.[3] || " "}</div>
      </div>

      <div className="pd-export-meishiki-row">
        <div className="pd-export-meishiki-label">天干</div>
        <div className="pd-export-meishiki-col">{renderExportPillarCell(response?.tenkan?.[0], response?.junshi?.tenkan?.[0])}</div>
        <div className="pd-export-meishiki-col">{renderExportPillarCell(response?.tenkan?.[1], response?.junshi?.tenkan?.[1])}</div>
        <div className="pd-export-meishiki-col">{renderExportPillarCell(response?.tenkan?.[2], response?.junshi?.tenkan?.[2])}</div>
        <div className="pd-export-meishiki-col">{renderExportPillarCell(response?.tenkan?.[3], response?.junshi?.tenkan?.[3])}</div>
      </div>

      <div className="pd-export-meishiki-row">
        <div className="pd-export-meishiki-label">地支</div>
        <div className="pd-export-meishiki-col">{renderExportPillarCell(response?.chishi?.[0], response?.junshi?.zoukan_honki?.[0])}</div>
        <div className="pd-export-meishiki-col">{renderExportPillarCell(response?.chishi?.[1], response?.junshi?.zoukan_honki?.[1])}</div>
        <div className="pd-export-meishiki-col">{renderExportPillarCell(response?.chishi?.[2], response?.junshi?.zoukan_honki?.[2])}</div>
        <div className="pd-export-meishiki-col">{renderExportPillarCell(response?.chishi?.[3], response?.junshi?.zoukan_honki?.[3])}</div>
      </div>

      <div className="pd-export-meishiki-row">
        <div className="pd-export-meishiki-label">蔵干</div>
        <div className="pd-export-meishiki-col">{renderExportZoukanCell(0)}</div>
        <div className="pd-export-meishiki-col">{renderExportZoukanCell(1)}</div>
        <div className="pd-export-meishiki-col">{renderExportZoukanCell(2)}</div>
        <div className="pd-export-meishiki-col">{renderExportZoukanCell(3)}</div>
      </div>

      <div className="pd-export-meishiki-row">
        <div className="pd-export-meishiki-label">十二運星</div>
        <div className="pd-export-meishiki-col">{response?.juniunshi?.[0] ?? "・"}</div>
        <div className="pd-export-meishiki-col">{response?.juniunshi?.[1] ?? "・"}</div>
        <div className="pd-export-meishiki-col">{response?.juniunshi?.[2] ?? "・"}</div>
        <div className="pd-export-meishiki-col">{response?.juniunshi?.[3] ?? "・"}</div>
      </div>

      <div className="pd-export-meishiki-row">
        <div className="pd-export-meishiki-label">空亡</div>
        <div className="pd-export-meishiki-wide">{response?.kubou ?? "・"}</div>
      </div>
    </div>
  );

  const renderChatSessionItems = () =>
    sortedChatSessions.length === 0 ? (
      <div className="pd-empty-state pd-chat-empty">履歴会話はまだありません。まずは新しい conversation を作成してください。</div>
    ) : (
      <div className="pd-chat-session-list">
        {sortedChatSessions.map((session) => (
          <button
            key={session.id}
            type="button"
            className={`pd-chat-session-item${session.id === activeChatSessionId ? " pd-chat-session-item-active" : ""}`}
            onClick={() => handleSelectChatSession(session.id)}
          >
            <div className="pd-chat-session-main">
              <div className="pd-chat-session-title">{session.title}</div>
              <div className="pd-chat-session-meta">{new Date(session.updatedAt).toLocaleString()}</div>
            </div>
            <span
              role="button"
              tabIndex={0}
              className="pd-chat-session-delete"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleDeleteChatSession(session.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  handleDeleteChatSession(session.id);
                }
              }}
            >
              削除
            </span>
          </button>
        ))}
      </div>
    );

  const renderChatMessages = (listRef, extraClass = "") => (
    <div ref={listRef} className={`pd-chat-list ${extraClass}`.trim()} aria-live="polite">
      {activeChatSession ? (
        visibleChatMessages.length === 0 ? (
          <div className="pd-empty-state pd-chat-empty">
            例: この命局の格局定位をもう少し噛み砕いて説明してください。
          </div>
        ) : (
          visibleChatMessages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`pd-chat-message pd-chat-message-${message.role}`}>
              <div className="pd-chat-role">{message.role === "user" ? "あなた" : "AI"}</div>
              <div className="pd-chat-bubble display-linebreak">
                <ReactMarkdown>{message.content}</ReactMarkdown>
                {message.role === "assistant" && message.reasoning ? (
                  <details className="pd-chat-reasoning">
                    <summary>思考過程 / Reference</summary>
                    <div className="pd-chat-reasoning-body display-linebreak">
                      <ReactMarkdown>{message.reasoning}</ReactMarkdown>
                    </div>
                  </details>
                ) : null}
                {message.typing ? <span className="pd-chat-cursor" aria-hidden="true"></span> : null}
              </div>
            </div>
          ))
        )
      ) : (
        <div className="pd-empty-state pd-chat-empty">「新規会話」をクリックして、この命局の AI 会話を始めてください。</div>
      )}
      {chatLoading ? (
        <div className="pd-chat-message pd-chat-message-assistant">
          <div className="pd-chat-role">AI</div>
          <div className="pd-chat-bubble pd-chat-loading">
            <span className="pd-spinner" aria-hidden="true"></span>
            <span>回答を生成中...</span>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderChatComposer = (inputRef = null, extraClass = "") => (
    <form className={`pd-chat-form ${extraClass}`.trim()} onSubmit={sendAIChat}>
      <textarea
        ref={inputRef}
        className="pd-chat-input"
        value={chatInput}
        onChange={handleChatInputChange}
        placeholder={activeChatSession ? "この命局について AI に質問..." : "先に新しい conversation を作成してください"}
        rows={3}
        disabled={!activeChatSession || chatLoading || chatTyping}
      />
      <button
        type="submit"
        className="pd-action-button pd-chat-send"
        disabled={!activeChatSession || chatLoading || chatTyping || !chatInput.trim()}
      >
        送信
      </button>
    </form>
  );

  const renderChatStatuses = () => (
    <>
      {chatStatus ? <div className="pd-ai-status">{chatStatus}</div> : null}
      {chatStorageStatus ? <div className="pd-ai-status">{chatStorageStatus}</div> : null}
    </>
  );

  const renderProfileIdentity = () => (
    <button type="button" className="pd-chat-profile-button" onClick={() => setIsProfileBaziOpen(true)}>
      <span className="pd-chat-profile-avatar" aria-hidden="true">
        {profileAvatar}
      </span>
      <span className="pd-chat-profile-meta">
        <span className="pd-chat-profile-name">{displayName}</span>
        <span className="pd-chat-profile-caption">命式プロフィール</span>
      </span>
    </button>
  );

  const renderFullscreenSidebar = () => (
    <aside
      className={`pd-chat-fullscreen-sidebar${isChatSidebarOpen ? " is-open" : ""}${
        isChatSidebarCollapsed ? " is-collapsed" : ""
      }`}
    >
      <div className="pd-chat-fullscreen-sidebar-head">
        <div>
          <div className="pd-chat-session-label">Conversation</div>
          <div className="pd-chat-session-caption">{displayName} の履歴会話</div>
        </div>
        <div className="pd-chat-sidebar-actions">
          <button
            type="button"
            className="pd-chat-sidebar-collapse"
            onClick={() => setIsChatSidebarCollapsed((current) => !current)}
            aria-label={isChatSidebarCollapsed ? "会話一覧を展開" : "会話一覧を折りたたむ"}
          >
            {isChatSidebarCollapsed ? ">>" : "<<"}
          </button>
          <button
            type="button"
            className="pd-chat-sidebar-close"
            onClick={() => setIsChatSidebarOpen(false)}
            aria-label="会話一覧を閉じる"
          >
            x
          </button>
        </div>
      </div>
      <button type="button" className="pd-action-button pd-chat-sidebar-create" onClick={handleCreateChatSession}>
        {isChatSidebarCollapsed ? "+" : "新規会話"}
      </button>
      <div className="pd-chat-fullscreen-sidebar-body">{renderChatSessionItems()}</div>
      <hr className="pd-chat-sidebar-divider" />
      <div className="pd-chat-fullscreen-sidebar-foot">{renderProfileIdentity()}</div>
    </aside>
  );

  return (
    <>
    <div className="container debug-container percision-debug">
      <div className="pd-screen-content">
        <div className="pd-title-row">
          <div>
            <div className="pd-title">{displayName} - 四柱推命精密版鑑定</div>
            <div className="pd-title-sub">{displayDescription}</div>
          </div>
          <div className="pd-counter">{displayId}</div>
        </div>

        <div className="row g-3">
        <div className="col-12">
          <section className="pd-panel">
            <div className="pd-panel-head">
              <div>
                <div className="pd-panel-title">操作</div>
              </div>
              <div className="pd-actions">
                <button
                  type="button"
                  className="pd-action-button"
                  onClick={queryForm}
                  disabled={!form.date || (!form.birthTimeUnknown && !form.time)}
                >
                  鑑定
                </button>
                {isAuthenticated ? (
                  <>
                    <button
                      type="button"
                      className="pd-action-button"
                      onClick={save}
                      disabled={!isDirty}
                    >
                      {saveMode}
                    </button>
                    <button type="button" className="pd-action-button" onClick={aiQuery}>
                      AI解読
                    </button>
                    {isAdmin ? (
                      <button type="button" className="pd-action-button" onClick={refreshAiQuery} disabled={aiLoading}>
                        解読更新
                      </button>
                    ) : null}
                  </>
                ) : null}
                <button
                  type="button"
                  className="pd-action-button"
                  onClick={exportAsPdf}
                  disabled={!response || exportingType !== null}
                >
                  {exportingType === "pdf" ? "PDF出力中…" : "PDF出力"}
                </button>
                <button
                  type="button"
                  className="pd-action-button"
                  onClick={exportAsImage}
                  disabled={!response || exportingType !== null}
                >
                  {exportingType === "image" ? "画像出力中…" : "長画像出力"}
                </button>
              </div>
            </div>

            <div className="row g-3 pd-action-form">
              <div className="col-12 col-md-6 col-xl-3">
                <label className="pd-field-label">名称</label>
                <div className="pd-control-wrap">
                  <input value={form.name} onChange={onChange("name")} className="table-input pd-control-input" />
                </div>
              </div>
              <div className="col-12 col-md-6 col-xl-3">
                <label className="pd-field-label">誕生日</label>
                <div className="pd-control-wrap pd-control-wrap-required">
                  <input
                    value={form.date}
                    onChange={onChange("date")}
                    className="table-input pd-control-input"
                    type="date"
                  />
                  {form.date ? <span className="pd-inline-note">（{toJapaneseEra(form.date)}）</span> : null}
                </div>
              </div>
              <div className="col-12 col-md-6 col-xl-3">
                <label className="pd-field-label">時間</label>
                <div className="pd-control-wrap pd-control-wrap-required">
                  <input
                    value={form.time}
                    onChange={onChange("time")}
                    className="table-input pd-control-input"
                    type="time"
                    disabled={form.birthTimeUnknown}
                  />
                  <label className="birth-time-checkbox">
                    <input
                      type="checkbox"
                      checked={form.birthTimeUnknown}
                      onChange={(event) => updateBirthTimeUnknown(event.target.checked)}
                    />
                    不明
                  </label>
                  <span className="pd-inline-note">（真太陽時）</span>
                </div>
              </div>
              <div className="col-12 col-md-6 col-xl-3">
                <label className="pd-field-label">性別</label>
                <div className="pd-control-wrap">
                  <select value={form.gender} onChange={onChange("gender")} className="table-input pd-control-input">
                    <option value="M">男</option>
                    <option value="F">女</option>
                  </select>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="col-12">
          <section className="pd-panel">
            <div className="pd-panel-head">
              <div>
                <div className="pd-panel-title">御命式</div>
              </div>
            </div>

            <Tabs
              activeKey={activeTab === "ai" ? "meishiki" : activeTab}
              onSelect={(key) => setActiveTab(key || "meishiki")}
              id="percision-debug-tabs"
              className="meishiki-tab pd-tabs-nav"
            >
              <Tab eventKey="meishiki" title="命式盤">
                <div className="pd-tab-shell">
                  <PrecisionMeishikiBoard
                    key={`${profile?.id ?? "profile"}-${profile?.birthDate ?? ""}-${profile?.gender ?? ""}`}
                    data={response}
                    requestInput={{
                      date: form.date,
                      time: getQueryTimeValue(form.time, form.birthTimeUnknown),
                      birthTimeUnknown: Boolean(form.birthTimeUnknown),
                      gender: form.gender === "M" ? 1 : 0,
                    }}
                    elementInsightsAvailable={hasElementInsights}
                    onElementClick={handleElementInsightClick}
                  />
                </div>
              </Tab>
              <Tab eventKey="gouka" title="刑・沖・破・害">
                <div className="pd-tab-shell">
                  {activeTab === "gouka" && response ? (
                    <GoukaAnlysis tableWidth={"100%"} response={response} active={activeTab === "gouka"} />
                  ) : "-"}
                </div>
              </Tab>
              <Tab eventKey="liutong" title="流通">
                <div className="pd-tab-shell">
                  {activeTab === "liutong" && response ? (
                    <ElementFlow response={response} active={activeTab === "liutong"} />
                  ) : "-"}
                </div>
              </Tab>
            </Tabs>
          </section>
        </div>

        {isAuthenticated && isAdmin ? (
          <div className="col-12">
            <section className="pd-panel">
              <div className="pd-panel-head">
                <div>
                  <div className="pd-panel-title">AI会話</div>
                  <div className="pd-panel-caption">この命局とAI解読について質問できます。</div>
                </div>
                <div className="pd-actions">
                  <button
                    type="button"
                    className="pd-action-button"
                    onClick={() => setIsInlineChatCollapsed((current) => !current)}
                  >
                    {isInlineChatCollapsed ? "▶ 開く" : "▼ 閉じる"}
                  </button>
                  {profile?.id ? (
                    <button type="button" className="pd-action-button" onClick={() => setIsChatFullscreen(true)}>
                      最大化
                    </button>
                  ) : null}
                </div>
              </div>

              {isInlineChatCollapsed ? null : !profile?.id ? (
                <div className="pd-empty-state">先に命局を保存するとAI会話を利用できます。</div>
              ) : (
                <>
                  <div className="pd-chat-session-toolbar">
                    <button
                      type="button"
                      className="pd-action-button"
                      onClick={handleCreateChatSession}
                      disabled={chatLoading || chatTyping}
                    >
                      新規会話
                    </button>
                  </div>

                  <div
                    className={`pd-chat-session-panel${
                      isInlineChatSessionsCollapsed ? " is-collapsed" : ""
                    }`}
                  >
                    <div className="pd-chat-session-head">
                      <div className="pd-chat-session-summary">
                        <div className="pd-chat-session-label">Conversation</div>
                        {!isInlineChatSessionsCollapsed ? (
                          <div className="pd-chat-session-caption">{displayName} の履歴会話</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="pd-chat-session-toggle"
                        onClick={() => setIsInlineChatSessionsCollapsed((current) => !current)}
                        aria-expanded={!isInlineChatSessionsCollapsed}
                      >
                        {isInlineChatSessionsCollapsed ? "▶ 開く" : "▼ 閉じる"}
                      </button>
                    </div>
                    {!isInlineChatSessionsCollapsed ? renderChatSessionItems() : null}
                  </div>

                  {renderChatMessages(inlineChatListRef)}
                  {renderChatStatuses()}
                  {renderChatComposer()}
                </>
              )}
            </section>
          </div>
        ) : null}
        <div className="col-12">
          <section className="pd-panel">
            <div className="pd-panel-head">
              <div>
                <div className="pd-panel-title">AI解読</div>
                <div className="pd-panel-caption">
                  {aiCreatedAt ? `最終更新: ${aiCreatedAt}` : "まだAI解読は生成されていません。"}
                </div>
              </div>
              <div className="pd-actions">
                {isAuthenticated && reasonCards.length > 0 ? (
                  <button
                    type="button"
                    className="pd-action-button"
                    onClick={() => setShowReason((current) => !current)}
                    disabled={aiLoading}
                  >
                    {showReason ? "▼ 思考過程を閉じる" : "▶ 思考過程を見る"}
                  </button>
                ) : null}
                {isAuthenticated ? (
                  <button type="button" className="pd-action-button" onClick={aiQuery} disabled={aiLoading}>
                    {aiLoading ? "生成中…" : aiResponse ? "再解読" : "AI解読開始"}
                  </button>
                ) : null}
                {isAuthenticated && isAdmin ? (
                  <button type="button" className="pd-action-button" onClick={refreshAiQuery} disabled={aiLoading}>
                    解読更新
                  </button>
                ) : null}
              </div>
            </div>
            {aiLoading ? (
              <div className="pd-ai-status pd-ai-status-progress">
                <span className="pd-spinner" aria-hidden="true"></span>
                <div className="pd-ai-progress-wrap">
                  <div className="pd-ai-progress-head">
                    <span>{aiProgressLabel || aiStatus || "AI\u89e3\u8aad\u3092\u751f\u6210\u4e2d\u2026"}</span>
                    <span>{aiProgressValue}%</span>
                  </div>
                  <div className="pd-ai-progress-track" aria-hidden="true">
                    <div className="pd-ai-progress-bar" style={{ width: `${aiProgressValue}%` }}></div>
                  </div>
                </div>
              </div>
            ) : aiStatus ? (
              <div className="pd-ai-status">
                <span>{aiStatus}</span>
              </div>
            ) : null}

            {aiLoading ? null : !Array.isArray(aiResponse?.content) || aiResponse.content.length === 0 ? (
              <div className="pd-empty-state">AI\u89e3\u8aad\u3092\u958b\u59cb\u3059\u308b\u3068\u3001\u3053\u3053\u306b\u89e3\u8aad\u7d50\u679c\u304c\u8868\u793a\u3055\u308c\u307e\u3059\u3002</div>
            ) : (
              <div className="pd-ai-list">{renderAiSections(aiResponse.content)}</div>
            )}

            {showReason && reasonCards.length > 0 ? (
              <div className="pd-reason-list">
                {exportReasonSections.map((card) => (
                  <fieldset key={card.key} className="pd-ai-row pd-ai-row-reason">
                    <legend className="pd-ai-entity">{card.entity}</legend>
                    <div className="pd-ai-content display-linebreak">
                      <ReactMarkdown>{card.content}</ReactMarkdown>
                    </div>
                  </fieldset>
                ))}
              </div>
            ) : null}
          </section>
        </div>
        </div>
      </div>

      <div className="pd-export-stage" aria-hidden="true">
        <div ref={exportRef} className="pd-export-sheet">
          <div className="pd-export-header">
            <div className="pd-export-title">{displayName}</div>
            <div className="pd-export-subtitle">御命式・AI解読 出力版</div>
          </div>

          <div className="pd-export-meta">
            <div className="pd-export-meta-row">
              <span className="pd-export-meta-label">誕生日</span>
              <span className="pd-export-meta-value">
                {form.date || "-"}
                {form.date ? ` （${toJapaneseEra(form.date)}）` : ""}
              </span>
            </div>
            <div className="pd-export-meta-row">
              <span className="pd-export-meta-label">時間</span>
              <span className="pd-export-meta-value">
                {getBirthTimeDisplay(form.time, form.birthTimeUnknown) || "-"} （真太陽時）
              </span>
            </div>
            <div className="pd-export-meta-row">
              <span className="pd-export-meta-label">性別</span>
              <span className="pd-export-meta-value">{form.gender === "M" ? "男" : "女"}</span>
            </div>
          </div>

          <section className="pd-panel pd-export-panel">
            <div className="pd-panel-head">
              <div className="pd-panel-title">御命式</div>
            </div>
            <div className="pd-tab-shell pd-export-shell">
              {renderExportMeishiki()}
            </div>
          </section>

          <section className="pd-panel pd-export-panel">
            <div className="pd-panel-head">
              <div>
                <div className="pd-panel-title">AI解読</div>
                <div className="pd-panel-caption">
                  {aiCreatedAt ? `最終更新: ${aiCreatedAt}` : "AI解読が未生成の場合は空欄になります。"}
                </div>
              </div>
            </div>

            {aiStatus && !Array.isArray(aiResponse?.content) ? <div className="pd-ai-status">{aiStatus}</div> : null}

            {Array.isArray(aiResponse?.content) && aiResponse.content.length > 0 ? (
              <div className="pd-ai-list pd-export-list">{renderExportAiCards(aiResponse.content)}</div>
            ) : (
              <div className="pd-empty-state">AI解読結果がまだありません。</div>
            )}

            {exportReasonSections.length > 0 ? (
              <div className="pd-reason-list pd-export-list">
                {renderExportAiCards(exportReasonSections, "pd-export-ai-card-reason")}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>

    <Modal show={isChatFullscreen} onHide={closeChatFullscreen} fullscreen className="pd-chat-fullscreen-modal">
      <Modal.Body className="pd-chat-fullscreen-modal-body">
        <div className={`pd-chat-fullscreen-shell${isChatSidebarCollapsed ? " is-sidebar-collapsed" : ""}`}>
          {renderFullscreenSidebar()}
          <button
            type="button"
            className={`pd-chat-sidebar-backdrop${isChatSidebarOpen ? " is-open" : ""}`}
            onClick={() => setIsChatSidebarOpen(false)}
            aria-label="会話一覧を閉じる"
          />
          <section className="pd-chat-fullscreen-main">
            <div className="pd-chat-fullscreen-main-head">
              <div className="pd-chat-fullscreen-main-info">
                <button
                  type="button"
                  className="pd-chat-sidebar-toggle"
                  onClick={() => setIsChatSidebarOpen(true)}
                >
                  会話一覧
                </button>
                <div>
                  <div className="pd-chat-fullscreen-main-title">
                    {activeChatSession?.title || "新規会話"}
                  </div>
                  <div className="pd-chat-fullscreen-main-caption">{displayName} の AI 会話</div>
                </div>
              </div>
              <button type="button" className="pd-action-button" onClick={closeChatFullscreen}>
                閉じる
              </button>
            </div>

            <div className="pd-chat-fullscreen-main-body">
              {renderChatMessages(fullscreenChatListRef, "pd-chat-list-fullscreen")}
              {renderChatStatuses()}
            </div>

            {renderChatComposer(fullscreenChatInputRef, "pd-chat-form-fullscreen")}
          </section>
        </div>
      </Modal.Body>
    </Modal>

    <Modal
      show={isElementInsightOpen}
      onHide={() => setIsElementInsightOpen(false)}
      centered
      className="pd-element-insight-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>{elementInsightTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {selectedElementInsight ? (
          <div className="pd-element-insight-card">
            {!selectedElementInsight.isNotice ? (
              <div className="pd-element-insight-head">
                <div className="pd-element-insight-symbol" style={{ color: getElementColor(selectedElementInsight.symbol) }}>
                  {selectedElementInsight.symbol}
                </div>
                <div className="pd-element-insight-meta">
                  <div><strong>柱位:</strong> {elementInsightPillarLabel}</div>
                  <div><strong>部位:</strong> {elementInsightPartLabel}</div>
                  <div><strong>十神:</strong> {selectedElementInsight.tsuhen || "-"}</div>
                </div>
              </div>
            ) : null}
            <div className="pd-element-insight-body display-linebreak">
              <ReactMarkdown>{selectedElementInsight.content || ""}</ReactMarkdown>
            </div>
          </div>
        ) : null}
      </Modal.Body>
    </Modal>

    <Modal
      show={isProfileBaziOpen}
      onHide={() => setIsProfileBaziOpen(false)}
      centered
      className="pd-bazi-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>{displayName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="pd-bazi-card">
          <div className="pd-bazi-card-head">
            <div>
              <div className="pd-bazi-card-title">{displayName}</div>
              <div className="pd-bazi-card-subtitle">
                {profileBirthDate || "未設定"} / {profileBirthTime || "未設定"} / {profileGenderLabel}
              </div>
            </div>
            {!compactBaziReady ? <div className="pd-bazi-card-status">命式を計算中</div> : null}
          </div>

          <div className="pd-bazi-pillars">
            {compactBaziPillars.map((pillar) => (
              <div key={pillar.label} className="pd-bazi-pillar">
                <div className="pd-bazi-pillar-label">{pillar.label}</div>
                <div className="pd-bazi-pillar-main">
                  <span className="pd-bazi-pillar-char" style={{ color: getElementColor(pillar.stem) }}>
                    {pillar.stem}
                  </span>
                  <span className="pd-bazi-pillar-char" style={{ color: getElementColor(pillar.branch) }}>
                    {pillar.branch}
                  </span>
                </div>
                <div className="pd-bazi-pillar-notes">
                  <span>{pillar.stemNote || " "}</span>
                  <span>{pillar.branchNote || " "}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal.Body>
    </Modal>
    </>
  );
}



