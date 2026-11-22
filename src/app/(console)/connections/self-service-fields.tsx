"use client";

import { SwitchField } from "@/components/app/form-fields";

/**
 * A pool's self-service switches: open sign-up, and whether an account must prove its address
 * before it signs in with its password. Only a pool has them; Clavia refuses them elsewhere.
 */
export function SelfServiceFields({
  allowSignUp = false,
  requireVerifiedEmail = false,
}: {
  allowSignUp?: boolean;
  requireVerifiedEmail?: boolean;
}) {
  return (
    <>
      <SwitchField
        name="allow_sign_up"
        label="Open sign-up"
        description="People may create their own account here, from the sign-in page of an application that enables this connection."
        defaultChecked={allowSignUp}
      />
      <SwitchField
        name="require_verified_email"
        label="Verified address required"
        description={
          <>
            An account signs in with its password only once it has followed the link it is emailed. Keep it on with open
            sign-up, so nobody can register someone else&apos;s address. Without working mail, Clavia does not offer
            sign-up into such a connection.
          </>
        }
        defaultChecked={requireVerifiedEmail}
      />
    </>
  );
}
