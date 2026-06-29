import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";

const HEARTBEAT_MS = 30000;

export default function usePresenceHeartbeat() {
  const location = useLocation();

  useEffect(() => {
    if (!localStorage.getItem("token")) return undefined;

    const sendHeartbeat = () => {
      api.post("/presence/heartbeat").catch(() => {});
    };

    sendHeartbeat();
    const timer = window.setInterval(sendHeartbeat, HEARTBEAT_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [location.pathname]);
}
