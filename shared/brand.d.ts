export const WEIGHT_NAMES: Record<number, string>;
export function cleanFamily(v: unknown): string | undefined;
export function parseWeights(v: unknown, fallback?: number[]): number[];
export function fontCssUrl(family: string, weights?: number[]): { source: "google" | "fontshare"; url: string };
export function moodFonts(items: { type: string; font?: string; weight?: number; weights?: string; title?: string }[] | undefined): { family: string; weights: number[] }[];
export function luminance(c: string): number;
export function contrast(a: string, b: string): number;
export function bestOn(bg: string, palette: string[]): string;
export function brandSheet(brand: unknown, existing?: unknown[]): unknown[];
