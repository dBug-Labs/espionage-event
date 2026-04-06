'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background text-on-surface font-body flex items-center justify-center terminal-bg">
        <div className="fixed inset-0 scanlines z-[60] opacity-20"></div>
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-headline text-sm tracking-[0.2em] text-primary uppercase">Authenticating...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
