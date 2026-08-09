# Theme

## Compact tokens

- Background: `#070b0f`; surface: `#0e151c`; raised surface: `#131d26`.
- Text: `#f4f6f8`; muted: `#9aa6af`; line: `#26323d`.
- Brand yellow: `#f4b900`; orange: `#ff5d28`; success: `#20c975`.
- Body: Inter/system UI; display: Arial Narrow/Impact.
- Maximum content width: 1200px. Breakpoints: 800px and 520px.
- Cards: 10px radius, thin border, restrained shadow. Buttons: uppercase compact labels.
- Light theme uses warm off-white surfaces while retaining yellow brand accents.

## Raw tokens
```css
:root{color-scheme:dark;--bg:#070b0f;--surface:#0e151c;--surface2:#131d26;--line:#26323d;--text:#f4f6f8;--muted:#9aa6af;--yellow:#f4b900;--orange:#ff5d28;--green:#20c975;--max:1200px;font-family:Inter,system-ui,sans-serif}
:root[data-theme="light"]{color-scheme:light;--bg:#f5f2eb;--surface:#fff;--surface2:#eee9df;--text:#17191b;--muted:#666;--line:#d4cec3}
```
