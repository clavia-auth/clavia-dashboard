import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** A person's picture, or their initials on the brand's tint. */
export function UserAvatar({
  user,
  className,
}: {
  user: { name: string | null; email: string; picture: string | null };
  className?: string;
}) {
  const source = user.name ?? user.email;
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  const initials = (
    words.length > 1 ? `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}` : source.slice(0, 2)
  ).toUpperCase();

  return (
    <Avatar className={cn("size-8", className)}>
      {user.picture !== null ? <AvatarImage src={user.picture} alt="" /> : null}
      <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">{initials}</AvatarFallback>
    </Avatar>
  );
}
