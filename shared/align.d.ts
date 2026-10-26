export interface TimedWord {
  w: string;
  t: number;
}
export interface TimingCue {
  start: number;
  dur?: number;
  text: string;
  words?: { text: string; t: number }[];
}
export function round(n: number): number;
export function wordTimeline(cues: TimingCue[]): TimedWord[];
export function alignRows(lines: string[], timeline: TimedWord[]): { times: (number | null)[]; matched: number };
