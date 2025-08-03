// File: src/app/dashboard/page.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If the session is not loading and the user is not authenticated, redirect to login.
    if (status !== 'loading' && !session) {
      router.push('/login');
    }
  }, [session, status, router]);

  // Display a loading message while the session is being verified
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Loading Dashboard...</p>
      </div>
    );
  }

  // Once loaded and authenticated, show the dashboard
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <header className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">My Drive</h1>
        <div className="flex items-center space-x-4">
          <p className="text-sm">Welcome, {session?.user?.name}</p>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-900"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="p-8">
        <h2 className="text-2xl font-semibold mb-6">Your Files</h2>
        {/* File and folder upload UI will go here */}
        <div className="p-16 text-center border-2 border-dashed border-gray-700 rounded-lg">
          <p className="text-gray-500">File area coming soon...</p>
        </div>
      </main>
    </div>
  );
}
