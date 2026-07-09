import { useEffect, useState } from "react";
import api from "../api";
import { buildProfilePayload, getProfileBirthTimeState } from "../lib/birthTime";

const emptyForm = {
  id: null,
  name: "",
  date: "",
  time: "",
  birthTimeUnknown: false,
  gender: "M",
};

const toForm = (profile) => {
  const { date, time, birthTimeUnknown } = getProfileBirthTimeState(profile);
  return {
    id: profile?.id || null,
    name: profile?.name || "",
    date,
    time,
    birthTimeUnknown,
    gender: profile?.gender || "M",
  };
};

const Sidebar = ({ isVisible, isMobile = false, onToggle, setSelectedProfile }) => {
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);

  const fetchProfileData = () => {
    setLoading(true);
    api
      .get("/api/meishiki/")
      .then((res) => res.data)
      .then((data) => {
        setProfiles(data);
      })
      .catch((err) => {
        console.error(err);
        setMessage("プロフィールを読み込めませんでした。");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isVisible) {
      fetchProfileData();
    }
  }, [isVisible]);

  const selectProfile = (profile) => {
    setSelectedProfile(profile);
    setForm(toForm(profile));
    if (isMobile) {
      onToggle();
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMessage("");
  };

  const saveProfile = async () => {
    if (!form.name.trim() || !form.date) {
      setMessage("名称と誕生日を入力してください。");
      return;
    }

    if (!form.birthTimeUnknown && !form.time) {
      setMessage("出生時刻が不明でない場合は、時刻を入力してください。");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = buildProfilePayload(form);
      const saved = form.id
        ? await api.patch(`/api/meishiki/${form.id}/`, payload).then((res) => res.data)
        : await api.post("/api/meishiki/", payload).then((res) => res.data);

      setSelectedProfile(saved);
      setForm(toForm(saved));
      await api.get("/api/meishiki/").then((res) => setProfiles(res.data));
    } catch (err) {
      console.error(err);
      setMessage("保存に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const deleteProfile = async () => {
    if (!form.id) return;
    if (!window.confirm("このプロフィールを削除しますか？")) return;

    setLoading(true);
    setMessage("");

    try {
      await api.delete(`/api/meishiki/${form.id}/`);
      setSelectedProfile(false);
      resetForm();
      await api.get("/api/meishiki/").then((res) => setProfiles(res.data));
    } catch (err) {
      console.error(err);
      setMessage("削除に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const updateBirthTimeUnknown = (nextValue) => {
    setForm((current) => ({
      ...current,
      birthTimeUnknown: nextValue,
      time: nextValue ? "" : current.time || "00:00",
    }));
  };

  return (
    <div className={`profile-sidebar${isMobile ? " profile-sidebar-mobile" : ""}`} style={{ display: isVisible ? "flex" : "none" }}>
      <div className="profile-sidebar-head">
        <button type="button" className="profile-sidebar-close" onClick={onToggle}>
          {isMobile ? "閉じる" : "◀"}
        </button>

        <div className="profile-sidebar-title">命式ファイル</div>
        {message ? <div className="profile-sidebar-message">{message}</div> : null}

        <button
          type="button"
          className="profile-editor-toggle"
          onClick={() => setEditorOpen((current) => !current)}
        >
          {editorOpen ? "プロフィール編集を閉じる" : "プロフィール編集を開く"}
        </button>
      </div>

      {editorOpen ? (
        <div className="profile-editor-shell">
          <div className="profile-editor">
            <label>
              名称
              <input value={form.name} onChange={updateField("name")} className="profile-input" />
            </label>
            <label>
              誕生日
              <input value={form.date} onChange={updateField("date")} className="profile-input" type="date" />
            </label>
            <label>
              時間
              <div className="birth-time-inline">
                <input
                  value={form.time}
                  onChange={updateField("time")}
                  className="profile-input"
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
              </div>
            </label>
            <label>
              性別
              <select value={form.gender} onChange={updateField("gender")} className="profile-input">
                <option value="M">男</option>
                <option value="F">女</option>
              </select>
            </label>

            <div className="profile-actions">
              <button type="button" onClick={saveProfile} disabled={loading}>
                {form.id ? "更新" : "追加"}
              </button>
              <button type="button" onClick={resetForm} disabled={loading}>
                新規
              </button>
              {form.id ? (
                <button type="button" onClick={deleteProfile} disabled={loading}>
                  削除
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="profile-list-shell">
        <div className="profile-list">
          {loading && profiles.length === 0 ? <div>読込中...</div> : null}
          {profiles.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`profile-list-item${form.id === item.id ? " profile-list-item-active" : ""}`}
              onClick={() => selectProfile(item)}
            >
              <span>{item.name}</span>
              <small>
                {item.birthDate ? item.birthDate.slice(0, 10) : ""}
                {item.birthTimeUnknown ? " / 時刻不明" : ""}
              </small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
