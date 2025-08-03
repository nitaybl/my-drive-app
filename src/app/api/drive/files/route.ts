// File: src/app/api/drive/files/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import { Readable } from 'stream';
import formidable from 'formidable';

const prisma = new PrismaClient();

const getDriveService = () => {
    const key = JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64!, 'base64').toString('ascii')
    );
    const auth = new google.auth.GoogleAuth({
        credentials: { client_email: key.client_email, private_key: key.private_key },
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
};

// GET: List files and folders
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.googleDriveFolderId) {
        return NextResponse.json({ message: 'User drive folder not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId') || user.googleDriveFolderId;

    try {
        const drive = getDriveService();
        const response = await drive.files.list({
            q: `'${parentId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, size, modifiedTime)',
            orderBy: 'folder desc, name',
        });
        return NextResponse.json(response.data.files);
    } catch (error) {
        console.error('Failed to list files:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Handles both file uploads and folder creation
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.googleDriveFolderId) {
        return NextResponse.json({ message: 'User drive folder not found' }, { status: 404 });
    }
    
    const contentType = req.headers.get('content-type') || '';

    // --- Handle Folder Creation ---
    if (contentType.includes('application/json')) {
        try {
            const { name, parentId } = await req.json();
            if (!name) {
                return NextResponse.json({ message: 'Folder name is required' }, { status: 400 });
            }

            const drive = getDriveService();
            const fileMetadata = {
                name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId || user.googleDriveFolderId],
            };
            const folder = await drive.files.create({
                requestBody: fileMetadata,
                fields: 'id',
            });
            return NextResponse.json({ success: true, folderId: folder.data.id }, { status: 201 });
        } catch (error) {
            console.error('Folder creation error:', error);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }
    }

    // --- Handle File Upload ---
    if (contentType.includes('multipart/form-data')) {
        try {
            const form = formidable({});
            const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
                form.parse(req as any, (err, fields, files) => {
                    if (err) reject(err);
                    resolve([fields, files]);
                });
            });
            
            const file = files.file?.[0] as formidable.File;
            const parentId = fields.parentId?.[0] as string || user.googleDriveFolderId;

            if (!file) {
                return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
            }

            if (user.storageUsed && user.storageQuota && (BigInt(user.storageUsed) + BigInt(file.size) > BigInt(user.storageQuota))) {
                return NextResponse.json({ message: 'Insufficient storage space' }, { status: 413 });
            }

            const drive = getDriveService();
            const fileMetadata = {
                name: file.originalFilename || 'untitled',
                parents: [parentId],
            };
            const media = {
                mimeType: file.mimetype || 'application/octet-stream',
                body: Readable.from(Buffer.from(await file.arrayBuffer())),
            };
            const response = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id',
            });
            await prisma.user.update({
                where: { id: user.id },
                data: { storageUsed: { increment: file.size } },
            });
            return NextResponse.json({ success: true, fileId: response.data.id }, { status: 201 });
        } catch (error) {
            console.error('File upload error:', error);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }
    }

    return NextResponse.json({ message: 'Unsupported content type' }, { status: 415 });
}
