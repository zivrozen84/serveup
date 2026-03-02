import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import * as bcrypt from "bcryptjs";
import { checkIpAllowed } from "./ip-check";
import { warn } from "./logger";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      role?: string;
    };
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // שעה – דורש התחברות מחדש כל פעם
  },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const ip = (req?.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          (req?.headers?.["x-real-ip"] as string) ||
          "127.0.0.1";
        if (!(await checkIpAllowed(ip))) {
          warn("[התחברות] כניסה נדחתה – IP לא מורשה:", ip);
          return null;
        }
        const username = credentials?.username;
        const password = credentials?.password;
        if (!username || !password) return null;
        const admin = await prisma.adminUser.findFirst({
          where: { OR: [{ username }, { email: username }] },
        });
        if (!admin) return null;
        const ok = await bcrypt.compare(password, admin.passwordHash);
        if (!ok) return null;
        await prisma.loginLog.create({
          data: { ipAddress: ip, success: true },
        });
        return {
          id: String(admin.id),
          email: admin.email ?? undefined,
          name: admin.username ?? undefined,
          role: admin.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
