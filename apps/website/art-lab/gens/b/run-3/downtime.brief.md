TITLE: Five street lamps in a row, the middle one dark

IDEA: Downtime is the one dark link in a chain that should be lit, and the dark gap between four glowing lamps reads instantly as an outage.

COMPOSITION:
- **Ground:** a straight horizon from (84, 172) to (316, 172).
- **Posts:** five identical lamp posts standing on the horizon, evenly spaced at x = 112, 156, 200, 244 and 288. Each post is a vertical shaft from y 172 up to y 98. At the top, a short arm bends 8 units to the right, ending in a small lamp head: a shallow hood 10 wide over a glass bulb of radius 4, centred about (x + 8, 102).
- **Wire:** one overhead cable runs from post to post. It hangs from each post top at y 96 and sags to y 104 midway between posts. It enters from x 84 and leaves at x 316.
- **Light pools:** under each lit lamp, a flattened ellipse 34 wide and 7 tall, centred at (x + 8, 173).
- **The dark lamp:** the middle lamp, head at (208, 102), has no glow and no pool.

LIGHT:
- **Four lit bulbs:** tone 1 at the bulb. Each has a round glow that falls off smoothly to 0 by radius 26. The glows of neighbouring lamps should nearly touch but not merge. Each glow is slightly brighter on its upper-left side.
- **Ground pools:** tone 0.5 at their centres, shrinking to nothing at the ellipse edge.
- **Dark lamp's surroundings:** the space around the middle lamp and its patch of ground stay at background texture, with no light at all. This gap is the subject, so keep it clean.
- **Posts, hoods and wire:** no dot light; they exist only as lines.
- **Background:** the sky above the horizon and the ground below it are left alone.

LINES:
- Horizon: half strength, solid.
- The five post shafts and arms: full strength, solid.
- The lamp hoods: full strength, solid.
- The four lit bulbs' glass outlines: half strength, solid.
- The dark bulb's glass outline: faint, dashed, like something switched off.
- Overhead cable: faint, solid. It runs unbroken through the dark post, because the system is still connected and only the light is gone.

ORANGE: A single tiny dot of radius 2.5 at (208, 103), the still-cooling filament inside the dead bulb. The eye should land on the exact point of failure, the one lamp that went out, and the ember says it was on a moment ago.

VARIATION:
- Vary each lit lamp's glow radius by ±3 and its peak tone between 0.85 and 1, so the working lamps flicker slightly unevenly.
- Vary the cable's sag in each span by ±2 units.
