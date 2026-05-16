import { useEffect, useState } from "react";
import { loadAllProgress, type SavedProgress } from "./state";
import type { GameIndexEntry } from "./types";
import { loadGameIndex } from "./yaml";

type State =
  | { kind: "loading" }
  | { kind: "ready"; games: GameIndexEntry[] }
  | { kind: "error"; message: string };

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ProgressCard({ g, p }: { g: GameIndexEntry; p: SavedProgress }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor(Date.now() / 1000) - p.startSec)
  );

  useEffect(() => {
    if (p.foundCount >= p.totalCount) return;
    const id = window.setInterval(
      () => setElapsed(Math.max(0, Math.floor(Date.now() / 1000) - p.startSec)),
      1000
    );
    return () => window.clearInterval(id);
  }, [p.startSec, p.foundCount, p.totalCount]);

  const done = p.foundCount >= p.totalCount;

  return (
    <a className={`game-card resume-card${done ? " done" : ""}`} href={p.hash}>
      <div className="resume-label">{done ? "✓ Completed" : "In progress"}</div>
      <h2>{g.name}</h2>
      <p>{g.description}</p>
      <div className="resume-meta">
        <span className="count">
          {p.foundCount} / {p.totalCount}
        </span>
        <span className="timer">{formatElapsed(elapsed)}</span>
      </div>
    </a>
  );
}

export function Lobby() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [progress] = useState<Record<string, SavedProgress>>(() => loadAllProgress());

  useEffect(() => {
    let cancelled = false;
    loadGameIndex()
      .then((games) => {
        if (!cancelled) setState({ kind: "ready", games });
      })
      .catch((err) => {
        if (!cancelled) setState({ kind: "error", message: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resumable =
    state.kind === "ready"
      ? state.games.filter((g) => progress[g.slug]?.foundCount > 0)
      : [];

  return (
    <>
      <header className="lobby-header">
        <h1>
          Where Were We<span aria-hidden="true">?</span>
        </h1>
        <p className="tagline">
          Geography guessing games — type names, watch the map fill in.
        </p>
      </header>
      <main className="lobby">
        {state.kind === "loading" && <div className="game-list">Loading games…</div>}
        {state.kind === "error" && (
          <p className="err">Couldn't load games: {state.message}</p>
        )}

        {resumable.length > 0 && (
          <section className="lobby-section">
            <h2 className="section-title">Continue playing</h2>
            <div className="game-list">
              {resumable.map((g) => (
                <ProgressCard key={g.slug} g={g} p={progress[g.slug]} />
              ))}
            </div>
          </section>
        )}

        {state.kind === "ready" && (
          <section className="lobby-section">
            {resumable.length > 0 && (
              <h2 className="section-title">All games</h2>
            )}
            <div className="game-list">
              {state.games.map((g) => (
                <a
                  key={g.slug}
                  className="game-card"
                  href={`#/${encodeURIComponent(g.slug)}`}
                >
                  <h2>{g.name}</h2>
                  <p>{g.description}</p>
                  <span className="count">{g.count} to find</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <footer className="lobby-foot">
          <p>
            Progress is saved automatically — pick up where you left off any time.
          </p>
        </footer>
      </main>
    </>
  );
}
