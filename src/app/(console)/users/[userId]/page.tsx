import { signedIn } from "@/server/operator";

import { userById } from "./data";
import { MetadataForm } from "./metadata-form";
import { PasswordForm, ProfileForm } from "./profile-form";

type Props = { params: Promise<{ userId: string }> };

export default async function UserProfilePage({ params }: Props) {
  const { operator } = await signedIn();
  const { userId } = await params;
  const user = await userById(userId);
  const editable = operator.can("update:users");
  // Writing it is granting access, so it takes its own scope beside update:users.
  const missing = !operator.can("update:users")
    ? "update:users"
    : !operator.can("update:users_app_metadata")
      ? "update:users_app_metadata"
      : null;

  return (
    <>
      <ProfileForm user={user} editable={editable} />
      {editable && user.connection !== "email" ? (
        <PasswordForm userId={user.id} hasPassword={user.has_password} />
      ) : null}
      <MetadataForm key={JSON.stringify(user.app_metadata)} user={user} editable={missing === null} missing={missing} />
    </>
  );
}
