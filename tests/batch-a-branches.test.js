import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../src/batch-a-engine.js';
import {InputError} from '../src/engine.js';
import {raw,inputs} from './batch-a-support.js';
import {registry,summary} from '../src/registry.js';
const base=id=>inputs(id,raw.vectors[id].valid[0].inputs);
const scoreTables={apgar:{fn:e.apgar,fields:{appearance:[0,1,2],pulse:[0,1,2],grimace:[0,1,2],activity:[0,1,2],respiration:[0,1,2]}},'ciwa-ar':{fn:e.ciwaAr,fields:Object.fromEntries(['nausea','tremor','sweats','anxiety','agitation','tactile','auditory','visual','headache','orientation'].map(k=>[k,Array.from({length:k==='orientation'?5:8},(_,i)=>i)]))},'westley-croup':{fn:e.westley,fields:{consciousness:[0,5],cyanosis:[0,4,5],stridor:[0,1,2],airEntry:[0,1,2],retractions:[0,1,2,3]}}};
for(const [id,{fn,fields}]of Object.entries(scoreTables))for(const [field,values]of Object.entries(fields))for(const n of values)test(`Batch A independent component ${id} ${field}=${n}`,()=>{
 const v={...base(id),...Object.fromEntries(Object.keys(fields).map(k=>[k,'0'])),[field]:String(n)};assert.equal(fn(v).score,n);
});
for(const [field,values]of Object.entries({age:[[18,0],[50,0],[51,3],[80,3],[81,16]],spo2:[[96,0],[95,8],[91,8],[90,24]],hb:[[100,11],[100.001,0]]}))for(const [n,expected]of values)test(`ARISCAT exact independent boundary ${field}=${n}`,()=>assert.equal(e.ariscat({...base('ariscat'),[field]:String(n)}).score,expected));
for(const [id,fn]of [['ariscat',e.ariscat],['apgar',e.apgar],['ciwa-ar',e.ciwaAr],['westley-croup',e.westley],['aec',e.aec],['ga-from-edd',e.gaFromEdd],['maintenance-fluids',e.maintenanceFluids],['posttest-lr',e.posttestLr],['posttest-sens-spec',e.posttestSensSpec],['urine-acr',e.urineAcr],['urine-pcr',e.urinePcr]])test(`Batch A ${id} rejects missing fields and non-finite/invalid controls`,()=>{
 const d=registry.find(d=>d.id===id);
 for(const f of d.inputs){if(f.id==='independent')continue;for(const bad of [undefined,null,'','bad',Infinity,NaN,{},[]])assert.throws(()=>fn({...base(id),[f.id]:bad}),InputError,`${id}.${f.id} ${String(bad)}`);}
});
test('civil dates are strict Gregorian, including year<100, leap-century and domain boundaries',()=>{
 for(const bad of ['2026-02-30','2025-02-29','1900-02-29','2026-13-01','2026-00-01','2026-01-00','0000-01-01','2026-1-01','2026-10-01T00:00:00Z'])assert.throws(()=>e.gaFromEdd({edd:bad,asOf:'2026-10-01'}),InputError);
 for(const day of ['2000-02-29','2024-02-29','0099-01-01','0001-01-01','9999-12-31'])assert.equal(e.gaFromEdd({edd:day,asOf:day}).gestationalDays,280);
 assert.deepEqual([e.gaFromEdd({edd:'2026-10-08',asOf:'2026-01-01'}).weeks,e.gaFromEdd({edd:'2026-10-08',asOf:'2026-01-01'}).days],[0,0]);
 assert.equal(e.gaFromEdd({edd:'2026-01-01',asOf:'2026-02-12'}).gestationalDays,322);
 assert.throws(()=>e.gaFromEdd({edd:'2026-01-01',asOf:'2026-02-13'}),InputError);
 assert.equal(e.gaFromEdd({edd:'2026-01-01',asOf:'2026-01-15'}).postTerm,false);
 assert.equal(e.gaFromEdd({edd:'2026-01-01',asOf:'2026-01-16'}).postTerm,true);
});
test('daily fluids use every branch without invented cap or 4-2-1 approximation',()=>{
 for(const [w,n]of [[0.5,50],[9.99,999],[10,1000],[10.01,1000.5],[19.99,1499.5],[20,1500],[20.01,1500.2],[100,3100]])assert.ok(Math.abs(e.maintenanceFluids({weightKg:String(w)}).dailyVolumeMl-n)<1e-9);
});
test('LR sequence parser is bounded numeric data, never code; independence deliberately confirmed',()=>{
 assert.deepEqual(e.parseLrs(' 2, 3\n0.5  1e-2 '),[2,3,0.5,0.01]);
 for(const value of ['',',2','2,','2,,3','NaN','Infinity','0','-2','2*3','alert(1)','0x10','1e309','1e-999',Array(21).fill('1').join(',')])assert.throws(()=>e.parseLrs(value),InputError);
 assert.equal(e.parseLrs(Array(20).fill('1').join(',')).length,20);
 for(const independent of ['',undefined,'no'])assert.throws(()=>e.posttestLr({...base('posttest-lr'),likelihoodRatios:'2,3',independent}),InputError);
 assert.ok(e.posttestLr({...base('posttest-lr'),independent:''}).posttestProbabilityPct>0);
});
test('log-space LR updates survive compensating huge and tiny products without saturation shortcuts',()=>{
 const v={pretestProbabilityPct:'50',likelihoodRatios:'1e300,1e300,1e-300,1e-300',independent:'yes'};
 assert.ok(Math.abs(e.posttestLr(v).posttestProbabilityPct-50)<1e-9);
 for(const likelihoodRatios of ['1e300','1e-300,1e-300'])assert.throws(()=>e.posttestLr({...v,likelihoodRatios}),InputError);
 for(const k of ['pretestProbabilityPct','sensitivityPct','specificityPct'])for(const n of ['0','100','101'])for(const result of ['positive','negative'])assert.throws(()=>e.posttestSensSpec({...base('posttest-sens-spec'),[k]:n,result}),InputError);
});
test('same-sample urine ratios preserve exact MW across all four input-unit combinations and both reporting choices',()=>{
 for(const [id,fn,analyte,prefix]of [['urine-acr',e.urineAcr,'albumin','acr'],['urine-pcr',e.urinePcr,'protein','pcr']])for(const analyteUnit of ['mg/L','mg/dL'])for(const creatinineUnit of ['mmol/L','mg/dL'])for(const outputUnit of ['mg/mmol','mg/g']){
  const v={[analyte+'Value']:analyteUnit==='mg/L'?'30':'3',[analyte+'Unit']:analyteUnit,creatinineValue:creatinineUnit==='mmol/L'?'10':'113.12',creatinineUnit,outputUnit};
  const r=fn(v);assert.ok(Math.abs(r[prefix+'MgMmol']-3)<1e-12);assert.ok(Math.abs(r[prefix+'MgG']-26.52050919377652)<1e-12);assert.equal(r.outputUnit,outputUnit);assert.match(summary(registry.find(d=>d.id===id),r),new RegExp(outputUnit==='mg/g'?'27 mg/g':'3.0 mg/mmol'));
 }
});
test('numeric overflow/underflow never yields a plausible result or zero count for nonzero eosinophils',()=>{
 const huge='1'+'0'.repeat(308),tiny='0.'+'0'.repeat(320)+'1';
 assert.throws(()=>e.maintenanceFluids({weightKg:huge}),InputError);
 assert.throws(()=>e.aec({wbc:huge,eosinophils:'100'}),InputError);
 assert.throws(()=>e.aec({wbc:tiny,eosinophils:tiny}),InputError);
 for(const fn of [e.urineAcr,e.urinePcr])assert.throws(()=>fn({albuminValue:huge,albuminUnit:'mg/dL',proteinValue:huge,proteinUnit:'mg/dL',creatinineValue:'1',creatinineUnit:'mmol/L',outputUnit:'mg/mmol'}),InputError);
});
test('all raw Doc vectors accounted for, unique IDs; no new oracle quarantine',()=>{
 assert.equal(Object.keys(raw.vectors).length,11);assert.equal(Object.values(raw.vectors).reduce((n,d)=>n+d.valid.length,0),85);assert.equal(Object.values(raw.vectors).reduce((n,d)=>n+d.guards.length,0),34);
 for(const d of Object.values(raw.vectors))assert.equal(new Set([...d.valid,...d.guards].map(v=>v.id)).size,d.valid.length+d.guards.length);
});
