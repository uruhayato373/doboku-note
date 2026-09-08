import { Blocks, Mountain, Route, Waves, ClipboardCheck, ShieldCheck, BadgeCheck, Leaf, Wrench, TrainFrontTunnel, ChartNoAxesCombined, Users, Network, HardHat, Globe } from 'lucide-react';

const icons = {
  concrete: Blocks, 'earthwork-foundations': Mountain, roads: Route,
  'rivers-disaster-prevention': Waves, 'construction-management': ClipboardCheck,
  'safety-laws': ShieldCheck, 'quality-management': BadgeCheck,
  'environment-decarbonization': Leaf, 'maintenance-asset-management': Wrench,
  tunnels: TrainFrontTunnel, 'economic-management': ChartNoAxesCombined,
  'human-resource-management': Users, 'information-management': Network,
  'safety-management-cem': HardHat, 'social-environment-management': Globe,
};
export default function TopicIcon({ slug }: { slug: string }) {
  const Icon = icons[slug as keyof typeof icons] ?? Blocks;
  return <Icon size={28} aria-hidden="true" className="mb-4 text-[var(--accent)]" />;
}
