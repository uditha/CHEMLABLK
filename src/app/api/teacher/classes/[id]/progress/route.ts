import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacher, requireClassOwner } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error: authError, session } = await requireTeacher();
    if (authError) return authError;

    const { error: classError } = await requireClassOwner(params.id, session!.user.id);
    if (classError) return classError;

    // Get all students in this class
    const students = await prisma.student.findMany({
      where: { classId: params.id },
      select: { id: true, name: true, indexNumber: true },
      orderBy: { name: "asc" },
    });

    // Get all assignments for this class
    const assignments = await prisma.assignment.findMany({
      where: { classId: params.id },
      include: {
        experiment: { select: { id: true, slug: true, title: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Get progress for all students × assigned experiments
    const studentIds = students.map((s) => s.id);
    const experimentIds = assignments.map((a) => a.experimentId);

    const progress =
      studentIds.length > 0 && experimentIds.length > 0
        ? await prisma.experimentProgress.findMany({
            where: {
              studentId: { in: studentIds },
              experimentId: { in: experimentIds },
            },
            select: {
              studentId: true,
              experimentId: true,
              completed: true,
              bestScore: true,
              attempts: true,
              modeCompletions: true,
              timeSpentSeconds: true,
            },
          })
        : [];

    return NextResponse.json({
      data: { students, assignments, progress },
    });
  } catch (error) {
    console.error("Class progress error:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}
