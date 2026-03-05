import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Validate that the current session belongs to a teacher.
 * Returns the session on success, or an error NextResponse on failure.
 */
export async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "teacher") {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }
  return { error: null, session };
}

/**
 * Verify that the given class exists and is owned by the teacher.
 * Returns the class record on success, or an error NextResponse on failure.
 */
export async function requireClassOwner(classId: string, teacherId: string) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.teacherId !== teacherId) {
    return {
      error: NextResponse.json({ error: "Class not found" }, { status: 404 }),
      cls: null,
    };
  }
  return { error: null, cls };
}
