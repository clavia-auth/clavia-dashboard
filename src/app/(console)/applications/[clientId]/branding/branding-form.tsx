"use client";

import { ImageIcon, PaletteIcon } from "lucide-react";
import { useActionState, useState } from "react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ACCENT_COLOR, accentTextColor, LOGO_TYPES } from "@/core/branding";
import { fieldError, IDLE } from "@/server/action-state";

import { removeLogo, saveAccentColor, uploadLogo } from "../../actions";

/** Clavia's own accent on its sign-in pages, which an application without a colour keeps. */
const CLAVIA_ACCENT = "#2d6a4f";

/**
 * The application's colour and logo on its sign-in pages, and a preview of the sign-in card wearing them.
 * Clavia serves both from its own origin and decides what it takes; this form only spares a round trip.
 */
export function BrandingForm({
  clientId,
  name,
  accentColor,
  logoUrl,
  editable,
}: {
  clientId: string;
  name: string;
  accentColor: string | null;
  logoUrl: string | null;
  editable: boolean;
}) {
  const [color, setColor] = useState(accentColor ?? "");
  const [chosen, setChosen] = useState<string | null>(null);
  const [colorState, saveColor, savingColor] = useActionState(saveAccentColor.bind(null, clientId), IDLE);
  const [logoState, upload, uploading] = useActionState(uploadLogo.bind(null, clientId), IDLE);
  useActionFeedback(colorState);
  useActionFeedback(logoState, () => setChosen(null));
  const preview = ACCENT_COLOR.test(color) ? color.toLowerCase() : (accentColor ?? CLAVIA_ACCENT);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-6">
        <Card>
          <form action={saveColor}>
            <CardHeader>
              <CardTitle>Colour</CardTitle>
              <CardDescription>
                Its buttons, links and chosen options on the sign-in pages. The text on it is worked out, white or dark,
                whichever reads better.
              </CardDescription>
            </CardHeader>
            <CardContent className="py-6">
              <fieldset disabled={!editable || savingColor}>
                <FieldGroup>
                  <Field data-invalid={fieldError(colorState, "accent_color") !== undefined || undefined}>
                    <FieldLabel htmlFor="accent-color">Accent colour</FieldLabel>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label="Pick the accent colour"
                        value={ACCENT_COLOR.test(color) ? color.toLowerCase() : CLAVIA_ACCENT}
                        onChange={(event) => setColor(event.target.value)}
                        className="border-input h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <Input
                        id="accent-color"
                        name="accent_color"
                        value={color}
                        onChange={(event) => setColor(event.target.value)}
                        placeholder="Clavia's own"
                        spellCheck={false}
                        autoComplete="off"
                        maxLength={7}
                        className="w-36 font-mono"
                        aria-invalid={fieldError(colorState, "accent_color") !== undefined || undefined}
                      />
                    </div>
                    <FieldDescription>
                      # and six hexadecimal digits. Leave it empty for Clavia&apos;s colour.
                    </FieldDescription>
                    <FieldError>{fieldError(colorState, "accent_color")}</FieldError>
                  </Field>
                </FieldGroup>
              </fieldset>
            </CardContent>
            {editable ? (
              <CardFooter className="gap-2 border-t">
                <Button type="submit" disabled={savingColor}>
                  {savingColor ? <Spinner /> : null}
                  Save colour
                </Button>
                {accentColor !== null ? (
                  <Button type="submit" variant="ghost" disabled={savingColor} onClick={() => setColor("")}>
                    Use Clavia&apos;s colour
                  </Button>
                ) : null}
              </CardFooter>
            ) : null}
          </form>
        </Card>

        <Card>
          <form action={upload}>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>
                Shown in place of Clavia&apos;s at the top of the sign-in card: a PNG, JPEG or WebP image, 16 to 1024
                pixels a side, at most 256 KiB. Never SVG, which can carry script.
              </CardDescription>
            </CardHeader>
            <CardContent className="py-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="bg-muted flex h-16 w-32 items-center justify-center rounded-md border">
                  {(chosen ?? logoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- an image of this server's, any shape
                    <img
                      src={chosen ?? logoUrl ?? ""}
                      alt={`${name}'s logo`}
                      className="max-h-12 max-w-28 object-contain"
                    />
                  ) : (
                    <ImageIcon className="text-muted-foreground size-6" aria-label="No logo" />
                  )}
                </div>
                {editable ? (
                  <Field
                    className="w-auto grow"
                    data-invalid={fieldError(logoState, "logo") !== undefined || undefined}
                  >
                    <FieldLabel htmlFor="logo">Image</FieldLabel>
                    <Input
                      id="logo"
                      name="logo"
                      type="file"
                      accept={LOGO_TYPES.join(",")}
                      disabled={uploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        setChosen(file === undefined ? null : URL.createObjectURL(file));
                      }}
                    />
                    <FieldError>{fieldError(logoState, "logo")}</FieldError>
                  </Field>
                ) : null}
              </div>
            </CardContent>
            {editable ? (
              <CardFooter className="gap-2 border-t">
                <Button type="submit" disabled={uploading || chosen === null}>
                  {uploading ? <Spinner /> : null}
                  Upload logo
                </Button>
                {logoUrl !== null ? (
                  <ConfirmAction
                    trigger={
                      <Button type="button" variant="ghost">
                        Remove logo
                      </Button>
                    }
                    title="Remove the logo?"
                    description="Its sign-in pages show Clavia's logo again."
                    confirm="Remove"
                    destructive
                    action={removeLogo.bind(null, clientId)}
                  />
                ) : null}
              </CardFooter>
            ) : null}
          </form>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaletteIcon className="size-4" aria-hidden />
            Preview
          </CardTitle>
          <CardDescription>The sign-in card as a person sees it, before saving.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <SignInPreview name={name} accent={preview} logo={chosen ?? logoUrl} />
        </CardContent>
      </Card>
    </div>
  );
}

/** A small likeness of Clavia's sign-in card, in light colours as the pages first show it. */
function SignInPreview({ name, accent, logo }: { name: string; accent: string; logo: string | null }) {
  const text = accentTextColor(accent);

  return (
    <div
      className="rounded-xl border bg-[#f1f8f4] p-4"
      role="img"
      aria-label={`The sign-in card of ${name}, in ${accent}`}
    >
      <div className="mx-auto flex max-w-60 flex-col items-center gap-2 rounded-lg border border-[#d2e3d9] bg-white p-4 text-[#12211a] shadow-sm">
        {logo !== null ? (
          // eslint-disable-next-line @next/next/no-img-element -- the logo as the pages show it
          <img src={logo} alt="" className="max-h-8 max-w-32 object-contain" />
        ) : (
          <span className="size-8 rounded-md bg-[#52b788]" />
        )}
        <span className="text-[0.65rem] font-semibold text-[#5a6b62]">{name}</span>
        <span className="text-sm font-bold">Sign in</span>
        <span className="h-6 w-full rounded border border-[#d2e3d9] bg-[#f7fbf8]" />
        <span className="h-6 w-full rounded border border-[#d2e3d9] bg-[#f7fbf8]" />
        <span
          className="flex h-7 w-full items-center justify-center rounded text-xs font-semibold"
          style={{ backgroundColor: accent, color: text }}
        >
          Sign in
        </span>
        <span className="text-[0.65rem] font-semibold" style={{ color: accent }}>
          Forgot your password?
        </span>
      </div>
    </div>
  );
}
