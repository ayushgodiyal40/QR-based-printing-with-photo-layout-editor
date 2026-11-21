import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users, shops } from "@/lib/db/schema";
import { eq, ilike } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";

if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  process.env.AUTH_SECRET = "43fb0d0b8f09fa6106655c68ee188e404bf79ef79f82fa5eb7fc51caeb76451e";
}
process.env.AUTH_TRUST_HOST = "true";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "43fb0d0b8f09fa6106655c68ee188e404bf79ef79f82fa5eb7fc51caeb76451e",
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 }, // 24 hours
  pages: {
    signIn: "/admin",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).trim();

        const userRows = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            passwordHash: users.passwordHash,
            isActive: users.isActive,
            shopId: users.shopId,
            shopName: shops.name,
          })
          .from(users)
          .leftJoin(shops, eq(users.shopId, shops.id))
          .where(ilike(users.email, email))
          .limit(1);

        const user = userRows[0];
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        // Update last login asynchronously (non-blocking, does not delay sign-in response)
        db.update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, user.id))
          .catch((err) => console.error("Error updating last login:", err));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          shopId: user.shopId,
          shopName: user.shopName || "Print Shop",
        };
      },
    }),
    Credentials({
      id: "firebase",
      name: "Firebase",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) return null;

        const idToken = credentials.idToken as string;
        const verified = await verifyFirebaseIdToken(idToken);
        if (!verified || !verified.email) return null;

        const email = verified.email.trim();

        // Check if user exists in database
        let userRows = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            isActive: users.isActive,
            shopId: users.shopId,
            shopName: shops.name,
          })
          .from(users)
          .leftJoin(shops, eq(users.shopId, shops.id))
          .where(ilike(users.email, email))
          .limit(1);

        let user = userRows[0];

        if (!user || !user.isActive) {
          return null;
        }

        db.update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, user.id))
          .catch((err) => console.error("Error updating last login:", err));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          shopId: user.shopId,
          shopName: user.shopName || "Print Shop",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.shopId = (user as any).shopId;
        token.shopName = (user as any).shopName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).shopId = token.shopId;
        (session.user as any).shopName = token.shopName;
      }
      return session;
    },
  },
});
