import {framingham, homa, egfr} from './engine.js';
import {expansion} from './expansion-registry.js';
import {batchA} from './batch-a-registry.js';
const source = (title,url) => ({title,url,accessed:'2026-10-26'});
const pubmed = (title,pmid) => source(title,`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`);
const number = (id,label,unit,help) => ({id,label,unit,help,type:'number'});
const yesno = (id,label,help) => ({id,label,unit:'choice (unitless)',help,type:'choice',options:[{value:'yes',label:'Yes'},{value:'no',label:'No'}]});
const sex = {id:'sex',label:'Sex used by the published equation',unit:'model category (unitless)',type:'choice',help:'The source model supplies male/female coefficients only; no inference from identity or treatment. Applicability outside these model categories is not established.',options:[{value:'male',label:'Male coefficient'},{value:'female',label:'Female coefficient'}]};
const age = number('age','Age','completed years','Enter completed whole years; age limits below distinguish model applicability from engineering sanity guards.');
const review = 'Clinician decision support — verify applicability and consult the model references. Release review evidence is recorded in the project documentation.';
const frsInputs = {sex:'male',age:'55',tc:'5.5',hdl:'1.1',sbp:'135',treated:'no',smoker:'no',diabetes:'no',cvd:'no',genetic:'no',bypass:'no',family:'no'};
const homaInputs = {glucose:'5.8',insulin:'114',fasting:'yes',exogenous:'no',population:'yes'};
const egfrInputs = {sex:'female',age:'55',creatinine:'80',stable:'yes',habit:'no'};
export const registry = [
 {
  id:'framingham',name:'Framingham 10-year general CVD risk',category:'Cardiovascular',aliases:['FRS','cardiovascular','cholesterol'],version:"D’Agostino 2008 — exact lipid Cox equation + CCS/BC reporting layer",
  endpoint:'10-year general CVD: coronary death, MI, coronary insufficiency, angina, stroke, TIA, PAD and heart failure; not hard CHD or ASCVD.',
  applicability:'Primary prevention, age 30–74, no established CVD/HF. Not for familial/genetic dyslipidaemia or statin-indicated high-risk conditions that bypass FRS. Canadian doubling only at age 30–59, without diabetes, with premature first-degree family history. Estimate only; calibration varies by population. No diagnosis or treatment recommendation.',
  validation:'Age 30–74 is the derivation range. Public FHS Sheet_1 bounds (not cohort predictor validation): SBP 90–200 mmHg; TC 100–405 mg/dL; HDL 10–100 mg/dL; TC must exceed HDL. Positive finite numbers and whole-year age are numeric guards. Reject outside these bounds; do not clamp. Canadian doubled values above 100% are blocked, not capped.',
  conversion:'TC and HDL mmol/L × 38.67 = mg/dL. Exact public-tool bounds in Canadian units: TC 100/38.67 to 405/38.67 mmol/L; HDL 10/38.67 to 100/38.67 mmol/L. Approximate displayed decimals are not validation boundaries.',
  method:'Risk (%) = 100 × [1 − S0 ^ exp(ΣβX − C)]. Natural logs of age, TC/HDL in mg/dL and SBP. Men: S0=.88936, C=23.9802; β age=3.06117, TC=1.12370, HDL=−.93263, SBP untreated=1.93303 / treated=1.99881, smoker=.65451, diabetes=.57367. Women: S0=.95012, C=26.1931; β age=2.32888, TC=1.20904, HDL=−.70833, SBP untreated=2.76157 / treated=2.82263, smoker=.52873, diabetes=.69154. Indicators 0/1. Canadian reporting: multiply by 2 only for the specified family-history population. Low <10%, Intermediate ≥10% and <20%, High ≥20%, applied before display rounding. Paper point scores are approximations and can differ.',
  clinicalReview:review,
  sources:[pubmed("D’Agostino et al., Circulation 2008",'18212285'),source('FHS official coefficients and lipid spreadsheet','https://www.framinghamheartstudy.org/fhs-for-researchers/fhs-risk-functions/cardiovascular-disease-10-year-risk/'),source('CCS FRS 2017','https://ccs.ca/app/uploads/2020/12/FRS_eng_2017_fnl1.pdf'),source('BC Guidelines Appendix B, December 2021','https://www2.gov.bc.ca/assets/gov/health/practitioner-pro/bc-guidelines/gpac_cardiovasculardisease_appendixb_dec2021.pdf'),source('BC CVD primary prevention guideline','https://www2.gov.bc.ca/gov/content/health/practitioner-professional-resources/bc-guidelines/cardiovascular-disease')],
  inputs:[sex,age,number('tc','Total cholesterol','mmol/L','FHS public-tool bounds 100–405 mg/dL internally, approximately 2.586–10.473 mmol/L.'),number('hdl','HDL cholesterol','mmol/L','FHS public-tool bounds 10–100 mg/dL internally, approximately 0.259–2.586 mmol/L; below total cholesterol.'),number('sbp','Systolic blood pressure','mmHg','FHS public-tool bounds 90–200 mmHg.'),yesno('treated','Receiving antihypertensive treatment?','Select the treated or untreated coefficient deliberately.'),yesno('smoker','Current smoker?','Source-model smoking indicator.'),yesno('diabetes','Diabetes?','Source-model diabetes indicator. Separately assess whether a statin-indicated condition bypasses FRS.'),yesno('cvd','Established CVD or heart failure?','Includes coronary disease, stroke/TIA, PAD or HF. Yes blocks this primary-prevention tool.'),yesno('genetic','Familial hypercholesterolaemia or genetic dyslipidaemia?','Yes is outside this tool’s scope.'),yesno('bypass','Other statin-indicated high-risk condition bypassing FRS?','Clinician assessment required: e.g. clinical atherosclerosis/AAA; most diabetes by age/duration; CKD age ≥50 with eGFR <60 or ACR >3 mg/mmol. This is not an automated treatment checklist. Yes blocks the estimate.'),yesno('family','Premature CVD in a first-degree relative?','Relative affected before age 55 if male or before 65 if female. Canadian multiplier applies only if patient age 30–59 and no diabetes.')],
  outputs:[{key:'risk',label:'Base equation risk',unit:'%',decimals:1},{key:'modifiedRisk',label:'Canadian reporting risk',unit:'%',decimals:1}],
  calculate:framingham,
  interpretation:r=>`${r.band} Canadian risk band, based on the unrounded Canadian reporting risk. ${r.modifierApplied?'Premature-family-history doubling applied (Canadian adaptation, not part of the base equation).':'Canadian family-history doubling not applicable.'} Risk estimate only.`,
  vectors:[{inputs:frsInputs,expected:{risk:'14.6',modifiedRisk:'14.6'},provenance:'Doc §2.9 A, independently derived published coefficients'},{inputs:{...frsInputs,sex:'female',age:'30',tc:'4.65',hdl:'1.16',sbp:'125'},expected:{risk:'1.3'},provenance:'Doc §2.9 FHS spreadsheet cross-check'},{inputs:{...frsInputs,sex:'female',tc:'6',hdl:'1',sbp:'145',treated:'yes',smoker:'yes'},expected:{risk:'24.7'},provenance:'Doc §2.9 B'}]
 },
 {
  id:'homa1-ir',name:'HOMA1-IR',category:'Metabolic / Endocrine',aliases:['insulin','insulin resistance','HOMA'],version:'Matthews 1985 — original linear HOMA1',endpoint:'Fasting homeostasis-model insulin resistance index; not HOMA2.',
  applicability:'Overnight fast ≥8 h, water only; endogenous insulin; non-diabetic or early untreated dysglycaemia. Not valid with exogenous insulin or non-fasting samples; beta-cell failure and glucose-lowering treatment distort estimates. Assays are not standardised; compare only within the same lab/assay. No universal diagnostic cutoff. HOMA1, not HOMA2.',
  validation:'Require explicit fasting, exogenous-insulin and eligible-population answers. Positive finite glucose and insulin; block overflow/underflow. These are numeric sanity guards, not validated clinical min/max ranges. No diagnostic categories or cutoffs are applied.',
  conversion:'Insulin pmol/L ÷ 6.0 = mU/L (= µU/mL), per Doc’s human-insulin standard decision. Do not use the legacy ÷6.945 factor. The exact numeric recommendation in Knopp full text was inaccessible; this evidence limitation is disclosed in the tracked addendum.',
  method:'HOMA1-IR = fasting glucose (mmol/L) × fasting insulin (mU/L) / 22.5. Canadian insulin conversion pmol/L ÷ 6.0. No HOMA2 approximation, HOMA-B or QUICKI output. Display IR to 2 decimals, converted insulin to 1 decimal; internal precision retained.',clinicalReview:review,
  sources:[pubmed('Matthews et al., Diabetologia 1985','3899825'),pubmed('Knopp et al., insulin units, 2019 (abstract; numeric recommendation full text not retrieved)','30318910'),pubmed('Wallace et al., Use and abuse of HOMA modeling, 2004','15161807')],
  inputs:[number('glucose','Fasting glucose','mmol/L','Positive finite value. No unsourced universal cutoff or diagnostic interpretation.'),number('insulin','Fasting insulin','pmol/L','Canadian laboratory unit. Converted internally by dividing by 6.0; do not enter mU/L.'),yesno('fasting','Overnight fast ≥8 hours, water only?','No blocks HOMA1.'),yesno('exogenous','Using exogenous insulin?','Yes blocks HOMA1. Assays may cross-react with insulin analogues.'),yesno('population','Non-diabetic or early untreated dysglycaemia?','No blocks this tool: established beta-cell failure and glucose-lowering treatment distort estimates.')],
  outputs:[{key:'ir',label:'HOMA1-IR',unit:'index (unitless)',decimals:2},{key:'insulinMu',label:'Converted fasting insulin',unit:'mU/L',decimals:1}],calculate:homa,
  interpretation:()=> 'No universal diagnostic cutoff; assay- and population-dependent. HOMA1, not HOMA2. No diagnosis inferred.',
  vectors:[{inputs:homaInputs,expected:{ir:'4.90',insulinMu:'19.0'},provenance:'Doc §3.9 V1, independently derived Matthews formula'},{inputs:{...homaInputs,glucose:'5',insulin:'60'},expected:{ir:'2.22'},provenance:'Doc §3.9 V2'}]
 },
 {
  id:'egfr-2021',name:'eGFR CKD-EPI 2021',category:'Renal',aliases:['kidney','creatinine','GFR'],version:'Inker 2021 — creatinine-only, race-free CKD-EPI',endpoint:'Estimated glomerular filtration rate indexed to 1.73 m² body surface area.',
  applicability:'Adults only; stable creatinine, not acute kidney injury. Not supported here at extremes of muscle mass/body habitus. Creatinine–cystatin C is more accurate. Indexed eGFR is not Cockcroft–Gault CrCl or absolute drug-dosing clearance; no CKD diagnosis or staging from a single result.',
  validation:'Adult model lower age 18 years. Completed whole-year ages ≤120 are accepted; 120 is an engineering sanity ceiling, NOT a validated upper age. Positive finite creatinine is a numeric guard, not a validated concentration range. Explicit stable-creatinine and habitus answers required; no race factor.',
  conversion:'Serum creatinine µmol/L ÷ 88.4 = mg/dL.',
  method:'eGFR = 142 × min(Scr/κ,1)^α × max(Scr/κ,1)^−1.200 × 0.9938^Age × (1.012 if female). Scr in mg/dL; κ=.7 female/.9 male; α=−.241 female/−.302 male. No race coefficient. Whole-number display only, full precision internally.',clinicalReview:review,
  sources:[pubmed('Inker et al., NEJM 2021','34554658'),source('NIDDK GFR equations and limitations','https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/kidney-disease/laboratory-evaluation/glomerular-filtration-rate/estimating')],
  inputs:[sex,age,number('creatinine','Serum creatinine','µmol/L','Positive finite serum creatinine; internally divided by 88.4.'),yesno('stable','Stable creatinine, without acute kidney injury?','No blocks creatinine-based estimation.'),yesno('habit','Extremes of muscle mass or body habitus?','Yes blocks this tool; creatinine-only estimation may be inappropriate.')],
  outputs:[{key:'gfr',label:'eGFR',unit:'mL/min/1.73 m²',decimals:0}],calculate:egfr,
  interpretation:()=> 'Estimate, not a precise measurement. Creatinine–cystatin C is more accurate; indexed eGFR is not absolute drug-dosing clearance.',
  vectors:[{inputs:egfrInputs,expected:{gfr:'75'},provenance:'Doc §4 independent F55/Scr80'},{inputs:{...egfrInputs,sex:'male',age:'60',creatinine:'110'},expected:{gfr:'66'},provenance:'Doc §4 independent M60/Scr110'},{inputs:{...egfrInputs,age:'70',creatinine:'120'},expected:{gfr:'42'},provenance:'Doc §4 independent F70/Scr120'}]
 },
 ...expansion,
 ...batchA
];
export function favourites(value) {
  if (!Array.isArray(value) || !value.every(x=>typeof x==='string')) return [];
  return [...new Set(value)].filter(id=>registry.some(d=>d.id===id));
}
export function searchCatalog(query) {
  const q=query.trim().toLowerCase();
  return q ? registry.filter(d=>[d.name,d.category,...d.aliases].some(s=>s.toLowerCase().includes(q))) : registry;
}
export function summary(d,result) {
  return [d.name,d.version,d.endpoint,...d.outputs.filter(o=>result[o.key]!==null&&result[o.key]!==undefined).map(o=>`${o.label}: ${result[o.key].toFixed(o.decimals)} ${o.unit}`),d.interpretation(result),d.applicability,'Clinician decision support; verify applicability.'].join('\n');
}
