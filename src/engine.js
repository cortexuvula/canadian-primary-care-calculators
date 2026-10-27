// Pure deterministic models. Sources and applicability: docs/requirements.
export const cholesterolMgDl = value => value * 38.67;
export class InputError extends Error {
  constructor(field, message) { super(message); this.name = 'InputError'; this.field = field; }
}
function fail(field, message) { throw new InputError(field, message); }
export function numeric(value, field) {
  if (!['string','number'].includes(typeof value) || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(value).trim())) fail(field, 'Enter a finite positive decimal number in the labelled unit.');
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) fail(field, 'Enter a finite number greater than zero (numeric sanity guard).');
  return n;
}
export function choice(value, field, options = ['yes','no']) {
  if (!options.includes(value)) fail(field, 'Select an explicit answer; blank is not No.');
  return value;
}
function range(n, field, min, max, message) {
  if (n < min || n > max) fail(field, message);
}
function age(value, minimum, maximum) {
  const n = numeric(value,'age');
  if (!Number.isInteger(n)) fail('age','Enter age in completed whole years.');
  range(n,'age',minimum,maximum,`Unsupported age: this calculator supports ${minimum}–${maximum} completed years. See model and sanity limits.`);
  return n;
}
export function framingham(v) {
  choice(v.sex,'sex',['male','female']);
  const years = age(v.age,30,74);
  const tc = numeric(v.tc,'tc'), hdl = numeric(v.hdl,'hdl'), sbp = numeric(v.sbp,'sbp');
  range(sbp,'sbp',90,200,'Unsupported: FHS public calculator bounds are SBP 90–200 mmHg; no clamping.');
  range(tc,'tc',100/38.67,405/38.67,'Unsupported: FHS total cholesterol bounds 100–405 mg/dL (100/38.67–405/38.67 mmol/L; approximately 2.586–10.473).');
  range(hdl,'hdl',10/38.67,100/38.67,'Unsupported: FHS HDL bounds 10–100 mg/dL (10/38.67–100/38.67 mmol/L; approximately 0.259–2.586).');
  if (hdl >= tc) fail('hdl','Total cholesterol must exceed HDL (FHS calculator guard).');
  for (const key of ['treated','smoker','diabetes','cvd','genetic','bypass','family']) choice(v[key],key);
  for (const key of ['cvd','genetic','bypass']) if (v[key] !== 'no') fail(key,'Unsupported primary-prevention population. No risk estimate produced; see applicability.');
  const male = v.sex === 'male';
  const b = male
    ? [3.06117, 1.12370, -0.93263, v.treated === 'yes' ? 1.99881 : 1.93303, .65451, .57367]
    : [2.32888, 1.20904, -.70833, v.treated === 'yes' ? 2.82263 : 2.76157, .52873, .69154];
  const sum = b[0]*Math.log(Number(v.age)) + b[1]*Math.log(cholesterolMgDl(Number(v.tc))) + b[2]*Math.log(cholesterolMgDl(Number(v.hdl))) + b[3]*Math.log(Number(v.sbp)) + b[4]*Number(v.smoker === 'yes') + b[5]*Number(v.diabetes === 'yes');
  const risk = 100 * (1 - (male ? .88936 : .95012) ** Math.exp(sum - (male ? 23.9802 : 26.1931)));
  const modifierApplied = years < 60 && v.diabetes === 'no' && v.family === 'yes';
  const modifiedRisk = risk * (modifierApplied ? 2 : 1);
  // Never silently cap the Canadian multiplier into a plausible probability.
  if (modifiedRisk > 100) fail('family','Unsupported: Canadian doubling exceeds 100%; no interpretable probability produced.');
  return {risk, modifiedRisk, modifierApplied, band: riskBand(modifiedRisk)};
}
export function homa(v) {
  const glucose = numeric(v.glucose,'glucose'), insulin = numeric(v.insulin,'insulin');
  for (const key of ['fasting','exogenous','population']) choice(v[key],key);
  if (v.fasting !== 'yes') fail('fasting','Unsupported: confirm an overnight fast of at least 8 hours, water only.');
  if (v.exogenous !== 'no') fail('exogenous','Unsupported: requires endogenous insulin; exogenous insulin invalidates HOMA1.');
  if (v.population !== 'yes') fail('population','Unsupported: use only for non-diabetic or early untreated dysglycaemia; established beta-cell failure and treatment distort the estimate.');
  const insulinMu = insulin / 6.0;
  const ir = glucose * insulinMu / 22.5;
  if (!Number.isFinite(ir) || ir <= 0 || insulinMu <= 0) fail('insulin','Numeric overflow/underflow: no interpretable result produced.');
  return {ir, insulinMu};
}
export function egfr(v) {
  choice(v.sex,'sex',['male','female']);
  const years = age(v.age,18,120); // 120 is an engineering sanity ceiling, NOT a validated upper model age.
  const creatinine = numeric(v.creatinine,'creatinine');
  choice(v.stable,'stable'); choice(v.habit,'habit');
  if (v.stable !== 'yes') fail('stable','Unsupported: acute kidney injury or unstable creatinine.');
  if (v.habit !== 'no') fail('habit','Unsupported: extremes of muscle mass or body habitus limit creatinine-based estimates.');
  const female = v.sex === 'female';
  const ratio = creatinine / 88.4 / (female ? .7 : .9);
  const gfr = 142 * Math.min(ratio,1) ** (female ? -.241 : -.302) * Math.max(ratio,1) ** -1.200 * .9938 ** years * (female ? 1.012 : 1);
  if (!Number.isFinite(gfr) || gfr <= 0) fail('creatinine','Numeric overflow/underflow: no interpretable result produced.');
  return {gfr};
}
// v2 additions: published model contracts in docs/requirements/expansion-v2.md.
function finite(value, field) {
  if (!Number.isFinite(value)) fail(field,'Numeric overflow/underflow: no interpretable result produced.');
  return value;
}
export function bmi(v) {
  const years=age(v.age,18,120); // 120: engineering ceiling, not a validation limit.
  choice(v.pregnantOrLactating,'pregnantOrLactating');
  const weight=numeric(v.weight,'weight'),height=numeric(v.height,'height');
  const value=finite(weight/(height/100)**2,'height');
  if(value<=0)fail('height','Numeric underflow: no interpretable result produced.');
  const band=value<18.5?'Underweight':value<25?'Normal':value<30?'Overweight':value<35?'Obese class I':value<40?'Obese class II':'Obese class III';
  return {bmi:value,band:v.pregnantOrLactating==='yes'?null:band,older:years>65};
}
export function bsa(v) {
  const height=numeric(v.height,'height'),weight=numeric(v.weight,'weight');
  const value=finite(Math.sqrt(height*weight/3600),'weight');
  if(value<=0)fail('weight','Numeric underflow: no interpretable result produced.');
  return {bsa:value};
}
export function fib4(v) {
  const years=numeric(v.age,'age');
  if(!Number.isInteger(years))fail('age','Enter completed whole years.');
  if(years<18)fail('age','Unsupported: FIB-4 is derived in adults, age ≥18.');
  const ast=numeric(v.ast,'ast'),alt=numeric(v.alt,'alt'),platelets=numeric(v.platelets,'platelets');
  const value=finite(years*ast/(platelets*Math.sqrt(alt)),'platelets');
  if(value<=0)fail('platelets','Numeric underflow: no interpretable result produced.');
  const low=years>=65?2.0:1.30;
  return {fib4:value,band:value<low?'Low':value>2.67?'High':'Indeterminate',ageCaution:years<35};
}
export function apri(v) {
  const ast=numeric(v.ast,'ast'),uln=numeric(v.uln,'uln'),platelets=numeric(v.platelets,'platelets');
  choice(v.acute,'acute');
  if(v.acute!=='no')fail('acute','Unsupported: not for acute transaminitis.');
  const value=finite((ast*100)/(uln*platelets),'platelets');
  if(value<=0)fail('platelets','Numeric underflow: no interpretable result produced.');
  return {apri:value,band:value<0.5?'Below 0.5':value>2?'Above 2.0':value>1.5?'Above 1.5':'Midrange'};
}
export const FIGGE_SLOPE = 0.25;
export function anionGap(v) {
  const sodium=numeric(v.sodium,'sodium'),chloride=numeric(v.chloride,'chloride'),bicarbonate=numeric(v.bicarbonate,'bicarbonate');
  choice(v.convention,'convention',['exclude','include']);
  const potassium=v.potassium===''||v.potassium===undefined?null:numeric(v.potassium,'potassium');
  if(v.convention==='include'&&potassium===null)fail('potassium','Enter potassium for the potassium-included convention.');
  const albumin=v.albumin===''||v.albumin===undefined?null:numeric(v.albumin,'albumin');
  if(albumin!==null||v.reference)choice(v.reference,'reference',['44','40']);
  const gap=finite(sodium+(v.convention==='include'?potassium:0)-(chloride+bicarbonate),'sodium');
  return {gap,corrected:albumin===null?null:finite(gap+FIGGE_SLOPE*(Number(v.reference)-albumin),'albumin'),convention:v.convention,reference:v.reference};
}
export const GLUCOSE_MG_DL = 18.016;
export const SODIUM_FACTORS = Object.freeze({katz:1.6,hillier:2.4});
export function correctedSodium(v) {
  const sodium=numeric(v.sodium,'sodium'),glucose=numeric(v.glucose,'glucose');
  choice(v.formula,'formula',['katz','hillier']);
  const glucoseMg=finite(glucose*GLUCOSE_MG_DL,'glucose');
  if(glucoseMg<=100)return {sodium,formula:v.formula,highGlucose:false,noCorrection:true};
  return {sodium:finite(sodium+SODIUM_FACTORS[v.formula]*(glucoseMg-100)/100,'sodium'),formula:v.formula,highGlucose:glucoseMg>400};
}
export const QTC_FRAMINGHAM = 0.154;
export const QTC_HODGES_MS = 1.75;
export function qtc(v) {
  const qt=numeric(v.qt,'qt'),hr=numeric(v.hr,'hr');
  choice(v.formula,'formula',['bazett','fridericia','framingham','hodges']);
  const rr=finite(60/hr,'hr');
  const value=v.formula==='bazett'?qt/Math.sqrt(rr):v.formula==='fridericia'?qt/Math.cbrt(rr):v.formula==='framingham'?(qt/1000+QTC_FRAMINGHAM*(1-rr))*1000:qt+QTC_HODGES_MS*(hr-60);
  if(value<=0)fail('qt','Numeric correction yields non-positive QTc; no interpretable result.');
  return {qtc:finite(value,'qt'),rr,formula:v.formula,outside:rr<0.5||rr>1.47};
}
export function homaB(v) {
  const glucose=numeric(v.glucose,'glucose');
  if(glucose<=3.5)fail('glucose','Unsupported: HOMA1-B requires glucose >3.5 mmol/L (positive denominator).');
  const {insulinMu}=homa(v);
  const beta=finite(20*insulinMu/(glucose-3.5),'insulin');
  if(beta<=0)fail('insulin','Numeric underflow: no interpretable result produced.');
  return {beta};
}
export function quicki(v) {
  const glucose=numeric(v.glucose,'glucose');
  const {insulinMu}=homa(v);
  const glucoseMg=finite(glucose*GLUCOSE_MG_DL,'glucose');
  const denominator=Math.log10(insulinMu)+Math.log10(glucoseMg);
  if(!Number.isFinite(denominator)||denominator<=0)fail('glucose','Undefined QUICKI: log-sum denominator must be finite and greater than zero.');
  return {quicki:finite(1/denominator,'glucose')};
}
export const CHA_AGE_POINTS = Object.freeze({'under65':0,'65-74':1,'75plus':2});
export function cha2ds2Vasc(v) {
  choice(v.af,'af');if(v.af!=='yes')fail('af','Unsupported: this score is for non-valvular atrial fibrillation.');
  choice(v.ageBand,'ageBand',Object.keys(CHA_AGE_POINTS));choice(v.sex,'sex',['male','female']);
  let score=CHA_AGE_POINTS[v.ageBand]+Number(v.sex==='female');
  for(const [field,points]of [['chf',1],['hypertension',1],['diabetes',1],['stroke',2],['vascular',1]]){choice(v[field],field);score+=Number(v[field]==='yes')*points;}
  return {score,sexOnly:score===1&&v.sex==='female'};
}
export function hasBled(v) {
  choice(v.af,'af');if(v.af!=='yes')fail('af','Unsupported: HAS-BLED is an AF bleeding-risk score.');
  const years=age(v.age,18,120);
  choice(v.anticoagulant,'anticoagulant',['vka','non-vka']);
  choice(v.labile,'labile',['yes','no','na']);
  if(v.anticoagulant==='vka'&&v.labile==='na')fail('labile','For VKA/warfarin, explicitly assess labile INR; N/A is not accepted.');
  if(v.anticoagulant==='non-vka'&&v.labile!=='na')fail('labile','For non-VKA, explicitly select not applicable; labile INR scores zero.');
  let score=Number(years>65)+Number(v.labile==='yes');
  for(const field of ['hypertension','renal','liver','stroke','bleeding','drugs','alcohol']){choice(v[field],field);score+=Number(v[field]==='yes');}
  return {score,labile:v.labile};
}
export const CG_CREATININE = 88.4;
export const CG_FEMALE = 0.85;
export function cockcroftGault(v) {
  choice(v.sex,'sex',['male','female']);
  const years=age(v.age,18,92),weight=numeric(v.weight,'weight'),scr=numeric(v.creatinine,'creatinine');
  let crcl=((140-years)*weight*CG_CREATININE)/(72*scr);
  if(v.sex==='female')crcl*=CG_FEMALE;
  finite(crcl,'creatinine');if(crcl<=0)fail('creatinine','Numeric underflow: no interpretable result produced.');
  return {crcl};
}
export function riskBand(percent) { return percent < 10 ? 'Low' : percent < 20 ? 'Intermediate' : 'High'; }
