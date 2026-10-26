// Lyrics timing: the words of a recording with their times, and lyric rows
// placed on them. Plain JS, shared by the server (api/_music.js) and the app.

export const round = (n) => Math.round(n * 100) / 100;

const normWord = (w) => String(w).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const normWords = (s) => String(s).split(/\s+/).map(normWord).filter(Boolean);

/**
 * Every word of a video with the second it is sung: [{ w, t }]. Automatic captions
 * time each word; other cues (people's captions, transcript services) spread
 * their words over the cue by length, which is within a fraction of a second.
 */
export function wordTimeline(cues) {
  const out = [];
  cues.forEach((c, i) => {
    if (c.words?.length) {
      for (const x of c.words) for (const w of normWords(x.text)) out.push({ w, t: x.t });
      return;
    }
    const ws = String(c.text).split(/\s+/).filter(Boolean);
    if (!ws.length) return;
    const end = c.dur > 0 ? c.start + c.dur : (cues[i + 1]?.start ?? c.start + ws.length * 0.4);
    const span = Math.max(0.2, Math.min(end - c.start, ws.length * 0.8));
    const total = ws.reduce((n, w) => n + w.length + 1, 0);
    let at = 0;
    for (const raw of ws) {
      const w = normWord(raw);
      if (w) out.push({ w, t: c.start + (at / total) * span });
      at += raw.length + 1;
    }
  });
  return out.sort((a, b) => a.t - b.t);
}

/** Same word, allowing the small slips of automatic captions ("senhor"/"senhora", "tu"/"tú"). */
const sameWord = (a, b) => !!a && !!b && (a === b || (a.length > 3 && b.length > 3 && a.slice(0, 4) === b.slice(0, 4)));

/**
 * Times each lyric row by finding its words, in order, in the video's word
 * timeline: the row starts when its first words are sung. Rows that cannot be
 * found (sung differently, or not at all) are placed between their neighbours.
 * Returns { times, matched } — matched is the share of rows found by their words.
 */
export function alignRows(lines, timeline) {
  const times = lines.map(() => null);
  let p = 0;
  let found = 0;
  let rows = 0;
  lines.forEach((line, i) => {
    const lw = normWords(line);
    if (!lw.length) return;
    rows++;
    const k = Math.min(lw.length, 5);
    let best = -1;
    let bestScore = 0;
    // Search ahead of the last match only, so a chorus sung again lands on its next repeat.
    for (let s = p; s < Math.min(timeline.length, p + 120); s++) {
      let hit = 0;
      // Each word may sit one place early or late (a word the captions missed or added).
      for (let j = 0; j < k; j++) if ([0, -1, 1].some((d) => sameWord(timeline[s + j + d]?.w, lw[j]))) hit++;
      if (!sameWord(timeline[s]?.w, lw[0]) && !sameWord(timeline[s]?.w, lw[1])) continue;
      const score = hit / k - (s - p) * 0.001;
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    if (best >= 0 && bestScore >= 0.6) {
      times[i] = round(timeline[best].t);
      p = best + Math.max(1, lw.length - 1);
      found++;
    }
  });
  // Rows not found sit evenly between the found rows around them.
  const idx = lines.map((l, i) => i).filter((i) => normWords(lines[i]).length);
  for (let a = 0; a < idx.length; a++) {
    if (times[idx[a]] != null) continue;
    let b = a;
    while (b < idx.length && times[idx[b]] == null) b++;
    const left = a > 0 ? times[idx[a - 1]] : Math.max(0, (times[idx[b]] ?? 0) - 3 * (b - a));
    const right = b < idx.length ? times[idx[b]] : left + 3 * (b - a + 1);
    for (let c = a; c < b; c++) times[idx[c]] = round(left + ((right - left) * (c - a + 1)) / (b - a + 1));
    a = b;
  }
  return { times, matched: rows ? found / rows : 0 };
}
