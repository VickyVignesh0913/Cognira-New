# Brand Guidelines v1.0

> Last updated: 2026-11-02
> Status: Draft

## Quick Reference

| Element | Value |
|---------|-------|
| Primary Color | #1E60FF (from existing project) |
| Secondary Color | #FF9F1C (from existing project) |
| Accent Color | #7C3AED (from existing project) |
| Neutral Dark | #0A1128 (from existing project) |
| Neutral Light | #F4F8FC (from existing project) |
| Voice | Professional, Helpful, Clear |

## 1. Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Primary Blue | #1E60FF | rgb(30,96,255) | CTAs, headers, primary actions |
| Primary Dark | #1A58F5 | rgb(26,88,245) | Hover states, emphasis |

### Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Secondary Orange | #FF9F1C | rgb(255,159,28) | Accents, highlights, warm states |

### Neutral Palette (Dark Theme)

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Background | #0A1128 | rgb(10,17,40) | Dark page backgrounds |
| Surface | #141D38 | rgb(20,29,56) | Cards, sections on dark mode |
| Ink | #F4F8FC | rgb(244,248,252) | Primary text on dark mode |
| Muted | #6C7A9C | rgb(108,122,156) | Captions, muted text |
| Soft | #EAF0FA | rgb(234,240,250) | Subtle backgrounds, dividers |
| Border | #0A1128 | rgb(10,17,40) | Dividers, borders |

### Neutral Palette (Light Theme)

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Background | #F4F8FC | rgb(244,248,252) | Light page backgrounds |
| Surface | #FFFFFF | rgb(255,255,255) | Cards, sections on light mode |
| Ink | #0A1128 | rgb(10,17,40) | Primary text on light mode |
| Muted | #6C7A9C | rgb(108,122,156) | Captions, muted text |
| Soft | #EAF0FA | rgb(234,240,250) | Subtle backgrounds, dividers |
| Border | #E5E7EB | rgb(229,231,235) | Dividers, borders |

### Semantic Colors

| State | Hex | Usage |
|-------|-----|-------|
| Success | #22C55E | Positive actions, confirmations |
| Warning | #F59E0B | Cautions, pending states |
| Error | #EF4444 | Errors, destructive actions |
| Info | #3B82F6 | Informational messages |

## 2. Typography

### Font Stack

```css
--font-display: "Archivo Black", "Arial Black", sans-serif;
--font-body: "Space Mono", ui-monospace, monospace;
```

### Type Scale

| Element | Size (Desktop) | Size (Mobile) | Weight | Line Height |
|---------|----------------|---------------|--------|-------------|
| H1 | 48px | 32px | 700 | 1.2 |
| H2 | 36px | 28px | 600 | 1.25 |
| H3 | 28px | 24px | 600 | 1.3 |
| H4 | 24px | 20px | 600 | 1.35 |
| Body | 16px | 16px | 400 | 1.5 |
| Body Large | 18px | 18px | 400 | 1.6 |
| Small | 14px | 14px | 400 | 1.5 |
| Caption | 12px | 12px | 400 | 1.4 |

## 3. Logo Usage

### Variants

- **Primary:** Full horizontal logo with wordmark
- **Stacked:** Vertical arrangement for square spaces  
- **Icon:** Symbol only for favicons, app icons
- **Monochrome:** Single color for limited palettes

### Clear Space

Minimum clear space = height of logo mark

### Minimum Size

- Digital: 80px width minimum
- Print: 25mm width minimum

### Don'ts

- Don't rotate or skew
- Don't change colors outside approved palette
- Don't add effects (shadows, gradients)
- Don't crop or modify proportions
- Don't place on busy backgrounds

## 4. Voice & Tone

### Brand Personality

| Trait | Description |
|-------|-------------|
| Professional | Expert knowledge, authoritative yet approachable |
| Helpful | Solution-focused, actionable guidance |
| Clear | Direct communication, jargon-free |

### Voice Chart

| Trait | We Are | We Are Not |
|-------|--------|------------|
| Professional | Expert, knowledgeable | Stuffy, corporate |
| Helpful | Supportive, empowering | Patronizing |
| Clear | Direct, concise | Vague, wordy |

### Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| Marketing | Engaging, benefit-focused | Create value-driven experiences |
| Documentation | Clear, instructional | Run the command to start |
| Error messages | Calm, solution-focused | Try refreshing the page |
| Success | Brief, celebratory | Entry logged successfully |

### Prohibited Terms

- revolutionary (overused)
- best-in-class (vague claim)
- seamless (overused)
- synergy (corporate jargon)
- leverage (use "use" instead)

## 5. Imagery Guidelines

### Photography Style

- Lighting: Natural, soft lighting preferred
- Subjects: Real people, authentic scenarios
- Color treatment: Maintain brand colors in post
- Composition: Clean, focused subjects

### Illustrations

- Style: Modern, flat design with subtle gradients
- Colors: Brand palette only
- Line weight: 2px consistent stroke
- Corners: 4px rounded

### Icons

- Style: Outlined, 24px base grid
- Stroke: 1.5px consistent
- Corner radius: 2px
- Fill: None (outline only)

## 6. Design Components

### Buttons

| Type | Background | Text | Border Radius |
|------|------------|------|---------------|
| Primary | #1E60FF | #FFFFFF | 12px |
| Secondary | #FF9F1C | #0A1128 | 12px |
| Ghost | Transparent | #1E60FF | 12px |

### Border Radius

| Element | Radius |
|---------|--------|
| Buttons | 12px |
| Cards | 12px |
| Inputs | 12px |
| Modals | 16px |
| Pills/Tags | 9999px |

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight spacing |
| sm | 8px | Compact elements |
| md | 16px | Standard spacing |
| lg | 24px | Section spacing |
| xl | 32px | Large gaps |
| 2xl | 48px | Section dividers |

## 7. Accessibility

- Text/Background Contrast: Minimum 4.5:1 for AA, 7:1 for AAA
- All interactive elements meet WCAG 2.1 AA standards
- Focus-visible outlines: 3px solid var(--color-accent)
- Reduced motion support via `@media (prefers-reduced-motion: reduce)`

## 8. Dark/Light Mode

### Dark Theme (.theme-focus)

```css
--color-bg: #0A1128;
--color-surface: #141D38;
--color-ink: #F4F8FC;
--color-muted: #6C7A9C;
--color-soft: #EAF0FA;
--color-border: #0A1128;
--color-primary: #1E60FF;
--color-on-primary: #FFFFFF;
--color-accent: #FF9F1C;
--color-on-accent: #0A1128;
--color-violet: #7C3AED;
--color-sky: #0EA5E9;
--color-danger: #FF3D3D;
--color-soft: #EAF0FA;
```

### Light Theme (.theme-calm)

```css
--color-bg: #F6F4EC;
--color-soft: #EFECE0;
```