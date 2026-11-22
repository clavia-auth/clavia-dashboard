import { signedIn } from "@/server/operator";

import { userById } from "./data";
import { PasswordForm, ProfileForm } from "./profile-form";

type Props = { params: Promise<{ userId: string }> };

export default async function UserProfilePage({ params }: Props) {
  const { operator } = await signedIn();
  const { userId } = await params;
  const user = await userById(userId);
  const editable = operator.can("update:users");

  return (
    <>
      <ProfileForm user={user} editable={editable} />
      {editable && user.connection !== "email" ? (
        <PasswordForm userId={user.id} hasPassword={user.has_password} />
      ) : null}
    </>
  );
}
