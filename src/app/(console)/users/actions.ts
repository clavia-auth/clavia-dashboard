"use server";

import type { Route } from "next";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isManagementError, ManagementError } from "@/core/management/errors";
import { type ActionState, parse, perform } from "@/server/actions";

/**
 * What an operator can do to an account. Every action re-reads the operator and goes
 * through the Management API, which checks their scope again; the page only decided what
 * to offer.
 */

const optional = z
  .string()
  .trim()
  .max(255)
  .transform((value) => (value === "" ? null : value));

const createSchema = z.object({
  email: z.email("Enter an email address.").trim().max(254),
  password: z.string().min(8, "At least 8 characters.").max(72, "At most 72 characters."),
  name: optional,
  connection: z.string().trim().min(1).max(64).optional(),
  email_verified: z.boolean(),
});

export async function createUser(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parse(createSchema, {
    email: form.get("email"),
    password: form.get("password"),
    name: form.get("name") ?? "",
    connection: form.get("connection") || undefined,
    email_verified: form.get("email_verified") === "on",
  });
  if (!parsed.ok) {
    return parsed.state;
  }
  const { name, ...user } = parsed.data;
  let created: string | undefined;
  const state = await perform(async ({ api }) => {
    created = (await api.users.create({ ...user, is_active: true, ...(name === null ? {} : { name }) })).id;

    return `Created ${user.email}.`;
  });
  if (created !== undefined) {
    redirect(`/users/${created}` as Route);
  }

  return state;
}

const profileSchema = z.object({
  email: z.email("Enter an email address.").trim().max(254),
  email_verified: z.boolean(),
  name: optional,
  given_name: optional,
  family_name: optional,
  nickname: optional,
  picture: optional.pipe(z.url("Enter a URL.").nullable()),
  locale: optional,
});

export async function updateProfile(userId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parse(profileSchema, {
    email: form.get("email"),
    email_verified: form.get("email_verified") === "on",
    name: form.get("name") ?? "",
    given_name: form.get("given_name") ?? "",
    family_name: form.get("family_name") ?? "",
    nickname: form.get("nickname") ?? "",
    picture: form.get("picture") ?? "",
    locale: form.get("locale") ?? "",
  });
  if (!parsed.ok) {
    return parsed.state;
  }

  return perform(async ({ api }) => {
    await api.users.update(userId, parsed.data);
    refresh();

    return "Profile saved.";
  });
}

const passwordSchema = z.object({
  password: z.string().min(8, "At least 8 characters.").max(72, "At most 72 characters."),
});

export async function setPassword(userId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parse(passwordSchema, { password: form.get("password") });
  if (!parsed.ok) {
    return parsed.state;
  }

  return perform(async ({ api }) => {
    await api.users.update(userId, { password: parsed.data.password });
    refresh();

    return "Password set.";
  });
}

export async function setActive(userId: string, active: boolean): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.users.update(userId, { is_active: active });
    refresh();

    return active ? "Account reactivated." : "Account deactivated; its sessions were ended.";
  });
}

export async function resetMfa(userId: string): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.users.resetMfa(userId);
    refresh();

    return "Two-factor authentication turned off. They can set it up again.";
  });
}

/** Mail the user the link to choose a password: an invitation for an account without one, a reset for one with. */
export async function sendPasswordLink(userId: string): Promise<ActionState> {
  return perform(async ({ api }) => {
    try {
      const { kind } = await api.users.sendPasswordLink(userId);
      refresh();

      return kind === "invitation"
        ? "Invitation sent. The link works once and expires."
        : "Password reset link sent. The link works once and expires.";
    } catch (error) {
      if (isManagementError(error, "service_unavailable")) {
        throw new ManagementError("service_unavailable", "No mail can be sent from this deployment. Nothing was done.");
      }
      throw error;
    }
  });
}

export async function deleteUser(userId: string): Promise<ActionState> {
  const state = await perform(async ({ api }) => {
    await api.users.delete(userId);

    return "User deleted.";
  });
  if (state.status === "success") {
    redirect("/users");
  }

  return state;
}

export async function replaceRoles(userId: string, roleIds: string[]): Promise<ActionState> {
  const parsed = parse(z.array(z.string().min(1).max(64)).max(100), roleIds);
  if (!parsed.ok) {
    return parsed.state;
  }

  return perform(async ({ api }) => {
    await api.users.replaceRoles(userId, parsed.data);
    refresh();

    return "Roles saved.";
  });
}

export async function endSession(userId: string, sid: string): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.users.endSession(userId, sid);
    refresh();

    return "Session ended.";
  });
}

export async function endAllSessions(userId: string): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.users.endSessions(userId);
    refresh();

    return "Every session ended.";
  });
}

export async function withdrawConsent(userId: string, clientId: string): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.users.withdrawConsent(userId, clientId);
    refresh();

    return "Consent withdrawn. The application will ask again.";
  });
}

export async function removePasskey(userId: string, passkeyId: string): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.users.removePasskey(userId, passkeyId);
    refresh();

    return "Passkey removed. They can add it again from a device they have.";
  });
}

export async function unlinkIdentity(userId: string, connection: string): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.users.unlinkIdentity(userId, connection);
    refresh();

    return "Identity unlinked.";
  });
}
