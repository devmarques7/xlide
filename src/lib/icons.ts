import {
  ArrowUpRight, Check, Clock, Eye, Globe, Heart, Languages, Layers, LayoutGrid, Loader, Monitor,
  Shield, Smartphone, Sparkles, Star, Target, ThumbsUp, Type, Users, Zap, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  loader: Loader,
  "thumbs-up": ThumbsUp,
  sparkles: Sparkles,
  layers: Layers,
  globe: Globe,
  zap: Zap,
  eye: Eye,
  target: Target,
  clock: Clock,
  users: Users,
  star: Star,
  check: Check,
  monitor: Monitor,
  smartphone: Smartphone,
  languages: Languages,
  type: Type,
  grid: LayoutGrid,
  shield: Shield,
  heart: Heart,
  arrow: ArrowUpRight,
};

export const ICON_NAMES = Object.keys(ICONS);
