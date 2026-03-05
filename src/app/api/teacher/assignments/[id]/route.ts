import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, session } = await requireTeacher();
    if (error) return error;

    // Find the assignment and verify ownership through the class
    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      include: { class: { select: { teacherId: true } } },
    });

    if (!assignment || assignment.class.teacherId !== session!.user.id) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    await prisma.assignment.delete({ where: { id: params.id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Assignment delete error:", error);
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}
