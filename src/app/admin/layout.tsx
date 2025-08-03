// File: src/app/admin/layout.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Do nothing while loading
    if (!session) {
        router.push('/login'); // Not authenticated
        return;
    }
    if (session.user?.role !== 'ADMIN') {
        router.push('/dashboard'); // Not an admin
    }
  }, [session, status, router]);

  if (status === 'loading' || session?.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Loading Admin Panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex">
        <aside className="w-64 bg-gray-800 p-4 space-y-4">
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <nav className="flex flex-col space-y-2">
                <Link href="/admin/users" className="p-2 rounded hover:bg-gray-700">Users</Link>
                <Link href="/admin/invitations" className="p-2 rounded hover:bg-gray-700">Invitations</Link>
                <Link href="/dashboard" className="p-2 rounded hover:bg-gray-700">Back to Dashboard</Link>
            </nav>
        </aside>
        <main className="flex-1 p-8">
            {children}
        </main>
    </div>
  );
}