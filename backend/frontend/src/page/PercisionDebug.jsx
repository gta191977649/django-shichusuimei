import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import BasicMeishiki from "./subpage/BasicMeishiki";
import BasicMeishikiTest from "./subpage/BasicMeishikiTest";
import "./PercisionDebug.css";

const KANA_GROUPS = ["あ", "か", "さ", "た", "な", "は", "ま", "や", "ら", "わ"];

export default function PercisionDebug({ profile, setSelectedProfile }) {
  const [response, setResponse] = useState(false);
  const [ai_response, setAIResponse] = useState(null);

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
    setAIResponse(false)
  }, [profile]);

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

  const ai_query = (e) => {
    e?.preventDefault?.();
    api
      .get(`/api/gpt?meishiki_id=${profile.id}`)
      .then((res) => res.data)
      .then((data) => setAIResponse(data))
      .catch((err) => alert(err));
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

  return (
    <div className="percision-debug">
      <div className="pd-shell">
        <div className="pd-title-row">
          <div className="pd-title-copy">
            <div className="pd-title">最新配信命式</div>
            <div className="pd-title-sub">新しく生成された命式の一覧です。詳細を選択してください。</div>
          </div>
          <div className="pd-title-meta">
            <div className="pd-counter">
              <span className="pd-counter-number">99</span>
              <span className="pd-counter-label">件</span>
            </div>
            <button type="button" className="pd-button pd-button--ghost">
              曲名順にならべる
            </button>
          </div>
        </div>

        <div className="pd-content">
          <aside className="pd-sidebar">
            {KANA_GROUPS.map((kana) => (
              <button key={kana} type="button" className="pd-sidebar-btn">
                {kana}
              </button>
            ))}
            <div className="pd-sidebar-footer">
              <button type="button" className="pd-sidebar-btn is-dark">
                もどる
              </button>
              <button type="button" className="pd-sidebar-btn is-dark">
                トップへ
              </button>
            </div>
          </aside>

          <section className="pd-main">
            <div className="pd-panel pd-form-panel">
              <div className="pd-panel-head">
                <div>
                  <div className="pd-panel-title">命式プロフィール</div>
                  <div className="pd-panel-caption">日付・時間を入力後、保存で命式を記録します。</div>
                </div>
                <div className="pd-actions">
                  <button
                    type="button"
                    className="pd-button pd-button--primary"
                    onClick={save}
                    disabled={!isDirty}
                    title={isDirty ? "" : "无更改"}
                  >
                    {saveMode}
                  </button>
                  <button type="button" className="pd-button" onClick={ai_query}>
                    解読
                  </button>
                </div>
              </div>

              <div className="pd-form-grid">
                <label className="pd-field">
                  <span>名称</span>
                  <input
                    type="text"
                    className="pd-input"
                    placeholder="名称"
                    value={form.name}
                    onChange={onChange("name")}
                  />
                </label>
                <label className="pd-field">
                  <span>日付</span>
                  <input
                    type="date"
                    className="pd-input"
                    value={form.date}
                    onChange={onChange("date")}
                  />
                </label>
                <label className="pd-field">
                  <span>時間</span>
                  <input
                    type="time"
                    className="pd-input"
                    value={form.time}
                    onChange={onChange("time")}
                  />
                </label>
                <label className="pd-field">
                  <span>元号</span>
                  <div className="pd-era">{toJapaneseEra(form.date)}</div>
                </label>
                <label className="pd-field">
                  <span>性別</span>
                  <button
                    type="button"
                    className={`pd-gender-toggle ${form.gender === "M" ? "is-male" : "is-female"}`}
                    onClick={toggleGender}
                  >
                    {form.gender === "M" ? "男" : "女"}
                  </button>
                </label>
              </div>
            </div>

            <div className="pd-panel">
              <div className="pd-panel-head">
                <div className="pd-panel-title">命式ビュー</div>
              </div>
              <Tabs defaultActiveKey="profile" id="percision-tabs" className="pd-tabs-nav">
                <Tab eventKey="profile" title="命式盤">
                  <div className="pd-panel-body">
                    <BasicMeishiki data={response} />
                  </div>
                </Tab>
                <Tab eventKey="contact" title="細盤分析">
                  <div className="pd-panel-body">
                    <BasicMeishikiTest />
                  </div>
                </Tab>
              </Tabs>
            </div>

            {Array.isArray(ai_response?.content) && ai_response.content.length > 0 && (
              <div className="pd-panel pd-ai-panel">
                <div className="pd-panel-head">
                  <div className="pd-panel-title">AI 解読結果</div>
                  <button type="button" className="pd-button pd-button--ghost" onClick={ai_query}>
                    更新
                  </button>
                </div>
                <div className="pd-panel-body">
                  {ai_response.content.map((item, index) => (
                    <div key={index} className="pd-ai-row">
                      <div className="pd-ai-entity">《{item.entity}》</div>
                      <div className="pd-ai-content">
                        {item.content
                          .split(/\n+/)
                          .filter((p) => p.trim() !== "")
                          .map((p, i) => (
                            <div key={i} className="pd-ai-line">
                              <span className="pd-ai-bullet">♪</span>
                              <span>{p.trim()}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
