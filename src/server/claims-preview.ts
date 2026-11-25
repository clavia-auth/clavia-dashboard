"use server";

import { type ClaimDraft, claimsFor, type ClaimsPreview, type ClaimSubject, mappingsOf } from "@/core/claims/claims";
import { perform } from "@/server/actions";

/** What the preview is for: an API's access tokens (by its id), or an application's ID tokens and userinfo. */
export type PreviewTarget = Readonly<{ kind: "api"; apiId: string }> | Readonly<{ kind: "application" }>;

/**
 * The claims the rows being edited would give one person, worked out from the account as it is
 * now with the same rules Clavia applies. Nothing is saved: it is a way to see a mapping
 * before it reaches a token. `search` names the person by their address.
 */
export async function previewClaims(
  target: PreviewTarget,
  search: string,
  drafts: readonly ClaimDraft[],
): Promise<ClaimsPreview> {
  const application = target.kind === "application";
  const parsed = mappingsOf(drafts, application);
  if (!parsed.ok) {
    return { status: "error", message: "Finish the claims first: one of them is not complete yet." };
  }
  const query = search.trim();
  if (query === "") {
    return { status: "error", message: "Enter the address of the person to preview." };
  }

  let preview: ClaimsPreview = { status: "idle" };
  const state = await perform(async ({ api }) => {
    const found = await api.users.list({ search: query, perPage: 10 });
    const user =
      found.items.find((candidate) => candidate.email.toLowerCase() === query.toLowerCase()) ??
      (found.items.length === 1 ? found.items[0] : undefined);
    if (user === undefined) {
      preview = {
        status: "error",
        message:
          found.items.length === 0
            ? `No user matches “${query}”.`
            : `${found.total} users match “${query}”: enter the full address.`,
      };

      return "";
    }
    // An API is told only the roles that grant a permission on it; an application, all of them.
    const roles =
      target.kind === "api"
        ? (await api.users.permissions(user.id))
            .filter((permission) => permission.resource_server_id === target.apiId)
            .flatMap((permission) => permission.roles.map((role) => role.name))
        : (await api.users.roles(user.id)).map((role) => role.name);
    const subject: ClaimSubject = {
      email: user.email,
      email_verified: user.email_verified,
      connection: user.connection,
      profile: {
        name: user.name,
        given_name: user.given_name,
        family_name: user.family_name,
        nickname: user.nickname,
        picture: user.picture,
        locale: user.locale,
      },
      app_metadata: user.app_metadata,
      roles: [...new Set(roles)],
    };
    preview = {
      status: "success",
      person: user.name ?? user.email,
      sections:
        target.kind === "api"
          ? [{ title: "Access token and introspection", claims: claimsFor(parsed.mappings, subject) }]
          : [
              { title: "ID token", claims: claimsFor(parsed.mappings, subject, "id_token") },
              { title: "Userinfo", claims: claimsFor(parsed.mappings, subject, "userinfo") },
            ],
    };

    return "";
  });

  return state.status === "error" ? { status: "error", message: state.message } : preview;
}
