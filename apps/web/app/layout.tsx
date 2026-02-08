import './globals.css';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['200', '300', '400', '500', '600', '700']
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500']
});

export const metadata = {
  title: 'Pomodoro Focus',
  description: 'A premium, minimal Pomodoro timer with streak tracking.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${jetbrains.variable}`}>
        {children}
      </body>
    </html>
  );
}
