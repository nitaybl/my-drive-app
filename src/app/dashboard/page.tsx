// File: src/app/dashboard/page.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';

// --- TYPE DEFINITIONS ---
type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
};

type ContextMenu = {
  visible: boolean;
  x: number;
  y: number;
  file: DriveFile | null;
};

// --- HELPER FUNCTIONS & COMPONENTS ---
const FileIcon = ({ mimeType }: { mimeType: string }) => {
  if (mimeType === 'application/vnd.google-apps.folder') {
    return <span className="text-5xl text-yellow-400">📁</span>;
  }
  return <span className="text-5xl text-gray-400">📄</span>;
};

const formatBytes = (bytesStr: string | number | bigint | undefined, decimals = 2) => {
    const bytes = Number(bytesStr || 0);
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// --- MAIN DASHBOARD COMPONENT ---
export default function DashboardPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  // State Management
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ visible: false, x: 0, y: 0, file: null });
  const [shareLink, setShareLink] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userDriveRootId = session?.user?.googleDriveFolderId;

  // Data Fetching
  const fetchFiles = useCallback(async (folderId: string) => {
    setIsLoading(true);
    const res = await fetch(`/api/drive/files?parentId=${folderId}`);
    if (res.ok) {
      setFiles(await res.json());
    } else {
      console.error("Failed to fetch files");
      setFiles([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (userDriveRootId && path.length === 0) {
        setPath([{ id: userDriveRootId, name: 'My Files' }]);
        fetchFiles(userDriveRootId);
    }
  }, [session, status, router, userDriveRootId, fetchFiles, path.length]);

  // Event Handlers
  const handleFolderClick = (file: DriveFile) => {
    setPath(prev => [...prev, { id: file.id, name: file.name }]);
    fetchFiles(file.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
    fetchFiles(newPath[newPath.length - 1].id);
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus(`Uploading ${file.name}...`);
    const formData = new FormData();
    formData.append('file', file);
    const currentFolderId = path[path.length - 1].id;
    formData.append('parentId', currentFolderId);

    const res = await fetch('/api/drive/files', { method: 'POST', body: formData });
    
    if (res.ok) {
        fetchFiles(currentFolderId);
        await updateSession(); // Update session to get new storage usage
        setUploadStatus(`Successfully uploaded ${file.name}!`);
    } else {
        const data = await res.json();
        setUploadStatus(`Upload failed: ${data.message}`);
    }
    
    setTimeout(() => setUploadStatus(''), 3000);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleNewFolder = async () => {
    const folderName = prompt("Enter new folder name:");
    if (!folderName || folderName.trim() === '') return;

    const currentFolderId = path[path.length - 1].id;
    const res = await fetch('/api/drive/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName.trim(), parentId: currentFolderId }),
    });

    if(res.ok) {
        fetchFiles(currentFolderId);
    } else {
        alert('Failed to create folder.');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, file: DriveFile) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, file });
  };
  
  const handleShare = async () => {
    if (!contextMenu.file) return;
    const res = await fetch('/api/drive/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: contextMenu.file.id }),
    });
    if(res.ok) {
        const data = await res.json();
        setShareLink(data.shareLink);
        setIsShareModalOpen(true);
    } else {
        alert("Failed to create share link.");
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  // UI Components
  const StorageMeter = () => {
    const storageUsed = session?.user?.storageUsed || 0;
    const storageQuota = session?.user?.storageQuota || 1;
    const percentage = (Number(storageUsed) / Number(storageQuota)) * 100;

    let meterColor = 'bg-blue-500';
    if (percentage > 75) meterColor = 'bg-red-500';
    else if (percentage > 50) meterColor = 'bg-yellow-500';

    return (
        <div className="space-y-2">
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className={`${meterColor} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
            </div>
            <p className="text-sm text-gray-400">{formatBytes(storageUsed)} of {formatBytes(storageQuota)} used</p>
        </div>
    );
  };

  if (status === 'loading' || !path.length) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><p className="text-white">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex" onClick={() => setContextMenu({ ...contextMenu, visible: false })}>
      <aside className="w-64 bg-gray-800 p-4 flex flex-col shrink-0">
        <h1 className="text-2xl font-bold mb-8">My Drive</h1>
        <div className="space-y-4 mb-8">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full text-left p-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors">Upload File</button>
            <button onClick={handleNewFolder} className="w-full text-left p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">New Folder</button>
        </div>
        {uploadStatus && <p className="text-xs text-center text-gray-400 mt-4">{uploadStatus}</p>}
        <div className="mt-auto">
            <StorageMeter />
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-gray-800 border-l border-gray-700 p-4 flex justify-between items-center shrink-0">
            <div>
                {path.map((p, i) => (
                    <span key={p.id} className="text-gray-400">
                        {i > 0 && <span className="mx-2">/</span>}
                        <button onClick={() => handleBreadcrumbClick(i)} className="hover:text-white">{p.name}</button>
                    </span>
                ))}
            </div>
            <div className="flex items-center space-x-4">
                {session?.user?.role === 'ADMIN' && (
                    <Link href="/admin/users" className="px-3 py-1 text-sm rounded-full bg-green-600 hover:bg-green-700">Admin Panel</Link>
                )}
                <button onClick={() => signOut({ callbackUrl: '/login' })} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">Sign Out</button>
            </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
            {isLoading ? <p>Loading files...</p> : files.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {files.map(file => (
                        <div key={file.id} onContextMenu={(e) => handleContextMenu(e, file)} onClick={() => file.mimeType === 'application/vnd.google-apps.folder' && handleFolderClick(file)} className="p-4 bg-gray-800 rounded-lg text-center cursor-pointer hover:bg-gray-700 transition-colors flex flex-col items-center justify-center aspect-square">
                            <FileIcon mimeType={file.mimeType} />
                            <p className="mt-2 text-sm truncate w-full">{file.name}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500">This folder is empty.</div>
            )}
        </main>
      </div>
      
      {contextMenu.visible && (
        <div style={{ top: contextMenu.y, left: contextMenu.x }} className="absolute bg-gray-700 rounded-md shadow-lg py-2 w-48 z-50">
            {contextMenu.file?.mimeType !== 'application/vnd.google-apps.folder' && 
                <button onClick={handleShare} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-600">Share</button>
            }
            <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-600">Rename</button>
            <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-600 text-red-400">Delete</button>
        </div>
      )}

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Share File</h3>
                <p className="text-sm text-gray-400 mb-2">Anyone with the link can view this file.</p>
                <input type="text" readOnly value={shareLink} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 mb-4"/>
                <div className="flex justify-end space-x-4">
                    <button onClick={() => navigator.clipboard.writeText(shareLink)} className="px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-700">Copy Link</button>
                    <button onClick={() => setIsShareModalOpen(false)} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500">Close</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
