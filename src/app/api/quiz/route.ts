import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const quizResultSchema = z.object({
  questionId: z.string(),
  selectedAnswer: z.number().int().min(0),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const experimentSlug = searchParams.get("experimentSlug");

    if (!experimentSlug) {
      return NextResponse.json({ error: "experimentSlug required" }, { status: 400 });
    }

    const experiment = await prisma.experiment.findUnique({
      where: { slug: experimentSlug },
      include: { questions: true },
    });

    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    return NextResponse.json({ data: experiment.questions });
  } catch (error) {
    console.error("Quiz fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = quizResultSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { questionId, selectedAnswer } = parsed.data;

    // Get the question to check if correct
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const correct = question.correctAnswer === selectedAnswer;

    const result = await prisma.quizResult.create({
      data: {
        studentId: session.user.id,
        questionId,
        selectedAnswer,
        correct,
      },
    });

    return NextResponse.json({ data: { ...result, correctAnswer: question.correctAnswer, explanation: question.explanation } });
  } catch (error) {
    console.error("Quiz submit error:", error);
    return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 });
  }
}
