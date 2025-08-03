// File: src/app/api/register/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 409 });
    }

    const password_hash = await hash(password, 10);

    // Create the user in the database without the unsafe 'any' cast
    // The 'user' variable is not needed here, so we remove it to fix the unused variable warning.
    await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
      },
    });

    // The createUser event in NextAuth will handle creating the Drive folder.

    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
