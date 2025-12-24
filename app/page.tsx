"use client";

import React, { useMemo, useState } from "react";

type Mode = "coach" | "drill" | "rebuttal" | "cx" | "flow";

export default function Page() {
  const [mode, setMode] = useState<Mode>("coach");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "LD Clash is live. Paste an AC/NC/1AR/2NR chunk (or opponent args) and pick a mode.",
    },
  ]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading]
  );

  async function send() {
    if (!canSend) return;
    setError(null);

    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, mode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");

      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.text || "(empty)" },
      ]);
    } catch (e: any) {
      setError(e?.message || "Something broke");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div>
            <div style={styles.title}>LD Clash</div>
            <div style={styles.subtitle}>
              Rubrics, clash, weighing, drills. No ghostwriting.
            </div>
          </div>

          <div style={styles.controls}>
            <label style={styles.label}>Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              style={styles.select}
              disabled={loading}
            >
              <option value="coach">Coach</option>
              <option value="drill">Drill</option>
              <option value="rebuttal">Rebuttal</option>
              <option value="cx">Cross-Ex</option>
              <option value="flow">Flow</option>
            </select>
          </div>
        </header>

        <main style={styles.chat}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                ...styles.bubble,
                ...(m.role === "user"
                  ? styles.userBubble
                  : styles.assistantBubble),
              }}
            >
              <div style={styles.role}>{m.role === "user" ? "You" : "Coach"}</div>
              <div style={styles.text}>{m.content}</div>
            </div>
          ))}

          {loading && (
            <div style={{ ...styles.bubble, ...styles.assistantBubble }}>
              <div style={styles.role}>Coach</div>
              <div style={styles.text}>Thinking…</div>
            </div>
          )}
        </main>

        <footer style={styles.footer}>
          {error && <div style={styles.error}>Error: {error}</div>}

          <div style={styles.inputRow}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`SIDE: (AFF/NEG) [optional]
SPEECH: (AC/NC/1AR/2NR) [optional]
TOPIC: [optional]
VC: (Value | Criterion) [optional]
OPP OFFENSE: (bullets) [optional]
MY TEXT: (paste your speech/blocks/args)
GOAL: (coach / flow / cx / drill) [optional]`}
              style={styles.textarea}
              rows={3}
              disabled={loading}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") send();
              }}
            />
            <button
              onClick={send}
              style={{
                ...styles.button,
                ...(canSend ? {} : styles.buttonDisabled),
              }}
              disabled={!canSend}
              title="Send (Ctrl/Cmd+Enter)"
            >
              Send
            </button>
          </div>

          <div style={styles.hint}>
            Tip: Ctrl/Cmd + Enter to send. Try <b>Flow</b> mode with opponent
            args.
          </div>
        </footer>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0b0f",
    color: "#f2f2f2",
    padding: 20,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  shell: {
    width: "min(920px, 96vw)",
    height: "min(860px, 92vh)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    overflow: "hidden",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 18px",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    gap: 14,
  },
  title: { fontSize: 22, fontWeight: 800, letterSpacing: 0.2 },
  subtitle: { fontSize: 13, opacity: 0.8, marginTop: 2 },
  controls: { display: "flex", alignItems: "center", gap: 10 },
  label: { fontSize: 12, opacity: 0.8 },
  select: {
    background: "rgba(255,255,255,0.06)",
    color: "#f2f2f2",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 10,
    padding: "8px 10px",
    outline: "none",
  },
  chat: {
    padding: 16,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  bubble: {
    borderRadius: 14,
    padding: "12px 12px",
    border: "1px solid rgba(255,255,255,0.10)",
    whiteSpace: "pre-wrap",
  },
  userBubble: {
    alignSelf: "flex-end",
    background: "rgba(99,102,241,0.14)",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    background: "rgba(255,255,255,0.06)",
  },
  role: { fontSize: 12, opacity: 0.75, marginBottom: 6 },
  text: { fontSize: 14, lineHeight: 1.45 },
  footer: {
    padding: 16,
    borderTop: "1px solid rgba(255,255,255,0.10)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  inputRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: 10 },
  textarea: {
    width: "100%",
    resize: "vertical",
    background: "rgba(255,255,255,0.06)",
    color: "#f2f2f2",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 12,
    padding: 10,
    outline: "none",
  },
  button: {
    background: "rgba(255,255,255,0.12)",
    color: "#f2f2f2",
    border: "1px solid rgba(255,255,255,0.20)",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
    height: "fit-content",
  },
  buttonDisabled: { opacity: 0.5, cursor: "not-allowed" },
  hint: { fontSize: 12, opacity: 0.75 },
  error: {
    fontSize: 12,
    color: "#ff6b6b",
    background: "rgba(255,0,0,0.08)",
    border: "1px solid rgba(255,0,0,0.20)",
    padding: "8px 10px",
    borderRadius: 12,
  },
};