"use client";

import { CheckIcon, UserPlusIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { type ActionState, IDLE } from "@/server/action-state";

import { findUsers, giveRole, type UserMatch } from "../../actions";

/** Find people by address and give them the role, several at once. */
export function AddHoldersDialog({ roleId, roleName }: { roleId: string; roleName: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<UserMatch[]>([]);
  const [chosen, setChosen] = useState<ReadonlyMap<string, UserMatch>>(new Map());
  const [searching, startSearch] = useTransition();
  const [state, setState] = useState<ActionState>(IDLE);
  const [pending, startTransition] = useTransition();
  useActionFeedback(state, () => {
    setOpen(false);
    setChosen(new Map());
    setSearch("");
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = setTimeout(() => startSearch(async () => setMatches(await findUsers(search))), 200);

    return () => clearTimeout(timer);
  }, [open, search]);

  const toggle = (user: UserMatch) =>
    setChosen((current) => {
      const next = new Map(current);
      if (next.has(user.id)) {
        next.delete(user.id);
      } else {
        next.set(user.id, user);
      }

      return next;
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlusIcon aria-hidden /> Add holders
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Give {roleName}</DialogTitle>
          <DialogDescription>Search by email, choose one or more people.</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} className="rounded-lg border">
          <CommandInput placeholder="Search by email…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              {searching ? "Searching…" : search.trim() === "" ? "Type to search." : "Nobody matches."}
            </CommandEmpty>
            {matches.length > 0 ? (
              <CommandGroup heading="People">
                {matches.map((user) => (
                  <CommandItem key={user.id} value={user.id} onSelect={() => toggle(user)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{user.name ?? user.email}</span>
                      {user.name !== null ? (
                        <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                      ) : null}
                    </span>
                    {chosen.has(user.id) ? <CheckIcon className="text-primary" aria-label="Chosen" /> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
        <DialogFooter className="items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">{chosen.size} chosen</span>
          <Button
            disabled={chosen.size === 0 || pending}
            onClick={() => startTransition(async () => setState(await giveRole(roleId, [...chosen.keys()])))}
          >
            {pending ? <Spinner /> : null}
            Give role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
