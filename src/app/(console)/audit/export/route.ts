import { type NextRequest, NextResponse } from "next/server";

import { auditCsvHeader, auditCsvRow } from "@/components/audit/csv";
import type { AuditEvent, Page } from "@/contract";
import type { AuditQuery } from "@/core/management/management-api";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { queryFrom, type Search } from "../query";

/** Clavia's largest page: the fewest round trips for a log that can be long. */
const PAGE_SIZE = 100;
const BOM = "﻿";

const FILTERS = [
  "type",
  "outcome",
  "period",
  "target_type",
  "target_id",
  "actor_user_id",
  "client_id",
] as const satisfies readonly (keyof Search)[];

/**
 * The audit log as a CSV file, with the filters of the page it was asked from. It is streamed:
 * a page of events is read from Clavia, written, and only then the next is read, so neither the
 * server nor the browser ever holds the file. Events are cut off at the moment the export
 * began, so new ones do not shift the pages under it.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { api, operator } = await signedIn();
  if (!operator.can("read:audit_events")) {
    return new NextResponse("Your roles do not grant read:audit_events, which the export needs.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const search: Search = {};
  for (const key of FILTERS) {
    const value = request.nextUrl.searchParams.get(key);
    if (value !== null) {
      search[key] = value;
    }
  }
  const started = new Date();
  const filters: AuditQuery = { ...queryFrom(search), perPage: PAGE_SIZE, until: started };
  const read = (page: number): Promise<Page<AuditEvent>> => api.auditEvents.list({ ...filters, page });

  // The first page is read before answering, so a refusal is a status and not a broken download.
  const first = await load(read(1));
  const encoder = new TextEncoder();
  let page = first;
  let sent = 0;

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(BOM + auditCsvHeader()));
    },
    async pull(controller) {
      try {
        if (page.items.length === 0 || sent >= page.total) {
          controller.close();

          return;
        }
        controller.enqueue(encoder.encode(page.items.map(auditCsvRow).join("")));
        sent += page.items.length;
        if (sent >= page.total) {
          controller.close();

          return;
        }
        page = await read(page.page + 1);
      } catch (error) {
        // Headers are gone: failing the stream makes the download fail rather than end short.
        controller.error(error);
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${started.toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
