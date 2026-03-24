/*
 * SID Control - MIDI controller for SIDaster III
 *
 * Maps Move's 8 knobs to SIDaster parameters across 8 pages.
 * Pads play chromatic notes (C2-G5).
 */

/* Shared utilities - absolute path for module location independence */
import {
    MidiNoteOn, MidiNoteOff, MidiCC,
    MoveShift, MoveSteps, MovePads,
    MoveKnob1, MoveKnob2, MoveKnob3, MoveKnob4,
    MoveKnob5, MoveKnob6, MoveKnob7, MoveKnob8,
    White, Black, Rose, BrightPink
} from '/data/UserData/schwung/shared/constants.mjs';

import {
    setLED, decodeAcceleratedDelta
} from '/data/UserData/schwung/shared/input_filter.mjs';

import {
    showOverlay, drawOverlay, tickOverlay, hideOverlay
} from '/data/UserData/schwung/shared/menu_layout.mjs';

/* === Page Definitions === */

const pages = [
    {
        name: 'Global',
        params: [
            { name: 'Volume', cc: 7 },
            { name: 'Ext In', cc: 8 },
            { name: 'Mode', cc: 9 },
            { name: 'LP', cc: 10 },
            { name: 'BP', cc: 11 },
            { name: 'Cutoff', cc: 12 },
            { name: 'Resonance', cc: 13 },
            { name: 'HP', cc: 14 }
        ]
    },
    {
        name: 'Tune',
        params: [
            { name: 'Tuning', cc: 15 },
            null, null, null, null, null, null, null
        ]
    },
    {
        name: 'OSC 1',
        params: [
            { name: 'Wave', cc: 16 },
            { name: 'Coarse', cc: 17 },
            { name: 'Fine', cc: 18 },
            { name: 'Duty', cc: 19 },
            { name: 'Ring', cc: 20 },
            { name: 'Sync', cc: 21 },
            { name: 'Attack', cc: 22 },
            { name: 'Decay', cc: 23 }
        ]
    },
    {
        name: 'OSC 1+',
        params: [
            { name: 'Sustain', cc: 24 },
            { name: 'Release', cc: 25 },
            { name: 'Output', cc: 26 },
            null, null, null, null, null
        ]
    },
    {
        name: 'OSC 2',
        params: [
            { name: 'Wave', cc: 32 },
            { name: 'Coarse', cc: 33 },
            { name: 'Fine', cc: 34 },
            { name: 'Duty', cc: 35 },
            { name: 'Ring', cc: 36 },
            { name: 'Sync', cc: 37 },
            { name: 'Attack', cc: 38 },
            { name: 'Decay', cc: 39 }
        ]
    },
    {
        name: 'OSC 2+',
        params: [
            { name: 'Sustain', cc: 40 },
            { name: 'Release', cc: 41 },
            { name: 'Output', cc: 42 },
            null, null, null, null, null
        ]
    },
    {
        name: 'OSC 3',
        params: [
            { name: 'Wave', cc: 48 },
            { name: 'Coarse', cc: 49 },
            { name: 'Fine', cc: 50 },
            { name: 'Duty', cc: 51 },
            { name: 'Ring', cc: 52 },
            { name: 'Sync', cc: 53 },
            { name: 'Attack', cc: 54 },
            { name: 'Decay', cc: 55 }
        ]
    },
    {
        name: 'OSC 3+',
        params: [
            { name: 'Sustain', cc: 56 },
            { name: 'Release', cc: 57 },
            { name: 'Output', cc: 58 },
            null, null, null, null, null
        ]
    }
];

/* === State === */

let currentPage = 0;
let shiftHeld = false;

/* Progressive LED init to avoid buffer overflow */
let ledInitPending = false;
let ledInitIndex = 0;
const LEDS_PER_FRAME = 8;

/* Store absolute values for all CCs (0-127) */
const paramValues = new Array(128).fill(64);

/* Knob CC numbers */
const KNOB_CCS = [MoveKnob1, MoveKnob2, MoveKnob3, MoveKnob4, MoveKnob5, MoveKnob6, MoveKnob7, MoveKnob8];

/* Pad note mapping */
const PAD_START_NOTE = 36;  /* C2 */

/* === Helper Functions === */

function getPadColor(padIndex) {
    const note = PAD_START_NOTE + padIndex;
    const isC = (note % 12) === 0;
    return isC ? BrightPink : Rose;
}

function getAllLEDsToInit() {
    const leds = [];
    /* Pads (32) */
    for (let i = 0; i < MovePads.length; i++) {
        leds.push({ note: MovePads[i], color: getPadColor(i) });
    }
    /* Page LEDs (8) */
    for (let i = 0; i < 8; i++) {
        leds.push({ note: MoveSteps[i], color: i === currentPage ? White : Black });
    }
    return leds;
}

function setupLedBatch() {
    const leds = getAllLEDsToInit();
    const start = ledInitIndex;
    const end = Math.min(start + LEDS_PER_FRAME, leds.length);

    for (let i = start; i < end; i++) {
        setLED(leds[i].note, leds[i].color);
    }

    ledInitIndex = end;
    if (ledInitIndex >= leds.length) {
        ledInitPending = false;
        ledInitIndex = 0;
    }
}

function updatePageLEDs() {
    for (let i = 0; i < 8; i++) {
        setLED(MoveSteps[i], i === currentPage ? White : Black);
    }
}

function getParamForKnob(knobIndex) {
    const page = pages[currentPage];
    if (!page || !page.params) return null;
    return page.params[knobIndex] || null;
}

function sendCC(cc, value) {
    /* Send to external MIDI (SIDaster on USB-A) */
    move_midi_external_send([0x2B, 0xB0, cc, value]);
}

function sendNoteOn(note, velocity) {
    move_midi_external_send([0x29, 0x90, note, velocity]);
}

function sendNoteOff(note) {
    move_midi_external_send([0x29, 0x80, note, 0]);
}

/* === Display === */

function drawGrid() {
    clear_screen();

    /* Header */
    const pageName = pages[currentPage]?.name || '???';
    print(2, 2, 'SIDControl', 1);
    const rightText = `[${pageName}]`;
    print(128 - (rightText.length * 6) - 2, 2, rightText, 1);

    /* Divider */
    fill_rect(0, 12, 128, 1, 1);

    /* Parameter grid: 4 rows x 2 columns */
    const page = pages[currentPage];
    if (!page) return;

    for (let row = 0; row < 4; row++) {
        const y = 15 + row * 12;

        /* Left column (knobs 1, 3, 5, 7) */
        const leftIdx = row * 2;
        const leftParam = page.params[leftIdx];
        if (leftParam) {
            const val = paramValues[leftParam.cc];
            const label = `${leftParam.name}:${val}`;
            print(2, y, label.substring(0, 10), 1);
        }

        /* Right column (knobs 2, 4, 6, 8) */
        const rightIdx = row * 2 + 1;
        const rightParam = page.params[rightIdx];
        if (rightParam) {
            const val = paramValues[rightParam.cc];
            const label = `${rightParam.name}:${val}`;
            print(66, y, label.substring(0, 10), 1);
        }
    }
}

function drawUI() {
    drawGrid();
    drawOverlay();
}

/* === MIDI Handlers === */

function onKnobTouch(knobIndex, pressed) {
    const param = getParamForKnob(knobIndex);
    if (!param) return;

    if (pressed) {
        showOverlay(param.name, paramValues[param.cc]);
    }
}

function onKnobTurn(knobIndex, ccValue) {
    const param = getParamForKnob(knobIndex);
    if (!param) return;

    /* Decode relative encoder with acceleration */
    const delta = decodeAcceleratedDelta(ccValue, `knob_${knobIndex}`);

    /* Update stored value */
    const oldValue = paramValues[param.cc];
    const newValue = Math.max(0, Math.min(127, oldValue + delta));
    paramValues[param.cc] = newValue;

    /* Send CC to SIDaster */
    sendCC(param.cc, newValue);

    /* Show overlay */
    showOverlay(param.name, newValue);
}

function onPageSelect(pageIndex) {
    if (pageIndex < 0 || pageIndex >= pages.length) return;
    currentPage = pageIndex;
    updatePageLEDs();
    hideOverlay();
}

function onPadPress(padIndex, velocity) {
    const note = PAD_START_NOTE + padIndex;
    setLED(MovePads[padIndex], White);
    sendNoteOn(note, velocity);
}

function onPadRelease(padIndex) {
    const note = PAD_START_NOTE + padIndex;
    setLED(MovePads[padIndex], getPadColor(padIndex));
    sendNoteOff(note);
}

/* === Global Handlers === */

globalThis.onMidiMessageInternal = function(data) {
    const status = data[0] & 0xF0;
    const channel = data[0] & 0x0F;
    const data1 = data[1];
    const data2 = data[2];

    /* Note messages */
    if (status === MidiNoteOn || status === MidiNoteOff) {
        const isNoteOn = status === MidiNoteOn && data2 > 0;

        /* Knob touch (notes 0-7) */
        if (data1 >= 0 && data1 <= 7) {
            onKnobTouch(data1, isNoteOn);
            return;
        }

        /* Step buttons (page select) */
        const stepIndex = MoveSteps.indexOf(data1);
        if (stepIndex >= 0 && stepIndex < 8 && isNoteOn) {
            onPageSelect(stepIndex);
            return;
        }

        /* Pads */
        const padIndex = MovePads.indexOf(data1);
        if (padIndex >= 0) {
            if (isNoteOn) {
                onPadPress(padIndex, data2);
            } else {
                onPadRelease(padIndex);
            }
            return;
        }
    }

    /* CC messages */
    if (status === MidiCC) {
        /* Shift tracking */
        if (data1 === MoveShift) {
            shiftHeld = data2 === 127;
            return;
        }

        /* Knob turns */
        const knobIndex = KNOB_CCS.indexOf(data1);
        if (knobIndex >= 0) {
            onKnobTurn(knobIndex, data2);
            return;
        }
    }
};

globalThis.onMidiMessageExternal = function(data) {
    /* Pass through external MIDI to LEDs if needed */
};

globalThis.init = function() {
    console.log('SID Control starting...');

    /* Initialize param values to center */
    for (let i = 0; i < 128; i++) {
        paramValues[i] = 64;
    }

    /* Start progressive LED init (host clears LEDs before loading overtake modules) */
    ledInitPending = true;
    ledInitIndex = 0;
};

globalThis.tick = function() {
    /* Continue progressive LED init if pending */
    if (ledInitPending) {
        setupLedBatch();
    }

    tickOverlay();
    drawUI();
};
