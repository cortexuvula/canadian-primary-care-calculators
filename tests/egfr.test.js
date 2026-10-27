import {test} from 'node:test';
import assert from 'node:assert/strict';
import {egfr} from '../src/engine.js';
const a={sex:'female',age:'55',creatinine:'80',stable:'yes',habit:'no'};
// Independent coefficient source: Inker 2021 Table 2 (see THIRD-PARTY-NOTICES.md).
// Recalculation: scripts/recompute-guard-pins.py; no production imports.
// W1a: 142 * (80 / (88.4 * .7)) ** -1.200 * .9938 ** 55 * 1.012
// independently evaluates to 75.0007870842784; compare unrounded output.
test('W1a eGFR creatinine conversion uses 88.4',()=>{
 assert.ok(Math.abs(egfr(a).gfr-75.0007870842784)<.01);
});
// W1b: below-knot ratios 50/(88.4*.7) and 70/(88.4*.9) exercise
// female alpha -.241 (including 1.012) and male alpha -.302 respectively.
test('W1b eGFR female below-knot alpha branch',()=>{
 assert.ok(Math.abs(egfr({...a,age:'40',creatinine:'50'}).gfr-118.0)<.2);
});
test('W1b eGFR male below-knot alpha branch',()=>{
 assert.ok(Math.abs(egfr({...a,sex:'male',age:'45',creatinine:'70'}).gfr-111.6)<.2);
});
for(const key of Object.keys(a)) test(`eGFR ${key} deliberate valid input required`,()=>{
 for(const bad of ['', ' ',null,undefined,NaN,Infinity,true,{},'0x10','5x']) assert.throws(()=>egfr({...a,[key]:bad}));
});
test('eGFR unsupported age, AKI/unstable and extreme muscle mass/body habitus blocked',()=>{
 for(const v of [{...a,age:'17'},{...a,age:'121'},{...a,age:'55.5'},{...a,stable:'no'},{...a,habit:'yes'}]) assert.throws(()=>egfr(v));
 for(const age of ['18','120']) assert.ok(Number.isFinite(egfr({...a,age}).gfr));
});
test('eGFR positive finite creatinine and output sanity guard',()=>{
 for(const creatinine of ['0','-1','9'.repeat(310),'0.'+'0'.repeat(325)+'1']) assert.throws(()=>egfr({...a,creatinine}));
});
test('eGFR both sides of sex-specific creatinine knot remain continuous',()=>{
 for(const [sex,knot] of [['male',79.56],['female',61.88]]) {
  const low=egfr({...a,sex,creatinine:String(knot-.00001)}).gfr;
  const high=egfr({...a,sex,creatinine:String(knot+.00001)}).gfr;
  assert.ok(low>high);assert.ok(low-high<.001);
 }
});
for(const [sex,age,creatinine,expected] of [['female','55','80','75'],['male','60','110','66'],['female','70','120','42']]) test(`CKD-EPI independent ${sex}/${age}/${creatinine} = ${expected}`,()=>assert.equal(egfr({...a,sex,age,creatinine}).gfr.toFixed(0),expected));
