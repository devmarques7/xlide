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
  items?: BoardItem[];
  value?: string;
  step?: number;
  progress?: number;
  by?: string;
  x?: number;
  y?: number;
}

export interface BoardEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface Board {
  id: string;
  title: string;
  idea: string;
  summary?: string;
  /** Set once a person moves cards by hand: new cards then find free space instead of re-laying out the map. */
  arranged?: boolean;
  accent: string;
  createdAt: number;
  updatedAt: number;
  nodes: BoardNode[];
  edges: BoardEdge[];
}

export interface VideoInfo {
  provider: "instagram" | "youtube" | "tiktok" | "file";
  id: string;
  url: string;
  embed: string;
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
