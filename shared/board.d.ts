export type NodeKind = "idea" | "stage" | "note" | "media" | "video" | "asset" | "list" | "metric";

export interface BoardItem {
  text: string;
  done?: boolean;
  by?: string;
}

export interface BoardNode {
  id: string;
  kind: NodeKind;
  title: string;
  text?: string;
  tag?: string;
  tags?: string[];
  images?: string[];
  video?: string;
  poster?: string;
  url?: string;
  file_type?: string;
  subtitle?: string;
  /** Where the content is published: icon keys (instagram, tiktok, youtube, shorts, spotify, applepodcasts, linkedin, whatsapp, substack, newsletter, app). */
  platforms?: string[];
  /** What publishing there does to reach. */
  reach?: string;
  items?: BoardItem[];
  value?: string;
  step?: number;
  progress?: number;
  by?: string;
  x?: number;
  y?: number;
  /** Width set by stretching the card; h is a minimum height (text always fits). */
  w?: number;
  h?: number;
}

export interface BoardEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export type MoodType = "image" | "note" | "todo" | "color" | "link" | "video" | "text" | "draw" | "shape";
export type ShapeKind = "rect" | "ellipse" | "triangle" | "line" | "arrow";

/** A moodboard item. Drawings and lines keep their points in a viewBox (vw × vh) scaled to the item box. */
export interface MoodItem {
  id: string;
  type: MoodType;
  x: number;
  y: number;
  w: number;
  h: number;
  src?: string;
  caption?: string;
  text?: string;
  title?: string;
  name?: string;
  url?: string;
  video?: string;
  poster?: string;
  color?: string;
  fill?: string;
  size?: string;
  shape?: ShapeKind;
  items?: BoardItem[];
  points?: number[];
  vw?: number;
  vh?: number;
  stroke?: number;
  rot?: number;
  flipX?: boolean;
  flipY?: boolean;
  /** Id of the mind map card this item was made from (dragged from the sidebar). */
  ref?: string;
  /** Lines/arrows: straight horizontal (h) or vertical (v) through the middle of the box. */
  axis?: "h" | "v";
}

export interface Board {
  id: string;
  title: string;
  idea: string;
  summary?: string;
  /** Set once a person moves cards by hand: new cards then find free space instead of re-laying out the map. */
  arranged?: boolean;
  /** Mind map direction; horizontal when unset. */
  layout?: "horizontal" | "vertical";
  accent: string;
  createdAt: number;
  updatedAt: number;
  nodes: BoardNode[];
  edges: BoardEdge[];
  mood?: { items: MoodItem[] };
}

export interface VideoInfo {
  provider: "instagram" | "youtube" | "tiktok" | "file";
  id: string;
  url: string;
  embed: string;
  /** Muted, looping, no-controls version for cards (autoplay where the provider allows it). */
  inline: string;
  /** Played inside the card after a click: sound and the provider's controls. */
  play: string;
  /** False for Instagram: its embeds never start on their own. */
  autoplay: boolean;
  poster: string | null;
}

export const KINDS: NodeKind[];
export const NODE_W: Record<NodeKind, number>;
export const MCP_INSTRUCTIONS: string;
export function estimateH(n: BoardNode): number;
export function newId(prefix?: string): string;
export function parseVideo(url: string | undefined): VideoInfo | null;
export function cleanNode(raw: unknown, fallbackId?: string): BoardNode;
export function normalizeBoard(raw: unknown): Board;
export function layoutBoard(board: Board, all?: boolean): Board;
export function addNodes(board: Board, list: unknown[]): BoardNode[];
export function connect(board: Board, edges: { from: string; to: string; label?: string }[]): BoardEdge[];
export function updateNode(board: Board, id: string, patch: Partial<BoardNode>): BoardNode | null;
export function removeItems(board: Board, nodeIds?: string[], edgeIds?: string[]): void;
export function outline(board: Board): { stages: { stage: BoardNode; items: BoardNode[] }[]; loose: BoardNode[] };
export const MOOD_TYPES: MoodType[];
export const SHAPES: ShapeKind[];
export function cleanMoodItem(raw: unknown): MoodItem;
export function addMoodItems(board: Board, list: unknown[]): MoodItem[];
export interface InstagramLink {
  key: string;
  /** Profile named in the link itself (instagram.com/name…). */
  user?: string;
  /** Post shortcode when the link is instagram.com/reel/CODE (author looked up later). */
  code?: string;
  type?: string;
  url: string;
  sources: { kind: "node" | "mood" | "board"; id: string; title: string }[];
}
export function instagramLinks(board: Board): InstagramLink[];
