import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacher, requireClassOwner } from "@/lib/teacher-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; studentId: string } }
) {
  try {
    const { error: authError, session } = await requireTeacher();
    if (authError) return authError;

    const { error: classError } = await requireClassOwner(params.id, session!.user.id);
    if (classError) return classError;

    // Verify student belongs to this class
    const student = await prisma.student.findUnique({
      where: { id: params.studentId },
    });

    if (!student || student.classId !== params.id) {
      return NextResponse.json(
        { error: "Student not found in this class" },
        { status: 404 }
      );
    }

    // Remove from class (set classId to null)
    await prisma.student.update({
      where: { id: params.studentId },
      data: { classId: null },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Remove student error:", error);
    return NextResponse.json({ error: "Failed to remove student" }, { status: 500 });
  }
}
