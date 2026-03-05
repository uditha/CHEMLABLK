import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacher, requireClassOwner } from "@/lib/teacher-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createAssignmentSchema = z.object({
  classId: z.string().min(1),
  experimentSlug: z.string().min(1),
  dueDate: z.string().datetime().optional().nullable(),
});

export async function GET() {
  try {
    const { error, session } = await requireTeacher();
    if (error) return error;

    const assignments = await prisma.assignment.findMany({
      where: { class: { teacherId: session!.user.id } },
      include: {
        class: { select: { id: true, name: true } },
        experiment: {
          select: { slug: true, title: true, difficulty: true, unit: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: assignments });
  } catch (error) {
    console.error("Assignments fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error: authError, session } = await requireTeacher();
    if (authError) return authError;

    const body = await req.json();
    const parsed = createAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data" },
        { status: 400 }
      );
    }

    const { classId, experimentSlug, dueDate } = parsed.data;

    // Verify class ownership
    const { error: classError } = await requireClassOwner(classId, session!.user.id);
    if (classError) return classError;

    // Find experiment by slug
    const experiment = await prisma.experiment.findUnique({
      where: { slug: experimentSlug },
    });

    if (!experiment) {
      return NextResponse.json(
        { error: "Experiment not found" },
        { status: 404 }
      );
    }

    // Check for duplicate assignment
    const existing = await prisma.assignment.findFirst({
      where: { classId, experimentId: experiment.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This experiment is already assigned to this class" },
        { status: 409 }
      );
    }

    const assignment = await prisma.assignment.create({
      data: {
        classId,
        experimentId: experiment.id,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        class: { select: { id: true, name: true } },
        experiment: {
          select: { slug: true, title: true, difficulty: true, unit: true },
        },
      },
    });

    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error) {
    console.error("Assignment create error:", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
