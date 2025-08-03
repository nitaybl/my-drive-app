// File: src/app/api/admin/users/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);

  // 1. Check if user is authenticated and is an admin
  // We need to extend the session type to include the user's role
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  // 2. Fetch all users from the database
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        storageUsed: true,
        storageQuota: true,
        createdAt: true, // Assuming you have this field from NextAuth adapter
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
