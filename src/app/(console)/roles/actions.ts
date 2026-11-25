"use server";

import type { Route } from "next";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isManagementError } from "@/core/management/errors";
import { type ActionState, parse, perform } from "@/server/actions";
import { signedIn } from "@/server/operator";

const roleSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(100),
  description: z.string().trim().max(500),
});

const updateSchema = roleSchema.extend({ provisionable: z.boolean() });

export async function createRole(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parse(roleSchema, { name: form.get("name"), description: form.get("description") ?? "" });
  if (!parsed.ok) {
    return parsed.state;
  }
  let created: string | undefined;
  const state = await perform(async ({ api }) => {
    // Whether a directory's group may grant it is set from the role's page, once there are permissions to judge.
    created = (await api.roles.create({ ...parsed.data, provisionable: false })).id;

    return `Created ${parsed.data.name}.`;
  });
  if (created !== undefined) {
    redirect(`/roles/${created}/permissions` as Route);
  }

  return state;
}

export async function updateRole(roleId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parse(updateSchema, {
    name: form.get("name"),
    description: form.get("description") ?? "",
    // A switch Clavia would refuse (the role holds a Management API permission) is shown off and disabled.
    provisionable: form.get("provisionable") === "on",
  });
  if (!parsed.ok) {
    return parsed.state;
  }

  return perform(async ({ api }) => {
    await api.roles.update(roleId, parsed.data);
    refresh();

    return "Role saved.";
  });
}

const referencesSchema = z
  .array(z.object({ resource_server_id: z.string().min(1).max(64), value: z.string().min(1).max(280) }))
  .max(500);

export async function saveRolePermissions(
  roleId: string,
  permissions: { resource_server_id: string; value: string }[],
): Promise<ActionState> {
  const parsed = parse(referencesSchema, permissions);
  if (!parsed.ok) {
    return parsed.state;
  }

  return perform(async ({ api }) => {
    await api.roles.update(roleId, { permissions: parsed.data });
    refresh();

    return "Permissions saved.";
  });
}

export async function giveRole(roleId: string, userIds: string[]): Promise<ActionState> {
  const parsed = parse(z.array(z.string().min(1).max(64)).min(1).max(100), userIds);
  if (!parsed.ok) {
    return parsed.state;
  }

  return perform(async ({ api }) => {
    await api.roles.give(roleId, parsed.data);
    refresh();

    return parsed.data.length === 1 ? "Role given." : `Role given to ${parsed.data.length} users.`;
  });
}

export async function takeRole(roleId: string, userId: string): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.roles.take(roleId, userId);
    refresh();

    return "Role taken away.";
  });
}

export async function deleteRole(roleId: string): Promise<ActionState> {
  const state = await perform(async ({ api }) => {
    await api.roles.delete(roleId);

    return "Role deleted.";
  });
  if (state.status === "success") {
    redirect("/roles");
  }

  return state;
}

export type UserMatch = Readonly<{ id: string; email: string; name: string | null }>;

/** Accounts whose address contains `search`, for picking holders — at most ten. */
export async function findUsers(search: string): Promise<UserMatch[]> {
  const { api, operator } = await signedIn();
  const query = search.trim().slice(0, 200);
  if (!operator.can("read:users") || query === "") {
    return [];
  }
  try {
    const page = await api.users.list({ search: query, perPage: 10 });

    return page.items.map((user) => ({ id: user.id, email: user.email, name: user.name }));
  } catch (error) {
    if (isManagementError(error)) {
      return [];
    }
    throw error;
  }
}
