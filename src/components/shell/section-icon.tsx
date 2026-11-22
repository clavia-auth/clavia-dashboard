import {
  AppWindowIcon,
  BoxesIcon,
  LayoutDashboardIcon,
  type LucideProps,
  PlugIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";

import type { Section } from "./navigation";

const ICONS = {
  overview: LayoutDashboardIcon,
  users: UsersIcon,
  applications: AppWindowIcon,
  apis: BoxesIcon,
  roles: ShieldCheckIcon,
  connections: PlugIcon,
  audit: ScrollTextIcon,
} as const;

export function SectionIcon({ icon, ...props }: { icon: Section["icon"] } & LucideProps) {
  const Icon = ICONS[icon];

  return <Icon aria-hidden {...props} />;
}
