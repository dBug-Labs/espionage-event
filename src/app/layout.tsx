import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Espionage | DBUG',
  description:
    'Can you stop the breach? A spy-themed competitive coding event by DBUG. Register now for the ultimate cyber mission.',
  keywords: 'espionage, dbug, coding event, cybersecurity, hackathon, spy theme, college event',
  openGraph: {
    title: 'Espionage | DBUG',
    description: 'Can you stop the breach? Register for the ultimate spy-themed coding challenge.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="scanline-overlay" suppressHydrationWarning>{children}</body>
    </html>
  );
}
