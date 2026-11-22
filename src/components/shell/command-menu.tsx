"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";

import type { Section } from "./navigation";
import { SectionIcon } from "./section-icon";

/** ⌘K / Ctrl+K: jump anywhere the operator may go, without the mouse. */
export function CommandMenu({ sections }: { sections: readonly Section[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-full justify-start gap-2 text-muted-foreground sm:w-64"
        onClick={() => setOpen(true)}
      >
        <SearchIcon aria-hidden />
        <span className="flex-1 text-left">Go to…</span>
        <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Go to" description="Jump to a section">
        <Command>
          <CommandInput placeholder="Where to?" />
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandGroup heading="Sections">
              {sections.map((section) => (
                <CommandItem
                  key={section.href}
                  value={`${section.title} ${section.description}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(section.href);
                  }}
                >
                  <SectionIcon icon={section.icon} />
                  <span>{section.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{section.description}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
