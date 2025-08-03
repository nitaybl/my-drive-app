// File: src/app/api/admin/invitations/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route'; // Correct import path
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

const generateInviteCode = () => {
    return randomBytes(4).toString('hex').toUpperCase();
};

export async function GET() {
    const session = await getServerSession(authOptions);
    // No longer using 'as any'
    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const invitations = await prisma.invitation.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(invitations);
    } catch {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    // No longer using 'as any'
    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const { validity } = await req.json();
        const expiresAt = new Date();

        if (validity === 'day') expiresAt.setDate(expiresAt.getDate() + 1);
        else if (validity === 'week') expiresAt.setDate(expiresAt.getDate() + 7);
        else if (validity === 'month') expiresAt.setMonth(expiresAt.getMonth() + 1);
        else if (validity === 'lifetime') expiresAt.setFullYear(expiresAt.getFullYear() + 100);
        else return NextResponse.json({ message: 'Invalid validity period' }, { status: 400 });

        const newInvite = await prisma.invitation.create({
            data: {
                code: generateInviteCode(),
                expiresAt: expiresAt,
            },
        });

        return NextResponse.json(newInvite, { status: 201 });
    } catch {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
