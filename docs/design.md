# SIDControl Module Design

MIDI controller module for SIDaster III synthesizer.

## Overview

A knob-focused controller that maps Move's 8 encoders to SIDaster's ~45 parameters across 8 pages. Pads play chromatic notes. No DSP - pure JavaScript MIDI translation.

## Parameter Mapping

8 pages, 8 knobs each, mapped to SIDaster CCs:

| Page | Name | Knob 1 | Knob 2 | Knob 3 | Knob 4 | Knob 5 | Knob 6 | Knob 7 | Knob 8 |
|------|------|--------|--------|--------|--------|--------|--------|--------|--------|
| 0 | Global | Vol (7) | ExtIn (8) | Mode (9) | LP (10) | BP (11) | Cut (12) | Res (13) | HP (14) |
| 1 | Tune | Tune (15) | — | — | — | — | — | — | — |
| 2 | OSC 1 | Wave (16) | Coarse (17) | Fine (18) | Duty (19) | Ring (20) | Sync (21) | Atk (22) | Dec (23) |
| 3 | OSC 1+ | Sus (24) | Rel (25) | Out (26) | — | — | — | — | — |
| 4 | OSC 2 | Wave (32) | Coarse (33) | Fine (34) | Duty (35) | Ring (36) | Sync (37) | Atk (38) | Dec (39) |
| 5 | OSC 2+ | Sus (40) | Rel (41) | Out (42) | — | — | — | — | — |
| 6 | OSC 3 | Wave (48) | Coarse (49) | Fine (50) | Duty (51) | Ring (52) | Sync (53) | Atk (54) | Dec (55) |
| 7 | OSC 3+ | Sus (56) | Rel (57) | Out (58) | — | — | — | — | — |

## Display & UI

### Main screen (grid layout)

```
┌────────────────────────────┐
│ SIDControl        [Global] │  ← Header: module name + page name
├────────────────────────────┤
│ Vol:64    ExtIn:0          │  ← Knobs 1-2
│ Mode:0    LP:On            │  ← Knobs 3-4
│ BP:Off    HP:Off           │  ← Knobs 5-6
│ Cut:64    Res:32           │  ← Knobs 7-8
└────────────────────────────┘
```

### On knob touch or turn

Overlay appears showing parameter name and current value.

## Pad Layout & Colors

32 pads, chromatic from C2 (note 36):

```
Row 4: C5  C#5 D5  D#5 E5  F5  F#5 G5   (notes 72-79)
Row 3: C4  C#4 D4  D#4 E4  F4  F#4 G4   (notes 60-67)
Row 2: C3  C#3 D3  D#3 E3  F3  F#3 G3   (notes 48-55)
Row 1: C2  C#2 D2  D#2 E2  F2  F#2 G2   (notes 36-43)
```

- **C notes**: Bright Pink - marks octave starts
- **Other notes**: Pink
- **On press**: White while held

## MIDI Handling

| Input | Action |
|-------|--------|
| Step button 1-8 | Switch page, update LEDs, redraw |
| Knob touch (note 0-7) | Show overlay with param name/value |
| Knob turn (CC 71-78) | Decode delta, update state, send CC, show overlay |
| Pad press | Send note-on, light white |
| Pad release | Send note-off, restore color |

## Module Catalog Entry

After release, add to `move-anything/module-catalog.json`:

```json
{
  "id": "sidcontrol",
  "name": "SID Control",
  "description": "MIDI controller for SIDaster III synthesizer",
  "author": "charlesvestal",
  "component_type": "utility",
  "latest_version": "0.1.0",
  "min_host_version": "1.0.0",
  "download_url": "https://github.com/charlesvestal/move-everything-sidcontrol/releases/download/v0.1.0/sidcontrol-module.tar.gz"
}
```
