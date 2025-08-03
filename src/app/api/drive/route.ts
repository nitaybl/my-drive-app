// File: src/app/api/drive/share/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { google } from 'googleapis';

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

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { fileId } = await req.json();
        if (!fileId) {
            return NextResponse.json({ message: 'File ID is required' }, { status: 400 });
        }

        const drive = getDriveService();

        // Make the file publicly readable
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // Get the public web link for the file
        const result = await drive.files.get({
            fileId: fileId,
            fields: 'webViewLink',
        });

        return NextResponse.json({ shareLink: result.data.webViewLink });

    } catch (error) {
        console.error('Failed to share file:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
