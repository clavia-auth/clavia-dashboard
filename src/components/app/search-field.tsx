"use client";

import { SearchIcon, XIcon } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";

/**
 * A search box that drives `?q=` as the operator types — debounced, back to page 1, the
 * URL kept shareable — and shows a spinner while the results stream in.
 */
export function SearchField({ placeholder, label }: { placeholder: string; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const search = (next: string, delay: number) => {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const query = new URLSearchParams(params);
      query.delete("page");
      if (next.trim() === "") {
        query.delete("q");
      } else {
        query.set("q", next.trim());
      }
      const qs = query.toString();
      startTransition(() => router.replace((qs === "" ? pathname : `${pathname}?${qs}`) as Route, { scroll: false }));
    }, delay);
  };

  return (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>{pending ? <Spinner /> : <SearchIcon aria-hidden />}</InputGroupAddon>
      <InputGroupInput
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        maxLength={200}
        onChange={(event) => search(event.target.value, 250)}
      />
      {value !== "" ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="Clear the search" onClick={() => search("", 0)}>
            <XIcon aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
