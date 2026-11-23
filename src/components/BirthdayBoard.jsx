import { Link } from "react-router-dom";
import DimensionalIcon from "./DimensionalIcon";
import UserAvatar from "./UserAvatar";

export function LeafIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M5 19c8 0 14-8 14-14-6 0-14 6-14 14Z" strokeLinejoin="round" />
      <path d="M8 16c2-3 5-6 9-8" />
    </svg>
  );
}

export default function BirthdayBoard({ people = [], today = [], missingBirthDate = false, compact = false }) {
  const celebrating = today.length > 0;

  return (
    <section className="dash-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e6ece8] px-4 py-4">
        <div className="flex items-start gap-3">
          <DimensionalIcon icon={LeafIcon} tone="forest" />
          <div>
            <h2 className="text-base font-bold text-[#1c4a32]">{celebrating ? "A birthday today" : "Birthdays"}</h2>
            <p className="text-sm text-[#3d6b4f]">Shared on screen, so the wish stays paperless.</p>
          </div>
        </div>
        {compact && (
          <Link to="/birthdays" className="text-sm font-bold text-[#1c4a32] hover:underline">
            Everyone's dates
          </Link>
        )}
      </div>

      {missingBirthDate && (
        <div className="border-b border-[#e6ece8] bg-[#eef7f1] px-4 py-3 text-sm text-[#1c4a32]">
          Add your birth date so the team can see it here.{" "}
          <Link to="/profile" className="font-bold underline">
            Save it on your profile
          </Link>
        </div>
      )}

      {celebrating && (
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {today.map((person) => (
            <article
              key={person.id}
              className="flex gap-3 rounded-[1rem] border border-[#d7e8db] bg-gradient-to-br from-white to-[#f3f8f4] p-3 shadow-[0_12px_24px_rgba(47,107,69,0.12)]"
            >
              <UserAvatar user={person} className="h-16 w-16 rounded-full ring-4 ring-white" iconClassName="h-8 w-8" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#1c4a32]">{person.username}</p>
                <p className="text-xs font-semibold text-[#3d6b4f]">{person.birthday_label}</p>
                <p className="mt-2 text-sm leading-5 text-[#244833]">{person.wish}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {!compact && (
        <ul className="divide-y divide-[#e6ece8]">
          {people.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-[#3d6b4f]">
              No birth dates yet. Each person adds their own on their profile.
            </li>
          ) : (
            people.map((person) => (
              <li
                key={person.id}
                className={`flex items-center gap-3 px-4 py-3 ${person.is_today ? "bg-[#eef7f1]" : "bg-white/70"}`}
              >
                <UserAvatar user={person} className="h-12 w-12 rounded-full" iconClassName="h-6 w-6" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#1c4a32]">{person.username}</p>
                  <p className="text-xs text-[#3d6b4f]">{person.birthday_label}</p>
                  {person.is_today && person.wish ? (
                    <p className="mt-1 text-sm text-[#244833]">{person.wish}</p>
                  ) : null}
                </div>
                {person.is_today ? (
                  <span className="shrink-0 rounded-full bg-[#2f6b45] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-[0_8px_16px_rgba(47,107,69,0.28)]">
                    Today
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      )}

      {compact && !celebrating && (
        <p className="px-4 py-4 text-sm text-[#3d6b4f]">
          {people.length === 0
            ? "Birth dates appear here once people save them."
            : `${people.length} birth date${people.length === 1 ? "" : "s"} saved. No birthday falls today.`}
        </p>
      )}
    </section>
  );
}
