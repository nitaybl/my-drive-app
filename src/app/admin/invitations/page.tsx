    // File: src/app/admin/invitations/page.tsx
    'use client';

    import { useState, useEffect } from 'react';

    type Invitation = {
        id: string;
        code: string;
        expiresAt: string;
        used: boolean;
        usedBy: string | null;
    };

    export default function AdminInvitationsPage() {
        const [invitations, setInvitations] = useState<Invitation[]>([]);
        const [validity, setValidity] = useState('week');
        const [loading, setLoading] = useState(true);

        const fetchInvitations = async () => {
            setLoading(true);
            const res = await fetch('/api/admin/invitations');
            if (res.ok) {
                setInvitations(await res.json());
            }
            setLoading(false);
        };

        useEffect(() => {
            fetchInvitations();
        }, []);

        const handleGenerateCode = async () => {
            await fetch('/api/admin/invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ validity }),
            });
            fetchInvitations(); // Refresh the list
        };

        return (
            <div>
                <h2 className="text-3xl font-bold mb-6">Invitation Codes</h2>

                <div className="bg-gray-800 p-4 rounded-lg mb-6 flex items-center space-x-4">
                    <select 
                        value={validity} 
                        onChange={(e) => setValidity(e.target.value)}
                        className="bg-gray-900 border border-gray-700 rounded-md p-2"
                    >
                        <option value="day">1 Day</option>
                        <option value="week">1 Week</option>
                        <option value="month">1 Month</option>
                        <option value="lifetime">Lifetime</option>
                    </select>
                    <button 
                        onClick={handleGenerateCode}
                        className="px-4 py-2 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Generate New Code
                    </button>
                </div>

                {loading ? <p>Loading codes...</p> : (
                    <div className="bg-gray-800 rounded-lg shadow">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-700">
                                <tr>
                                    <th className="p-4">Code</th>
                                    <th className="p-4">Expires At</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Used By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invitations.map((invite) => (
                                    <tr key={invite.id} className="border-b border-gray-700 last:border-b-0">
                                        <td className="p-4 font-mono">{invite.code}</td>
                                        <td className="p-4">{new Date(invite.expiresAt).toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${invite.used ? 'bg-red-500' : 'bg-green-500'}`}>
                                                {invite.used ? 'USED' : 'AVAILABLE'}
                                            </span>
                                        </td>
                                        <td className="p-4">{invite.usedBy || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }
