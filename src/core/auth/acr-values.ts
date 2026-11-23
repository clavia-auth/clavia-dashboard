/**
 * The `acr_values` a sign-in asks Clavia for (OpenID Connect Core §3.1.2.1): a space-separated
 * list of authentication context values, such as the multi-factor policy URI a step-up
 * challenge names (RFC 9470 §3). They reach the sign-in route in a query string, so they are
 * checked like any input: a short list of visible ASCII words, or nothing.
 */
const MAXIMUM_LENGTH = 512;

export function safeAcrValues(candidate: string | null | undefined): string | null {
  if (candidate === null || candidate === undefined || candidate.length > MAXIMUM_LENGTH) {
    return null;
  }

  return /^[\x21-\x7e]+(?: [\x21-\x7e]+)*$/.test(candidate) ? candidate : null;
}
