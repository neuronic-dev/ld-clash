import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";

// Clean + validate the key to avoid the “string did not match expected pattern” issue
const raw = process.env.OPENAI_API_KEY ?? "";
const apiKey = raw.trim().replace(/^["']|["']$/g, "");

if (!apiKey) throw new Error("Missing OPENAI_API_KEY in .env.local");
if (!(apiKey.startsWith("sk-") || apiKey.startsWith("sk-proj-"))) {
  throw new Error(
    "OPENAI_API_KEY looks wrong. .env.local must be: OPENAI_API_KEY=sk-... (no quotes, no spaces)."
  );
}

const client = new OpenAI({ apiKey });

const BodySchema = z.object({
  message: z.string().min(1).max(12000),
  mode: z.enum(["coach", "drill", "rebuttal", "cx", "flow"]).default("coach"),
});

type Mode = z.infer<typeof BodySchema>["mode"];

const OUTPUT_FORMAT = `FORMAT REQUIREMENT (STRICT):
Return your answer with EXACTLY these 4 headings, in this order, each on its own line, ALL CAPS:

SCORECARD
VOTERS
FIXES
DRILL

Rules:
- Under each heading, use bullet points starting with "- ".
- No other headings. No markdown headers like "##".
- If you truly have nothing for a section, write "- N/A".
- Keep it tournament-usable: short bullets, high signal.`;

function systemPrompt(mode: Mode) {
  const base =
    "You are an elite Lincoln-Douglas (LD) debate coach. " +
    "Give concrete, structured, round-winning advice. Prefer numbered bullets. " +
    "Do NOT write full speeches or full cases. " +
    "You may provide outlines and at most 1–2 sentences of example phrasing. " +
    "Focus on: VC alignment, warrants, clash, offense/defense, weighing, collapse, and strategy.";

  const modeText: Record<Mode, string> = {
    coach:
      "Coach mode: Identify the 3 highest-impact issues, what matters most to win, and a prioritized fix plan.",
    drill:
      "Drill mode: Create 3–5 timed drills (10–15 min each) with scoring rubrics and what 'excellent' looks like.",
    rebuttal:
      "Rebuttal mode: No full scripts. Give the best 1–2 voters, key turns/answers, weighing, and an outline for the 1AR/2NR.",
    cx:
      "CX mode: Give 10 sharp cross-ex questions + follow-ups + what each question is trying to expose.",
    flow:
      "Flow mode: Label arguments clearly and show what was answered vs dropped; recommend the best collapse path.",
  };

  return `${base}\n\nMODE: ${mode}\nTASK: ${modeText[mode]}`;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { message, mode } = parsed.data;

    // Basic anti-ghostwriting
    const banned =
      /(write|generate|draft).*(case|speech|AC|NC|1AR|2NR)|give me (a )?full (AC|NC|1AR|2NR)/i;
    if (banned.test(message)) {
      return Response.json(
        {
          error:
            "No ghostwriting. Paste YOUR draft and I’ll diagnose + outline fixes + drills (not generate full speeches).",
        },
        { status: 400 }
      );
    }

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      instructions: systemPrompt(mode) + "\n\n" + OUTPUT_FORMAT,
      input: message,
      temperature: 0.4,
    });

    return Response.json({ text: resp.output_text ?? "" });
  } catch (err: any) {
    console.error(err);
    return Response.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}