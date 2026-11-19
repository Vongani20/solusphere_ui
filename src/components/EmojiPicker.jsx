import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const CATEGORIES = [
  {
    label: "Smileys",
    icon: "😀",
    emojis:
      "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😌 😔 😪 😴 😷 🤒 🤕 🤢 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬",
  },
  {
    label: "Gestures",
    icon: "👍",
    emojis:
      "👍 👎 👌 🤌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💪 🫶 👀 🧠 🙋 🙆 🙅 🤷 🤦 💁",
  },
  {
    label: "Hearts",
    icon: "❤️",
    emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💯 💢 💥 💫 💦 💬 💭 💤",
  },
  {
    label: "Celebrate",
    icon: "🎉",
    emojis: "🎉 🎊 🎈 🎁 🎂 🍰 🥂 🍾 🏆 🥇 🥈 🥉 🏅 🎯 ⭐ 🌟 ✨ 🔥 🌈 ☀️ 🌸 🌻 🌹 🍀",
  },
  {
    label: "Work",
    icon: "💼",
    emojis:
      "💼 📅 📌 📎 📝 📄 📊 📈 📉 🗂️ 📁 📧 📞 💻 🖥️ ⌨️ 🖱️ 📱 🔔 🔕 ⏰ ⏳ ✅ ☑️ ❌ ⚠️ ❓ ❗ 💡 🔒 🔑 🛠️ 🚀 ☕ 🍕 🍔",
  },
].map((category) => ({ ...category, emojis: category.emojis.split(" ") }));

const PICKER_WIDTH = 288;
const PICKER_HEIGHT_QUICK = 330;
const PICKER_HEIGHT = 280;

/**
 * Popover grid of emojis. Closes on outside click or Escape.
 * Without `anchorRef`, it sits above its (relative) parent, aligned by `align`.
 * With `anchorRef`, it floats in a portal next to that element (opening above or below,
 * whichever has room), so scrolling containers can't clip it.
 */
export default function EmojiPicker({ onSelect, onClose, align = "left", quick = false, anchorRef = null }) {
  const [tab, setTab] = useState(0);
  const [position, setPosition] = useState(null);
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!anchorRef?.current) return undefined;
    const place = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const height = quick ? PICKER_HEIGHT_QUICK : PICKER_HEIGHT;
      const width = Math.min(PICKER_WIDTH, window.innerWidth - 16);
      const above = rect.top - height - 8 >= 8 || rect.bottom + height + 8 > window.innerHeight;
      const top = above ? Math.max(8, rect.top - height - 8) : rect.bottom + 8;
      const preferredLeft = align === "right" ? rect.right - width : rect.left;
      const left = Math.min(Math.max(8, preferredLeft), window.innerWidth - width - 8);
      setPosition({ top, left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [align, anchorRef, quick]);

  useEffect(() => {
    const onDown = (event) => {
      if (anchorRef?.current?.contains(event.target)) return; // the trigger toggles it
      if (ref.current && !ref.current.contains(event.target)) onClose?.();
    };
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onClose]);

  if (anchorRef && !position) return null;

  const floating = Boolean(anchorRef);
  const panel = (
    <div
      ref={ref}
      role="dialog"
      aria-label="Choose an emoji"
      style={floating ? { position: "fixed", top: position.top, left: position.left, width: position.width } : undefined}
      className={`z-[90] rounded-xl border border-slate-200 bg-white p-2 shadow-xl ${
        floating
          ? ""
          : `absolute bottom-full mb-2 w-72 max-w-[calc(100vw-2rem)] ${align === "right" ? "right-0" : "left-0"}`
      }`}
    >
      {quick ? (
        <div className="mb-2 flex justify-between border-b border-slate-100 pb-2">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              className="rounded-lg p-1 text-2xl leading-none transition hover:scale-110 hover:bg-slate-100"
              aria-label={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mb-2 flex gap-1">
        {CATEGORIES.map((category, index) => (
          <button
            key={category.label}
            type="button"
            title={category.label}
            onClick={() => setTab(index)}
            className={`flex-1 rounded-lg py-1 text-lg leading-none ${
              tab === index ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-slate-100"
            }`}
          >
            {category.icon}
          </button>
        ))}
      </div>
      <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto">
        {CATEGORIES[tab].emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className="rounded-md p-1 text-xl leading-none hover:bg-slate-100"
            aria-label={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );

  return floating ? createPortal(panel, document.body) : panel;
}
