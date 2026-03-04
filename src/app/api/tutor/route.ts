import { NextRequest, NextResponse } from "next/server";
import { anthropic, buildSystemPrompt, checkRateLimit } from "@/lib/anthropic";
import { auth } from "@/lib/auth";
import { z } from "zod";

const tutorRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  experimentTitle: z.string(),
  unit: z.number(),
  mode: z.string(),
  currentStep: z.string().optional(),
  selectedItem: z.string().optional(),
  observations: z.array(z.string()).optional(),
  language: z.enum(["en", "si", "ta"]).default("en"),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const { allowed, remaining } = checkRateLimit(session.user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in an hour." },
        { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
      );
    }

    const body = await req.json();
    const parsed = tutorRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const {
      message,
      experimentTitle,
      unit,
      mode,
      currentStep,
      selectedItem,
      observations,
      language,
      conversationHistory,
    } = parsed.data;

    const systemPrompt = buildSystemPrompt({
      experimentTitle,
      unit,
      mode,
      currentStep,
      selectedItem,
      observations,
      language,
    });

    // Build messages array for Claude
    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...conversationHistory.slice(-8), // Keep last 8 turns for context
      { role: "user", content: message },
    ];

    // Stream response
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: systemPrompt,
      messages,
    });

    // Convert to ReadableStream for Next.js
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-RateLimit-Remaining": String(remaining),
      },
    });
  } catch (error) {
    console.error("Tutor API error:", error);
    return NextResponse.json({ error: "AI tutor unavailable" }, { status: 500 });
  }
}
