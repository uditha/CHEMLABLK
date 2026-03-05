import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { error, session } = await requireTeacher();
    if (error) return error;

    const teacherId = session!.user.id;

    // Count total students across all teacher's classes
    const totalStudents = await prisma.student.count({
      where: { class: { teacherId } },
    });

    // Count completed experiment progress for teacher's students
    const completedExperiments = await prisma.experimentProgress.count({
      where: {
        student: { class: { teacherId } },
        completed: true,
      },
    });

    // Count active assignments (no dueDate OR dueDate >= now)
    const activeAssignments = await prisma.assignment.count({
      where: {
        class: { teacherId },
        OR: [{ dueDate: null }, { dueDate: { gte: new Date() } }],
      },
    });

    // Recent 10 completions from teacher's students
    const recentActivity = await prisma.experimentProgress.findMany({
      where: {
        student: { class: { teacherId } },
        completed: true,
      },
      orderBy: { lastAttempt: "desc" },
      take: 10,
      include: {
        student: { select: { name: true, indexNumber: true } },
        experiment: { select: { title: true, slug: true } },
      },
    });

    return NextResponse.json({
      data: {
        totalStudents,
        completedExperiments,
        activeAssignments,
        recentActivity: recentActivity.map((r) => ({
          studentName: r.student.name,
          studentIndex: r.student.indexNumber,
          experimentTitle: r.experiment.title,
          experimentSlug: r.experiment.slug,
          bestScore: r.bestScore,
          completedAt: r.lastAttempt,
        })),
      },
    });
  } catch (error) {
    console.error("Teacher stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
