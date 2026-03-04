import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const experiment = await prisma.experiment.findUnique({
      where: { slug: params.slug },
      include: {
        questions: true,
      },
    });

    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    return NextResponse.json({ data: experiment });
  } catch (error) {
    console.error("Experiment fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch experiment" }, { status: 500 });
  }
}
