import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacher, requireClassOwner } from "@/lib/teacher-auth";
import { z } from "zod";

const addStudentSchema = z.object({
  indexNumber: z.string().min(3, "Index number is too short").max(20).trim(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error: authError, session } = await requireTeacher();
    if (authError) return authError;

    const { error: classError } = await requireClassOwner(params.id, session!.user.id);
    if (classError) return classError;

    const body = await req.json();
    const parsed = addStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data" },
        { status: 400 }
      );
    }

    // Find the student by index number
    const student = await prisma.student.findUnique({
      where: { indexNumber: parsed.data.indexNumber },
    });

    if (!student) {
      return NextResponse.json(
        { error: "No student found with this index number" },
        { status: 404 }
      );
    }

    // Verify same school as teacher
    if (student.schoolId !== session!.user.schoolId) {
      return NextResponse.json(
        { error: "This student is not from your school" },
        { status: 403 }
      );
    }

    // Check if already in this class
    if (student.classId === params.id) {
      return NextResponse.json(
        { error: "Student is already in this class" },
        { status: 409 }
      );
    }

    // Update student's class
    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { classId: params.id },
      select: { id: true, indexNumber: true, name: true, language: true },
    });

    return NextResponse.json({ data: updated }, { status: 201 });
  } catch (error) {
    console.error("Add student error:", error);
    return NextResponse.json({ error: "Failed to add student" }, { status: 500 });
  }
}
