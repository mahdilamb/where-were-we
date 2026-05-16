import { useEffect, useState } from "react";
import { loadGameIndex } from "./yaml";
import type { GameIndexEntry } from "./types";

type State =
  | { kind: "loading" }
  | { kind: "ready"; games: GameIndexEntry[] }
  | { kind: "error"; message: string };

export function Lobby() {
  const [state, setState] = useState<State>({ kind: "loading" });

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
        {state.kind === "ready" && (
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
        )}
        <footer className="lobby-foot">
          <p>
            Your progress is stored in the URL hash — copy the URL to save or share,
            including the start time so you'll see how long it's taken.
          </p>
        </footer>
      </main>
    </>
  );
}
