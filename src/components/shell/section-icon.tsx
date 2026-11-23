import {
  AppWindowIcon,
  BoxesIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  type LucideProps,
  PlugIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  TicketIcon,
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
  keys: KeyRoundIcon,
  tokens: TicketIcon,
  audit: ScrollTextIcon,
} as const;

export function SectionIcon({ icon, ...props }: { icon: Section["icon"] } & LucideProps) {
  const Icon = ICONS[icon];

  return <Icon aria-hidden {...props} />;
}
