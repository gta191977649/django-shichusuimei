import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import BasicMeishiki from "./subpage/BasicMeishiki";
import BasicMeishikiTest from "./subpage/BasicMeishikiTest";
import ReactMarkdown from "react-markdown";
import { motion } from "motion/react";
import "./PercisionDebug.css";
import GoukaAnlysis from "../components/GoukaAnlysis";

const KANA_GROUPS = ["あ", "か", "さ", "た", "な", "は", "ま", "や", "ら", "わ"];

const interactiveSpring = { type: "spring", stiffness: 320, damping: 26, mass: 0.85 };
const buttonMotion = {
  whileHover: { y: -2, scale: 1.02 },
  whileTap: { y: 1, scale: 0.97 },
  transition: interactiveSpring,
};
const sidebarButtonMotion = {
  whileHover: { y: -1.5, scale: 1.01 },
  whileTap: { y: 0.5, scale: 0.98 },
  transition: interactiveSpring,
};
const calloutMotion = {
  whileHover: { y: -4, scale: 1.02 },
  whileTap: { y: 2, scale: 0.97 },
  transition: { type: "spring", stiffness: 260, damping: 20, mass: 0.85 },
};
const inputMotion = {
  whileFocus: { scale: 1.01, boxShadow: "0 0 0 6px rgba(142, 180, 247, 0.25)" },
  transition: { type: "spring", stiffness: 280, damping: 32, mass: 0.9 },
};
const containerMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.3, 1] },
};
const titleMotion = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.2, 0.8, 0.3, 1], delay: 0.05 },
};
const panelMotion = (delay = 0) => ({
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.55, delay, ease: [0.2, 0.8, 0.3, 1] },
});
const sidebarMotion = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.55, ease: [0.2, 0.8, 0.3, 1], delay: 0.05 },
};
const MotionDiv = motion.div;
const MotionButton = motion.button;
const MotionInput = motion.input;
const MotionAside = motion.aside;

export default function PercisionDebug({ profile, setSelectedProfile }) {
  const [response, setResponse] = useState(false);
  const [ai_response, setAIResponse] = useState(null);
  const [showReason, setShowReason] = useState(false);
  const [aiStatus, setAIStatus] = useState(null);
  const [aiLoading, setAILoading] = useState(false);
  const reasonRef = useRef(null);

  const initial = useMemo(() => {
    const iso = profile?.birthDate || "";
    const [d, t = ""] = iso.split("T");
    const hhmm = t.replace("Z", "").slice(0, 5);
    return {
      name: profile?.name || "",
      date: d || "",
      time: hhmm || "",
      gender: profile?.gender || "M",
    };
  }, [profile]);

  const [form, setForm] = useState(initial);

  // live save mode + dirty state
  const [saveMode, setSaveMode] = useState("保存"); // 保存=new record, 更新=update existing
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => setForm(initial), [initial]);

  // auto recompute save state whenever controls change
  useEffect(() => {
    const initialName = initial.name ?? "";
    const initialDate = initial.date ?? "";
    const initialTime = initial.time ?? "";
    const initialGender = initial.gender ?? "M";

    const nameChanged = (form.name ?? "").trim() !== initialName;
    const dateChanged = (form.date ?? "") !== initialDate || (form.time ?? "") !== initialTime;
    const genderChanged = (form.gender ?? "") !== initialGender;

    const dirty = nameChanged || dateChanged || genderChanged;
    setIsDirty(dirty);

    // rule: if name changed => new record => 保存
    // else if any other field changed => 更新
    // else default 保存 (but disabled via isDirty=false)
    if (nameChanged) setSaveMode("保存");
    else if (dateChanged || genderChanged) setSaveMode("更新");
    else setSaveMode("保存");
  }, [form, initial]);

  useEffect(() => {
    if (profile) query();
    setAIResponse(false);
    setAIStatus(null);
    setAILoading(false);
  }, [profile]);

  useEffect(() => {
    setShowReason(false);
  }, [ai_response]);

  useEffect(() => console.log("GOT IT"), [ai_response]);

  const onChange = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }));
  const toggleGender = () =>
    setForm((s) => ({ ...s, gender: s.gender === "M" ? "F" : "M" }));

  // Query for 排盘 (always use latest profile data)
  const query = () => {
    if (!profile?.birthDate || !profile?.gender) return;
    const [date, timeFull] = profile.birthDate.split("T");
    const time = timeFull ? timeFull.slice(0, 5) : "";
    const genderValue = profile.gender === "M" ? 1 : 0;

    api
      .post("/api/query", { date, time, gender: genderValue })
      .then((res) => res.data)
      .then((data) => {
        console.log("排盘結果:", data);
        setResponse(data);
      })
      .catch((err) => {
        console.error(err);
        alert("查询失败");
      });
  };

  const ai_query = async (e) => {
    e?.preventDefault?.();
    if (!profile?.id) return;
    setShowReason(false);
    setAILoading(true);
    setAIStatus("AI解読を準備中…");
    try {
      const res = await api.get(`/api/gpt?meishiki_id=${profile.id}`);
      if (res.status === 202) {
        setAIResponse(null);
        setAIStatus(res.data?.detail || "解読生成中です…");
        setAILoading(true);
        return;
      }
      setAIResponse(res.data);
      setAIStatus(null);
      setAILoading(false);
    } catch (err) {
      setAIStatus("解読に失敗しました。しばらくしてから再試行してください。");
      setAILoading(false);
    }
  };

  // Helper: build ISO from current form
  const buildBirthDate = () => {
    if (form.date && form.time) return `${form.date}T${form.time}:00Z`;
    if (initial.date && initial.time) return `${initial.date}T${initial.time}:00Z`;
    return profile?.birthDate ?? "";
  };

  // Save: insert on name change, else update changed fields
  const save = async () => {
    try {
      const initialName = initial.name ?? "";
      const initialDate = initial.date ?? "";
      const initialTime = initial.time ?? "";
      const initialGender = initial.gender ?? "M";

      const nameChanged = (form.name ?? "").trim() !== initialName;
      const dateChanged =
        (form.date ?? "") !== initialDate || (form.time ?? "") !== initialTime;
      const genderChanged = (form.gender ?? "") !== initialGender;

      if (!nameChanged && !dateChanged && !genderChanged) {
        console.log("No changes detected. Skipping save.");
        return;
      }

      if (nameChanged) {
        // create new
        const payloadCreate = {
          name: form.name,
          birthDate: buildBirthDate(),
          gender: form.gender,
        };
        const created = await api.post("/api/meishiki/", payloadCreate).then((r) => r.data);
        console.log("Created new record:", created);
        setResponse(created);
        setSelectedProfile(created)
        return;
      }

      // update existing
      if (profile?.id) {
        const patchData = {};
        if (dateChanged) patchData.birthDate = buildBirthDate();
        if (genderChanged) patchData.gender = form.gender;

        if (Object.keys(patchData).length > 0) {
          const updated = await api
            .patch(`/api/meishiki/${profile.id}/`, patchData)
            .then((r) => r.data);
          console.log("Updated record:", updated);
          setSelectedProfile(updated);
        }
      } else {
        // fallback create if no id
        const created = await api
          .post("/api/meishiki/", {
            name: form.name,
            birthDate: buildBirthDate(),
            gender: form.gender,
          })
          .then((r) => r.data);
        //setResponse(created);
   
      }
    } catch (err) {
      console.error(err);
      alert("保存失败");
    }
  };

  // JP era display
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

  const displayName = (form.name || profile?.name || "未命名命式").trim() || "未命名命式";
  const displayDescription = profile?.description || "説明がまだありません。";
  const displayId = profile?.id ? `#${profile.id}` : "ID 未設定";
  const aiCreatedAt = ai_response?.created_at
    ? new Date(ai_response.created_at).toLocaleString()
    : null;
  const reasonCards = useMemo(() => {
    const reasonData = ai_response?.reason;
    if (!reasonData) return [];

    const toCard = (value) => {
      if (value == null) return null;
      if (typeof value === "string") {
        return { title: "解読過程", text: value };
      }
      if (Array.isArray(value)) {
        return value.map((nested) => toCard(nested)).filter(Boolean);
      }
      if (typeof value === "object") {
        const title = value.title || value.step || "解読過程";
        const text =
          value.text ||
          value.detail ||
          value.description ||
          JSON.stringify(value, null, 2);
        return { title, text };
      }
      return { title: "解読過程", text: String(value) };
    };

    const cards = Array.isArray(reasonData)
      ? reasonData.flatMap((item) => {
          const result = toCard(item);
          return Array.isArray(result) ? result : [result];
        })
      : [toCard(reasonData)];

    return cards.filter(Boolean);
  }, [ai_response]);

  const hasReason = reasonCards.length > 0;

  useEffect(() => {
    if (showReason && reasonRef.current) {
      reasonRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showReason, reasonCards]);

  return (
    <MotionDiv className="percision-debug" {...containerMotion}>
      <MotionDiv className="pd-title-row" {...titleMotion}>
        <div className="pd-title-copy">
          <div className="pd-title">{displayName}</div>
          <div className="pd-title-sub">{displayDescription}</div>
        </div>
        <div className="pd-title-meta">
          <div className="pd-counter">
            <span className="pd-counter-number">{displayId}</span>
            <span className="pd-counter-label">番</span>
          </div>
        </div>
      </MotionDiv>

      <div className="pd-content">
        <MotionAside className="pd-sidebar" {...sidebarMotion}>
          {KANA_GROUPS.map((kana) => (
            <MotionButton key={kana} type="button" className="pd-sidebar-btn" {...sidebarButtonMotion}>
              {kana}
            </MotionButton>
          ))}
          <div className="pd-sidebar-footer">
            <MotionButton type="button" className="pd-sidebar-btn is-dark" {...sidebarButtonMotion}>
              もどる
            </MotionButton>
            <MotionButton type="button" className="pd-sidebar-btn is-dark" {...sidebarButtonMotion}>
              トップへ
            </MotionButton>
          </div>
        </MotionAside>

        <section className="pd-main">
          <MotionDiv className="pd-panel pd-form-panel" {...panelMotion(0.05)}>
            <div className="pd-panel-head">
              <div>
                <div className="pd-panel-title">命式プロフィール</div>
                <div className="pd-panel-caption">日付・時間を入力後、保存で命式を記録します。</div>
              </div>
              <div className="pd-actions">
                <MotionButton
                  type="button"
                  className="pd-button pd-button--primary"
                  onClick={save}
                  disabled={!isDirty}
                  title={isDirty ? "" : "无更改"}
                  {...buttonMotion}
                >
                  {saveMode}
                </MotionButton>
                <MotionButton type="button" className="pd-button" onClick={ai_query} {...buttonMotion}>
                  解読
                </MotionButton>
              </div>
            </div>

            <div className="pd-form-grid">
              <label className="pd-field">
                <span>名称</span>
                <MotionInput
                  type="text"
                  className="pd-input"
                  placeholder="名称"
                  value={form.name}
                  onChange={onChange("name")}
                  {...inputMotion}
                />
              </label>
              <label className="pd-field">
                <span>日付</span>
                <MotionInput
                  type="date"
                  className="pd-input"
                  value={form.date}
                  onChange={onChange("date")}
                  {...inputMotion}
                />
              </label>
              <label className="pd-field">
                <span>時間</span>
                <MotionInput
                  type="time"
                  className="pd-input"
                  value={form.time}
                  onChange={onChange("time")}
                  {...inputMotion}
                />
              </label>
              <label className="pd-field">
                <span>元号</span>
                <div className="pd-era">{toJapaneseEra(form.date)}</div>
              </label>
              <label className="pd-field">
                <span>性別</span>
                <MotionButton
                  type="button"
                  className={`pd-gender-toggle ${form.gender === "M" ? "is-male" : "is-female"}`}
                  onClick={toggleGender}
                  {...buttonMotion}
                >
                  {form.gender === "M" ? "男" : "女"}
                </MotionButton>
              </label>
            </div>
          </MotionDiv>

          <MotionDiv className="pd-panel" {...panelMotion(0.12)}>
            <div className="pd-panel-head">
              <div className="pd-panel-title">命式ビュー</div>
            </div>
            <Tabs defaultActiveKey="profile" id="percision-tabs" className="pd-tabs-nav">
              <Tab eventKey="profile" title="命式盤">
                <div className="pd-panel-body pd-tab-body">
                  <BasicMeishiki data={response} />
                </div>
              </Tab>
              <Tab eventKey="contact" title="細盤分析">
                <div className="pd-panel-body pd-tab-body xipan">
                  {/* <BasicMeishikiTest /> */}
                  <GoukaAnlysis tableWidth={"100%"} response={response} />
                </div>
              </Tab>
              </Tabs>
            </MotionDiv>

          <MotionDiv className="pd-panel pd-ai-panel" {...panelMotion(0.2)}>
            <div className="pd-panel-head">
              <div className="pd-panel-title-group">
                <div className="pd-panel-title">AI 解読</div>
                {aiCreatedAt && <div className="pd-ai-timestamp">{aiCreatedAt}</div>}
                <MotionButton
                  type="button"
                  className="pd-help-button"
                  onClick={() => setShowReason((v) => !v)}
                  disabled={!hasReason || aiLoading}
                  title="解読プロセス"
                  {...buttonMotion}
                >
                  ?
                </MotionButton>
              </div>
              <MotionButton
                type="button"
                className="pd-button pd-button--ghost"
                onClick={ai_query}
                disabled={aiLoading}
                {...buttonMotion}
              >
                {ai_response ? "更新" : "解読"}
              </MotionButton>
            </div>
            <div className="pd-panel-body">
              {aiStatus && (
                <div className="pd-ai-status">
                  {aiLoading && <span className="pd-spinner" aria-hidden="true"></span>}
                  <span>{aiStatus}</span>
                </div>
              )}
              {Array.isArray(ai_response?.content) && ai_response.content.length > 0 ? (
                ai_response.content.map((item, index) => (
                  <div key={index} className="pd-ai-row">
                    <div className="pd-ai-entity">《{item.entity}》</div>
                    <div className="pd-ai-content pd-ai-markdown">
                      <ReactMarkdown>{item.content || ""}</ReactMarkdown>
                    </div>
                  </div>
                ))
              ) : (
                !aiLoading && (
                  <MotionButton
                    type="button"
                    className="pd-ai-callout"
                    onClick={ai_query}
                    {...calloutMotion}
                  >
                    <span className="pd-ai-callout-text">AI解読開始</span>
                  </MotionButton>
                )
              )}
              {showReason && hasReason && (
                <MotionDiv
                  className="pd-ai-reason"
                  ref={reasonRef}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.2, 0.8, 0.3, 1] }}
                >
                  {reasonCards.map((card, idx) => (
                    <div key={`${card.title}-${idx}`} className="pd-ai-row pd-ai-reason-row">
                      <div className="pd-ai-entity">《{card.title}》</div>
                      <div className="pd-ai-content pd-ai-markdown">
                        <ReactMarkdown>{card.text || ""}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </MotionDiv>
              )}
            </div>
          </MotionDiv>
        </section>
      </div>
    </MotionDiv>
  );
}
