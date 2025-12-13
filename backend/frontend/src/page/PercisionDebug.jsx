import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import BasicMeishiki from "./subpage/BasicMeishiki";
import BasicMeishikiTest from "./subpage/BasicMeishikiTest";

export default function PercisionDebug({ profile,setSelectedProfile }) {
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
    <div className="container">
      <style>{`
        .btn-pink { background-color: #ff99b5; color: white; }
        .btn-pink:hover { background-color: #ff6f96ff; color: white; }
      `}</style>

      {/* Top controls */}
      <div className="container my-3">
        <div className="d-flex justify-content-center align-items-center flex-wrap gap-3 text-center">
          {/* Name */}
          <div className="input-group" style={{ width: "140px" }}>
            <input
              type="text"
              className="form-control text-center"
              placeholder="名称"
              value={form.name}
              onChange={onChange("name")}
            />
          </div>

          {/* Date + Time + Gender (with Japanese era display) */}
          <div className="input-group" style={{ width: "460px" }}>
            <input
              type="date"
              className="form-control text-center"
              value={form.date}
              onChange={onChange("date")}
            />
            <span className="input-group-text">{toJapaneseEra(form.date)}</span>
            <input
              type="time"
              className="form-control text-center"
              value={form.time}
              onChange={onChange("time")}
            />
            <button
              type="button"
              className={`btn ${form.gender === "M" ? "btn-primary" : "btn-pink"}`}
              onClick={toggleGender}
            >
              {form.gender === "M" ? "男" : "女"}
            </button>
          </div>

          {/* Actions */}
          <div className="btn-group">
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={save}
              disabled={!isDirty}
              title={isDirty ? "" : "无更改"}
            >
              {saveMode}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={ai_query}>
              解読
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultActiveKey="profile" id="uncontrolled-tab-example" className="mb-3">
        <Tab eventKey="profile" title="命式盤">
          <BasicMeishiki data={response} />
        </Tab>
        <Tab eventKey="contact" title="細盤分析">
          <BasicMeishikiTest/>
        </Tab>
      </Tabs>

      {/* AI result */}
      <a href="#" onClick={ai_query}>
        解読
      </a>
        
      {Array.isArray(ai_response?.content) && ai_response.content.length > 0 && (
  <div className="container mt-3">
    {ai_response.content.map((item, index) => (
      <div
        key={index}
        className="row py-3 border-bottom align-items-start"
        style={{ lineHeight: "1.8" }}
      >
        {/* Left side — title */}
        <div className="col-12 col-md-3 text-md-end fw-bold mb-2 mb-md-0">
          《{item.entity}》
        </div>

        {/* Right side — paragraphs */}
        <div className="col-12 col-md-9">
          {item.content
            .split(/\n+/)
            .filter((p) => p.trim() !== "")
            .map((p, i) => (
              <div key={i} className="mb-2 d-flex align-items-start">
                <span
                  className="me-2"
                  style={{ fontSize: "1.2em", lineHeight: "1.2em", color:"#52c41a"}}
                >
                  •
                </span>
                <span style={{ color: "#333", whiteSpace: "pre-wrap" }}>{p.trim()}</span>
              </div>
            ))}
        </div>
      </div>
    ))}
  </div>
)}

    </div>
  );
}
