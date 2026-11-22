import { SearchXIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState icon={SearchXIcon} title="Not found" description="It may have been deleted, or the link is wrong.">
      <Button variant="outline" asChild>
        <Link href="/">Back to the overview</Link>
      </Button>
    </EmptyState>
  );
}
