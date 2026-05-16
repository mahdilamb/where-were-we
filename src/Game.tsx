import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapView } from "./MapView";
import { candidateKeys, normalize } from "./match";
import {
  bitsetFromIndices,
  buildHash,
  indicesFromBitset,
  parseHash,
  setHash,
  stableSortedOrder,
} from "./state";
import type { GameDefinition, GameItem } from "./types";
import { loadGame } from "./yaml";

interface Props {
  slug: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; game: GameDefinition };

interface Feedback {
  message: string;
  cls: "hit" | "miss" | "dup" | "win" | "end";
  // monotonic id so identical messages still re-trigger animations
  id: number;
}

export function Game({ slug }: Props) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    loadGame(slug)
      .then((game) => {
        if (!cancelled) setState({ kind: "ready", game });
      })
      .catch((err) => {
        if (!cancelled) setState({ kind: "error", message: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.kind === "loading") {
    return (
      <div className="loading">
        Loading <code>{slug}</code>…
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="err">
        Couldn't load game: {state.message}
        <p>
          <a href="#/lobby">← back to lobby</a>
        </p>
      </div>
    );
  }
  return <PlayableGame game={state.game} slug={slug} />;
}

function PlayableGame({ game, slug }: { game: GameDefinition; slug: string }) {
  const lookup = useMemo(() => {
    const m = new Map<string, number>();
    game.items.forEach((item, idx) => {
      for (const key of candidateKeys(item.name, item.aliases)) {
        if (!m.has(key)) m.set(key, idx);
      }
    });
    return m;
  }, [game]);

  const sortedOrder = useMemo(() => stableSortedOrder(game.items), [game]);

  // Initial state from URL hash (only on first mount per game).
  const initial = useMemo(() => parseHash(window.location.hash), [game]); // eslint-disable-line react-hooks/exhaustive-deps

  const [startSec] = useState<number>(
    () => initial.startSec ?? Math.floor(Date.now() / 1000)
  );
  const [found, setFound] = useState<Set<number>>(
    () =>
      initial.foundBits && initial.foundBits.length
        ? indicesFromBitset(initial.foundBits, sortedOrder)
        : new Set()
  );
  const [missed, setMissed] = useState<Set<number>>(() => new Set());
  const [gaveUp, setGaveUp] = useState(false);
  const [focusItem, setFocusItem] = useState<GameItem | null>(null);
  const [flashItem, setFlashItem] = useState<GameItem | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [guess, setGuess] = useState("");
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor(Date.now() / 1000) - startSec)
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackId = useRef(0);

  // Commit start time to URL immediately if missing.
  useEffect(() => {
    if (initial.startSec === undefined) {
      setHash(buildHash(slug, startSec), true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist progress to URL whenever found changes.
  useEffect(() => {
    const bits = bitsetFromIndices(found, sortedOrder);
    setHash(buildHash(slug, startSec, bits), true);
  }, [found, slug, startSec, sortedOrder]);

  // Timer
  const won = found.size === game.items.length;
  useEffect(() => {
    if (won || gaveUp) return;
    const id = window.setInterval(() => {
      setElapsed(Math.max(0, Math.floor(Date.now() / 1000) - startSec));
    }, 1000);
    return () => window.clearInterval(id);
  }, [won, gaveUp, startSec]);

  // Auto-dismiss transient feedback
  useEffect(() => {
    if (!feedback) return;
    if (feedback.cls === "win" || feedback.cls === "end") return;
    const id = window.setTimeout(() => setFeedback(null), 2200);
    return () => window.clearTimeout(id);
  }, [feedback]);

  // On completion, set the win feedback
  useEffect(() => {
    if (won && !gaveUp) {
      setFeedback({
        message: `🎉 All ${game.items.length} found in ${formatElapsed(elapsed)} — well played!`,
        cls: "win",
        id: ++feedbackId.current,
      });
    }
    // We only want to fire this once when `won` flips true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const onSubmit = useCallback(
    (ev: FormEvent) => {
      ev.preventDefault();
      if (won || gaveUp) return;
      const raw = guess;
      const norm = normalize(raw);
      if (!norm) return;
      const idx = lookup.get(norm);
      if (idx === undefined) {
        setFeedback({
          message: `“${raw.trim()}” — no match`,
          cls: "miss",
          id: ++feedbackId.current,
        });
        inputRef.current?.select();
        return;
      }
      if (found.has(idx)) {
        setFeedback({
          message: `Already found: ${game.items[idx].name}`,
          cls: "dup",
          id: ++feedbackId.current,
        });
        setGuess("");
        return;
      }
      const next = new Set(found);
      next.add(idx);
      const item = game.items[idx];
      setFound(next);
      setFlashItem(item);
      setFocusItem(item);
      setFeedback({
        message: `✓ ${item.name}`,
        cls: "hit",
        id: ++feedbackId.current,
      });
      setGuess("");
    },
    [guess, found, lookup, game.items, won, gaveUp]
  );

  const onGiveUp = useCallback(() => {
    if (gaveUp || won) return;
    if (!window.confirm("Reveal all remaining items? This ends the game.")) return;
    const missedSet = new Set<number>();
    for (let i = 0; i < game.items.length; i++) {
      if (!found.has(i)) missedSet.add(i);
    }
    setMissed(missedSet);
    setGaveUp(true);
    setFeedback({
      message: `Game over — ${found.size} of ${game.items.length} found in ${formatElapsed(elapsed)}`,
      cls: "end",
      id: ++feedbackId.current,
    });
  }, [found, gaveUp, won, game.items.length, elapsed]);

  const onRestart = useCallback(() => {
    if (!window.confirm("Reset progress and timer?")) return;
    setHash(buildHash(slug), false);
    window.location.reload();
  }, [slug]);

  return (
    <div className="game">
      <header className="game-bar">
        <a className="back" href="#/lobby" title="Back to lobby">
          ←
        </a>
        <div className="game-title">
          <h1>{game.name}</h1>
          <p>{game.description}</p>
        </div>
        <div className="game-meta">
          <span className="score">
            <b>{found.size}</b> / <b>{game.items.length}</b>
          </span>
          <span className="timer" aria-label="elapsed time">
            {formatElapsed(elapsed)}
          </span>
        </div>
      </header>
      <MapView
        game={game}
        found={found}
        missed={missed}
        focusItem={focusItem}
        flashItem={flashItem}
      />
      <form className="guess-form" onSubmit={onSubmit} autoComplete="off">
        <input
          ref={inputRef}
          type="text"
          placeholder={won || gaveUp ? "Game over" : "Type a name…"}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          disabled={won || gaveUp}
          autoFocus
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Guess a name"
        />
        <button
          type="button"
          className="ghost"
          onClick={onGiveUp}
          disabled={won || gaveUp}
          title="Reveal everything you missed"
        >
          Give up
        </button>
        <button
          type="button"
          className="ghost"
          onClick={onRestart}
          title="Reset progress and timer"
        >
          Restart
        </button>
      </form>
      <div
        className={`feedback ${feedback ? `show ${feedback.cls}` : ""}`}
        aria-live="polite"
      >
        {feedback?.message ?? ""}
      </div>
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
