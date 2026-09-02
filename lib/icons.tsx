import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BookOpen,
  Box,
  Compass,
  KeyRound,
  LifeBuoy,
  LineChart,
  Lock,
  Mic,
  Play,
  Rocket,
  Search,
  Server,
  Settings,
  Shield,
  Sparkles,
  Terminal,
} from 'lucide-react';
import type { ReactNode } from 'react';

const icons: Record<string, LucideIcon> = {
  activity: Activity,
  book: BookOpen,
  box: Box,
  compass: Compass,
  'life-buoy': LifeBuoy,
  'line-chart': LineChart,
  mic: Mic,
  play: Play,
  rocket: Rocket,
  search: Search,
  server: Server,
  settings: Settings,
  shield: Shield,
  sparkles: Sparkles,
  terminal: Terminal,
  key: KeyRound,
  lock: Lock,
};

/** Resolve a fumadocs `icon` value (e.g. `lucide:rocket`) into a lucide icon. */
export function iconResolver(icon: string | undefined): ReactNode {
  if (!icon) return undefined;
  const name = icon.split(':').pop();
  if (!name) return undefined;
  const Cmp = icons[name];
  if (!Cmp) return undefined;
  return <Cmp className="size-4" aria-hidden />;
}
