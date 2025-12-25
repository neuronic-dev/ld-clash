import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type Mode = "coach" | "flow" | "cx" | "drill" | "rebuttal" | "envision";

type EnvisionPayload = {
  topic?: string;
  side?: "Aff" | "Neg" | "";
  value?: string;
  criterion?: string;
  caseText?: string;

  judgeType?: "Lay" | "Notetaker" | "Flow" | "";
  endgamePref?: "1-voter" | "2-voter" | "";
  riskPosture?: "threshold" | "ev" | "balanced" | "";
  strategyStyle?: "tempo" | "link-control" | "balanced" | "";
  decisionLens?: "legitimacy" | "rights" | "welfare" | "mixed" | "";
};

const MODE_SET = new Set<Mode>(["coach", "flow", "cx", "drill", "rebuttal", "envision"]);
function coerceMode(v: unknown): Mode {
  return typeof v === "string" && MODE_SET.has(v as Mode) ? (v as Mode) : "coach";
}

const MASTERFILE_TERMS = [
  "Positional debating","Position","Position stack","Position spine","Position invariants","Ballot story","Ballot question","Ballot instruction","Advocacy",
  "Interpretation","Contextual definitions","Ground division","Topicality boundary",
  "Core conflict","Core tradeoff","Decision rule","Standard","Framework","Framework completeness","Framework insurance",
  "Multi-functional impacting","Impact translation",
  "Issue selection","Argument ROI","Word economy","Smart contention design",
  "Causal claims","Warrants","Warrant hierarchy","Link chain","Link integrity","Link control","Internal link","Internal link turn",
  "Prerequisite framing","Gatekeeping argument","Access claim","Reachability",
  "Defense vs offense distinction","Sticky offense","Offense extension","Defensive concession","Strategic conceding","Preemption","Steelmanning",
  "Argument interaction","Dot-connecting","Comparative worlds framing","Narrative control","Impact control",
  "Weighing","Weighing mechanisms","Magnitude","Probability","Risk assessment","Risk threshold","Expected value framing","Timeframe","Scope","Reversibility","Moral relevance","Precedent/normalization","Legitimacy framing",
  "Common sense check","Lay adaptation","Judge profiling","Speed calibration","Delivery mode switching","Clarity control","Emphasis and pausing","Rebuttal readiness",
  "Collapse","Collapse timing","Win condition","Win-condition math","Shortest path principle","Decision tree planning",
  "Tempo","Initiative","Forcing lines","Threats","Dilemmas","Double bind","Zugzwang","Trading","Simplification when ahead",
  "Endgame planning","Opening/middlegame/endgame mapping","Key squares control","Triage",
  "Prep-time doctrine","Extension budget","CX mission","Concession harvesting","Quote test",
  "Front-end framing","Line-by-line discipline","Flow management","No-floating-impacts rule","Turn defense into offense",
  "Judge onboarding","Tag clarity","Content ordering","Evidence role","Examples as evidence","No-jargon policy",
];

function systemPrompt(mode: Mode) {
  const noMarkdownRule =
    "Do NOT use markdown. No #, no *, no backticks. Use plain text with labels, numbering, and indentation only.";

  if (mode === "envision") {
    return [
      "You are LD Clash: ENVISION MODE.",
      "Goal: simulate a realistic LD round against the user's case while coaching every step using positional debating (ballot control / position architecture).",
      "",
      "ENGINE REQUIREMENT:",
      "Use Masterfile concepts as the engine. Do not name-drop randomly — only invoke a concept when it is actively used.",
      "You must visibly execute: tempo, initiative, forcing lines, threats/dilemmas, win-condition math, link control, reachability, impact calculus, collapse, and ballot instruction.",
      "",
      "MASTERFILE CONCEPTS (engine list):",
      MASTERFILE_TERMS.join(" | "),
      "",
      "OUTPUT RULES:",
      `- ${noMarkdownRule}`,
      "- Be readable. Short tags. Clear sections.",
      "- No debate jargon unless judgeType is Flow. If judge is Lay/Notetaker, translate jargon into plain English.",
      "- If info is missing, proceed anyway: list Missing info + Assumptions quickly, then continue.",
      "- Always include BOTH: (1) ballot question and (2) shortest path to win (win-condition math).",
      "",
      "FORMAT (always this structure):",
      "0) Intake check",
      "   - Missing info:",
      "   - Assumptions:",
      "",
      "1) Terrain setup (ballot control)",
      "   - Interpretation:",
      "   - Advocacy:",
      "   - Standard / Decision rule:",
      "   - Core conflict + core tradeoff:",
      "   - Ballot question (1 sentence):",
      "   - Position spine (<=10 seconds):",
      "   - Win condition (1–3 claims):",
      "   - Insurance (how you still win if framework shifts):",
      "",
      "2) Predicted opponent strategy (most likely 1NC)",
      "   A. Framework push they likely go for",
      "   B. Case presses (key link attacks + internal link turns)",
      "   C. CX traps they’ll use",
      "   D. Any forcing structures (dilemmas/double binds) they’ll try",
      "",
      "3) Envisioned round walkthrough (speech-by-speech coaching)",
      "   - 1AC: what YOU must make crystal clear (judge onboarding + key squares).",
      "   - 1NC: write their best responses (realistic).",
      "   - CX after 1NC: 6–10 questions with a CX mission + concessions you’re hunting.",
      "   - 1AR: triaged template: front-end framing first, then line-by-line, then collapse direction.",
      "   - 2NR: show the endgame: collapse, weighing, ballot instruction.",
      "",
      "4) Endgame package (copy/paste)",
      "   - Final collapse (1–2 voters):",
      "   - Weighing block (probability/reversibility/scope/timeframe/etc.):",
      "   - Ballot instruction (1–2 sentences RFD-ready):",
      "",
      "5) Training assignments (short)",
      "   - 3 drills to fix the biggest leak, each with a measurable goal.",
    ].join("\n");
  }

  if (mode === "coach") return `${noMarkdownRule}\nYou are LD Clash coach mode. Give feedback and strategy. No ghostwriting.`;
  if (mode === "flow") return `${noMarkdownRule}\nYou are LD Clash flow mode. Clean line-by-line, drops, collapse, and what matters.`;
  if (mode === "cx") return `${noMarkdownRule}\nYou are LD Clash CX mode. Give targeted questions, followups, and what each answer buys.`;
  if (mode === "rebuttal") return `${noMarkdownRule}\nYou are LD Clash rebuttal mode. Write extensions + front-end framing + collapse + ballot instruction, using the user's wording when possible.`;
  return `${noMarkdownRule}\nYou are LD Clash drill mode. Produce short drills with rubrics and measurable targets.`;
}

function buildEnvisionInput(payload: EnvisionPayload, fallbackCaseText: string) {
  const caseText = (payload.caseText && payload.caseText.trim().length > 0)
    ? payload.caseText
    : fallbackCaseText;

  return [
    "ENVISION INTAKE:",
    `Topic: ${payload.topic || ""}`,
    `Side: ${payload.side || ""}`,
    `V: ${payload.value || ""}`,
    `VC: ${payload.criterion || ""}`,
    `Judge type: ${payload.judgeType || ""}`,
    `Endgame preference: ${payload.endgamePref || ""}`,
    `Risk posture: ${payload.riskPosture || ""}`,
    `Strategy style: ${payload.strategyStyle || ""}`,
    `Decision lens: ${payload.decisionLens || ""}`,
    "",
    "CASE (paste below):",
    caseText || "",
  ].join("\n");
}

function stringifyError(err: any): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (typeof err?.message === "string") return err.message;

  const nested =
    err?.error?.message ||
    err?.response?.data?.error?.message ||
    err?.cause?.message;

  if (typeof nested === "string") return nested;

  try { return JSON.stringify(err); } catch { return "Unknown error (non-serializable)"; }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const mode = coerceMode(body?.mode);
    const message = typeof body?.message === "string" ? body.message : "";
    const envision = (body?.envision || {}) as EnvisionPayload;

    const input = mode === "envision"
      ? buildEnvisionInput(envision, message)
      : message;

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      instructions: systemPrompt(mode),
      input,
      max_output_tokens: mode === "envision" ? 2200 : 1200,
    });

    const text = resp.output_text ?? "No response text returned. Check server logs.";

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const msg = stringifyError(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
