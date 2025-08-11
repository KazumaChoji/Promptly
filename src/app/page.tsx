'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect directly to studio for open source version
    router.push('/studio');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Promptly</h1>
        <p className="text-muted-foreground">Redirecting to studio...</p>
      </div>
    </div>
  );
}
