import type { ManagementScope } from "@/contract";
import type { DashboardSession, OperatorIdentity } from "./session";

/**
 * The person using the dashboard, and what their token lets them do. A page offers an
 * action only when {@link Operator.can} says so; the API checks again on every call.
 */
export class Operator {
  private readonly scopes: ReadonlySet<string>;

  private constructor(
    readonly identity: OperatorIdentity,
    scopes: readonly string[],
  ) {
    this.scopes = new Set(scopes);
  }

  static of(session: DashboardSession): Operator {
    return new Operator(session.operator, session.tokens.scopes);
  }

  can(scope: ManagementScope): boolean {
    return this.scopes.has(scope);
  }

  /** A name to show: their name, else their address, else their subject. */
  get displayName(): string {
    return this.identity.name ?? this.identity.email ?? this.identity.subject;
  }

  /** One or two letters for an avatar. */
  get initials(): string {
    const words = this.displayName.split(/[\s@._-]+/).filter((word) => word.length > 0);
    const letters = words.length > 1 ? [words[0], words[1]] : [words[0] ?? "?"];

    return letters
      .map((word) => word.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  }
}
