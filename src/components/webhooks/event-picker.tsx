"use client";

import { useId, useState } from "react";

import { EVENT_TYPES } from "@/components/audit/describe";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

import { ALL_EVENTS, PICKER_SECTIONS } from "./events";

/**
 * Which audit events an endpoint hears: every one, or the types ticked. It posts `all_events`
 * when every event is chosen, and each type under `events` otherwise. The configuration and
 * security events come first; the traffic follows, with its volume said.
 */
export function EventPicker({
  defaultValue = [],
  error,
  disabled,
}: {
  defaultValue?: readonly string[];
  error?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const [all, setAll] = useState(defaultValue.includes(ALL_EVENTS));

  return (
    <FieldSet>
      <FieldLegend variant="label">Events</FieldLegend>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor={`${id}-all`}>Every event</FieldLabel>
          <FieldDescription>
            Includes the ones added later, and every token issued. Pick types below to hear fewer.
          </FieldDescription>
        </FieldContent>
        <Switch id={`${id}-all`} name="all_events" checked={all} onCheckedChange={setAll} disabled={disabled} />
      </Field>
      <div className="flex flex-col gap-6" aria-disabled={all || undefined}>
        {PICKER_SECTIONS.map((section) => (
          <FieldSet key={section.title} disabled={all || disabled}>
            <FieldLegend variant="label" className="text-muted-foreground">
              {section.title}
            </FieldLegend>
            {section.description !== undefined ? <FieldDescription>{section.description}</FieldDescription> : null}
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {section.groups.map((group) => (
                <FieldGroup key={group.group} className="gap-2">
                  <p className="text-sm font-medium">{group.group}</p>
                  {group.types.map((type) => (
                    <Field key={type} orientation="horizontal">
                      <Checkbox
                        id={`${id}-${type}`}
                        name="events"
                        value={type}
                        defaultChecked={defaultValue.includes(type)}
                      />
                      <FieldLabel htmlFor={`${id}-${type}`} className="font-normal">
                        {EVENT_TYPES[type].label}
                        <code className="ml-2 font-mono text-xs text-muted-foreground">{type}</code>
                      </FieldLabel>
                    </Field>
                  ))}
                </FieldGroup>
              ))}
            </div>
          </FieldSet>
        ))}
      </div>
      {error !== undefined ? <FieldError>{error}</FieldError> : null}
    </FieldSet>
  );
}
