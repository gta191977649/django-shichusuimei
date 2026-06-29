import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { setStoredAuthTokens } from "../api";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setMessage("ユーザー名とパスワードを入力してください。");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await api.post("/api/token/", {
        username: username.trim(),
        password,
      });
      setStoredAuthTokens({
        access: res.data.access,
        refresh: res.data.refresh,
      });
      onLogin?.({ username: username.trim() });
      navigate("/v2");
    } catch (err) {
      console.error(err);
      setMessage("ログインに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-title">ログイン</div>
        <label className="login-label">
          ユーザー名
          <input
            className="login-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="login-label">
          パスワード
          <input
            className="login-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>

        {message ? <div className="login-message">{message}</div> : null}

        <button className="login-button" type="submit" disabled={loading}>
          {loading ? "処理中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}
