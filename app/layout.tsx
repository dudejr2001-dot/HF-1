import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HF 미디어 모니터링 대시보드',
  description: '한국주택금융공사 미디어 모니터링 — 뉴스·YouTube·DC인사이드 언급량/감성/트렌드 분석',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className={`${geist.className} bg-slate-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
