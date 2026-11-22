import "server-only";

import { notFound, redirect } from "next/navigation";

import { isManagementError } from "@/core/management/errors";

/**
 * Read for a page: a resource that is not there is the page's 404, a session Clavia no
 * longer accepts is a new sign-in. Any other refusal reaches the segment's error boundary.
 */
export async function load<T>(read: Promise<T>): Promise<T> {
  try {
    return await read;
  } catch (error) {
    if (isManagementError(error, "not_found")) {
      notFound();
    }
    if (isManagementError(error, "unauthenticated")) {
      redirect("/auth/sign-in");
    }
    throw error;
  }
}

/**
 * Read a resource the page's URL names: as {@link load}, and an identifier Clavia refuses as
 * malformed names nothing either, so it is the page's 404 rather than an error. Lists keep
 * {@link load}, where a refusal means a query the dashboard got wrong.
 */
export async function find<T>(read: Promise<T>): Promise<T> {
  try {
    return await load(read);
  } catch (error) {
    if (isManagementError(error, "invalid")) {
      notFound();
    }
    throw error;
  }
}
