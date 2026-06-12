import React, { useEffect, useMemo, useState } from "react";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { resolveImageUrl } from "../utils/assets";

export function getUserInitials(user) {
  const label = user?.username || user?.email || "User";
  return label
    .split(/[ @._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function UserAvatar({ user, className = "h-10 w-10", iconClassName = "h-6 w-6" }) {
  const imageUrl = useMemo(() => resolveImageUrl(user?.image_url || user?.imageUrl), [user]);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  if (imageUrl && !imageFailed) {
    return (
      <img
        src={imageUrl}
        alt={user?.username ? `${user.username} profile` : "Profile"}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className={`${className} shrink-0 rounded-lg object-cover ring-1 ring-slate-200`}
      />
    );
  }

  const initials = getUserInitials(user);

  return (
    <div className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white`}>
      {initials || <UserCircleIcon className={iconClassName} />}
    </div>
  );
}
