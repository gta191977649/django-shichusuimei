import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import api, { ACCESS_TOKEN, AUTH_CHANGED_EVENT, clearStoredAuthTokens } from "./api";
import { clearLastActiveProfile, getLastActiveProfileId, setLastActiveProfile } from "./lib/adminChatStorage";
import Login from "./page/Login";
import Debug from "./page/Debug";
import NotFound from "./page/NotFound";
import Calendar from "./page/Calendar";
import PercisionDebug from "./page/PercisionDebug";
import Suimei from "./page/Suimei";

const HEADER_HEIGHT = "30px";
const MOBILE_BREAKPOINT = 960;
const SIDEBAR_WIDTH = 280;

function App() {
  const profileRestoreRef = useRef({ userId: null, complete: false });
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [meishiki, setSelectedProfile] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== "undefined" ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get("/api/me");
      return res.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  useEffect(() => {
    const updateViewportMode = () => {
      setIsMobileViewport(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(ACCESS_TOKEN)) return;

    let active = true;
    fetchCurrentUser().then((user) => {
      if (!active) return;
      if (user) {
        setAuthUser(user);
      } else {
        clearStoredAuthTokens();
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const syncAuthState = async (event) => {
      const authenticated = event?.detail?.authenticated ?? Boolean(localStorage.getItem(ACCESS_TOKEN));
      if (!authenticated) {
        setAuthUser(null);
        setSelectedProfile(false);
        setSidebarVisible(false);
        return;
      }

      const user = await fetchCurrentUser();
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
        setSelectedProfile(false);
        setSidebarVisible(false);
      }
    };

    window.addEventListener(AUTH_CHANGED_EVENT, syncAuthState);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, syncAuthState);
  }, []);

  useEffect(() => {
    if (!authUser?.id || !authUser?.is_admin) {
      profileRestoreRef.current = { userId: null, complete: false };
      return;
    }

    if (profileRestoreRef.current.userId === authUser.id && profileRestoreRef.current.complete) {
      return;
    }

    profileRestoreRef.current = { userId: authUser.id, complete: false };
    const lastProfileId = getLastActiveProfileId(authUser.id);
    if (!lastProfileId) {
      profileRestoreRef.current = { userId: authUser.id, complete: true };
      return;
    }

    let active = true;
    api
      .get(`/api/meishiki/${lastProfileId}/`)
      .then((res) => {
        if (!active) return;
        setSelectedProfile(res.data);
      })
      .catch((error) => {
        if (!active) return;
        if (error?.response?.status === 403 || error?.response?.status === 404) {
          clearLastActiveProfile(authUser.id, lastProfileId);
        }
      })
      .finally(() => {
        if (!active) return;
        profileRestoreRef.current = { userId: authUser.id, complete: true };
      });

    return () => {
      active = false;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser?.id || !authUser?.is_admin) return;
    if (profileRestoreRef.current.userId !== authUser.id || !profileRestoreRef.current.complete) return;

    if (meishiki?.id) {
      setLastActiveProfile(authUser.id, meishiki);
      return;
    }

    clearLastActiveProfile(authUser.id);
  }, [authUser, meishiki]);

  useEffect(() => {
    if (!isMobileViewport || !sidebarVisible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileViewport, sidebarVisible]);

  const isAuthenticated = Boolean(authUser && localStorage.getItem(ACCESS_TOKEN));
  const headerHeight = HEADER_HEIGHT;
  const desktopSidebarOffset = !isMobileViewport && sidebarVisible ? `${SIDEBAR_WIDTH}px` : "0px";

  const handleLogout = () => {
    clearStoredAuthTokens();
  };

  return (
    <BrowserRouter>
      <div className="header-debug" style={{ height: headerHeight }}>
        <ul className="header-debug-list">
          {isAuthenticated ? (
            <li className="header-debug-item">
              <button type="button" className="header-debug-link" onClick={() => setSidebarVisible((current) => !current)}>
                {"\u300c\u30d5\u30a1\u30a4\u30eb\u300d"}
              </button>
            </li>
          ) : null}
          <li className="header-debug-item">
            <Link to="/">{"\u300c\u901a\u5e38\u7248\u300d"}</Link>
          </li>
          <li className="header-debug-item">
            <Link to="/v2">{"\u300c\u7cbe\u5bc6\u7248\u300d"}</Link>
          </li>
          {isAuthenticated ? (
            <li className="header-debug-item">
              <button type="button" className="header-debug-link" onClick={handleLogout}>
                {"\u300c\u30ed\u30b0\u30a2\u30a6\u30c8\u300d"}
              </button>
            </li>
          ) : (
            <li className="header-debug-item">
              <Link to="/login">{"\u300c\u30ed\u30b0\u30a4\u30f3\u300d"}</Link>
            </li>
          )}
          <li className="header-debug-item">{"\u300c\u4f7f\u3044\u65b9?\u300d"}</li>
          <li className="header-debug-note">
           Developer: Nurupo
          </li>
        </ul>
      </div>

      <div className="app-shell" style={{ marginTop: headerHeight, height: `calc(100dvh - ${headerHeight})` }}>
        <div
          className={`app-sidebar-frame${sidebarVisible ? " is-visible" : ""}${isMobileViewport ? " is-mobile" : ""}`}
          style={{
            top: headerHeight,
            width: isMobileViewport ? "100vw" : `${SIDEBAR_WIDTH}px`,
            height: `calc(100dvh - ${headerHeight})`,
          }}
        >
          {isAuthenticated ? (
            <Sidebar
              isVisible={sidebarVisible}
              isMobile={isMobileViewport}
              onToggle={() => setSidebarVisible(false)}
              setSelectedProfile={setSelectedProfile}
            />
          ) : null}
        </div>

        {sidebarVisible && isMobileViewport ? (
          <button
            type="button"
            className="app-sidebar-backdrop"
            onClick={() => setSidebarVisible(false)}
            aria-label="ファイルメニューを閉じる"
            style={{ top: headerHeight }}
          />
        ) : null}

        <div
          className={`app-main${sidebarVisible && isMobileViewport ? " is-sidebar-open" : ""}`}
          style={{
            marginLeft: desktopSidebarOffset,
            width: !isMobileViewport && sidebarVisible ? `calc(100% - ${SIDEBAR_WIDTH}px)` : "100%",
            height: `calc(100dvh - ${headerHeight})`,
          }}
        >
          <Routes>
            <Route path="/home" element={<Suimei />} />
            <Route path="/login" element={<Login onLogin={setAuthUser} />} />
            <Route path="/" element={<Debug profile={meishiki} />} />
            <Route
              path="/v2"
              element={
                <PercisionDebug
                  profile={meishiki}
                  setSelectedProfile={setSelectedProfile}
                  isAuthenticated={isAuthenticated}
                  isAdmin={Boolean(authUser?.is_admin)}
                  authUserId={authUser?.id || null}
                />
              }
            />
            <Route path="/app" element={<Calendar />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
