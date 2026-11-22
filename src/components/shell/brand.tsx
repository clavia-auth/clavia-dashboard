/** The Clavia key: the logo, drawn inline so it follows the theme's ground. */
export function ClaviaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <rect width="120" height="120" rx="28" fill="#52B788" />
      <circle
        cx="60"
        cy="50"
        r="28"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray="133 43"
        strokeDashoffset="21"
        transform="rotate(-12 60 50)"
      />
      <g fill="#FFFFFF">
        <rect x="54" y="74" width="12" height="34" rx="4" />
        <rect x="57" y="86" width="20" height="10" rx="3" />
        <rect x="57" y="99" width="17" height="9" rx="3" />
      </g>
      <circle cx="60" cy="50" r="10" fill="#D4A843" />
      <circle cx="60" cy="50" r="4.5" fill="#52B788" />
    </svg>
  );
}
