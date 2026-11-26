import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { totp } from "./totp";

/**
 * The second factor of the operator the suite signs in as. Clavia requires one of anyone who uses the
 * Management API (its `mfa_policy`), so the first sign-in enrols an authenticator app and keeps what it
 * is given here, and every later sign-in answers the challenge with one of the recovery codes: each works
 * once, which spares the suite waiting for the next 30-second time step.
 */
const FILE = path.join("e2e", ".auth", "second-factor.json");

type Enrolment = { secret: string; recoveryCodes: string[] };

export function remember(enrolment: Enrolment): void {
  mkdirSync(path.dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(enrolment));
}

/**
 * What to type at the challenge. A recovery code is claimed with an exclusive file, so two workers never
 * type the same one; `E2E_TOTP_SECRET` is for an operator who was enrolled before this run (a development
 * stack kept between runs), and a code of the current time step is typed.
 */
export function answer(): string {
  if (existsSync(FILE)) {
    const { recoveryCodes } = JSON.parse(readFileSync(FILE, "utf8")) as Enrolment;
    for (const [index, code] of recoveryCodes.entries()) {
      try {
        closeSync(openSync(path.join(path.dirname(FILE), `recovery-${index}.used`), "wx"));

        return code;
      } catch {
        // Claimed already: the next one.
      }
    }
  }
  const secret = process.env.E2E_TOTP_SECRET;
  if (secret) return totp(secret);

  throw new Error(
    "Clavia asks for a second factor and the suite has none: it enrols one at its first sign-in, or set " +
      "E2E_TOTP_SECRET to the key of an authenticator app the operator already has.",
  );
}
