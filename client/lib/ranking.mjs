// Ranks players for the scoreboards. Players who are still in the game are ranked by score (equal scores share a
// rank). Players who have left are listed after them with no rank, so someone who walked away cannot show up as the
// winner or push a player who stayed down the table.
export function rankPlayers(players) {
  const active = players.filter((p) => !p.left).sort((a, b) => b.score - a.score);
  const ranked = active.map((p) => ({ ...p, rank: active.findIndex((q) => q.score === p.score) + 1 }));
  const gone = players.filter((p) => p.left).sort((a, b) => b.score - a.score).map((p) => ({ ...p, rank: null }));
  return [...ranked, ...gone];
}
