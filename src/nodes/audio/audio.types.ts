import { s, type Infer } from '@collidor/struct'

export const AudioEventSchema = s.struct({
  time: s.number().describe('AudioContext start timestamp in seconds or cycle offset'),
  duration: s.number().describe('Duration in seconds'),
  note: s.string().optional().describe('Pitch note (e.g. C4, Eb3) or sample identifier'),
  freq: s.number().optional().describe('Frequency in Hz'),
  velocity: s.number().default(0.8).optional().describe('Velocity/gain amplitude from 0.0 to 1.0'),
  pan: s.number().default(0.0).optional().describe('Stereo pan from -1.0 (L) to +1.0 (R)'),
  params: s.record(s.any()).optional().describe('Arbitrary synthesis parameters'),
})

export type AudioEvent = Infer<typeof AudioEventSchema>

const NOTE_OFFSETS: Record<string, number> = {
  c: 0,
  'c#': 1,
  db: 1,
  d: 2,
  'd#': 3,
  eb: 3,
  e: 4,
  f: 5,
  'f#': 6,
  gb: 6,
  g: 7,
  'g#': 8,
  ab: 8,
  a: 9,
  'a#': 10,
  bb: 10,
  b: 11,
}

/**
 * Converts a note name (e.g., "A4", "C3", "eb4", "F#5") or MIDI number to frequency in Hz.
 * Defaults A4 = 440 Hz (MIDI 69).
 */
export function noteToFrequency(noteOrMidi: string | number): number {
  if (typeof noteOrMidi === 'number') {
    // If it's already a frequency >= 20Hz, return as is (if < 20Hz treat as MIDI note number 0..127)
    if (noteOrMidi > 130) {
      return noteOrMidi
    }
    return 440 * Math.pow(2, (noteOrMidi - 69) / 12)
  }

  const str = String(noteOrMidi).trim().toLowerCase()
  if (!str) return 440

  // Direct numeric string (e.g. "440" or "69")
  if (!Number.isNaN(Number(str))) {
    return noteToFrequency(Number(str))
  }

  // Regex parse note + optional accidental + optional octave
  const match = str.match(/^([a-g](?:#|b)?)(-?\d+)?$/)
  if (!match) {
    return 440
  }

  const noteName = match[1]
  const octave = match[2] !== undefined ? parseInt(match[2], 10) : 4

  const semitone = NOTE_OFFSETS[noteName] ?? 9
  // MIDI note: C-1 is 0, C4 is 60, A4 is 69
  const midi = (octave + 1) * 12 + semitone
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * Converts frequency in Hz to closest MIDI note number.
 */
export function frequencyToMidi(freq: number): number {
  if (freq <= 0) return 0
  return Math.round(69 + 12 * Math.log2(freq / 440))
}
