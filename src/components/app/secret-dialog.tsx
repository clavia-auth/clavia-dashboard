"use client";

import { TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CopyButton } from "./copy-button";

/**
 * A secret, shown the one time Clavia hands it out: it is stored hashed and can only be
 * replaced, never read again. A client secret by default; `clientId` shows beside it.
 */
export function SecretDialog({
  clientId,
  secret,
  title = "Copy the client secret now",
  label = "Client secret",
  lost = "rotate it.",
  open,
  onDone,
}: {
  clientId?: string;
  secret: string;
  title?: string;
  label?: string;
  /** What to do if it is lost, finishing "Clavia keeps only a hash of it: if it is lost, …". */
  lost?: string;
  open: boolean;
  onDone: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDone()}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="flex gap-2">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-gold-foreground" aria-hidden />
            It is shown once. Clavia keeps only a hash of it: if it is lost, {lost}
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          {clientId !== undefined ? <Credential label="Client ID" value={clientId} /> : null}
          <Credential label={label} value={secret} />
        </dl>
        <DialogFooter>
          <Button onClick={onDone}>I have copied it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Credential({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
        <code className="min-w-0 flex-1 break-all font-mono text-xs">{value}</code>
        <CopyButton value={value} label={`Copy the ${label.toLowerCase()}`} />
      </dd>
    </div>
  );
}
