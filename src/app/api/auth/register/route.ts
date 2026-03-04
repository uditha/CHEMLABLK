import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const studentSchema = z.object({
  type: z.literal("student"),
  indexNumber: z.string().min(3).max(20),
  name: z.string().min(2).max(100),
  schoolCode: z.string().min(3),
  language: z.enum(["en", "si", "ta"]).default("en"),
});

const teacherSchema = z.object({
  type: z.literal("teacher"),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
  schoolCode: z.string().min(3),
});

const registerSchema = z.discriminatedUnion("type", [studentSchema, teacherSchema]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data: " + parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Find school by code
    const school = await prisma.school.findUnique({ where: { code: data.schoolCode } });
    if (!school) {
      return NextResponse.json(
        { error: "School code not found. Please contact your school." },
        { status: 400 }
      );
    }

    if (data.type === "student") {
      // Check if index number already exists
      const existing = await prisma.student.findUnique({ where: { indexNumber: data.indexNumber } });
      if (existing) {
        return NextResponse.json({ error: "This index number is already registered." }, { status: 409 });
      }

      const student = await prisma.student.create({
        data: {
          indexNumber: data.indexNumber,
          name: data.name,
          schoolId: school.id,
          language: data.language,
        },
      });

      return NextResponse.json({ success: true, id: student.id });
    }

    if (data.type === "teacher") {
      const existing = await prisma.teacher.findUnique({ where: { email: data.email } });
      if (existing) {
        return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
      }

      const passwordHash = await bcrypt.hash(data.password, 12);
      const teacher = await prisma.teacher.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          schoolId: school.id,
        },
      });

      return NextResponse.json({ success: true, id: teacher.id });
    }
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
