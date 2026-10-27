# Sources and third-party notices

The MIT licence applies to Andre Hugo's original implementation and documentation, not to linked articles, third-party works, model names or trademarks. These are independent implementations of published equations, coefficients and scoring point values, with original surrounding wording. No source article, spreadsheet, copyrighted questionnaire/instrument text, logo, font or other third-party asset is redistributed. Citations are scientific attribution, not a permission grant or an endorsement. No legal or regulatory certification is claimed.

The Framingham calculator is not affiliated with or endorsed by the Framingham Heart Study.

## Scientific sources (same links as the runtime)

### Framingham 10-year general CVD risk

- [D’Agostino et al., Circulation 2008](https://pubmed.ncbi.nlm.nih.gov/18212285/)
- [FHS official coefficients and lipid spreadsheet](https://www.framinghamheartstudy.org/fhs-for-researchers/fhs-risk-functions/cardiovascular-disease-10-year-risk/)
- [CCS FRS 2017](https://ccs.ca/app/uploads/2020/12/FRS_eng_2017_fnl1.pdf)
- [BC Guidelines Appendix B, December 2021](https://www2.gov.bc.ca/assets/gov/health/practitioner-pro/bc-guidelines/gpac_cardiovasculardisease_appendixb_dec2021.pdf)
- [BC CVD primary prevention guideline](https://www2.gov.bc.ca/gov/content/health/practitioner-professional-resources/bc-guidelines/cardiovascular-disease)

### HOMA1-IR

- [Matthews et al., Diabetologia 1985](https://pubmed.ncbi.nlm.nih.gov/3899825/)
- [Knopp et al., insulin units, 2019 (abstract; numeric recommendation full text not retrieved)](https://pubmed.ncbi.nlm.nih.gov/30318910/)
- [Wallace et al., Use and abuse of HOMA modeling, 2004](https://pubmed.ncbi.nlm.nih.gov/15161807/)

### eGFR CKD-EPI 2021

- [Inker et al., NEJM 2021](https://pubmed.ncbi.nlm.nih.gov/34554658/)
- [NIDDK GFR equations and limitations](https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/kidney-disease/laboratory-evaluation/glomerular-filtration-rate/estimating)

### Adult BMI

- [Health Canada, Canadian Guidelines for Body Weight Classification in Adults](https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/healthy-weights/canadian-guidelines-body-weight-classification-adults/questions-answers-public.html)
- [Douketis et al., CMAJ 2005](https://pubmed.ncbi.nlm.nih.gov/15824401/)

### Body surface area — Mosteller

- [Mosteller, NEJM 1987](https://pubmed.ncbi.nlm.nih.gov/3657876/)

### APRI

- [Wai et al., Hepatology 2003](https://pubmed.ncbi.nlm.nih.gov/12883497/)

### Anion gap

- [Figge et al., Crit Care Med 1998](https://pubmed.ncbi.nlm.nih.gov/9824071/)
- [Emmett & Narins, Medicine 1977;56:38–54](https://pubmed.ncbi.nlm.nih.gov/401925/)

### Glucose-corrected sodium

- [Katz, NEJM 1973](https://pubmed.ncbi.nlm.nih.gov/4763428/)
- [Hillier et al., Am J Med 1999](https://pubmed.ncbi.nlm.nih.gov/10225241/)

### QTc

- [Sagie et al., Am J Cardiol 1992](https://pubmed.ncbi.nlm.nih.gov/1519533/)
- [Bazett, Heart 1920;7:353–70](https://doi.org/10.1136/hrt.7.4.353)
- [Fridericia, Acta Med Scand 1920;53:469–86](https://doi.org/10.1111/j.0954-6820.1920.tb18266.x)
- [Hodges, Salerno & Erlien, JACC 1983;1:694 (citation)](https://pubmed.ncbi.nlm.nih.gov/?term=Hodges+Salerno+Erlien+QT+1983)

### HOMA1-B beta-cell function

- [Matthews et al., Diabetologia 1985](https://pubmed.ncbi.nlm.nih.gov/3899825/)
- [Knopp et al., insulin units (abstract)](https://pubmed.ncbi.nlm.nih.gov/30318910/)

### QUICKI

- [Katz et al., JCEM 2000](https://pubmed.ncbi.nlm.nih.gov/10902785/)
- [Knopp et al., insulin units (abstract)](https://pubmed.ncbi.nlm.nih.gov/30318910/)

### CHA₂DS₂-VASc

- [Lip et al., Chest 2010](https://pubmed.ncbi.nlm.nih.gov/19762550/)
- [CCS 2020 AF guideline: stroke prevention / CCS algorithm](https://ccs.ca/guideline/2020-atrial-fibrillation/chapter-8-stroke-prevention/)
- [BC Guidelines: atrial fibrillation](https://www2.gov.bc.ca/gov/content/health/practitioner-professional-resources/bc-guidelines/atrial-fibrillation)

### HAS-BLED

- [Pisters et al., Chest 2010](https://pubmed.ncbi.nlm.nih.gov/20299623/)
- [ClinCalc HAS-BLED definitions](https://clincalc.com/Cardiology/HASBLED.aspx)

### FIB-4

- [Sterling et al., Hepatology 2006](https://pubmed.ncbi.nlm.nih.gov/16729309/)
- [2024 FIB-4 diagnostic accuracy meta-analysis; clinical thresholds](https://doi.org/10.3350/cmh.2024.0330)

### Cockcroft–Gault creatinine clearance

- [Cockcroft & Gault, Nephron 1976](https://pubmed.ncbi.nlm.nih.gov/1244564/)

## Host and development dependencies

The runtime has external imports only: `@hermes/plugin-sdk`, `react`, and `react/jsx-runtime`. Desktop supplies these; no copy of the host SDK or React is bundled in `plugin.js`. React is MIT licensed (Meta Platforms, Inc. and affiliates). Hermes Agent's SDK is MIT licensed (Nous Research).

Development dependencies are installed through npm, not vendored. Their own licences remain applicable: Playwright (Microsoft, Apache-2.0), esbuild (Evan Wallace, MIT), React/React DOM (Meta, MIT), @tabler/icons-react (Tabler, MIT), class-variance-authority (Joe Bell, Apache-2.0), clsx (Luke Edwards, MIT), radix-ui (WorkOS, MIT), tailwind-merge (Dany Castillo, MIT). Transitive dependencies retain their package licences. The lockfile pins the full dependency graph; inspect package licence files in node_modules when redistributing those dependencies.

The optional test-only SDK fixture must be explicitly provisioned from exact upstream files and the upstream LICENSE at the public commit recorded in `e2e/sdk-fixture.json` (see [setup](docs/sdk-fixture.md)). CI acquisition is separate from the offline JS verifier; they live in ignored `.browser/sdk/`, are used only by the browser harness, and are excluded from the source/distributable ZIP. Screenshots depict our own UI with synthetic data, system fonts and no copied third-party image assets.
