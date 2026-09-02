# Chart design rules for Breeze

Derived from Anthropic's `dataviz` skill, which is built into the Claude Code binary and
cannot be installed as a plugin. This file is the portable extract: the parameters it
needs, filled in for Breeze's Station palette, plus the validator so the colour work stays
**computed rather than eyeballed**.

**Read this before writing any chart code.** Then check the result against the
anti-patterns at the bottom.

---

## 1. The palette (validated — do not substitute by eye)

Two hard problems the existing tokens do not solve:

- `--chart-1..5` in `app/globals.css` is a **sequential** ramp — four steps of verdigris
  terminated by brass. Correct for magnitude/ordered data. **Wrong for categorical
  series**: four adjacent teals are indistinguishable as separate bars or lines.
- Dark mode is **selected, not flipped**. The dark column below is the same six hues
  re-stepped for the night surface, because the dark lightness band (L 0.48–0.67) is
  narrower than light (0.43–0.77). A naive lightness inversion fails the band check —
  I confirmed this: the first dark attempt failed on brass (L 0.78) and moss (L 0.74).

### Categorical — fixed order, never cycled

| Slot | Hue       | Light     | Dark      |
| ---- | --------- | --------- | --------- |
| 1    | verdigris | `#14938d` | `#1b9690` |
| 2    | brass     | `#d49838` | `#c38824` |
| 3    | blue      | `#2863ab` | `#3072c1` |
| 4    | rust      | `#d05f43` | `#d46246` |
| 5    | violet    | `#773f9b` | `#8a4fb0` |
| 6    | moss      | `#7daf61` | `#71a255` |

Slots 1 and 2 are the Station primaries (verdigris, brass), so a one- or two-series chart
reads as native to the app. The remaining four extend the instrument-panel world without
repeating a hue.

**Surfaces used for validation:** light `#f3f5f4` (paper `--background`), dark `#111515`
(night `--background`). Both surfaces were desaturated and lightened in the 2026-09-02
tint pass; the palette was re-validated against them and dark violet moved
`#8048a5` → `#8a4fb0`, the smallest nudge that keeps all six dark slots at ≥ 3:1 on the
lighter night surface. If a chart sits on `--card` instead, re-run the validator with
that surface.

**Both modes pass every hard gate on the adjacent pairlist:**

| Check               | Light                    | Dark                     |
| ------------------- | ------------------------ | ------------------------ |
| Lightness band      | PASS (all in 0.43–0.77)  | PASS (all in 0.48–0.67)  |
| Chroma floor        | PASS (all ≥ 0.10)        | PASS                     |
| CVD separation      | PASS — worst ΔE **14.1** | PASS — worst ΔE **13.2** |
| Normal-vision floor | PASS — worst ΔE **22.9** | PASS — worst ΔE **20.3** |
| Contrast vs surface | **WARN** (see below)     | PASS (all ≥ 3:1)         |

Worst adjacent pair in both modes is brass↔verdigris, comfortably clear of the ΔE ≥ 8
CVD target and the ≥ 15 normal-vision floor.

### The one obligation you cannot skip

In **light mode**, brass (`#d49838`, 2.21:1) and moss (`#7daf61`, 2.25:1) fall below 3:1
against paper. The relief rule applies and **is not dismissable**: any chart using those
slots in light mode must ship **visible direct labels or a table view**. Since the spec
already includes a `table` widget, the cheapest compliance is to direct-label those series.

### Re-running the validator

The script is vendored at `scripts/validate_palette.js` (with a local
`scripts/package.json` marking it ESM — the root `package.json` is untouched).

```bash
node scripts/validate_palette.js "#14938d,#d49838,#2863ab,#d05f43,#773f9b,#7daf61" \
  --mode light --surface "#f3f5f4"
node scripts/validate_palette.js "#1b9690,#c38824,#3072c1,#d46246,#8a4fb0,#71a255" \
  --mode dark  --surface "#111515"
```

Exit code is non-zero on a hard FAIL. **If you change a single hex, re-run both.** The
script's CLI is gated on its own filename — do not rename it.

### Scatter / bubble / small-multiple caution

The passes above are for the **adjacent** pairlist, which covers bars, lines, stacks and
pies. Forms where any two series can land side by side need `--pairs all`, which is a
much harder gate. If you build a scatter, re-validate with `--pairs all` and expect to
cap the series count — fold the tail into "Other" or facet.

### Sequential and diverging

- **Sequential (magnitude, one measure):** keep using the existing `--chart-1..5` ramp.
  It is a correct single-hue light→dark verdigris scale. This is its proper job.
- **Diverging (polarity):** two hues plus a **neutral grey** midpoint — verdigris one
  side, brass the other, `--muted-foreground` in the middle. Never a hue at the midpoint,
  never a rainbow.
- **Status (good/warning/serious/critical):** reserved, drawn from `--destructive` and
  friends, **never reused as "series 4"**, and always shipped with an icon + label so
  state is never colour-alone.

---

## 2. Rules that are not about colour

**Form first — and sometimes the answer is not a chart.** A single number is a stat tile
or hero number, not a one-bar bar chart. That is why the spec has a `metrics` widget:
prefer it whenever the data's job is "one headline figure".

**Non-negotiables:**

- **One axis. Never a dual-axis chart.** Two measures at different scales become two
  charts, small multiples, or both indexed to a common base. This is the single most
  common chart mistake.
- **Colour follows the entity, never its rank.** If a filter drops a series, the
  survivors keep their colours — do not repaint by position.
- **Assign hues in fixed order, never cycled.** A 7th series is not a generated hue: it
  folds into "Other", facets, or a table.
- **Text wears text tokens, never the series colour.** Values, axis labels and legend
  text stay in `--readout` / `--muted-foreground` / `--foreground`; the coloured mark
  beside them carries identity. This matters doubly here because two light-mode slots
  already fail text contrast.
- **Legend always present for ≥ 2 series** (one series needs none — the title names it);
  at ≤ 4 series also direct-label, so identity is never colour-alone.

**Marks and chrome:**

- Thin marks; 2px lines; markers ≥ 8px
- 4px rounded data-ends, anchored to the baseline (round the tip, not the base)
- 2px surface-coloured gap between adjacent bars and between stacked segments
- 2px surface ring on overlapping marks
- Recessive grid and axes — hairline weight, `--hairline`
- Selective direct labels; never a number on every point

**Interaction — ship it by default.** An HTML/SVG chart is interactive: crosshair +
tooltip on line/area, per-mark tooltip on bar/dot/cell. The only form that skips it is a
bare stat tile with no plot. Hit targets larger than the mark.

**Motion.** This is a Breeze constraint, not a dataviz one: one entrance transition per
widget, ~40ms stagger, nothing loops, `prefers-reduced-motion` respected. Recharts'
default animation is close to right; do not add more on top.

---

## 3. Anti-patterns — check every chart against these

If the chart matches an entry, it is wrong:

- Dual y-axes (the worst one)
- A rainbow sequential ramp, or a hue at a diverging midpoint
- Categorical hues cycled past the end of the list
- Series recoloured when a filter changes the set
- Status colours reused as ordinary series
- A number printed on every data point
- Grid lines competing with the data
- Value text tinted with the series colour
- A one-bar bar chart where a stat tile belongs
- Dark mode produced by flipping light-mode lightness
- Colour as the only carrier of identity (no legend, no labels, no table)

**Finally: render it and look at it.** The validator checks colour, not layout.
Screenshot the output in both themes and eyeball for label collisions, overflow, and
geometry before calling it done.
