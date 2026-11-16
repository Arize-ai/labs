# Arize Labs cover art: the print style

The cover and social-card art (`src/components/art/cover-art.ts`) is a
simulated two-colour print: an **amplitude-modulated, clustered-dot ordered
halftone** for tone, overprinted with **crisp vector linework** for structure.
Every number below is the site's `DEFAULT_SCREEN`, in drawing units on a
400 × 250 card.

## What it is not

- Not error diffusion (Floyd–Steinberg, Atkinson, Jarvis): no dot is ever
  placed or sized by propagated error, so there are no worms or snaking
  textures.
- Not a dispersed-dot ordered dither (Bayer matrix): there is no threshold
  matrix and no binary pixels; tone is carried by dot *size*, not by how many
  cells are switched on.
- Not stochastic or FM screening (blue noise): dot positions never move.
- Not a line, cross-hatch or ASCII screen.

## The screen (AM halftone)

- **Lattice.** A square cell grid of pitch 3.2, sampled only where `i + j` is
  even: a checkerboard, which is a square screen turned to **45°** with
  neighbours 3.2·√2 ≈ 4.53 apart. One dot per lattice site, at the cell
  centre. Both inks use the same angle and the same sites, so there is no
  moiré and no rosette.
- **Dot shape.** Perfect circles (zero-length strokes with round caps). They
  never merge into chains or invert into white holes the way a real
  halftone does past 50%: at full tone the dots only just touch, so a solid
  still reads as a dense field of round dots with paper diamonds between them.
- **Tone → size.** Area-proportional: level `k = round(√tone × 12)`, radius
  `= 3.2 × 0.74 × k / 12` (max ≈ 2.37). So 12 radius steps, a posterised
  tone scale quantised in the square-root domain.
- **Highlight cut-off.** Levels below 3 (tone under ≈ 4%) are not printed at
  all; the ground shows instead. There is no feathering into nothing, the
  smallest printed dot is already a visible size.
- **Small-dot compensation.** Level 3 prints at 55% opacity and level 4 at
  75%, everything above at 92%, so the first visible steps do not jump out of
  the ground.

## The ground

Every lattice site also carries a fixed tiny dot (radius 0.55, 16% opacity),
a flat tint screen. Unlit areas are therefore still a dot matrix rather than
empty paper, and light dots print over it. This is what lets the art bleed
into the card with no box.

## Grain and fade

- **Amplitude noise.** Three-octave value noise (scale 5 units) adds ±4% to
  the tone *before* quantisation, only where there is already some light.
  This is noise dithering of the level, not of position: it breaks up banding
  between radius steps so flat fills look printed rather than mechanical.
- **Vignette.** Tone is multiplied by a smoothstep fade over the outer 44
  units left/right and 30 units top/bottom, so the light always dies out
  before the card edge.

## Two spot inks

Ink (the theme's foreground: near-black on paper, paper-white on the dark
cards) and signal orange (`#ff5a1f`). At each site the ink with the larger
tone wins and the other is knocked out: no overprinting, no blending, no
trapping. Orange dots are always fully opaque. Orange is used at most once
per drawing, for the point of the figure.

## The linework

Structure is never dithered. Outlines, axes, edges and connectors are 1–1.5
unit vector rules on the half pixel, in three ink weights (85%, 45%, 20%
opacity) plus orange, with round joins, and dashes of `1 3` (dotted guides)
or `4 3` (thresholds). They sit on top of the dots and stay sharp at
thumbnail size. A rule may fade out along its length with a gradient, for
things that emerge from the ground.

## How tone is built

A drawing is a function from a point to a tone (0–1) for each ink, made of
signed-distance shapes: a one-dot antialiased edge for solids, exponential
glows (`exp(-d / w)`) around them, and gentle gradients for shading. Light
comes from the upper left, so fills brighten toward their top-left. One
subject, centred in the box x 84–316, y 56–194, with the margins left to the
ground. No text and no frame.

The overall effect is a technical illustration printed on a two-colour press:
quiet, diagrammatic, mostly ink, with one point of orange.
