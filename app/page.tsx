"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type Mode = "coach" | "flow" | "cx" | "drill" | "rebuttal";
type ViewTab = "output" | "history";

const MODE_LABELS: Record<Mode, string> = {
  coach: "Coach",
  flow: "Flow",
  cx: "CX",
  drill: "Drill",
  rebuttal: "Rebuttal",
};

type SavedMsg = {
  id: string;
  ts: number;
  mode: Mode;
  input: string;
  output: string;
};

const STORAGE_KEY = "ldclash_history_v1";
const MAX_SAVED = 200;

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

WHAT I WANT: Score me + 2 voters + top 3 fixes.`,
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
];

function fmtTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function previewLine(s: string, n = 90) {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? one.slice(0, n - 1) + "…" : one;
}

export default function Page() {
  const [mode, setMode] = useState<Mode>("coach");
  const [tab, setTab] = useState<ViewTab>("output");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [output, setOutput] = useState<string>(
    "Ready.\n\nPick a mode and paste anything — partial info is fine.\n\nNo ghostwriting: you get voters, fixes, and drills."
  );

  const [history, setHistory] = useState<SavedMsg[]>([]);

  // Load saved history once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedMsg[];
      if (Array.isArray(parsed)) setHistory(parsed.slice(0, MAX_SAVED));
    } catch {
      // ignore
    }
  }, []);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_SAVED)));
    } catch {
      // ignore
    }
  }, [history]);

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

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setTab("output");
    setOutput("Thinking...\n");

    const currentMode = mode;

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: trimmed, mode: currentMode }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const err = data?.error || `Request failed (${resp.status})`;
        throw new Error(err);
      }

      const text = (data?.text ?? "(No response text returned.)") as string;
      setOutput(text);

      const item: SavedMsg = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ts: Date.now(),
        mode: currentMode,
        input: trimmed,
        output: text,
      };

      setHistory((prev) => [item, ...prev].slice(0, MAX_SAVED));
    } catch (e: any) {
      setOutput(`⚠️ ${e?.message || "Something went wrong."}\n\nTry again or shorten your paste.`);
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
    } catch {}
  }

  async function exportHistory() {
    const payload = history.map((h) => ({
      ts: h.ts,
      time: fmtTime(h.ts),
      mode: h.mode,
      input: h.input,
      output: h.output,
    }));
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setOutput("Copied history JSON to clipboard ✅\n\nPaste into Notes/Docs for backup.");
      setTab("output");
    } catch {
      setOutput("Couldn’t copy history. Browser blocked clipboard.");
      setTab("output");
    }
  }

  function clearAll() {
    setInput("");
    setOutput("Cleared.\n\nPick a mode, paste your chunk, and hit Send.");
    setTab("output");
  }

  function clearHistory() {
    if (!confirm("Delete all saved history on this device/browser?")) return;
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setOutput("History cleared on this device ✅");
    setTab("output");
  }

  function loadItem(h: SavedMsg) {
    setMode(h.mode);
    setInput(h.input);
    setOutput(h.output);
    setTab("output");
  }

  function deleteItem(id: string) {
    setHistory((prev) => prev.filter((x) => x.id !== id));
  }

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
            <button className={styles.btnPrimary} onClick={send} disabled={loading || !input.trim()}>
              {loading ? "…" : "Send"}
            </button>
          </div>
        </div>

        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Input</div>
              <div className={styles.cardTitle}>
                Send: <span className={styles.kbd}>Cmd/Ctrl</span> + <span className={styles.kbd}>Enter</span>
              </div>
            </div>

            <div className={styles.cardBody}>
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
                        setInput(s.text);
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

              <div className={styles.iconRow}>
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tabBtn} ${tab === "output" ? styles.tabBtnActive : ""}`}
                    onClick={() => setTab("output")}
                  >
                    Output
                  </button>
                  <button
                    className={`${styles.tabBtn} ${tab === "history" ? styles.tabBtnActive : ""}`}
                    onClick={() => setTab("history")}
                  >
                    History ({history.length})
                  </button>
                </div>

                <button className={styles.iconBtn} onClick={copyOutput}>
                  Copy
                </button>
              </div>
            </div>

            <div className={styles.cardBody}>
              {tab === "output" ? (
                <>
                  <div className={styles.output}>{output}</div>
                  <div className={styles.hint}>
                    Output is formatted for quick extensions: scorecard → voters → fixes → drill.
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.row} style={{ marginTop: 0 }}>
                    <div className={styles.hint} style={{ marginTop: 0 }}>
                      Saved on this device/browser. Click one to reload it (mode + input + output).
                    </div>
                    <div className={styles.iconRow}>
                      <button className={styles.iconBtn} onClick={exportHistory}>
                        Export
                      </button>
                      <button className={`${styles.iconBtn} ${styles.danger}`} onClick={clearHistory}>
                        Clear all
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }} className={styles.historyList}>
                    {history.length === 0 ? (
                      <div className={styles.output}>No saved chats yet.\n\nSend something and it’ll auto-save.</div>
                    ) : (
                      history.map((h) => (
                        <div key={h.id} className={styles.historyItem} onClick={() => loadItem(h)} role="button">
                          <div className={styles.historyTop}>
                            <div className={styles.historyTitle}>{previewLine(h.input, 70) || "(empty input)"}</div>
                            <div className={styles.historyActions}>
                              <span className={styles.miniTag}>{MODE_LABELS[h.mode]}</span>
                              <button
                                className={`${styles.iconBtn} ${styles.danger}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteItem(h.id);
                                }}
                                title="Delete this saved item"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className={styles.historyMeta}>
                            {fmtTime(h.ts)} • Output: {previewLine(h.output, 90)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
