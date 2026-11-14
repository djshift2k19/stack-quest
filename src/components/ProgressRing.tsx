/**
 * A circle that fills up as you make progress, like an activity ring.
 * Screen readers hear the label instead, e.g. "Trail progress: 40%".
 */
export function ProgressRing({
  fraction,
  size = 56,
  stroke = 6,
  label,
}: {
  fraction: number;
  size?: number;
  stroke?: number;
  label: string;
}) {
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${label}: ${percent}%`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span aria-hidden="true" className="absolute text-xs font-semibold">
        {percent}%
      </span>
    </div>
  );
}
