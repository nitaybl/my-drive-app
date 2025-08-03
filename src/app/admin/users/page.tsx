// File: src/app/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';

// Define a type for the user data we expect
type User = {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    createdAt: string;
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
            setLoading(false);
        };
        fetchUsers();
    }, []);

    if (loading) return <p>Loading users...</p>;

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">User Management</h2>
            <div className="bg-gray-800 rounded-lg shadow">
                <table className="w-full text-left">
                    <thead className="border-b border-gray-700">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-gray-700 last:border-b-0">
                                <td className="p-4">{user.name}</td>
                                <td className="p-4">{user.email}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-200'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
