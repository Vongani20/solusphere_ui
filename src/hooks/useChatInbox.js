import { useEffect, useState } from "react";
import api from "../services/api";

const emptyInbox = { unread_messages: 0, missed_calls: 0 };

export function useChatInbox(pollMs = 30000) {
  const [inbox, setInbox] = useState(emptyInbox);

  useEffect(() => {
    if (!localStorage.getItem("token")) return undefined;

    const loadInbox = async () => {
      try {
        const res = await api.get("/chats", {
          params: { _ts: Date.now() },
          headers: { "Cache-Control": "no-cache" },
        });
        setInbox(res.data.inbox || emptyInbox);
      } catch {
        // Ignore inbox polling errors.
      }
    };

    loadInbox();
    const timer = window.setInterval(loadInbox, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs]);

  return inbox;
}
