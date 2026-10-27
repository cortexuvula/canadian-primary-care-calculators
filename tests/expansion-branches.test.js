import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../src/engine.js';
import {registry,favourites,summary} from '../src/registry.js';
import {initial,transition} from '../src/state.js';
const get=id=>registry.find(d=>d.id===id);
const base=id=>get(id).vectors[0].inputs;
test('BMI exact classifications and rounding traps',()=>{
 for(const [weight,band]of [['18.4999','Underweight'],['18.5','Normal'],['24.9999','Normal'],['25','Overweight'],['29.9999','Overweight'],['30','Obese class I'],['35','Obese class II'],['40','Obese class III']])assert.equal(e.bmi({...base('bmi'),height:'100',weight}).band,band);
 assert.equal(e.bmi({...base('bmi'),age:'66'}).older,true);
});
test('FIB4 age-adjustment and exact strict clinical cutoffs before rounding',()=>{
 const v={...base('fib4'),age:'50',alt:'100',platelets:'100'};
 for(const [ast,band]of [['25.9999','Low'],['26','Indeterminate'],['53.4','Indeterminate'],['53.4001','High']])assert.equal(e.fib4({...v,ast}).band,band);
 assert.equal(e.fib4({...v,age:'64',ast:'30'}).band,'Indeterminate');
 assert.equal(e.fib4({...v,age:'65',ast:'30'}).band,'Low');
 assert.equal(e.fib4({...v,age:'25'}).ageCaution,true);
});
test('APRI threshold equality is not greater-than; local ULN changes output',()=>{
 const v={...base('apri'),platelets:'100',uln:'40'};
 for(const [ast,band]of [['19.9999','Below 0.5'],['20','Midrange'],['60','Midrange'],['60.0001','Above 1.5'],['80','Above 1.5'],['80.0001','Above 2.0']])assert.equal(e.apri({...v,ast}).band,band);
 assert.equal(e.apri({...v,ast:'40',uln:'20'}).apri,2);
});
test('anion gap optional fields are conditional, signed outputs legitimate, copy names reference',()=>{
 assert.throws(()=>e.anionGap({...base('anion-gap'),convention:'include'}),x=>x.field==='potassium');
 assert.throws(()=>e.anionGap({...base('anion-gap'),albumin:'25'}),x=>x.field==='reference');
 assert.equal(e.anionGap({...base('anion-gap'),sodium:'120'}).gap,-9);
 const d=get('anion-gap'),v=d.vectors[2].inputs;
 assert.match(summary(d,e.anionGap(v)),/reference 44 g\/L/);
 let s=initial(d);for(const [field,value]of Object.entries(base(d.id)))s=transition(d,s,{type:'edit',field,value});
 s=transition(d,s,{type:'calculate'});assert.equal(s.snapshot.inputs.albumin,null);
});
test('corrected sodium variants and hyperglycaemia boundary caveats',()=>{
 for(const formula of ['katz','hillier']){
  assert.equal(e.correctedSodium({sodium:'140',glucose:String(100/e.GLUCOSE_MG_DL),formula}).noCorrection,true);
  assert.equal(e.correctedSodium({sodium:'140',glucose:String(400/e.GLUCOSE_MG_DL),formula}).highGlucose,false);
  assert.equal(e.correctedSodium({sodium:'140',glucose:'30',formula}).highGlucose,true);
 }
});
test('QTc all methods at 60, fast and slow rates; RR warning only, no clamp',()=>{
 for(const formula of ['bazett','fridericia','framingham','hodges']){
  assert.equal(e.qtc({qt:'400',hr:'60',formula}).qtc,400);
  assert.equal(e.qtc({qt:'400',hr:'120',formula}).outside,false);
  assert.equal(e.qtc({qt:'400',hr:'121',formula}).outside,true);
  assert.equal(e.qtc({qt:'480',hr:'40',formula}).outside,true);
  assert.ok(e.qtc({qt:'480',hr:'50',formula}).qtc>0);
 }
});
test('HOMA-B lower denominator and QUICKI undefined log-sum block',()=>{
 assert.throws(()=>e.homaB({...base('homa1-b'),glucose:'3.4999'}),x=>x.field==='glucose');
 assert.throws(()=>e.quicki({...base('quicki'),glucose:'0.01',insulin:'0.01'}),x=>x.field==='glucose');
});
test('CHA all factors, age exclusivity, zero/sex-only/max; scored metadata matches model',()=>{
 const v={af:'yes',ageBand:'under65',sex:'male',chf:'no',hypertension:'no',diabetes:'no',stroke:'no',vascular:'no'};
 assert.equal(e.cha2ds2Vasc(v).score,0);
 for(const [f,n]of [['chf',1],['hypertension',1],['diabetes',1],['stroke',2],['vascular',1]])assert.equal(e.cha2ds2Vasc({...v,[f]:'yes'}).score,n);
 for(const o of get('cha2ds2-vasc').inputs.find(f=>f.id==='ageBand').options)assert.equal(e.cha2ds2Vasc({...v,ageBand:o.value}).score,o.points);
 assert.equal(e.cha2ds2Vasc({...v,sex:'female'}).sexOnly,true);
});
test('HAS all independent factors, age strictly >65 and explicit non-VKA N/A',()=>{
 const v={...base('has-bled'),hypertension:'no'};
 assert.equal(e.hasBled(v).score,0);
 for(const f of ['hypertension','renal','liver','stroke','bleeding','drugs','alcohol','labile'])assert.equal(e.hasBled({...v,[f]:'yes'}).score,1);
 assert.equal(e.hasBled({...v,age:'65'}).score,0);assert.equal(e.hasBled({...v,age:'66'}).score,1);
 assert.equal(e.hasBled({...v,anticoagulant:'non-vka',labile:'na'}).score,0);
 assert.throws(()=>e.hasBled({...v,anticoagulant:'non-vka',labile:'yes'}),x=>x.field==='labile');
});
test('all new modules have qualified copy and allowlisted favourites in existing schema',()=>{
 for(const d of registry.slice(3)){
  assert.deepEqual(favourites(['homa1-ir',d.id,'ghost',d.id]),['homa1-ir',d.id]);
  for(const v of d.vectors)assert.doesNotMatch(summary(d,d.calculate(v.inputs)),/undefined|NaN|Infinity/);
 }
});

test('addendum BMI pregnancy suppresses class, FIB4 young adult warns and paediatric blocks, HAS N/A explicit',()=>{assert.equal(e.bmi({...base('bmi'),pregnantOrLactating:'yes'}).band,null);assert.throws(()=>e.fib4({...base('fib4'),age:'17'}),x=>x.field==='age');assert.equal(e.fib4({...base('fib4'),age:'70'}).ageCaution,false);assert.match(summary(get('has-bled'),e.hasBled({...base('has-bled'),anticoagulant:'non-vka',labile:'na'})),/Labile INR: N\/A/);});

test('HAS Doc V6 typo does not lower a 70-year-old hypertensive non-VKA score',()=>{const v={...base('has-bled'),age:'70',anticoagulant:'non-vka',labile:'na'};assert.equal(e.hasBled(v).score,2);});
