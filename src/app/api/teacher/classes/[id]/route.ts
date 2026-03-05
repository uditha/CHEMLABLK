import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacher, requireClassOwner } from "@/lib/teacher-auth";
import { z } from "zod";

const updateClassSchema = z.object({
  name: z.string().min(1, "Class name is required").max(100).trim(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error: authError, session } = await requireTeacher();
    if (authError) return authError;

    const { error: classError } = await requireClassOwner(params.id, session!.user.id);
    if (classError) return classError;

    const cls = await prisma.class.findUnique({
      where: { id: params.id },
      include: {
        students: {
          select: { id: true, indexNumber: true, name: true, language: true },
          orderBy: { name: "asc" },
        },
        assignments: {
          include: {
            experiment: {
              select: { slug: true, title: true, difficulty: true, unit: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ data: cls });
  } catch (error) {
    console.error("Class detail error:", error);
    return NextResponse.json({ error: "Failed to fetch class" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error: authError, session } = await requireTeacher();
    if (authError) return authError;

    const { error: classError } = await requireClassOwner(params.id, session!.user.id);
    if (classError) return classError;

    const body = await req.json();
    const parsed = updateClassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data" },
        { status: 400 }
      );
    }

    const cls = await prisma.class.update({
      where: { id: params.id },
      data: { name: parsed.data.name },
    });

    return NextResponse.json({ data: cls });
  } catch (error) {
    console.error("Class update error:", error);
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error: authError, session } = await requireTeacher();
    if (authError) return authError;

    const { error: classError } = await requireClassOwner(params.id, session!.user.id);
    if (classError) return classError;

    // Transaction: unlink students, delete assignments, delete class
    await prisma.$transaction([
      prisma.student.updateMany({
        where: { classId: params.id },
        data: { classId: null },
      }),
      prisma.assignment.deleteMany({
        where: { classId: params.id },
      }),
      prisma.class.delete({
        where: { id: params.id },
      }),
    ]);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Class delete error:", error);
    return NextResponse.json({ error: "Failed to delete class" }, { status: 500 });
  }
}
