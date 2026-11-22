"use client";

import { ChevronsUpDownIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useRef } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

/** What the browser is told about the operator: enough to show them, nothing more. */
export type OperatorSummary = Readonly<{
  name: string;
  email: string | null;
  initials: string;
  picture: string | null;
}>;

export function OperatorMenu({ operator }: { operator: OperatorSummary }) {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const signOut = useRef<HTMLFormElement>(null);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <OperatorAvatar operator={operator} />
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{operator.name}</span>
                {operator.email !== null && operator.email !== operator.name ? (
                  <span className="truncate text-xs text-muted-foreground">{operator.email}</span>
                ) : null}
              </span>
              <ChevronsUpDownIcon className="ml-auto size-4" aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2">
                <OperatorAvatar operator={operator} />
                <div className="grid text-sm leading-tight">
                  <span className="truncate font-medium">{operator.name}</span>
                  {operator.email !== null ? (
                    <span className="truncate text-xs text-muted-foreground">{operator.email}</span>
                  ) : null}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Appearance</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">
                <SunIcon aria-hidden /> Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <MoonIcon aria-hidden /> Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <MonitorIcon aria-hidden /> System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut.current?.requestSubmit()}>
              <LogOutIcon aria-hidden /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* A plain form: signing out is a POST, and it leaves the dashboard for Clavia. */}
        <form ref={signOut} method="post" action="/dashboard/auth/sign-out" hidden />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function OperatorAvatar({ operator }: { operator: OperatorSummary }) {
  return (
    <Avatar className="size-8 rounded-lg">
      {operator.picture !== null ? <AvatarImage src={operator.picture} alt="" /> : null}
      <AvatarFallback className="rounded-lg bg-primary/10 font-medium text-primary">{operator.initials}</AvatarFallback>
    </Avatar>
  );
}
