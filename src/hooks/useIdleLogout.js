import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCall } from "../context/CallContext";
import { useGroupCall } from "../context/GroupCallContext";
import { clearSession } from "../services/api";

const IDLE_MS = 5 * 60 * 1000;
const LAST_ACTIVITY_KEY = "ss-last-activity";
export const LOGOUT_REASON_KEY = "ss-logout-reason";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"];

export default function useIdleLogout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { inCall } = useCall();
  const { inGroupCall } = useGroupCall();
  const onACall = inCall || inGroupCall;

  useEffect(() => {
    if (!localStorage.getItem("token")) return undefined;

    const markActive = () => {
      sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    };

    const logout = () => {
      clearSession();
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
      sessionStorage.setItem(LOGOUT_REASON_KEY, "inactive");
      navigate("/login", { replace: true });
    };

    const checkIdle = () => {
      if (!localStorage.getItem("token")) return;
      if (onACall) {
        markActive();
        return;
      }
      const last = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
      if (Date.now() - last >= IDLE_MS) logout();
    };

    let lastMark = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastMark < 10000) return;
      lastMark = now;
      markActive();
    };

    markActive();
    lastMark = Date.now();
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, onActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", checkIdle);
    const timer = window.setInterval(checkIdle, 15000);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, onActivity);
      });
      document.removeEventListener("visibilitychange", checkIdle);
      window.clearInterval(timer);
    };
  }, [location.pathname, navigate, onACall]);
}
