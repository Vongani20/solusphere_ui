export default function DimensionalIcon({ icon: Icon, tone = "teal", size = "md", soft = false, className = "" }) {
  const sizes = {
    sm: "h-9 w-9",
    md: "h-11 w-11",
    lg: "h-14 w-14",
  };
  const glyphs = {
    sm: "h-[18px] w-[18px]",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  if (soft) {
    return (
      <span className={`icon-soft icon-soft-${tone} ${sizes[size]} ${className}`} aria-hidden="true">
        <Icon className={glyphs[size]} />
      </span>
    );
  }

  return (
    <span className={`icon-orb icon-orb-${tone} ${sizes[size]} ${className}`} aria-hidden="true">
      <span className="icon-orb-shine" />
      <Icon className={`relative z-[1] ${glyphs[size]}`} />
    </span>
  );
}
