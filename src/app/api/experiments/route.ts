import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unit = searchParams.get("unit");
    const priority = searchParams.get("priority");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (unit) where.unit = parseInt(unit);
    if (priority) where.priority = priority;
    if (status) where.status = status;

    const experiments = await prisma.experiment.findMany({
      where,
      orderBy: [{ unit: "asc" }, { title: "asc" }],
    });

    return NextResponse.json({ data: experiments });
  } catch (error) {
    console.error("Experiments fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch experiments" }, { status: 500 });
  }
}
