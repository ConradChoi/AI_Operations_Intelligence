const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function WalletIcon() {
  return (
    <svg {...common}>
      <path d="M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M16 13h.01" />
    </svg>
  );
}

export function RepeatIcon() {
  return (
    <svg {...common}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

export function PiggyBankIcon() {
  return (
    <svg {...common}>
      <path d="M19 9V6a2 2 0 0 0-2-2h-1a5 5 0 0 0-9 2H5a2 2 0 0 0-2 2c0 1 .6 1.8 1.5 2.2" />
      <path d="M3 10h1" />
      <path d="M13 5v2" />
      <circle cx="16" cy="12" r="0.6" fill="currentColor" />
      <path d="M2 12v3a2 2 0 0 0 2 2h1v2h3v-2h6v2h3v-2.3a4 4 0 0 0 2-3.4V11a4 4 0 0 0-4-4H8a6 6 0 0 0-6 6Z" />
    </svg>
  );
}

export function AlertTriangleIcon() {
  return (
    <svg {...common}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
