import "server-only";

import { cache } from "react";

import type { Client, ResourceServerAuthorization } from "@/contract";
import { isManagementError } from "@/core/management/errors";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

/** The API's authorization, read once per request by the layout and its tabs; null when it was never set up. */
export const authorizationOf = cache(async (apiId: string): Promise<ResourceServerAuthorization | null> => {
  const { api } = await signedIn();

  return load(
    api.authorization.get(apiId).catch((error: unknown) => {
      if (isManagementError(error, "not_found")) {
        return null;
      }
      throw error;
    }),
  );
});

/**
 * What a read from the decision engine came to. The engine's own refusals are the page's to
 * explain, not an error: the API has no store, the server names no engine, or the engine does not
 * answer now. A refused query (a page token, an object) is the form's to show.
 */
export type EngineRead<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; reason: "no_store" | "no_engine" | "unavailable" | "refused"; message: string }>;

export async function fromEngine<T>(read: Promise<T>): Promise<EngineRead<T>> {
  try {
    return { ok: true, value: await read };
  } catch (error) {
    if (isManagementError(error, "not_found")) {
      return { ok: false, reason: "no_store", message: "The API has no store: authorization was never turned on." };
    }
    if (isManagementError(error, "conflict")) {
      return { ok: false, reason: "no_engine", message: error.message };
    }
    if (isManagementError(error, "service_unavailable")) {
      return {
        ok: false,
        reason: "unavailable",
        message: "The decision engine does not answer now. Nothing is shown rather than a guess: try again later.",
      };
    }
    if (isManagementError(error, "invalid")) {
      return { ok: false, reason: "refused", message: error.fields[0]?.detail ?? error.message };
    }
    // An ended session, a step-up, or anything else: as every page read.
    return load(Promise.reject(error));
  }
}

/**
 * The applications that can speak for an API: first-party machine clients, which ask for
 * decisions with the client credentials grant. Read whole, a hundred at a time.
 */
export const machineClients = cache(async (): Promise<Client[]> => {
  const { api } = await signedIn();
  const found: Client[] = [];
  for (let page = 1; page <= 20; page++) {
    const { items, total, per_page } = await load(api.clients.list({ page, perPage: 100 }));
    found.push(...items);
    if (page * per_page >= total) {
      break;
    }
  }

  return found.filter(
    (client) =>
      client.is_first_party &&
      client.client_type === "confidential" &&
      client.grant_types.includes("client_credentials"),
  );
});
