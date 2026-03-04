import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const studentLoginSchema = z.object({
  indexNumber: z.string().min(3).max(20),
  type: z.literal("student"),
});

const teacherLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  type: z.literal("teacher"),
});

const loginSchema = z.discriminatedUnion("type", [
  studentLoginSchema,
  teacherLoginSchema,
]);

// ─── NextAuth Config ──────────────────────────────────────────────────────────

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        type: { label: "Type", type: "text" },
        indexNumber: { label: "Index Number", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const creds = parsed.data;

        // ── Student login (index number only) ────────────────────────────────
        if (creds.type === "student") {
          const student = await prisma.student.findUnique({
            where: { indexNumber: creds.indexNumber },
            include: { school: true },
          });
          if (!student) return null;

          return {
            id: student.id,
            name: student.name,
            email: `${student.indexNumber}@student.chemlab.lk`,
            role: "student" as const,
            indexNumber: student.indexNumber,
            schoolId: student.schoolId,
            language: student.language,
          };
        }

        // ── Teacher login (email + password) ─────────────────────────────────
        if (creds.type === "teacher") {
          const teacher = await prisma.teacher.findUnique({
            where: { email: creds.email },
            include: { school: true },
          });
          if (!teacher) return null;

          const passwordValid = await bcrypt.compare(
            creds.password,
            teacher.passwordHash
          );
          if (!passwordValid) return null;

          return {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            role: "teacher" as const,
            schoolId: teacher.schoolId,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.indexNumber = (user as { indexNumber?: string }).indexNumber;
        token.schoolId = (user as { schoolId?: string }).schoolId;
        token.language = (user as { language?: string }).language;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.indexNumber = token.indexNumber as string | undefined;
        session.user.schoolId = token.schoolId as string;
        session.user.language = (token.language as string) ?? "en";
      }
      return session;
    },
  },
});

// ─── Type augmentation ────────────────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      indexNumber?: string;
      schoolId: string;
      language: string;
    };
  }
}
