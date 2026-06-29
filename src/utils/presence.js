export function formatPresenceLabel(user) {
  if (user?.is_online) return "Available";
  if (!user?.last_seen_at) return "Offline";

  const lastSeen = new Date(user.last_seen_at);
  if (Number.isNaN(lastSeen.getTime())) return "Offline";

  const diffMs = Date.now() - lastSeen.getTime();
  if (diffMs < 60000) return "Last seen just now";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `Last seen ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `Last seen ${days}d ago`;
}

export function presenceTone(user) {
  if (user?.is_online) return "text-emerald-600";
  return "text-slate-500";
}
