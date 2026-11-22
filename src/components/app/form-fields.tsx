"use client";

import { useId } from "react";

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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

/** A labelled input with its description, and the message the server sent back for it. */
export function TextField({
  name,
  label,
  description,
  error,
  className,
  ...input
}: {
  name: string;
  label: string;
  description?: React.ReactNode;
  error?: string;
  /** Classes for the field as a whole (its place in a grid), not for the input. */
  className?: string;
} & Omit<React.ComponentProps<typeof Input>, "name" | "id" | "className">) {
  const id = useId();

  return (
    <Field data-invalid={error !== undefined ? true : undefined} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        aria-invalid={error !== undefined ? true : undefined}
        aria-describedby={description !== undefined ? `${id}-description` : undefined}
        {...input}
      />
      {description !== undefined ? <FieldDescription id={`${id}-description`}>{description}</FieldDescription> : null}
      {error !== undefined ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

/** A switch that posts `on` when set, with what it means beside it. */
export function SwitchField({
  name,
  label,
  description,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  description?: React.ReactNode;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  const id = useId();

  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description !== undefined ? <FieldDescription>{description}</FieldDescription> : null}
      </FieldContent>
      <Switch id={id} name={name} defaultChecked={defaultChecked} disabled={disabled} />
    </Field>
  );
}

/** A list of values, one per line — redirect URIs and the like. */
export function LinesField({
  name,
  label,
  description,
  error,
  defaultValue,
  placeholder,
  rows = 3,
}: {
  name: string;
  label: string;
  description?: React.ReactNode;
  error?: string;
  defaultValue?: readonly string[];
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();

  return (
    <Field data-invalid={error !== undefined ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        name={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue?.join("\n")}
        className="font-mono text-xs"
        aria-invalid={error !== undefined ? true : undefined}
        spellCheck={false}
      />
      {description !== undefined ? <FieldDescription>{description}</FieldDescription> : null}
      {error !== undefined ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

/** A set of checkboxes posting every value checked under one name. */
export function CheckboxesField({
  name,
  legend,
  options,
  defaultValue = [],
  error,
  disabled,
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string; description?: string }[];
  defaultValue?: readonly string[];
  error?: string;
  disabled?: boolean;
}) {
  const id = useId();

  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <FieldGroup className="gap-3">
        {options.map((option, index) => (
          <Field key={option.value} orientation="horizontal">
            <Checkbox
              id={`${id}-${index}`}
              name={name}
              value={option.value}
              defaultChecked={defaultValue.includes(option.value)}
              disabled={disabled}
            />
            <FieldContent>
              <FieldLabel htmlFor={`${id}-${index}`} className="font-normal">
                {option.label}
              </FieldLabel>
              {option.description !== undefined ? <FieldDescription>{option.description}</FieldDescription> : null}
            </FieldContent>
          </Field>
        ))}
      </FieldGroup>
      {error !== undefined ? <FieldError>{error}</FieldError> : null}
    </FieldSet>
  );
}
