import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { totp } from "./totp";

/**
 * The second factor of an operator the suite signs in as. Clavia requires one of anyone who uses the
 * Management API (its `mfa_policy`), so an operator's first sign-in enrols an authenticator app and keeps what
 * it is given here, and every later sign-in answers the challenge with one of the recovery codes: each works
 * once, which spares the suite waiting for the next 30-second time step.
 */
const DIRECTORY = path.join("e2e", ".auth");

type Enrolment = { secret: string; recoveryCodes: string[] };

function slug(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
}

function file(email: string): string {
  return path.join(DIRECTORY, `second-factor-${slug(email)}.json`);
}

export function remember(email: string, enrolment: Enrolment): void {
  mkdirSync(DIRECTORY, { recursive: true });
  writeFileSync(file(email), JSON.stringify(enrolment));
}

/**
 * What `email` types at the challenge. A recovery code is claimed with an exclusive file, so two workers never
 * type the same one; `E2E_TOTP_SECRET` is for the operator who was enrolled before this run (a development
 * stack kept between runs), and a code of the current time step is typed.
 */
export function answer(email: string): string {
  if (existsSync(file(email))) {
    const { recoveryCodes } = JSON.parse(readFileSync(file(email), "utf8")) as Enrolment;
    for (const [index, code] of recoveryCodes.entries()) {
      try {
        closeSync(openSync(path.join(DIRECTORY, `recovery-${slug(email)}-${index}.used`), "wx"));

        return code;
      } catch {
        // Claimed already: the next one.
      }
    }
  }
  const secret = process.env.E2E_TOTP_SECRET;
  if (secret) return totp(secret);

  throw new Error(
    `Clavia asks ${email} for a second factor and the suite has none: it enrols one at the first sign-in, ` +
      "or set E2E_TOTP_SECRET to the key of an authenticator app the operator already has.",
  );
}
