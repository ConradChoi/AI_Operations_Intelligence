import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'AI Operations Intelligence — Spend',
  description: '결제까지 더 짧게. 운영은 더 빠르게. 지출은 더 가볍게.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-white text-gray-900">{children}</body>
    </html>
  );
}
