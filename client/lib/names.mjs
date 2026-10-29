// Short display names for tight spaces (live board, result table, podium, lists).
// People are recognised by first name, so "Kalpana Srivastava" shows as "Kalpana". When two players would look the
// same, only those players get more detail: first name + the initial of the next word ("Sangeeta P." / "Sangeeta S."),
// then the full name, and finally a number if two people typed exactly the same name.

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

// First visible character, so a Devanagari conjunct like "श्री" is not cut in half.
function initial(word) {
  if (segmenter) for (const { segment } of segmenter.segment(word)) return segment;
  return [...word][0] ?? '';
}

const key = (s) => s.toLowerCase();

export function displayNames(players) {
  const people = players.map((p) => {
    const parts = String(p.name ?? '').trim().split(/\s+/).filter(Boolean);
    return { id: p.id, parts, full: parts.join(' ') || String(p.name ?? '') };
  });

  const byFirst = new Map();
  for (const p of people) {
    const k = key(p.parts[0] ?? '');
    byFirst.set(k, [...(byFirst.get(k) ?? []), p]);
  }

  const label = new Map();
  for (const group of byFirst.values()) {
    if (group.length === 1) {
      label.set(group[0].id, group[0].parts[0] ?? group[0].full);
      continue;
    }
    // Step 1: first name + initial of the next word.
    const step1 = new Map(group.map((p) => [p.id, p.parts[1] ? `${p.parts[0]} ${initial(p.parts[1])}.` : p.parts[0]]));
    const counts = new Map();
    for (const l of step1.values()) counts.set(key(l), (counts.get(key(l)) ?? 0) + 1);
    // Step 2: only the players still colliding get their full name.
    for (const p of group) label.set(p.id, counts.get(key(step1.get(p.id))) > 1 ? p.full : step1.get(p.id));
    // Step 3: people who typed exactly the same name are numbered in joining order. The number goes on the SHORT
    // name ("Kalpana (2)"), because a number after a long full name is the first thing a narrow chip would cut off.
    const finalCounts = new Map();
    for (const p of group) finalCounts.set(key(label.get(p.id)), (finalCounts.get(key(label.get(p.id))) ?? 0) + 1);
    const numbered = new Map();
    for (const p of group) {
      const k = key(label.get(p.id));
      if (finalCounts.get(k) > 1) {
        const n = (numbered.get(k) ?? 0) + 1;
        numbered.set(k, n);
        label.set(p.id, `${p.parts[0] ?? p.full} (${n})`);
      }
    }
  }
  return label;
}
