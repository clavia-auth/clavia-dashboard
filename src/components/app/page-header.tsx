import type { Route } from "next";
import Link from "next/link";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type Crumb = Readonly<{ label: string; href?: Route }>;

/** A page's title, what it is for, where it sits, and what can be done from it. */
export function PageHeader({
  title,
  description,
  crumbs = [],
  actions,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  crumbs?: readonly Crumb[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {crumbs.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, index) => (
              <Fragment key={`${crumb.label}-${index}`}>
                <BreadcrumbItem>
                  {crumb.href !== undefined ? (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {index < crumbs.length - 1 ? <BreadcrumbSeparator /> : null}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {children}
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
            {description !== undefined ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {actions !== undefined ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
