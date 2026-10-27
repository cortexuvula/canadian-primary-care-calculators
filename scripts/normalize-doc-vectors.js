import {readFile,writeFile} from 'node:fs/promises';
const raw=JSON.parse(await readFile('tests/fixtures/doc-v2-vectors.json','utf8'));
const ids={bmi:'bmi',bsa:'bsa-mosteller',cockcroftGault:'cockcroft-gault',fib4:'fib4',apri:'apri',anionGap:'anion-gap',correctedSodium:'corrected-sodium',qtc:'qtc',homaB:'homa1-b',quicki:'quicki',cha2ds2Vasc:'cha2ds2-vasc',hasBled:'has-bled'};
const fields={weightKg:'weight',heightCm:'height',ageYears:'age',scrUmolL:'creatinine',astUperL:'ast',altUperL:'alt',platelets109L:'platelets',astUlnUperL:'uln',na:'sodium',cl:'chloride',hco3:'bicarbonate',k:'potassium',albuminGL:'albumin',naMmolL:'sodium',glucoseMmolL:'glucose',qtMs:'qt',hrBpm:'hr',insulinPmolL:'insulin',htn:'hypertension',dm:'diabetes',strokeTia:'stroke'};
const outputs={bsaM2:'bsa',crclMlMin:'crcl',homaBPercent:'beta'};
const decimals={bmi:1,bsa:2,crcl:0,fib4:2,apri:2,gap:1,corrected:1,sodium:1,qtc:0,beta:0,quicki:3,score:0};
const valid=[],guards=[],quarantined=[];
function inputs(model,i){const v=Object.fromEntries(Object.entries(i).map(([k,n])=>[fields[k]??k,typeof n==='boolean'?(n?'yes':'no'):String(n)]));
 if(model==='bmi'){v.age='40';v.pregnantOrLactating=i.pregnantOrLactating?'yes':'no';}
 if(model==='apri')v.acute='no';
 if(model==='anionGap'){v.convention=i.k===undefined?'exclude':'include';v.potassium??='';v.albumin??='';v.reference=i.albuminGL===undefined?'':'44';}
 if(model==='homaB'||model==='quicki')Object.assign(v,{fasting:'yes',exogenous:'no',population:'yes'});
 if(model==='cha2ds2Vasc'){v.af='yes';v.ageBand=i.ageYears>=75?'75plus':i.ageYears>=65?'65-74':'under65';delete v.age;v.sex=i.sex==='F'?'female':'male';}
 if(model==='hasBled'){v.af='yes';v.anticoagulant=i.labileInr==='na_doac_none'?'non-vka':'vka';v.labile=i.labileInr==='yes_vka'?'yes':i.labileInr==='na_doac_none'?'na':'no';delete v.labileInr;}
 return v;
}
function add(model,v,i,expected,suffix=''){valid.push({calculator:ids[model],id:v.id+suffix,label:v.label,inputs:i,expected,display:Object.fromEntries(Object.entries(expected).map(([k,n])=>[k,n.toFixed(decimals[k])])),provenance:`Doc independent Python JSON ${model}.${v.id}${suffix}`});}
for(const [model,data]of Object.entries(raw.vectors)){
 for(const v of data.valid){const i=inputs(model,v.inputs),o=v.outputs;
  if(model==='hasBled'&&v.id==='V6'&&o.score===1){quarantined.push({model,id:v.id,reason:'Source JSON score=1 contradicts age70(+1)+hypertension(+1). Not used as an oracle.'});continue;}
  if(model==='qtc'){for(const [formula,key]of [['bazett','bazett'],['fridericia','fridericia'],['framingham','framinghamSagie'],['hodges','hodges']])add(model,v,{...i,formula},{qtc:o[key]},'-'+formula);}
  else if(model==='correctedSodium'){for(const formula of ['katz','hillier'])add(model,v,{...i,formula},{sodium:o[formula]},'-'+formula);}
  else if(model==='anionGap'){if(o.correctedRef44!==undefined){for(const ref of ['44','40'])add(model,v,{...i,reference:ref},{gap:o.raw,corrected:o['correctedRef'+ref]},'-ref'+ref);}else add(model,v,i,{gap:o.raw??o.withK});}
  else add(model,v,i,Object.fromEntries(Object.entries(o).filter(([k])=>k!=='class'&&k!=='insulinMuL').map(([k,n])=>[outputs[k]??k,n])));
 }
 for(const g of data.guards??[]){const i=inputs(model,g.inputs);if(model==='qtc')i.formula='bazett';if(model==='correctedSodium')i.formula='katz';guards.push({calculator:ids[model],id:g.id,inputs:i,reason:g.reason});}
}
await writeFile('tests/fixtures/doc-v2-normalized.json',JSON.stringify({valid,guards,quarantined},null,2)+'\n');
const registryVectors=Object.fromEntries(Object.values(ids).map(id=>[id,valid.filter(v=>v.calculator===id).map(v=>({inputs:v.inputs,expected:v.display,provenance:v.provenance}))]));
await writeFile('src/expansion-vectors.js','// Generated from independent Doc JSON by scripts/normalize-doc-vectors.js; no production calculation.\nexport const docVectors = '+JSON.stringify(registryVectors,null,2)+';\n');
console.log(JSON.stringify({valid:valid.length,guards:guards.length,quarantined}));
