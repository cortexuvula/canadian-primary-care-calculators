# Clinical scope, units and limitations

## What's included

**Included (15 calculators, 6 categories).** This plugin implements a fixed, named set of fifteen evidence-based calculators in Canadian units. It is **not** a comprehensive or universal clinical calculator library.

**Cardiovascular**
- Framingham 10-year general CVD risk (D'Agostino 2008, with the CCS/BC Canadian reporting layer)
- QTc (Bazett, Fridericia, Framingham/Sagie, Hodges — four named methods)
- CHA₂DS₂-VASc (Lip 2010 — stroke/TE risk score, not the CCS anticoagulation algorithm)
- HAS-BLED (Pisters 2010)

**Metabolic / Endocrine**
- HOMA1-IR (Matthews 1985 — original linear HOMA1)
- HOMA1-B beta-cell function (Matthews 1985 — linear HOMA1)
- QUICKI (Katz 2000)

**Renal**
- eGFR CKD-EPI 2021 (Inker 2021 — creatinine-only, race-free)
- Cockcroft–Gault creatinine clearance (1976)

**Hepatic**
- FIB-4 (Sterling 2006 equation; adopted clinical / age-adjusted bands)
- APRI (Wai 2003)

**Anthropometry**
- Adult BMI (Health Canada / WHO 2003 adult classification)
- Body surface area — Mosteller (1987)

**Electrolytes / Acid–base**
- Anion gap (potassium-excluded / potassium-included; Figge 1998 albumin correction)
- Glucose-corrected sodium (Katz 1973 / Hillier 1999 — deliberate choice)

**Deliberately not included.** HOMA2 (nonlinear Oxford engine, not a closed form); Canadian FRAX (unpublished coefficients); ASCVD/PCE/QRISK/SCORE2 (non-Canadian engines); MoCA/Epworth (copyrighted or licensed questionnaires); MELD/Child–Pugh (specialist transplant scope); corrected calcium and cystatin-C eGFR. These are intentional scope boundaries, not omissions to be assumed available.

## Canadian units

**All inputs and outputs use Canadian laboratory and clinical units.** Conversions are applied internally only where a published equation uses non-SI units, and are never silently mixed:

| Calculator | Inputs (Canadian) | Output |
|---|---|---|
| Framingham | total & HDL cholesterol **mmol/L**, systolic BP **mmHg**, age, sex | 10-year risk **%** |
| HOMA1-IR / HOMA1-B / QUICKI | fasting glucose **mmol/L**, fasting insulin **pmol/L** | index / % (see HOMA1 and insulin caveats below) |
| eGFR CKD-EPI 2021 | serum creatinine **µmol/L**, age, sex | **mL/min/1.73 m²** |
| Cockcroft–Gault | serum creatinine **µmol/L**, weight **kg**, age, sex | creatinine clearance **mL/min** (unindexed) |
| BMI | weight **kg**, height **cm** | **kg/m²** + class |
| BSA (Mosteller) | height **cm**, weight **kg** | **m²** |
| FIB-4 / APRI | AST & ALT **U/L**, platelets **×10⁹/L** (e.g. "220", not "220 000"), local AST ULN **U/L** | index |
| Anion gap | Na⁺, K⁺, Cl⁻, HCO₃⁻ **mmol/L**; albumin **g/L** | **mmol/L** |
| Glucose-corrected Na | sodium **mmol/L**, glucose **mmol/L** | **mmol/L** |
| QTc | QT **ms**, heart rate **bpm** | QTc **ms** |
| CHA₂DS₂-VASc / HAS-BLED | categorical choices (+ age in completed years) | points |

Internal conversion constants are single named values: cholesterol ×38.67; creatinine ÷88.4; glucose ×18.016; insulin pmol/L ÷6.0. They are not re-derived ad hoc.

## HOMA1 and insulin caveats

**HOMA1 only — this plugin does not compute HOMA2.** HOMA1-IR and HOMA1-B use the original linear HOMA1 equations of Matthews et al. (1985). HOMA2 is the newer nonlinear "Oxford" model (the HOMA2 Calculator) and is **not** a closed-form equation; it is **not reproduced or approximated** here. Results are **HOMA1**, not HOMA2, and are not interchangeable with HOMA2 outputs.

**Insulin conversion:** fasting insulin is entered in the Canadian unit **pmol/L** and converted internally to **mU/L by dividing by 6.0** (the human-insulin standard adopted for this project). The legacy ÷6.945 factor is **not** used.

**Insulin estimates require:** an overnight fast of ≥8 hours (water only); **endogenous** insulin (exogenous insulin or insulin analogues invalidate the estimate); and a non-diabetic or early untreated dysglycaemic population (established beta-cell failure and glucose-lowering treatment distort the estimate). Insulin assays are **not standardised** across laboratories — compare only within the same lab/assay. **No universal diagnostic cutoff** is applied to HOMA1-IR, HOMA1-B, or QUICKI; the circulating "QUICKI 0.45 = normal" figure is **not** a Katz-derived cutoff and is deliberately absent.

## Clinical use

**Clinician decision support only — not a diagnosis, not a treatment recommendation, not a substitute for clinical judgment.** Every result must be interpreted by a qualified clinician in the context of the individual patient. This plugin computes published formulas and scores; it does not diagnose, stage, or prescribe.

Specifically:
- **CHA₂DS₂-VASc is a stroke/thromboembolism risk score, not the Canadian anticoagulation rule.** The 2020 CCS AF guideline uses the **CCS algorithm ("CHADS-65")**, not CHA₂DS₂-VASc, for anticoagulation decisions. A score of 1 from female sex alone is **not** an anticoagulation indication.
- **A high HAS-BLED score is never an automatic reason to deny or withhold anticoagulation.** It identifies modifiable bleeding risk factors and prompts closer follow-up.
- **Cockcroft–Gault is unindexed creatinine clearance, not CKD-EPI eGFR**; no drug dose or dosing adjustment is calculated.
- **FIB-4 and APRI are screening/triage indices, not a cirrhosis diagnosis**; abnormal results prompt secondary assessment (e.g. elastography), not biopsy by default.
- **QTc, anion gap, corrected sodium, BMI, BSA, HOMA and QUICKI are calculated values**, not diagnoses or treatment targets.

## Applicability and limitations

Each calculator reflects the population in which its source model was derived. Key qualifications:
- **Framingham** — primary prevention, age 30–74, no established CVD/heart failure; not for familial/genetic dyslipidaemia or conditions that bypass the score (clinician-assessed). Estimate only; calibration varies by population.
- **eGFR CKD-EPI 2021** — adults, **stable** creatinine (not acute kidney injury); less reliable at extremes of muscle mass/habitus.
- **Cockcroft–Gault** — derived in 249 men aged 18–92; the female ×0.85 is an estimated adjustment. Obesity has **no consensus weight basis** — the module takes one clinician-supplied weight and applies **no** invented ideal/adjusted-weight formula. Unreliable in pregnancy, acute/unstable kidney injury, and extremes of muscle mass.
- **FIB-4** — derived in HIV/HCV coinfection; adopted clinical screening in NAFLD/MASLD. Less reliable below age 35 and with non-hepatic thrombocytopenia; age ≥65 uses an adjusted low cutoff. Not valid during an acute hepatitis episode. **No CASL-specific cutoff endorsement is claimed.**
- **APRI** — validated in treatment-naïve chronic HCV; other chronic liver disease use is off-label screening; the local AST upper limit of normal is an **editable input** (40 U/L suggested, never assumed).
- **BMI** — adults ≥18; Health Canada excludes pregnancy/lactation from classification (class is suppressed, numeric BMI retained); may misclassify muscular, very lean, not-fully-grown, and >65-year-old adults.
- **Glucose-corrected sodium (Hillier)** — derived in n=6 healthy subjects; the relation is nonlinear, and above ~400 mg/dL glucose a factor of ~4.0 is reported (flagged, **not** automatically applied).
- **QTc** — the QT interval must be measured manually/consistently; the plugin does not measure the ECG. Correction quality degrades outside RR 0.5–1.47 s (flagged, not clamped).

## Validation and testing

**Numerical validation (scoped to the finite, documented test vectors).** Every formula and score was independently re-derived from the published coefficients and checked against the compiled engine using a **finite, documented set of test vectors** — branch, boundary, and Canadian-unit-conversion cases — at full double precision (tolerance ≤1e-9, integer scores exact). This is not an exhaustive proof of every possible input: it establishes correctness for the tested vectors plus the independent derivation trace, not for all conceivable inputs. Automated unit, browser, and mutation test suites exercise each module; reproduction commands and their coverage are recorded in [verification](verification.md). Generated test output is local and gitignored, not redistributed as historical review evidence. No expected value was generated by the production code itself.

**What is not certified.** The numerical/source review does **not** constitute:
- **Regulatory approval or classification.** **No claim of regulatory approval, clearance, or licensing is made, and no regulatory classification (medical device or otherwise) is asserted.** The absence of a claimed approval does not by itself establish device or non-device status. This software has **not** been reviewed, approved, cleared, or licensed by Health Canada, the FDA, or any other regulator (see the Disclaimer below).
- **Live-host certification.** Automated tests run against the compiled plugin bytes in a headless harness with SDK control adapters (the pinned public SDK’s Button/Input implementations in the SDK test run). The full desktop loader, live sidebar mount, complete desktop theme/CSS, and the real operating-system clipboard are **not** exercised by the automated suite. Live-desktop and OS-clipboard behaviour should be treated as **unverified** at publication, not as passed.
- **A universal calculator or treatment recommendation.** Scope is fixed at the 15 named calculators (see What’s included above).

## Disclaimer

**Disclaimer.** This software is provided for educational and clinician-decision-support purposes. **No claim of regulatory approval, clearance, or licensing is made, and no regulatory classification is asserted** — this software has **not** been reviewed, approved, cleared, or licensed by Health Canada, the FDA, or any other regulatory authority, and the absence of such a determination does not by itself establish device or non-device status. It does **not** diagnose, treat, or prescribe, and it is **not** a substitute for the judgment of a qualified clinician. Synthetic or example data appear **only in documentation, screenshots, and test vectors**; in actual use a clinician may enter real patient measurements, and the plugin stores **no** clinical values. (Redistribution/licence terms are documented separately and are not a grant of regulatory approval.)
