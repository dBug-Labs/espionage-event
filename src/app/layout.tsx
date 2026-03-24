import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ESPIONAGE | DBUG',
  description: 'Dhurandhar – The Spy Intelligence Challenge. Register now for the ultimate cyber mission.',
  keywords: 'espionage, dbug, coding event, cybersecurity, hackathon, spy theme, college event',
  openGraph: {
    title: 'ESPIONAGE | DBUG',
    description: 'Register for the ultimate spy-themed coding challenge.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container terminal-bg" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
