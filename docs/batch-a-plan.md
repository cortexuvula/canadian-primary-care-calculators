# Batch A implementation scope and TDD plan

Authorized baseline: aaf0eb9f190c890c71bbbb8cc3148c18bf32caab. Exactly R01/R04/R05/R07/R08/R25/R32/R34/R35/R39/R40; expected 26 calculators. Clinical authority: Doc's 2026-10-27 Batch A contract and independent raw vectors. No deferred families, treatments, diagnoses, patient identifiers, persistence or live installation.

## Decisions
- Separate `batch-a-engine.js`, registry and groups; original engine, expansion registry and existing goldens remain byte-identical. Registry changes only import/spread the additions.
- Preserve full-precision raw Doc fixture. Normalize choice values to strings; LR arrays to comma-separated decimal input text. Add explicit `outputUnit: mg/mmol` to vector inputs (Doc's raw vectors contain both outputs, but omit this required presentation choice). Both unit outputs remain available; selection controls primary order in results/copy. Multi-LR vectors deliberately acknowledge conditional independence. No UI clinical defaults.
- Date-only controls use explicit civil dates, strict Gregorian validation and UTC day arithmetic; no Today default. LR control is labelled bounded decimal-list text, never code/eval; 1–20 finite positive LRs, commas/whitespace separated. Multi-LR independence confirmation required. Log-odds arithmetic avoids product overflow; unrepresentable probabilities block instead of claiming certainty.
- Scores have fully labelled criteria; CIWA-Ar unanchored intermediate points explicitly labelled as such rather than invented severity definitions. Source form freely reproducible, with attribution.
- Preserve Precision Console. Existing snapshot machinery already invalidates on all edits and clears on switching/reset. Add date/list input rendering only; no persistence change.
- Version 0.4.0 preview, explicit source/runtime/public allowlists. Rebind changed hashes, never remove equality guards. Public SDK acquisition remains separate from offline verification.

## Vertical test-first slices
1. For each calculator: add its independent valid/guard tests, observe missing-feature failure; implement its pure calculation and registry/groups; run focused tests. Supplement every component option, piecewise boundary and numerical hazard.
2. Add compiled date/list journey tests; observe baseline rendering failure; implement typed controls. Verify blank choices, timepoint/date qualification, unit selection, independence acknowledgement, error focus, stale copy/reset/switch and offline privacy.
3. Run original and new full suites; extend mutation probes without weakening existing tests. Update intentional inventory/version assertions and integrity manifests with reasons.
4. Exercise compiled browser modes (adapter and pinned public Button/Input), 320/640/1200 widths, light/dark/enlarged text, actual synthetic screenshots. Verify admission/catalog gates and deterministic clean-commit release assets twice.
5. Commit clean source, exact inventory/assets/digests and external implementation report. Release the two pre-created independent report-only reviews; completion is not clinical/code approval or authorization to publish/install.
