// File: src/app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcrypt";
import { google } from "googleapis";

const prisma = new PrismaClient();

// Helper function to create a Google Drive folder for a new user
const createDriveFolder = async (userName: string) => {
  try {
    const key = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64!, "base64").toString("ascii")
    );

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: key.client_email,
        private_key: key.private_key,
      },
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    const fileMetadata = {
      name: `user-folder-${userName}-${Date.now()}`,
      mimeType: "application/vnd.google-apps.folder",
      parents: [process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!],
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });

    return folder.data.id || null;
  } catch (error) {
    console.error("Failed to create Google Drive folder:", error);
    return null;
  }
};

// This is no longer exported directly to fix the build error.
const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // If the user doesn't exist or doesn't have a password, fail authorization.
        if (!user || !user.password_hash) {
          return null;
        }

        // Safely compare the provided password with the stored hash
        const passwordMatch = await compare(credentials.password, user.password_hash);

        if (!passwordMatch) {
          return null;
        }

        // Return the user object if the password is correct
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login', // Redirect users to a custom login page
  },
  events: {
    // This event fires when a new user is created (e.g., through a sign-up form)
    createUser: async ({ user }) => {
      if (user.name && user.email) {
        const folderId = await createDriveFolder(user.name);
        if (folderId) {
          // Save the new folder's ID to the user's record in our database
          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              googleDriveFolderId: folderId,
            },
          });
        }
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
