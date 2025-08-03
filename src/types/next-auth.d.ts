// File: src/types/next-auth.d.ts

import { DefaultSession } from "next-auth"

// Removed unused imports

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
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