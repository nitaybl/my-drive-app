// File: src/types/next-auth.d.ts

import NextAuth, { DefaultSession, User } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      storageQuota?: number | string | bigint;
      storageUsed?: number | string | bigint;
      googleDriveFolderId?: string;
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    storageQuota?: number | string | bigint;
    storageUsed?: number | string | bigint;
    googleDriveFolderId?: string;
  }
}
