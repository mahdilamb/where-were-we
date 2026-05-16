import { Lobby } from "./Lobby";
import { Game } from "./Game";
import { parseHash } from "./state";
import { useHash } from "./useHash";

export default function App() {
  const hash = useHash();
  const parsed = parseHash(hash);

  if (parsed.route === "game" && parsed.slug) {
    return <Game key={parsed.slug} slug={parsed.slug} />;
  }
  return <Lobby />;
}
