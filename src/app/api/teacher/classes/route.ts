import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createClassSchema = z.object({
  name: z.string().min(1, "Class name is required").max(100).trim(),
});

export async function GET() {
  try {
    const { error, session } = await requireTeacher();
    if (error) return error;

    const classes = await prisma.class.findMany({
      where: { teacherId: session!.user.id },
      include: {
        _count: { select: { students: true, assignments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: classes });
  } catch (error) {
    console.error("Classes fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, session } = await requireTeacher();
    if (error) return error;

    const body = await req.json();
    const parsed = createClassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data" },
        { status: 400 }
      );
    }

    const cls = await prisma.class.create({
      data: {
        name: parsed.data.name,
        teacherId: session!.user.id,
      },
      include: {
        _count: { select: { students: true, assignments: true } },
      },
    });

    return NextResponse.json({ data: cls }, { status: 201 });
  } catch (error) {
    console.error("Class create error:", error);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
