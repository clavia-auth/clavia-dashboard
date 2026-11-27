/**
 * An application's look on its sign-in pages (Clavia #25): the rules the dashboard shares with Clavia, so
 * what it previews is what the pages will show.
 */

/** `#` and six hexadecimal digits: the only accent colour Clavia takes. */
export const ACCENT_COLOR = /^#[0-9a-f]{6}$/i;

/** The images Clavia takes as a logo, recognised by their content; never SVG, which can carry script. */
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** At most 256 KiB, as Clavia allows. */
export const LOGO_MAX_BYTES = 256 * 1024;

const DARK_TEXT = "#12211a";
const LIGHT_TEXT = "#ffffff";

/**
 * The text Clavia draws on an accent colour: white or its dark ink, whichever contrasts more (WCAG 2.2,
 * relative luminance and contrast ratio), as `AccentColor::textColor()` decides it.
 */
export function accentTextColor(hex: string): string {
  const luminance = relativeLuminance(hex);
  const onWhite = 1.05 / (luminance + 0.05);
  const onDark = (luminance + 0.05) / (relativeLuminance(DARK_TEXT) + 0.05);

  return onWhite >= onDark ? LIGHT_TEXT : DARK_TEXT;
}

function relativeLuminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;

    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
