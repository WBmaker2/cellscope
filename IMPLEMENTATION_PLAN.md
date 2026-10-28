# CellScope — Implementation Plan

**Project name:** CellScope
**Folder:** `/Volumes/ External Drive 256G/Dev2/opencode/cellscope`
**Type:** Static educational SPA/PWA
**Runtime AI:** None. No LLM/API calls after build. All biology runs in the browser.
**Target learners:** Grades 5–9 (Korean 초5~중3)
**Subject:** Biology — cell structure, organelles, osmosis, mitosis
**MVP duration:** 3–4 weeks

---

## 0. One-page summary

CellScope is a 3D cell microscope built around a single question: **how does a cell keep its inside different from its outside, and how does it make a copy of itself?**

Students explore an animal cell and a plant cell, cut them open with a clipping plane, click organelles, and read what each part does. In the osmosis lab they change the concentration outside the cell and watch water particles move across the membrane while the cell swells, shrinks, or stays stable. In the mitosis lab they scrub through the stages of cell division and watch chromosomes separate.

The app is **not** an AI tutor. Every result comes from a deterministic particle and volume model. There are no generated explanations, no network calls, and no medical claims. The cell is a concept model, not a to-scale reconstruction.

**Why this is a strong build**

- 3D visual payoff with procedural geometry: a translucent cell, cutaway clipping, organelle meshes, chromosome rods, and particle flows.
- Real, testable biology: organelle functions, concentration gradients, osmotic equilibrium, plant turgor, and mitosis stage order have clear expected outcomes.
- Clear misconceptions to target: "the cell is flat", "water moves toward higher water concentration" (it moves toward higher solute concentration), "plant cells have no mitochondria", "mitosis is just splitting in half".
- The hard part is making an invisible process visible: particle diffusion, volume change, and stage transitions all need a coherent model.

**MVP shape**

- Animal cell and plant cell with 10–14 labeled organelles.
- Clipping plane cutaway with a cross-section cap.
- Osmosis lab with concentration slider, water particles, volume, and turgor readouts.
- Mitosis lab with six timeline stops (interphase through cytokinesis) and a simplified 4-chromosome model.
- Six missions, local progress, teacher mode, PWA.

---

## 1. Product definition

### 1.1 Learning problem

Students memorize organelle names from a flat diagram but cannot connect structure to function. Osmosis is especially hard because the direction of water movement is counterintuitive, and the difference between animal and plant cells in hypotonic solutions is often reduced to a sentence. Mitosis is taught as a sequence of static pictures, so students cannot explain what actually moves.

### 1.2 Learning goals

By the end of the core missions, a student should be able to:

- Identify the major organelles in animal and plant cells and state their functions.
- Explain the difference between a cell membrane and a cell wall.
- Predict the direction of water movement across a membrane from solute concentration.
- Explain why an animal cell can lyse while a plant cell becomes turgid.
- Explain what happens to a plant cell in a hypertonic solution (plasmolysis).
- Order the stages of mitosis and describe what chromosomes do in each stage.
- Distinguish a concept model from a real microscope image.

### 1.3 Core learning loop

1. **Predict** — the mission asks what will happen to the cell or the chromosomes.
2. **Set** — the student changes the concentration, moves the clipping plane, or scrubs the stage.
3. **Observe** — particles, volume, turgor, and chromosome positions update.
4. **Explain** — the student answers a short question using the evidence.
5. **Connect** — a one-sentence takeaway links the structure to its function.

### 1.4 Success criteria

- A student can label 10 organelles across both cell types.
- A student can predict swelling, shrinking, or no change for three concentrations.
- A student can explain why the plant cell does not burst.
- A student can explain plasmolysis.
- A student can order the mitosis stages and describe chromosome behavior.
- A teacher can reset progress, reveal answers, and print a worksheet without code changes.

---

## 2. Scope

### MVP (must ship)

- Animal cell model with membrane, cytoplasm, nucleus, nucleolus, mitochondria, rough ER, smooth ER, Golgi, ribosomes, lysosomes, and centrosomes.
- Plant cell model with cell wall, membrane, cytoplasm, nucleus, chloroplasts, central vacuole, mitochondria, ER, Golgi, and ribosomes.
- Organelle selection, highlight, label lines, and an information card.
- Clipping plane slider with a cross-section cap.
- Osmosis lab: extracellular concentration 0–600 mOsm/L, water particles, cell volume, turgor pressure, and state labels.
- Animal cell lysis and crenation thresholds.
- Plant cell wall limit and plasmolysis state.
- Mitosis lab with six timeline stops: interphase, prophase, metaphase, anaphase, telophase, and cytokinesis.
- Simplified 4-chromosome model with a visible "simplified" note.
- Stage scrubber, play/pause, and a stage-ordering quiz.
- Microscope-style 2D inset with a scale bar and "not to scale" warning.
- Six missions with prediction gates and explanations.
- Local progress, teacher reset, printable worksheet.
- Responsive layout, keyboard alternative, reduced motion.
- PWA install and offline cache.

### Later (do not build in the first pass)

- Meiosis and fertilization.
- Protein synthesis and the secretory pathway.
- Cellular respiration and photosynthesis pathways.
- Membrane channels and active transport.
- Microscope simulator with focus, staining, and objective lenses.
- Electron-microscope view.
- Organelle interaction animations.
- Classroom accounts or teacher dashboards.

### Out of scope

- Medical advice or diagnosis.
- Real cell dimensions or molecular dynamics.
- Full biochemistry or gene expression.
- Any server, database, login, or analytics.
- Any runtime AI or generated explanations.
- Claims that the model reproduces a real microscope image.

---

## 3. Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Build | Vite + TypeScript | Static output, fast iteration |
| 3D | Three.js | Translucent meshes, clipping planes, instanced particles |
| 2D inset | Canvas 2D | Microscope-style view and scale bar |
| Biology math | Pure TypeScript modules | Deterministic and unit-testable without a DOM |
| Math tests | Vitest | Osmosis, volume, stage order, organelle data |
| Browser tests | Playwright | Explore, osmosis, mitosis, accessibility |
| PWA | `vite-plugin-pwa` | Offline classroom use |
| Hosting | GitHub Pages / Cloudflare Pages | No server |

**Constraints**

- Node.js 20+.
- No backend, no API keys, no runtime network calls.
- No external textures or model files. Use procedural materials and system fonts.
- Target 60 fps on a mid-range laptop and ≥ 30 fps on a school tablet.
- Initial gzip bundle under 800 KB.
- All biology calculations must run without a DOM.

---

## 4. Architecture

### 4.1 Module map

```text
src/
  main.ts
  app/
    App.ts
    state.ts
    routes.ts
  bio/
    cellData.ts          cell types, organelles, functions
    osmosis.ts           concentration, flux, volume, turgor
    diffusion.ts         particle random walk and membrane crossing
    mitosis.ts           stage definitions and keyframes
    chromosomes.ts       simplified chromosome model
    constants.ts         osmolarity, thresholds, particle counts
    scale.ts             model scale and warnings
  render/
    CellScene.ts
    OrganelleMesh.ts
    Membrane.ts
    Clipping.ts
    ParticleField.ts
    ChromosomeField.ts
    Labels.ts
    CameraRig.ts
    shaders/
      membrane.glsl
  features/
    explorer/
    osmosis/
    mitosis/
    missions/
    teacher/
  data/
    cells.json
    missions.json
  ui/
    components/
    styles/
  storage/
    progress.ts
  tests/
    unit/
    e2e/
```

### 4.2 Coordinate frames and units

- Cell models use arbitrary scene units; a typical animal cell is 20 units across for readability.
- The scale note must state that the model is not to scale and that real cells are micrometers.
- Osmolarity is in mOsm/L; volume is relative to the initial volume (`V/V₀`).
- Turgor pressure is in arbitrary units or kPa-like units; label it as a relative model value.
- Never mix scene units into biology functions.

### 4.3 State

```ts
interface AppState {
  route: 'explore' | 'osmosis' | 'mitosis' | 'missions' | 'teacher';
  cell: {
    type: 'animal' | 'plant';
    selectedOrganelleId: string | null;
    clipping: number;          // 0..1, 0 = no cut
  };
  osmosis: {
    externalOsmolarity: number; // mOsm/L
    timeSec: number;
    playing: boolean;
    volumeRatio: number;
    turgor: number;
    state: 'lysed' | 'crenated' | 'isotonic' | 'turgid' | 'plasmolyzed';
  };
  mitosis: {
    stageIndex: number;         // 0..5
    progress: number;           // 0..1 within stage
    playing: boolean;
  };
  view: {
    showLabels: boolean;
    showMicroscopeInset: boolean;
    autoRotate: boolean;
  };
  mission: {
    currentId: string | null;
    prediction: string | null;
    completed: string[];
  };
  preferences: {
    reducedMotion: boolean;
  };
}
```

### 4.4 Persistence

- `localStorage` key: `cellscope.progress.v1`.
- Store completed missions, answers, last cell type, and view preferences.
- Do not store particle positions; regenerate from a fixed seed.
- Teacher reset clears progress after confirmation.
- No personal data.

---

## 5. Data model

### 5.1 Organelle

```ts
interface Organelle {
  id: string;
  nameKo: string;
  nameEn: string;
  functionKo: string;
  cellTypes: ('animal' | 'plant')[];
  color: string;
  shape: 'sphere' | 'ellipsoid' | 'rod' | 'stack' | 'network' | 'vacuole';
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  labelAnchor: { x: number; y: number; z: number };
}
```

Initial organelle set:

| Organelle | Animal | Plant | Core function |
|---|---|---|---|
| Cell membrane | ✓ | ✓ | Controls what enters and leaves |
| Cell wall | — | ✓ | Supports the cell and limits expansion |
| Cytoplasm | ✓ | ✓ | Holds organelles and supports reactions |
| Nucleus | ✓ | ✓ | Stores DNA and controls activities |
| Nucleolus | ✓ | ✓ | Makes ribosomes |
| Mitochondria | ✓ | ✓ | Releases energy from food |
| Ribosomes | ✓ | ✓ | Builds proteins |
| Rough ER | ✓ | ✓ | Folds and transports proteins |
| Smooth ER | ✓ | ✓ | Makes lipids and detoxifies |
| Golgi apparatus | ✓ | ✓ | Sorts and packages proteins |
| Lysosomes | ✓ | — | Breaks down waste |
| Centrosomes | ✓ | — | Helps cell division |
| Chloroplasts | — | ✓ | Photosynthesis |
| Central vacuole | — | ✓ | Stores water and maintains turgor |

### 5.2 Cell type

```ts
interface CellType {
  id: 'animal' | 'plant';
  nameKo: string;
  boundary: 'membrane' | 'wall';
  shape: 'ellipsoid' | 'rounded-box';
  organelles: Organelle[];
}
```

### 5.3 Osmosis model

```ts
interface OsmosisState {
  internalOsmolarity: number;  // mOsm/L
  externalOsmolarity: number;  // mOsm/L
  volumeRatio: number;         // V / V0
  turgor: number;              // relative wall pressure
  state: 'lysed' | 'crenated' | 'isotonic' | 'turgid' | 'plasmolyzed';
}

const ISOTONIC_OSMOLARITY = 300;   // mOsm/L
const WATER_PERMEABILITY = 0.004;  // tuned for a 5–15 s experiment
const ANIMAL_LYSIS_VOLUME = 1.45;  // V/V0
const ANIMAL_CRENATION_VOLUME = 0.65;
const PLANT_MAX_VOLUME = 1.12;
const PLANT_PLASMOLYSIS_VOLUME = 0.82;
```

### 5.4 Mission

```ts
interface Mission {
  id: string;
  titleKo: string;
  concept: 'organelle' | 'osmosis' | 'plant' | 'mitosis' | 'scale';
  promptKo: string;
  setup: {
    cellType: 'animal' | 'plant';
    externalOsmolarity?: number;
    stageIndex?: number;
    selectedOrganelleId?: string;
  };
  options: string[];
  answer: string;
  explanationKo: string;
  takeawayKo: string;
  difficulty: 1 | 2 | 3;
}
```

### 5.5 Mitosis stages

```ts
type MitosisStage =
  | 'interphase'
  | 'prophase'
  | 'metaphase'
  | 'anaphase'
  | 'telophase'
  | 'cytokinesis';
```

Each stage has a duration, a one-sentence description, and a chromosome keyframe. Interphase is included as the preparation stage; mitosis proper begins at prophase. The MVP uses 4 chromosomes (2 pairs) and states that human cells have 46.

---

### 5.6 Mission content

The six missions are stored in `missions.json`. Each has a prediction gate and an explanation gate, and each loads a cell type and lab state.

1. `organelle-hunt` — **소기관을 찾아라**: find five named organelles in the 3D cell and match each to its function.
2. `animal-vs-plant` — **동물세포 vs 식물세포**: compare the two cells. Predict which structures are unique to the plant cell; verify by selecting them.
3. `osmosis-predict` — **물은 어디로 갈까?**: test hypotonic, isotonic, and hypertonic solutions. Predict the volume change before running each case.
4. `plant-wall` — **식물세포는 왜 터지지 않을까?**: put a plant cell in a hypotonic solution, then a strongly hypertonic one. Explain turgor and plasmolysis.
5. `mitosis-order` — **분열 순서**: order the six timeline stops from interphase through cytokinesis.
6. `mitosis-explain` — **염색체는 어떻게 나뉠까?**: scrub to anaphase. Predict what happens to sister chromatids and explain the role of the spindle.

---

## 6. Core algorithms

### 6.1 Cell and organelle rendering

- Animal cell: a low-poly ellipsoid with a translucent membrane and a slightly opaque cytoplasm.
- Plant cell: a rounded box with a thick translucent cell wall, a membrane inside it, and a large central vacuole.
- Organelles are simple procedural meshes placed from `cells.json`.
- Use `MeshPhysicalMaterial` sparingly; a simpler `MeshStandardMaterial` with transparency is enough for tablets.
- Sort transparent objects explicitly or accept minor artifacts; the clipping plane makes interior visibility the priority.
- Use a CSS2D or sprite-based label layer; hide labels behind the cell when occluded if the cost is acceptable, otherwise show them only for the selected organelle.

### 6.2 Clipping and cutaway

- Use a Three.js clipping plane on the cell group.
- A slider moves the plane from outside the cell to the center.
- Add a cap disk at the clip plane with a translucent cross-section color so the cell does not look hollow.
- The cap is a visual aid, not a computed cross-section.
- When the clip is active, dim the outer membrane and brighten the organelles near the cut.
- Provide a "reset cut" button and a keyboard shortcut.

### 6.3 Osmosis model

Use a simplified two-compartment model:

```text
C_in = n_in / V
J_v = WATER_PERMEABILITY × (C_in - C_out)
dV/dt = J_v
```

- `n_in` is constant (the cell does not gain or lose solute in this model).
- When `C_out < C_in`, water enters (`dV/dt > 0`).
- When `C_out > C_in`, water leaves (`dV/dt < 0`).
- Integrate with a fixed timestep (e.g., 1/60 s) and a time scale so the experiment reaches equilibrium in 5–15 seconds.
- As `V` changes, `C_in` changes, so the model self-limits at equilibrium.

Animal cell:

- If `V/V₀ ≥ 1.45` → lysis state; clamp volume and stop the simulation.
- If `V/V₀ ≤ 0.65` → crenation state; clamp volume.
- Otherwise the cell is stable or swollen.

Plant cell:

- The cell wall limits expansion: `V/V₀ ≤ 1.12`.
- Turgor pressure rises as the cell approaches the wall limit:

```text
turgor = clamp((V/V₀ - 1) / (PLANT_MAX_VOLUME - 1), 0, 1)
```

- If `V/V₀ ≤ 0.82`, the membrane pulls away from the wall → plasmolysis state.
- The plant cell never lyses in this model; the wall is the reason.

**Honesty:** this is a teaching model, not a real osmotic pressure calculation. The UI must show the assumptions.

### 6.4 Particle visualization

- Water particles are instanced small spheres or points.
- Inside and outside regions have separate particle counts proportional to their current water amount.
- Each particle does a seeded random walk; near the membrane, a crossing probability is biased by the sign and magnitude of `J_v`.
- Do not simulate every water molecule; use a few hundred representative particles and label them "대표 입자".
- Solute particles (optional toggle) move by diffusion; the membrane is impermeable to them in the osmosis lab.
- Use a fixed timestep and a seeded PRNG so screenshots and tests are deterministic.
- When reduced motion is on, replace particles with static arrows and a numeric flux readout.

### 6.5 Diffusion (optional layer)

- Solute particles perform a random walk in both compartments.
- If a channel is open, a particle can cross with a probability proportional to the concentration difference.
- This layer is a visual companion to osmosis, not a separate quantitative model.
- Label it "확산 개념 모형" and keep it off by default.

### 6.6 Mitosis model

The mitosis lab is a keyframed animation, not a molecular simulation:

| Stage | Chromosomes | Nuclear envelope | Spindle | Cell shape |
|---|---|---|---|---|
| Interphase | Chromatin (thin threads) | Intact | Not visible | Normal |
| Prophase | Condensed rods | Breaking down | Forming | Normal |
| Metaphase | Aligned at the equator | Gone | Fully formed | Normal |
| Anaphase | Sister chromatids separate | Gone | Pulling | Elongating |
| Telophase | Two clusters at poles | Reforming | Disassembling | Pinching |
| Cytokinesis | Two nuclei | Intact | Gone | Two cells |

- Use 4 chromosomes (2 pairs) for clarity; state that this is a simplified model.
- Each stage has a normalized progress `0..1`; interpolate chromosome positions and nuclear envelope opacity.
- The spindle is drawn as lines from poles to chromosomes.
- The stage scrubber shows the current stage and a short description.
- The stage-ordering quiz asks the student to place six cards in order.

**Test:** stage order is fixed; anaphase always separates sister chromatids; cytokinesis produces two cells.

### 6.7 Microscope inset

- A 2D canvas in the corner shows a stylized field of view.
- Animal cell: organelles scattered in a round field; plant cell: a grid-like wall and chloroplasts.
- A scale bar shows "10 µm (모형)" and a "not to scale" note.
- Optional focus slider blurs the inset; this is cosmetic and does not affect the model.
- The inset is a visual aid, not a real microscope simulation.

### 6.8 Selection and labels

- Raycast against organelle meshes; select the nearest hit.
- Highlight the selected organelle with an outline or emissive boost.
- Show a label line and an information card with name, function, and cell types.
- The organelle list is a keyboard-accessible alternative to clicking in 3D.
- Clicking empty space clears the selection.

### 6.9 Determinism

- Seeded PRNG for particle positions and jitter.
- Fixed timestep for osmosis and mitosis.
- Same initial state and seed → same particle counts, volume curve, and screenshots.
- Tests use tolerance 1e-6 for volume and 1e-9 for concentration.

---

## 7. Screens and UX

### 7.1 Explorer screen

- **Center:** 3D cell with orbit controls.
- **Left:** cell type toggle, organelle list, clipping slider.
- **Right:** information card for the selected organelle.
- **Bottom:** mission strip and a "microscope view" toggle.
- **Top:** labels, cutaway, reset, help.

### 7.2 Osmosis lab

- **Center:** a beaker with the cell and solution; particles inside and outside.
- **Left:** concentration slider with labels (저장액 / 등장액 / 고장액) and presets.
- **Right:** gauges for volume ratio, internal osmolarity, turgor, and state.
- **Bottom:** play/pause, reset, and a time readout.
- **Feedback:** the cell visibly swells or shrinks; the plant wall resists expansion; plasmolysis pulls the membrane away from the wall.

### 7.3 Mitosis lab

- **Center:** 3D cell with chromosomes and spindle.
- **Bottom:** stage timeline with six labeled stops and a play/pause control.
- **Right:** stage description and chromosome count.
- **Top:** reset, labels, and a "simplified model" badge.
- **Quiz:** a drag-free ordering exercise with clickable cards.

### 7.4 Mission screen

- Prediction card with a question and 3–4 options.
- The lab is set to the mission scenario.
- The student explores, then answers the explanation question.
- On success: explanation, takeaway, and a "next mission" button.
- On failure: a hint that points to the evidence, not the answer.

### 7.5 Teacher mode

- Mission list with concepts, answers, and explanations.
- Preset scenarios for animal/plant osmosis and mitosis.
- Reset progress.
- Print a worksheet with a cell diagram and blank labels.
- Toggle answer visibility for classroom projection.

### 7.6 Responsive layout

**Desktop (≥ 1024 px)**

- Three columns: controls, viewport, information card.

**Tablet (768–1023 px)**

- Viewport with collapsible drawers.

**Phone (< 768 px)**

- Viewport at the top; bottom sheet tabs: Explore | Osmosis | Mitosis | Mission.
- Large touch targets for organelles and the concentration slider.
- Pinch to zoom; two-finger orbit.

### 7.7 Accessibility

- Keyboard: `Tab` through the organelle list, `Enter` to select, `C` to toggle clipping, `O`/`M` to switch labs.
- Every 3D state has a text summary: cell type, selected organelle, volume ratio, turgor, stage.
- Screen reader announces selection and state changes.
- Respect `prefers-reduced-motion`: no auto-rotation, no particle animation; use static arrows and numbers.
- Do not encode organelle identity by color alone; show names and labels.
- Provide a "read the cell" panel that lists organelles and functions in words.
- Ensure the concentration slider is a native range input with a text value.

---

## 8. Implementation milestones

### M0 — Setup (0.5 day)

- Scaffold Vite + TypeScript + Three.js.
- Add Vitest, Playwright, ESLint, Prettier, PWA plugin.
- Create the module map and a translucent sphere.
- **Verify:** dev server, build, and tests run.

### M1 — Cell data and models (3–4 days)

- Author `cells.json` with organelles, positions, and functions.
- Build the animal and plant cell meshes.
- Add selection, highlighting, labels, and the information card.
- **Verify:** every organelle is selectable and has a correct function.

### M2 — Clipping and microscope inset (2 days)

- Add the clipping plane, cap disk, and slider.
- Build the 2D microscope inset and scale warning.
- **Verify:** the cutaway reveals interior organelles without z-fighting.

### M3 — Osmosis core (3–4 days)

- Implement the concentration, volume, turgor, and state model.
- Write unit tests for hypotonic, isotonic, and hypertonic cases.
- Add the particle field and membrane crossing.
- **Verify:** animal cell lyses/shrinks; plant cell becomes turgid/plasmolyzed; no NaNs.

### M4 — Mitosis lab (3 days)

- Implement the six stage keyframes and chromosome animation.
- Add the spinner, scrubber, and stage descriptions.
- Add the stage-ordering quiz.
- **Verify:** stage order and chromosome behavior are correct.

### M5 — Missions and teacher mode (2–3 days)

- Author six missions with prediction and explanation gates.
- Add progress persistence, teacher reset, and the printable worksheet.
- **Verify:** each mission can be completed from a fresh state.

### M6 — Responsive, accessibility, PWA (2 days)

- Implement the layouts.
- Add keyboard controls, text summaries, reduced motion.
- Configure offline caching.
- **Verify:** keyboard-only completion; offline reload.

### M7 — QA and pilot (2 days)

- Run all tests and screenshot checks.
- Test on a low-end tablet.
- Ask 3–5 students to try the osmosis and mitosis labs.
- Fix the top usability issues.
- Deploy.
- **Verify:** acceptance criteria below are met.

---

## 9. Testing and verification

### Unit tests (Vitest)

- Every organelle has a non-empty Korean name and function.
- Animal cell includes mitochondria; plant cell includes chloroplasts and a wall.
- Osmosis: `C_out < 300` increases volume; `C_out > 300` decreases volume; `C_out = 300` is stable.
- Animal lysis threshold and crenation threshold.
- Plant maximum volume and plasmolysis threshold.
- Turgor increases monotonically with volume in the plant model.
- Mitosis stage order and chromosome count.
- Anaphase separates sister chromatids.
- Cytokinesis produces two cells.
- Particle simulation is deterministic for a fixed seed.
- Volume curve reaches equilibrium without oscillation.

### Interaction tests (Playwright)

- Switch animal/plant and select an organelle.
- Move the clipping slider and confirm the interior is visible.
- Change the concentration and confirm the cell volume changes.
- Trigger lysis, crenation, turgor, and plasmolysis.
- Scrub the mitosis stages and confirm the labels.
- Complete the stage-ordering quiz.
- Complete a mission correctly and incorrectly.
- Reset progress in teacher mode.
- Keyboard-only path through the organelle mission.

### Visual tests

- Screenshot the animal and plant cells with and without clipping.
- Screenshot the osmosis lab in three concentration states.
- Screenshot each mitosis stage.
- Run at 1440×900, 1024×768, and 390×844.
- Check that the "not to scale" and "simplified model" badges are visible.

### Accessibility checks

- `axe-core` scan with no critical issues.
- Keyboard reaches every control.
- Reduced motion stops particles and auto-rotation.
- Text summary matches the current cell and lab state.
- Organelle identity is not conveyed by color alone.

### Performance budget

- 60 fps on a mid-range laptop; ≥ 30 fps on a school tablet.
- Cap particles at 600 and chromosomes at 8.
- No per-frame geometry rebuild.
- Pause rendering when the tab is hidden.
- DPR clamp to 2.
- Initial load < 2.5 s on simulated 4G.

---

## 10. Acceptance criteria / Go-No-Go

- [ ] Animal and plant cells are visually distinct and have the correct organelles.
- [ ] Every organelle is selectable and shows a correct function.
- [ ] The clipping plane reveals the interior with a visible cross-section cap.
- [ ] Hypotonic, isotonic, and hypertonic solutions produce the correct volume change.
- [ ] The animal cell lyses and crenates at the defined thresholds.
- [ ] The plant cell becomes turgid but does not lyse.
- [ ] The plant cell shows plasmolysis in a strongly hypertonic solution.
- [ ] The six timeline stops are ordered correctly, from interphase through cytokinesis.
- [ ] Anaphase separates sister chromatids; cytokinesis produces two cells.
- [ ] Six missions are playable, scored, and saved locally.
- [ ] Teacher reset works.
- [ ] Keyboard-only mission completion works.
- [ ] Reduced motion is respected.
- [ ] The app works offline after the first load.
- [ ] No runtime network calls to an AI service or backend.
- [ ] The "concept model, not to scale" notice is visible.

If the osmosis or mitosis tests fail, stop and fix the model before adding missions.

---

## 11. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Osmosis direction is taught backwards | Core misconception | Unit tests for three concentrations; explicit "water moves toward higher solute" explanation |
| Animal lysis is shown as a real medical outcome | Overclaim | Label it a model; no medical advice; low-stakes visuals |
| Plant cell is shown bursting | Wrong biology | Hard wall limit; turgor model; explicit plasmolysis state |
| Translucent rendering is slow or glitchy | Unusable on tablets | Low-poly meshes, sorted transparency, cap disk, quality tiers |
| Organelle positions are mistaken for real anatomy | Misconception | "Concept model" badge; no real scale claims |
| Mitosis is shown with 46 chromosomes and becomes cluttered | Poor readability | Use 4 chromosomes; state the simplification |
| Particle animation causes motion sickness | Discomfort | Reduced-motion mode with static arrows |
| Clicking small organelles is hard on a phone | Usability | Organelle list and large touch targets |
| Students think the microscope inset is a real image | Misconception | "모형" scale bar and "not to scale" label |

---

## 12. AI build guide

Use the AI coding agent for scaffolding, the osmosis model, particle animation, mitosis keyframes, tests, and screenshot-driven fixes. Biology is easy to make visually plausible but wrong, so tests and teacher review are mandatory.

### Recommended build order

1. Scaffold Vite + TypeScript + Three.js with tests.
2. Author the cell data and validate organelle completeness.
3. Build the animal and plant cell meshes and selection.
4. Add clipping and the microscope inset.
5. Implement osmosis math and unit tests.
6. Add particles and the osmosis UI.
7. Add mitosis keyframes and the stage quiz.
8. Add missions and teacher mode.
9. Do responsive/accessibility passes.
10. Use screenshots at three viewports and fix visual regressions.

### Prompt rules

- State the constraint: “No backend, no runtime AI, no network calls.”
- Require a test for every osmosis rule and stage transition.
- Ask the agent to explain the concentration/volume model before coding.
- Use exact expected states in tests, not only screenshots.
- Never let the app claim medical or diagnostic value.
- Provide screenshots when fixing transparency or clipping issues.

### What not to delegate

- The decision that the simplified osmosis model is pedagogically acceptable.
- The final review of organelle functions and plant/animal differences.
- Accessibility judgment.
- Classroom pilot feedback.

### Definition of done

- All biology and interaction tests pass.
- The acceptance checklist is complete.
- A teacher can run the six missions without developer help.
- The model's simplifications are visible in the UI.

---

## 13. Future extensions

- Meiosis and fertilization.
- Protein synthesis and the secretory pathway.
- Cellular respiration and photosynthesis.
- Membrane channels and active transport.
- Microscope simulator with focus, staining, and objective lenses.
- Electron-microscope view.
- Organelle interaction animations.
- Classroom worksheet generator.
- Localization.

---

## 14. References

- Khan Academy — Cells: https://www.khanacademy.org/science/biology/structure-of-a-cell
- OpenStax Biology 2e — Cell structure: https://openstax.org/books/biology-2e/
- NCBI Bookshelf — Molecular Biology of the Cell: https://www.ncbi.nlm.nih.gov/books/NBK21054/
- Three.js documentation: https://threejs.org/docs/
- MDN Web APIs: https://developer.mozilla.org/en-US/docs/Web/API
- WCAG 2.2 quick reference: https://www.w3.org/WAI/WCAG22/quickref/

---

**Plan version:** 1.0
**Created:** 2026-10-28
**Next step:** scaffold the project, then implement M1 (cell data + organelle models + tests) before building the osmosis lab.
