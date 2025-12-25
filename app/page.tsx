"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

type Mode = "coach" | "flow" | "cx" | "drill" | "rebuttal" | "envision";

const MODE_LABELS: Record<Mode, string> = {
  coach: "Coach",
  flow: "Flow",
  cx: "CX",
  drill: "Drill",
  rebuttal: "Rebuttal",
  envision: "Envision",
};

const STARTERS: Array<{ label: string; mode: Mode; text: string; sub: string }> = [
  {
    label: "Score my chunk",
    mode: "coach",
    sub: "Rubric + 2 voters + 3 fixes + 1 drill",
    text: `SIDE: (AFF/NEG) [optional]
SPEECH: (AC/NC/1AR/2NR) [optional]
TOPIC: [optional]
VC: (Value | Criterion) [optional]

MY TEXT:
(paste your chunk)

GOAL: Score me + 2 voters + top 3 fixes.`,
  },
  {
    label: "Find drops",
    mode: "flow",
    sub: "Answered vs dropped + collapse recommendation",
    text: `TOPIC: [optional]

OPP OFFENSE (paste/bullets):
- ...

MY RESPONSE (paste/bullets):
- ...

TASK: Identify answered vs dropped and what to collapse to.`,
  },
  {
    label: "CX questions",
    mode: "cx",
    sub: "10 sharp questions + follow-ups + purpose",
    text: `TOPIC: [optional]
OPP CASE (paste or summarize):
...

TASK: Give 10 CX questions + follow-ups + what each exposes.`,
  },
  {
    label: "10-min drill",
    mode: "drill",
    sub: "Timed drill + rubric + how to improve",
    text: `WHAT I STRUGGLE WITH:
(e.g., weighing, extensions, warrants)

TASK: Make a 10-minute drill + scoring rubric + improvement path.`,
  },
  {
    label: "Envision a whole round",
    mode: "envision",
    sub: "Full round sim + positional feedback + endgame plan",
    text: `TOPIC:
(paste resolution)

SIDE: (AFF/NEG)
V:
VC:

CASE OR CONTENTION:
(paste)

TASK: Envision the entire round against likely opponent positions, using positional debating: ballot question, position stack, win condition math, tempo/initiative, threats/dilemmas, link control, impact calculus, collapse + endgame.`,
  },
];

export default function Page() {
  const [mode, setMode] = useState<Mode>("coach");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [output, setOutput] = useState<string>(
    "Ready.\n\nPick a mode and paste anything — partial info is fine.\n\nNo ghostwriting: you get voters, fixes, and drills."
  );

  // Envision fields
  const [envTopic, setEnvTopic] = useState("");
  const [envSide, setEnvSide] = useState<"AFF" | "NEG">("AFF");
  const [envV, setEnvV] = useState("");
  const [envVC, setEnvVC] = useState("");
  const [envCase, setEnvCase] = useState("");

  // Envision dropdowns (mapped to your masterfile concepts)
  const [envJudge, setEnvJudge] = useState<"Lay" | "Notetaker" | "Flow">("Flow");
  const [envRisk, setEnvRisk] = useState<"Threshold" | "EV" | "Balanced">("Balanced");
  const [envStrategy, setEnvStrategy] = useState<"Tempo/Initiative" | "Link Control" | "Key Squares" | "Balanced">(
    "Balanced"
  );
  const [envEndgame, setEnvEndgame] = useState<"1 Voter" | "2 Voters">("1 Voter");
  const [envDelivery, setEnvDelivery] = useState<"Teach" | "Precision" | "Story" | "Hammer">("Precision");
  const [envFocus, setEnvFocus] = useState<
    "Ballot Question" | "Framework/Standard" | "Links/Reachability" | "Weighing/Impact Calc" | "All"
  >("All");

  const placeholder = useMemo(
    () => `SIDE: (AFF/NEG) [optional]
SPEECH: (AC/NC/1AR/2NR) [optional]
TOPIC: [optional]
VC: (Value | Criterion) [optional]
OPP OFFENSE: (bullets) [optional]
MY TEXT: (paste your speech/blocks/args)
WHAT I WANT: (score / voters / fixes / CX / collapse) [optional]
`,
    []
  );

  function buildEnvisionMessage() {
    return `MODE: ENVISION

TOPIC:
${envTopic || "(missing)"}

SIDE: ${envSide}
V: ${envV || "(missing)"}
VC: ${envVC || "(missing)"}

JUDGE PROFILE: ${envJudge}
RISK POSTURE (Impact Calc): ${envRisk}
STRATEGY FOCUS: ${envStrategy}
ENDGAME PREF (Collapse): ${envEndgame}
DELIVERY MODE: ${envDelivery}
FOCUS SQUARES: ${envFocus}

CASE / CONTENTION:
${envCase || "(missing)"}

TASK:
1) Generate the most likely opposing position (interpretation, standard/decision rule, mechanism, offense).
2) Simulate the round step-by-step (speech by speech) and show where it’s going.
3) Use positional debating terms constantly: ballot question, position stack/spine, invariants, win condition math, tempo/initiative, threats/dilemmas/double binds, link control, reachability, impact calculus (probability/magnitude/scope/timeframe/reversibility/moral relevance), collapse timing, endgame.
4) Give feedback at each step: what I should say next + what to concede strategically + what to prioritize (triage).
`;
  }

  async function send() {
    if (loading) return;

    const message = mode === "envision" ? buildEnvisionMessage() : input.trim();
    if (!message.trim()) return;

    setLoading(true);
    setOutput("Thinking...\n");

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, mode }),
      });

      const raw = await resp.text();

      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        // keep as text
      }

      if (!resp.ok) {
        const errAny =
          (data && (data.error ?? data.message)) ??
          raw ??
          `Request failed (${resp.status})`;

        const errStr = typeof errAny === "string" ? errAny : JSON.stringify(errAny, null, 2);
        throw new Error(errStr);
      }

      // prefer JSON { text }, fallback to raw text
      setOutput(typeof data?.text === "string" ? data.text : (raw || "(No response text returned.)"));

      // Clear only normal input; keep envision filled so they can iterate.
      if (mode !== "envision") setInput("");
    } catch (e: any) {
      setOutput(`⚠️ ${e?.message || "Something went wrong."}\n\nTry again or shorten your paste.`);
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      // ignore
    }
  }

  function clearAll() {
    setInput("");
    setOutput("Cleared.\n\nPick a mode, paste your chunk, and hit Send.");

    // Also clear Envision
    setEnvTopic("");
    setEnvSide("AFF");
    setEnvV("");
    setEnvVC("");
    setEnvCase("");
    setEnvJudge("Flow");
    setEnvRisk("Balanced");
    setEnvStrategy("Balanced");
    setEnvEndgame("1 Voter");
    setEnvDelivery("Precision");
    setEnvFocus("All");
  }

  const envisionQuickSendHint = (
    <>
      Send: <span className={styles.kbd}>Cmd/Ctrl</span> + <span className={styles.kbd}>Enter</span>
    </>
  );

  return (
    <div className={styles.bg}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <div className={styles.brand}>
            <div className={styles.badge}>LD</div>
            <div>
              <div className={styles.title}>LD Clash</div>
              <div className={styles.sub}>Tournament UI • teal/black • panels • no ghostwriting</div>
            </div>
          </div>

          <div className={styles.right}>
            <div className={styles.pills}>
              {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
                <button
                  key={m}
                  className={`${styles.pill} ${m === mode ? styles.pillActive : ""}`}
                  onClick={() => setMode(m)}
                  disabled={loading}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>

            <button className={styles.btnGhost} onClick={clearAll} disabled={loading}>
              Clear
            </button>
            <button
              className={styles.btnPrimary}
              onClick={send}
              disabled={loading || (mode === "envision" ? !envCase.trim() : !input.trim())}
              title={mode === "envision" ? "Requires case/content paste" : "Requires input"}
            >
              {loading ? "…" : "Send"}
            </button>
          </div>
        </div>

        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Input</div>
              <div className={styles.cardTitle}>{envisionQuickSendHint}</div>
            </div>

            <div className={styles.cardBody}>
              {mode !== "envision" ? (
                <>
                  <textarea
                    className={styles.textarea}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholder}
                    disabled={loading}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") send();
                    }}
                  />

                  <div className={styles.hint}>
                    Missing info is okay. If you don’t know the VC or topic, leave it blank — the coach still runs.
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.hint} style={{ marginBottom: 10 }}>
                    Envision = full round simulation + coaching. Paste your case/cont. Dropdowns just steer the round.
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div className={styles.cardTitle} style={{ marginBottom: 6 }}>
                        Topic (resolution)
                      </div>
                      <textarea
                        className={styles.textarea}
                        style={{ minHeight: 90 }}
                        value={envTopic}
                        onChange={(e) => setEnvTopic(e.target.value)}
                        placeholder="Paste the full resolution"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <div className={styles.cardTitle} style={{ marginBottom: 6 }}>
                        Side / V / VC
                      </div>

                      <div className={styles.row} style={{ marginTop: 0, gap: 8, alignItems: "center" }}>
                        <select
                          className={styles.smallBtn}
                          value={envSide}
                          onChange={(e) => setEnvSide(e.target.value as any)}
                          disabled={loading}
                        >
                          <option value="AFF">AFF</option>
                          <option value="NEG">NEG</option>
                        </select>

                        <input
                          className={styles.textarea}
                          style={{ minHeight: 0, height: 40, resize: "none" }}
                          value={envV}
                          onChange={(e) => setEnvV(e.target.value)}
                          placeholder="V (Value)"
                          disabled={loading}
                        />
                      </div>

                      <textarea
                        className={styles.textarea}
                        style={{ minHeight: 52, marginTop: 8 }}
                        value={envVC}
                        onChange={(e) => setEnvVC(e.target.value)}
                        placeholder="VC (Criterion / Decision rule in plain English)"
                        disabled={loading}
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <div className={styles.cardTitle} style={{ marginBottom: 6 }}>
                        Case / Contention (paste)
                      </div>
                      <textarea
                        className={styles.textarea}
                        value={envCase}
                        onChange={(e) => setEnvCase(e.target.value)}
                        placeholder="Paste your entire case or a single contention"
                        disabled={loading}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") send();
                        }}
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <div className={styles.cardTitle} style={{ marginBottom: 8 }}>
                        Round Controls (optional)
                      </div>

                      <div className={styles.row} style={{ flexWrap: "wrap", gap: 8 }}>
                        <select
                          className={styles.smallBtn}
                          value={envJudge}
                          onChange={(e) => setEnvJudge(e.target.value as any)}
                          disabled={loading}
                          title="Judge profiling"
                        >
                          <option value="Lay">Judge: Lay</option>
                          <option value="Notetaker">Judge: Notetaker</option>
                          <option value="Flow">Judge: Flow</option>
                        </select>

                        <select
                          className={styles.smallBtn}
                          value={envRisk}
                          onChange={(e) => setEnvRisk(e.target.value as any)}
                          disabled={loading}
                          title="Impact calculus posture"
                        >
                          <option value="Balanced">Risk: Balanced</option>
                          <option value="Threshold">Risk: Threshold</option>
                          <option value="EV">Risk: EV</option>
                        </select>

                        <select
                          className={styles.smallBtn}
                          value={envStrategy}
                          onChange={(e) => setEnvStrategy(e.target.value as any)}
                          disabled={loading}
                          title="Tempo / initiative / link control"
                        >
                          <option value="Balanced">Strategy: Balanced</option>
                          <option value="Tempo/Initiative">Strategy: Tempo/Initiative</option>
                          <option value="Link Control">Strategy: Link Control</option>
                          <option value="Key Squares">Strategy: Key Squares</option>
                        </select>

                        <select
                          className={styles.smallBtn}
                          value={envEndgame}
                          onChange={(e) => setEnvEndgame(e.target.value as any)}
                          disabled={loading}
                          title="Collapse preference"
                        >
                          <option value="1 Voter">Endgame: 1 Voter</option>
                          <option value="2 Voters">Endgame: 2 Voters</option>
                        </select>

                        <select
                          className={styles.smallBtn}
                          value={envDelivery}
                          onChange={(e) => setEnvDelivery(e.target.value as any)}
                          disabled={loading}
                          title="Delivery mode switching"
                        >
                          <option value="Teach">Delivery: Teach</option>
                          <option value="Precision">Delivery: Precision</option>
                          <option value="Story">Delivery: Story</option>
                          <option value="Hammer">Delivery: Hammer</option>
                        </select>

                        <select
                          className={styles.smallBtn}
                          value={envFocus}
                          onChange={(e) => setEnvFocus(e.target.value as any)}
                          disabled={loading}
                          title="Key squares focus"
                        >
                          <option value="All">Focus: All</option>
                          <option value="Ballot Question">Focus: Ballot Question</option>
                          <option value="Framework/Standard">Focus: Framework/Standard</option>
                          <option value="Links/Reachability">Focus: Links/Reachability</option>
                          <option value="Weighing/Impact Calc">Focus: Weighing/Impact Calc</option>
                        </select>
                      </div>

                      <div className={styles.hint} style={{ marginTop: 8 }}>
                        These dropdowns map to: judge profiling, impact calculus, tempo/initiative, key squares, and endgame
                        planning — aka “don’t drift, don’t die.”
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className={styles.row}>
                <button className={styles.smallBtn} onClick={() => setInput("")} disabled={loading}>
                  Clear input
                </button>
                <div className={styles.cardTitle}>Mode: {MODE_LABELS[mode]}</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className={styles.cardTitle} style={{ marginBottom: 8 }}>
                  Starters
                </div>
                <div className={styles.starters}>
                  {STARTERS.map((s) => (
                    <button
                      key={s.label}
                      className={styles.starter}
                      onClick={() => {
                        setMode(s.mode);
                        if (s.mode === "envision") {
                          // Don’t overwrite envision fields; just drop the template into the normal input if they want it.
                          // If they click it, we’ll populate the envision case box with the template so it's obvious.
                          setEnvCase(s.text);
                        } else {
                          setInput(s.text);
                        }
                      }}
                      disabled={loading}
                    >
                      <div className={styles.starterTop}>
                        <span className={styles.starterName}>{s.label}</span>
                        <span className={styles.tag}>{MODE_LABELS[s.mode]}</span>
                      </div>
                      <div className={styles.starterSub}>{s.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Output</div>
              <div className={styles.row} style={{ marginTop: 0 }}>
                <button className={styles.smallBtn} onClick={copyOutput}>
                  Copy
                </button>
              </div>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.output}>{output}</div>
              <div className={styles.hint}>
                Output is formatted for quick extensions: scorecard → voters → fixes → drill.
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
