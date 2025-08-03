// File: src/app/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This component will act as a gatekeeper for your application.
export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Wait until the session status is determined.
    if (status === 'loading') {
      return; // Do nothing while loading
    }

    if (session) {
      // If the user is authenticated, redirect to the dashboard.
      router.push('/dashboard');
    } else {
      // If the user is not authenticated, redirect to the login page.
      router.push('/login');
    }
  }, [session, status, router]);

  // Render a loading state to prevent screen flicker during redirect
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </div>
  );
}
