# Ticket 027: Multi-Input Audio Summing and BaseGraph Connection Model

**Labels**: `wayfinder:task`
**Status**: Closed
**Blocked by**: None

---

## Question

How does Axon support multiple audio outputs connecting into a single audio input (such as `lead-synth:audioOut`, `bass-synth:audioOut`, and `drum-sampler:audioOut` summing into `master-out:audioIn`), given that `BaseGraph.addEdge()` enforces a single-connection rule on input ports?

---

## Root Causes & Diagnosis

1. **BaseGraph Single Connection Rule for Standard Inputs**:
   - In `src/core/base.graph.ts` line 243:
     ```ts
     // Single connection rule for input ports: remove previous incoming connection to toId
     for (const [existingFrom, toSet] of this.#adjacencyMap.entries()) {
       if (toSet.has(toId) && existingFrom !== fromId) {
         toSet.delete(toId)
       }
     }
     ```
   - For standard scalar/control signals, an input can only receive one value.
   - However, in modular synthesizers and Web Audio, **audio signals and bus inputs are multi-in summing junctions** (a single mixer input or master bus accepts multiple incoming audio streams, and Web Audio GainNodes naturally sum inputs).
   - Because `BaseGraph` stripped prior edges to `toId`, connecting `drum-sampler-1:audioOut` to `master-out-1:audioIn` automatically deleted `bass-synth-1:audioOut` and `delay-fx-1:audioOut`!
2. **Audio Input Web Audio Handling**:
   - In `masterOutput.engine.ts` lines 94–113:
     ```ts
     public connectAudioInput(sourceVal: any): void {
       this.disconnectAudioInput() // Disconnects previous source!
       ...
     }
     ```
   - `MasterOutputNodeEngine` only tracked a single `connectedSourceNode`, disconnecting the previous one whenever a new source arrived.
   - It needs a set of connected sources: `connectedSourceNodes = new Set<any>()`.

---

## Requirements

1. In `src/core/base.graph.ts`:
   - Support multi-connection inputs when the port allows multiple inputs (e.g. `allowMultiple` flag on port or check if port type is audio/bus, or port metadata allows multi-connection).
   - Alternatively, identify audio ports by type (`'audio'` / `AUDIO_PORT` or check node engine port options) and preserve multiple incoming connections in `#adjacencyMap`.
2. In `src/nodes/audio/fx/masterOutput.engine.ts` (and FX engines if they support multi-input):
   - Support multiple simultaneous audio source inputs in `connectAudioInput(sourceVal)` using a Set/Map of connected nodes so all incoming audio buses sum into `masterGain`.
3. In `src/web-components/axonGraph.component.ts`:
   - Ensure `rebuildAdjacency()` and `draw()` draw all parallel incoming edges without overwriting or disappearing.
4. Add unit test verifying that multiple audio outputs can connect to `master-out-1:audioIn` simultaneously.
