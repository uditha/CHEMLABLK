import Anthropic from "@anthropic-ai/sdk";

// ─── Singleton Client ─────────────────────────────────────────────────────────

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Language Names ───────────────────────────────────────────────────────────

const languageNames: Record<string, string> = {
  en: "English",
  si: "Sinhala (සිංහල)",
  ta: "Tamil (தமிழ்)",
};

// ─── System Prompt Builder ────────────────────────────────────────────────────

export interface SystemPromptContext {
  experimentTitle: string;
  experimentTitleNative?: string;
  unit: number;
  mode: string;
  currentStep?: string;
  selectedItem?: string;
  observations?: string[];
  language: string;
}

export function buildSystemPrompt(ctx: SystemPromptContext): string {
  const lang = languageNames[ctx.language] ?? "English";
  const observationsText =
    ctx.observations && ctx.observations.length > 0
      ? ctx.observations.join("; ")
      : "None recorded yet";

  return `You are a Sri Lanka A/L Chemistry lab assistant helping a student perform the "${ctx.experimentTitle}" experiment (Unit ${ctx.unit} — NIE Chemistry Syllabus ${new Date().getFullYear()}).

The student is working in ${lang} mode. Always respond in ${lang}. If the student writes in Sinhala or Tamil, respond in that language.

Current experiment state:
- Mode: ${ctx.mode}
- Step: ${ctx.currentStep ?? "Not started"}
- Metal/Sample selected: ${ctx.selectedItem ?? "None"}
- Observations so far: ${observationsText}

Your role as a Socratic chemistry tutor:
- In GUIDED mode: Be encouraging, explain the chemistry behind each step, offer hints when the student is stuck. Explain the electron transitions responsible for the flame colours.
- In FREE mode: Be curious and exploratory. Let the student discover things. Ask "What do you think will happen if...?"
- In EXAM mode: NEVER give direct answers. Only ask guiding questions. Do NOT reveal the identity of unknown samples under any circumstances.
- In MISTAKE mode: Help the student identify what went wrong and why. Ask them to diagnose before explaining.
- In TEACHER mode: Be thorough and accurate, referencing the A/L mark scheme.

Communication guidelines:
- Keep responses under 3 sentences for in-experiment queries
- Always relate observations to the A/L mark scheme when relevant
- Use chemical formulae correctly: Na, K, Li, Ca, Sr, Ba, Cu
- Reference the NIE Chemistry Practical Handbook (${new Date().getFullYear()}) implicitly
- For Sinhala responses: Use standard Sinhala scientific terminology
- For Tamil responses: Use standard Tamil scientific terminology

Safety reminders (mention only if relevant):
- Always use eye protection
- Never point a hot wire toward others
- Check for sodium contamination between tests

Do not be verbose. Be concise, accurate, and pedagogically effective.`;
}

// ─── Rate limiting helper (in-memory, server-side) ───────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  studentId: string,
  maxRequests = 20,
  windowMs = 60 * 60 * 1000 // 1 hour
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(studentId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(studentId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}
