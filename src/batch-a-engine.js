// Batch A: pure calculations; contract/citations in batch-a-registry.js.
import {InputError,numeric,choice} from './engine.js';
const fail=(field,message)=>{throw new InputError(field,message);};
export function ariscat(v){
 const age=numeric(v.age,'age'),spo2=numeric(v.spo2,'spo2'),hb=numeric(v.hb,'hb');
 if(!Number.isInteger(age)||age<18)fail('age','Adult model: enter completed whole years ≥18.');
 if(!Number.isInteger(spo2))fail('spo2','SpO₂ must be a whole-number percentage (conservative source-fidelity guard).');
 if(spo2>100)fail('spo2','SpO₂ must be greater than zero and ≤100%.');
 choice(v.respiratoryInfection,'respiratoryInfection');choice(v.emergency,'emergency');
 choice(v.incision,'incision',['peripheral','upper-abdominal','intrathoracic']);
 choice(v.duration,'duration',['le2h','2to3h','gt3h']);
 const score=(age<=50?0:age<=80?3:16)+(spo2>=96?0:spo2>90?8:24)+Number(v.respiratoryInfection==='yes')*17+Number(hb<=100)*11+({peripheral:0,'upper-abdominal':15,intrathoracic:24}[v.incision])+({le2h:0,'2to3h':16,gt3h:23}[v.duration])+Number(v.emergency==='yes')*8;
 return {score,riskClass:score<26?'Low':score<45?'Intermediate':'High'};
}

function points(v,fields){return fields.reduce((sum,[field,allowed])=>{choice(String(v[field]??''),field,allowed.map(String));return sum+Number(v[field]);},0);}
export function apgar(v){
 choice(v.timepoint,'timepoint',['1min','5min','10min']);
 return {score:points(v,['appearance','pulse','grimace','activity','respiration'].map(k=>[k,[0,1,2]])),timepoint:v.timepoint};
}

export function ciwaAr(v){return {score:points(v,['nausea','tremor','sweats','anxiety','agitation','tactile','auditory','visual','headache','orientation'].map(k=>[k,Array.from({length:k==='orientation'?5:8},(_,i)=>i)]))};}

export function westley(v){return {score:points(v,[['consciousness',[0,5]],['cyanosis',[0,4,5]],['stridor',[0,1,2]],['airEntry',[0,1,2]],['retractions',[0,1,2,3]]])};}

function decimal(value,field){if(!['string','number'].includes(typeof value)||!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(value).trim())||!Number.isFinite(Number(value)))fail(field,'Enter a finite non-negative decimal in the labelled unit.');return Number(value);}
function finitePositive(n,field){if(!Number.isFinite(n)||n<=0)fail(field,'Numeric overflow/underflow: no interpretable result.');return n;}
export function aec(v){const wbc=numeric(v.wbc,'wbc'),eos=decimal(v.eosinophils,'eosinophils');if(eos>100)fail('eosinophils','Enter eosinophils as a percentage from 0 to 100, not a fraction.');const aec109L=wbc*eos/100,aecPerMicrolitre=aec109L*1000;if(!Number.isFinite(aecPerMicrolitre)||(eos>0&&aec109L===0))fail('eosinophils','Numeric overflow/underflow: no interpretable count.');return {aec109L,aecPerMicrolitre};}

function civilDay(value,field){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))fail(field,'Enter a civil date as YYYY-MM-DD.');
 const [y,m,d]=value.split('-').map(Number);
 if(y<1)fail(field,'Enter a valid Gregorian calendar date (year 0001–9999).');
 const date=new Date(0);date.setUTCFullYear(y,m-1,d);date.setUTCHours(0,0,0,0);
 if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)fail(field,'Enter a valid Gregorian calendar date.');
 return date.getTime()/86400000;
}
export function gaFromEdd(v){const edd=civilDay(v.edd,'edd'),asOf=civilDay(v.asOf,'asOf'),daysToEdd=edd-asOf,gestationalDays=280-daysToEdd;if(gestationalDays<0||gestationalDays>322)fail('asOf','Unsupported date combination: calculated gestation must be 0–322 days (engineering plausibility guard, not a dating validation).');return {weeks:Math.floor(gestationalDays/7),days:gestationalDays%7,gestationalDays,daysToEdd,postTerm:gestationalDays>294,edd:v.edd,asOf:v.asOf};}

export function maintenanceFluids(v){const w=numeric(v.weightKg,'weightKg');return {dailyVolumeMl:finitePositive(w<=10?100*w:w<=20?1000+50*(w-10):1500+20*(w-20),'weightKg')};}

function probability(value,field){const n=numeric(value,field);if(n>=100)fail(field,'Enter a probability strictly between 0 and 100%; impossible/certain events are unsupported.');return n/100;}
export function parseLrs(value){
 if(typeof value!=='string'||!value.trim())fail('likelihoodRatios','Enter 1–20 positive finite likelihood ratios, separated by commas or whitespace.');
 // A numeric list, never an expression. Reject empty comma elements and all code.
 const groups=value.trim().split(',');if(groups.some(x=>!x.trim()))fail('likelihoodRatios','Empty LR entries are not allowed.');
 const tokens=groups.flatMap(x=>x.trim().split(/\s+/));
 if(tokens.length>20)fail('likelihoodRatios','Use at most 20 likelihood ratios (engineering limit).');
 return tokens.map(x=>{if(!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(x))fail('likelihoodRatios','Enter numbers only, not expressions or risk/odds ratios.');return finitePositive(Number(x),'likelihoodRatios');});
}
function posterior(p,logLr,field){
 const logOdds=Math.log(p)-Math.log1p(-p)+logLr;
 const q=logOdds>=0?1/(1+Math.exp(-logOdds)):Math.exp(logOdds)/(1+Math.exp(logOdds));
 if(!Number.isFinite(q)||q<=0||q>=1)fail(field,'Numeric precision limit: cannot represent this estimate without implying certainty.');
 return q*100;
}
export function posttestLr(v){const p=probability(v.pretestProbabilityPct,'pretestProbabilityPct'),lrs=parseLrs(v.likelihoodRatios);if(lrs.length>1){choice(v.independent,'independent');if(v.independent!=='yes')fail('independent','Confirm conditional independence before chaining tests; dependent evidence can overstate certainty.');}return {posttestProbabilityPct:posterior(p,lrs.reduce((sum,n)=>sum+Math.log(n),0),'likelihoodRatios'),testCount:lrs.length};}

export function posttestSensSpec(v){const p=probability(v.pretestProbabilityPct,'pretestProbabilityPct'),s=probability(v.sensitivityPct,'sensitivityPct'),c=probability(v.specificityPct,'specificityPct');choice(v.result,'result',['positive','negative']);const logLr=v.result==='positive'?Math.log(s)-Math.log1p(-c):Math.log1p(-s)-Math.log(c);return {posttestProbabilityPct:posterior(p,logLr,'sensitivityPct'),result:v.result};}

export const CREATININE_MW=113.12;
function urineRatio(v,analyte,prefix){
 const value=numeric(v[analyte+'Value'],analyte+'Value'),creat=numeric(v.creatinineValue,'creatinineValue');
 choice(v[analyte+'Unit'],analyte+'Unit',['mg/L','mg/dL']);choice(v.creatinineUnit,'creatinineUnit',['mmol/L','mg/dL']);choice(v.outputUnit,'outputUnit',['mg/mmol','mg/g']);
 const mgL=finitePositive(value*(v[analyte+'Unit']==='mg/dL'?10:1),analyte+'Value');
 const creatMmol=finitePositive(v.creatinineUnit==='mmol/L'?creat:creat*10/CREATININE_MW,'creatinineValue');
 const creatMgL=finitePositive(v.creatinineUnit==='mmol/L'?creat*CREATININE_MW:creat*10,'creatinineValue');
 const si=finitePositive(mgL/creatMmol,'creatinineValue'),conventional=finitePositive(mgL/creatMgL*1000,'creatinineValue');
 return {[prefix+'MgMmol']:si,[prefix+'MgG']:conventional,outputUnit:v.outputUnit};
}
export function urineAcr(v){return urineRatio(v,'albumin','acr');}

export function urinePcr(v){return urineRatio(v,'protein','pcr');}
