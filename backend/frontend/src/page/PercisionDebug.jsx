import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import ReactMarkdown from "react-markdown";
import html2canvas from "html2canvas";
import PrecisionMeishikiBoard from "./subpage/PrecisionMeishikiBoard";
import GoukaAnlysis from "../components/GoukaAnlysis";
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

export default function PercisionDebug({ profile, setSelectedProfile, isAuthenticated = false }) {
  const [response, setResponse] = useState(false);
  const [aiResponse, setAIResponse] = useState(null);
  const [showReason, setShowReason] = useState(false);
  const [aiStatus, setAIStatus] = useState(null);
  const [aiLoading, setAILoading] = useState(false);
  const [activeTab, setActiveTab] = useState("meishiki");
  const [exportingType, setExportingType] = useState(null);
  const exportRef = useRef(null);
  const aiAutoLoadRequestRef = useRef(0);

  const initial = useMemo(() => {
    const iso = profile?.birthDate || "";
    const [date = "", timePart = ""] = iso.split("T");
    const time = timePart.replace("Z", "").slice(0, 5);

    return {
      name: profile?.name || "",
      date,
      time,
      gender: profile?.gender || "M",
    };
  }, [profile]);

  const [form, setForm] = useState(initial);
  const [saveMode, setSaveMode] = useState("保存");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  useEffect(() => {
    const nameChanged = (form.name ?? "").trim() !== (initial.name ?? "");
    const dateChanged =
      (form.date ?? "") !== (initial.date ?? "") || (form.time ?? "") !== (initial.time ?? "");
    const genderChanged = (form.gender ?? "") !== (initial.gender ?? "M");

    const dirty = nameChanged || dateChanged || genderChanged;
    setIsDirty(dirty);

    if (nameChanged) setSaveMode("保存");
    else if (dateChanged || genderChanged) setSaveMode("更新");
    else setSaveMode("保存");
  }, [form, initial]);

  const onChange = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }));

  const query = ({ date, time, gender }) => {
    api
      .post("/api/query", { date, time, gender })
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

    const [date, timeFull = ""] = targetProfile.birthDate.split("T");
    const time = timeFull.replace("Z", "").slice(0, 5);
    const gender = targetProfile.gender === "M" ? 1 : 0;

    query({ date, time, gender });
  };

  const queryForm = () => {
    if (!form.date || !form.time || !form.gender) {
      alert("誕生日・時間・性別を入力してください。");
      return;
    }

    query({
      date: form.date,
      time: form.time,
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
        return;
      }
      setAIResponse(res.data);
      setAIStatus(null);
    } catch (err) {
      if (aiAutoLoadRequestRef.current !== requestId) return;
      if (err?.response?.status === 404) return;
      console.error(err);
      setAIStatus("既存のAI解読を読み込めませんでした。");
    } finally {
      if (aiAutoLoadRequestRef.current === requestId) {
        setAILoading(false);
      }
    }
  };

  useEffect(() => {
    if (!profile) return;
    const requestId = aiAutoLoadRequestRef.current + 1;
    aiAutoLoadRequestRef.current = requestId;

    setResponse(false);
    setActiveTab("meishiki");
    queryProfile(profile);
    setAIResponse(null);
    setAIStatus(null);
    setAILoading(false);
    setShowReason(false);

    if (isAuthenticated) {
      loadExistingAI(profile, requestId);
    }
  }, [profile, isAuthenticated]);

  const aiQuery = async () => {
    if (!isAuthenticated || !profile?.id) return;

    setShowReason(false);
    setAILoading(true);
    setAIStatus("AI解読を準備中…");

    try {
      const res = await api.get(`/api/gpt?meishiki_id=${profile.id}`);
      if (res.status === 202) {
        setAIResponse(null);
        setAIStatus(res.data?.detail || "解読生成中です…");
        setAILoading(true);
        setActiveTab("ai");
        return;
      }

      setAIResponse(res.data);
      setAIStatus(null);
      setAILoading(false);
      setActiveTab("ai");
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "解読に失敗しました。しばらくしてから再試行してください。";
      setAIStatus(detail);
      setAILoading(false);
      setActiveTab("ai");
    }
  };

  const buildBirthDate = () => {
    if (form.date && form.time) return `${form.date}T${form.time}:00Z`;
    if (initial.date && initial.time) return `${initial.date}T${initial.time}:00Z`;
    return profile?.birthDate ?? "";
  };

  const save = async () => {
    if (!isAuthenticated) return;

    try {
      const initialName = initial.name ?? "";
      const initialDate = initial.date ?? "";
      const initialTime = initial.time ?? "";
      const initialGender = initial.gender ?? "M";

      const nameChanged = (form.name ?? "").trim() !== initialName;
      const dateChanged = (form.date ?? "") !== initialDate || (form.time ?? "") !== initialTime;
      const genderChanged = (form.gender ?? "") !== initialGender;

      if (!nameChanged && !dateChanged && !genderChanged) return;

      if (nameChanged) {
        const created = await api
          .post("/api/meishiki/", {
            name: form.name,
            birthDate: buildBirthDate(),
            gender: form.gender,
          })
          .then((r) => r.data);

        setSelectedProfile(created);
        return;
      }

      if (profile?.id) {
        const patchData = {};
        if (dateChanged) patchData.birthDate = buildBirthDate();
        if (genderChanged) patchData.gender = form.gender;

        if (Object.keys(patchData).length > 0) {
          const updated = await api.patch(`/api/meishiki/${profile.id}/`, patchData).then((r) => r.data);
          setSelectedProfile(updated);
        }
      } else {
        const created = await api
          .post("/api/meishiki/", {
            name: form.name,
            birthDate: buildBirthDate(),
            gender: form.gender,
          })
          .then((r) => r.data);
        setSelectedProfile(created);
      }
    } catch (err) {
      console.error(err);
      alert("保存失敗");
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

  const reasonCards = useMemo(() => {
    const reasonData = aiResponse?.reason;
    if (!reasonData) return [];

    const toCard = (value) => {
      if (value == null) return null;
      if (typeof value === "string") return { title: "解読過程", text: value };
      if (Array.isArray(value)) return value.map((nested) => toCard(nested)).filter(Boolean);
      if (typeof value === "object") {
        return {
          title: value.title || value.step || "解読過程",
          text: value.text || value.detail || value.description || JSON.stringify(value, null, 2),
        };
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
  }, [aiResponse]);

  const displayName = (form.name || profile?.name || "未命名命式").trim() || "未命名命式";
  const displayDescription = profile?.description || "説明がまだありません。";
  const displayId = profile?.id ? `#${profile.id}` : "ID 未設定";
  const aiCreatedAt = aiResponse?.created_at ? new Date(aiResponse.created_at).toLocaleString() : null;
  const exportFileBase = `${displayName}-${form.date || "export"}`
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");

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
        <div className="pd-export-meishiki-label">項目</div>
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

  return (
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
                  disabled={!form.date || !form.time}
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
                  />
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
                      time: form.time,
                      gender: form.gender === "M" ? 1 : 0,
                    }}
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
            </Tabs>
          </section>
        </div>

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
                    {showReason ? "過程を閉じる" : "過程を見る"}
                  </button>
                ) : null}
                {isAuthenticated ? (
                  <button type="button" className="pd-action-button" onClick={aiQuery} disabled={aiLoading}>
                    {aiLoading ? "生成中…" : aiResponse ? "再解読" : "AI解読開始"}
                  </button>
                ) : null}
              </div>
            </div>

            {aiStatus ? (
              <div className="pd-ai-status">
                {aiLoading ? <span className="pd-spinner" aria-hidden="true"></span> : null}
                <span>{aiStatus}</span>
              </div>
            ) : null}

            {!Array.isArray(aiResponse?.content) || aiResponse.content.length === 0 ? (
              !aiLoading ? <div className="pd-empty-state">AI解読を開始すると、ここに解読結果が表示されます。</div> : null
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
              <span className="pd-export-meta-value">{form.time || "-"} （真太陽時）</span>
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
  );
}
