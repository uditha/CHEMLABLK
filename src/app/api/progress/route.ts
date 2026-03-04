import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const progressPostSchema = z.object({
  slug: z.string().min(1),
  mode: z.enum(["Guided", "Free", "Exam", "Mistake", "Teacher"]),
  score: z.number().min(0).max(100).optional(),
  timeSpentSeconds: z.number().min(0).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    const where: Record<string, unknown> = { studentId: session.user.id };
    if (slug) {
      const exp = await prisma.experiment.findUnique({ where: { slug } });
      if (!exp) return NextResponse.json({ data: [] });
      where.experimentId = exp.id;
    }

    const progress = await prisma.experimentProgress.findMany({
      where,
      include: { experiment: { select: { slug: true } } },
    });

    const data = progress.map((p) => ({
      slug: p.experiment.slug,
      modeCompletions: p.modeCompletions,
      completed: p.completed,
      score: p.score,
      bestScore: p.bestScore,
      attempts: p.attempts,
      timeSpentSeconds: p.timeSpentSeconds,
      lastAttempt: p.lastAttempt,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Progress fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "student") {
      return NextResponse.json({ error: "Only students can save progress" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = progressPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const { slug, mode, score, timeSpentSeconds } = parsed.data;

    const experiment = await prisma.experiment.findUnique({ where: { slug } });
    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    const existing = await prisma.experimentProgress.findUnique({
      where: {
        studentId_experimentId: {
          studentId: session.user.id,
          experimentId: experiment.id,
        },
      },
    });

    const currentModes = existing?.modeCompletions ?? [];
    const modeStr = mode;
    const newModes = currentModes.includes(modeStr)
      ? currentModes
      : [...currentModes, modeStr];

    const newScore = score ?? existing?.score ?? 0;
    const newBestScore = Math.max(newScore, existing?.bestScore ?? 0);

    const progress = await prisma.experimentProgress.upsert({
      where: {
        studentId_experimentId: {
          studentId: session.user.id,
          experimentId: experiment.id,
        },
      },
      update: {
        mode,
        modeCompletions: newModes,
        completed: newModes.length > 0,
        score: newScore,
        bestScore: newBestScore,
        ...(timeSpentSeconds !== undefined && {
          timeSpentSeconds: { increment: timeSpentSeconds },
        }),
        attempts: { increment: 1 },
        lastAttempt: new Date(),
      },
      create: {
        studentId: session.user.id,
        experimentId: experiment.id,
        mode,
        modeCompletions: newModes,
        completed: newModes.length > 0,
        score: newScore,
        bestScore: newBestScore,
        timeSpentSeconds: timeSpentSeconds ?? 0,
        attempts: 1,
      },
    });

    return NextResponse.json({
      data: {
        slug: experiment.slug,
        modeCompletions: progress.modeCompletions,
        score: progress.score,
        bestScore: progress.bestScore,
      },
    });
  } catch (error) {
    console.error("Progress save error:", error);
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}
