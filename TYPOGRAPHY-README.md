# Typography System — Implementation Guide

> **For Claude / AI assistants:** Read this whole file before writing any UI code.
> Follow every rule here. Do not choose your own fonts, sizes, weights, or spacing.
> If something you need is not defined here, ask before inventing a new value.

---

## 1. Project font choice (edit this section per project)

| Role | Font family | Source | Weights to load |
| --- | --- | --- | --- |
| Sans (body + UI + headings) | **Inter** | Google Fonts | 400, 500, 600 |
| Serif (optional headline accent) | **Instrument Serif** | Google Fonts | 400 (+ italic) |
| Mono (labels, numbers, code) | **Geist Mono** | Google Fonts | 400, 500 |

- Set `USE_SERIF_HEADINGS = false`. When `true`, H1 and H2 use the serif font at weight 400. When `false`, every heading uses the sans font.
- Use **at most two families plus one mono**. Never add another font.
- Load only the weights listed above.

---

## 2. Type scale (the only allowed text styles)

| Token | Use for | Font | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- | --- | --- |
| `display` | Hero headline (one per page) | sans (or serif) | `clamp(44px, 7vw, 72px)` | 600 (serif: 400) | 1.0 | -0.03em |
| `h1` | Page title | sans (or serif) | `clamp(36px, 5vw, 56px)` | 600 (serif: 400) | 1.05 | -0.025em |
| `h2` | Section title | sans (or serif) | `clamp(28px, 3.5vw, 40px)` | 600 (serif: 400) | 1.1 | -0.02em |
| `h3` | Card / sub-section title | sans | 24px | 600 | 1.2 | -0.01em |
| `h4` | Small heading | sans | 20px | 600 | 1.3 | 0 |
| `body-lg` | Lead paragraph, intro text | sans | 18px | 400 | 1.6 | 0 |
| `body` | Default text | sans | 16px | 400 | 1.5 | 0 |
| `body-sm` | Secondary text, table cells | sans | 14px | 400 | 1.5 | 0 |
| `label` | Buttons, nav, form labels | sans | 14px | 500 | 1.2 | 0 |
| `overline` | Eyebrow text, tags, dates | mono | 12px | 500 | 1.2 | 0.06em, UPPERCASE |
| `caption` | Footnotes, helper text | sans | 12px | 400 | 1.4 | 0 |
| `code` | Inline code, IDs, numbers | mono | 0.9em | 400 | inherit | 0 |

**Rules**
- Use `display` once per page at most.
- Base body size is **16px**. Never set body text below 14px.
- Keep reading text between **60 and 75 characters** wide (`max-width: 65ch`).
- Text colour must pass WCAG AA: 4.5:1 for body text, 3:1 for text 24px and larger.
- Buttons and headings use sentence case. Only `overline` is uppercase.

---

## 3. Implementation by stack

### A. Plain HTML / CSS

Put this in the `<head>` of the main layout, **once**:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Create `styles/typography.css` and import it globally:

```css
:root {
  /* Families */
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-serif: "Instrument Serif", Georgia, "Times New Roman", serif;
  --font-mono: "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  --font-heading: var(--font-sans); /* change to var(--font-serif) if USE_SERIF_HEADINGS */

  /* Sizes */
  --text-display: clamp(44px, 7vw, 72px);
  --text-h1: clamp(36px, 5vw, 56px);
  --text-h2: clamp(28px, 3.5vw, 40px);
  --text-h3: 24px;
  --text-h4: 20px;
  --text-body-lg: 18px;
  --text-body: 16px;
  --text-body-sm: 14px;
  --text-label: 14px;
  --text-overline: 12px;
  --text-caption: 12px;

  /* Weights */
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
}

html { -webkit-text-size-adjust: 100%; }

body {
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: var(--weight-regular);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  font-optical-sizing: auto;
}

.text-display { font-family: var(--font-heading); font-size: var(--text-display); font-weight: var(--weight-semibold); line-height: 1.0;  letter-spacing: -0.03em; }
h1, .text-h1  { font-family: var(--font-heading); font-size: var(--text-h1);      font-weight: var(--weight-semibold); line-height: 1.05; letter-spacing: -0.025em; }
h2, .text-h2  { font-family: var(--font-heading); font-size: var(--text-h2);      font-weight: var(--weight-semibold); line-height: 1.1;  letter-spacing: -0.02em; }
h3, .text-h3  { font-size: var(--text-h3); font-weight: var(--weight-semibold); line-height: 1.2; letter-spacing: -0.01em; }
h4, .text-h4  { font-size: var(--text-h4); font-weight: var(--weight-semibold); line-height: 1.3; }

.text-body-lg { font-size: var(--text-body-lg); line-height: 1.6; }
.text-body    { font-size: var(--text-body);    line-height: 1.5; }
.text-body-sm { font-size: var(--text-body-sm); line-height: 1.5; }
.text-label   { font-size: var(--text-label);   font-weight: var(--weight-medium); line-height: 1.2; }
.text-overline{ font-family: var(--font-mono); font-size: var(--text-overline); font-weight: var(--weight-medium); line-height: 1.2; letter-spacing: 0.06em; text-transform: uppercase; }
.text-caption { font-size: var(--text-caption); line-height: 1.4; }
code, kbd, samp, .text-code { font-family: var(--font-mono); font-size: 0.9em; }

p, li { max-width: 65ch; }

/* If USE_SERIF_HEADINGS is true, serif headings use weight 400 */
:root[data-serif-headings] h1,
:root[data-serif-headings] h2,
:root[data-serif-headings] .text-display { font-weight: var(--weight-regular); }
```

### B. Tailwind CSS

Load the fonts with the `<link>` from section A (or the Next.js loader below), then extend the theme. **Do not use arbitrary values** such as `text-[18px]` or `font-['Poppins']`.

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans:  ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono:  ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        display:  ["clamp(44px, 7vw, 72px)",  { lineHeight: "1.0",  letterSpacing: "-0.03em",  fontWeight: "600" }],
        h1:       ["clamp(36px, 5vw, 56px)",  { lineHeight: "1.05", letterSpacing: "-0.025em", fontWeight: "600" }],
        h2:       ["clamp(28px, 3.5vw, 40px)",{ lineHeight: "1.1",  letterSpacing: "-0.02em",  fontWeight: "600" }],
        h3:       ["24px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        h4:       ["20px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg":["18px", { lineHeight: "1.6" }],
        body:     ["16px", { lineHeight: "1.5" }],
        "body-sm":["14px", { lineHeight: "1.5" }],
        label:    ["14px", { lineHeight: "1.2", fontWeight: "500" }],
        overline: ["12px", { lineHeight: "1.2", letterSpacing: "0.06em", fontWeight: "500" }],
        caption:  ["12px", { lineHeight: "1.4" }],
      },
    },
  },
};
```

Usage: `<h1 className="text-h1">`, `<p className="text-body">`, `<span className="font-mono text-overline uppercase">`.

### C. Next.js (App Router)

Use `next/font` instead of the `<link>` tag. It self-hosts the fonts automatically.

```jsx
// app/fonts.js
import { Inter, Instrument_Serif, Geist_Mono } from "next/font/google";

export const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans", display: "swap" });
export const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
export const mono  = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });
```

```jsx
// app/layout.js
import { inter, serif, mono } from "./fonts";
import "./globals.css"; // contains section A's CSS, minus the --font-sans/serif/mono lines

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${mono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

Here `next/font` sets `--font-sans`, `--font-serif` and `--font-mono`, so remove those three definitions from the CSS `:root`.

### D. React + Vite (no Next.js)

```bash
npm install @fontsource-variable/inter @fontsource/instrument-serif @fontsource/geist-mono
```

```js
// main.jsx (top of file)
import "@fontsource-variable/inter";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "./styles/typography.css";
```

In the CSS, set `--font-sans: "Inter Variable", system-ui, sans-serif;`.

### E. Flutter

```yaml
# pubspec.yaml
dependencies:
  google_fonts: ^6.2.1
```

```dart
import 'package:google_fonts/google_fonts.dart';

final textTheme = TextTheme(
  displayLarge:  GoogleFonts.inter(fontSize: 56, fontWeight: FontWeight.w600, height: 1.05, letterSpacing: -1.4),
  headlineMedium:GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w600, height: 1.1,  letterSpacing: -0.6),
  titleLarge:    GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w600, height: 1.2),
  bodyLarge:     GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w400, height: 1.5),
  bodyMedium:    GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w400, height: 1.5),
  labelLarge:    GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500, height: 1.2),
  labelSmall:    GoogleFonts.geistMono(fontSize: 12, fontWeight: FontWeight.w500, letterSpacing: 0.7),
);

// MaterialApp(theme: ThemeData(textTheme: textTheme))
```

Use `Theme.of(context).textTheme.bodyLarge` everywhere. Never create a `TextStyle` with a raw font size inside a widget.

### F. Native iOS / Android

- **iOS (SwiftUI):** use the system font, SF Pro, with Dynamic Type (`.font(.body)`, `.font(.title)`). Use Inter only if the brand requires it: add the `.ttf` files and list them under `UIAppFonts` in `Info.plist`.
- **Android (Compose):** use Material 3 `Typography` and set `FontFamily` once, through Google Fonts downloadable fonts.

---

## 4. Rules for Claude (must follow)

1. **Read this file first.** Use only the families, tokens and values above.
2. **Load fonts in one place only** (root layout or global CSS). Never import fonts inside a component.
3. **Never hardcode** `font-family`, `font-size`, `font-weight`, `line-height` or `letter-spacing` in components. Always use the tokens or classes.
4. **Use semantic HTML.** One `<h1>` per page. Headings go in order (h1 → h2 → h3) without skipping levels.
5. **Build hierarchy with size and weight**, not with extra fonts or colours.
6. **Large headings get tight tracking** (negative letter spacing); small uppercase text gets wider tracking.
7. **Every font stack keeps its fallbacks** (`system-ui`, `Georgia`, `ui-monospace`).
8. **Always include `display=swap`** (or the framework equivalent) so text stays visible while fonts load.
9. **Use mono only** for labels, numbers, dates, IDs and code. Never for paragraphs.
10. **Don't use bold (700+)** unless this file adds it. The heaviest weight is 600.
11. **Shared components carry their own text style.** Buttons use `label`, inputs use `body`, table cells use `body-sm`.
12. **If a design needs a size that isn't in the scale**, stop and ask. Don't add one-off values.

---

## 5. Pre-ship checklist

- [ ] Fonts load once, globally, with only the listed weights
- [ ] No raw font values in component files (search for `font-size:`, `text-[`, `fontSize:`)
- [ ] One `<h1>` per page; headings in order
- [ ] Body text is 16px with line height 1.5
- [ ] Paragraph width is capped near 65ch
- [ ] Text contrast passes WCAG AA in light and dark mode
- [ ] Layouts tested at 375px, 768px and 1440px widths
- [ ] Fallback fonts look acceptable (test with network throttling)

---

## 6. Changing the font later

To switch fonts, change only these places:

1. **Section 1** of this file
2. The `<link>` tag, `next/font` import or Fontsource packages
3. The `--font-sans`, `--font-serif` and `--font-mono` variables

Nothing else in the project should need to change. If it does, a component is hardcoding a value; fix it to use the tokens.

**Free alternatives to premium fonts:**

| Premium | Free alternative |
| --- | --- |
| PP Neue Montreal | Switzer (Fontshare) or Inter |
| Neue Haas Grotesk / Helvetica Now / Suisse Int'l | Inter |
| ABC Diatype | Geist |
| PP Editorial New | Instrument Serif |
