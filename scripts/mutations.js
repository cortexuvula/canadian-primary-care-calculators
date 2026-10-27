// Mutations run only in isolated ignored copies; never edit tracked production files.
import {readFile,writeFile,mkdir,cp,rm,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {batchMutations} from './batch-a-mutations.js';
const mutations=[
 ...batchMutations,
 ['cholesterol-conversion','src/engine.js','value * 38.67','value * 1'],
 ['insulin-legacy-factor','src/engine.js','insulin / 6.0','insulin / 6.945'],
 ['insulin-unit-omitted','src/engine.js','insulin / 6.0','insulin / 1'],
 ['homa-wrong-denominator','src/engine.js','insulinMu / 22.5','insulinMu / 405'],
 ['creatinine-conversion','src/engine.js','creatinine / 88.4','creatinine / 1'],
 ['W1a-creatinine-subtle-drift','src/engine.js','creatinine / 88.4','creatinine / 88.0'],
 ['W1b-below-knot-sex-swap','src/engine.js','female ? -.241 : -.302','female ? -.302 : -.241'],
 ['W1c-diabetes-decimal-shift','src/engine.js','.65451, .57367','.65451, .057367'],
 ['framingham-age-range','src/engine.js','age(v.age,30,74)','age(v.age,18,120)'],
 ['homa-nonfasting-guard','src/engine.js',"if (v.fasting !== 'yes')","if (false)"],
 ['homa-exogenous-guard','src/engine.js',"if (v.exogenous !== 'no')","if (false)"],
 ['choice-missing-guard','src/engine.js','if (!options.includes(value))','if (false)'],
 ['stale-revision-guard','src/state.js','r.revision===s.revision','true'],
 ['stale-snapshot-clearing','src/state.js','snapshot:null,errors:{},status:s.snapshot','snapshot:s.snapshot,errors:{},status:s.snapshot'],
 ['risk-band-rounding','src/engine.js',"percent < 10 ? 'Low'", "Math.round(percent) < 10 ? 'Low'"],
 ['v2-bmi-height-drift','src/engine.js','(height/100)**2','(height/100.1)**2'],
 ['v2-bsa-divisor-drift','src/engine.js','height*weight/3600','height*weight/3601'],
 ['v2-fib4-age65-overlap','src/engine.js','years>=65?2.0:1.30','years>65?2.0:1.30'],
 ['v2-fib4-high-equality','src/engine.js',"value>2.67?'High'","value>=2.67?'High'"],
 ['v2-fib4-round-before-band','src/engine.js',"value<low?'Low'","Number(value.toFixed(2))<low?'Low'"],
 ['v2-apri-percent-drift','src/engine.js','(ast*100)/(uln*platelets)','(ast*99)/(uln*platelets)'],
 ['v2-apri-high-equality','src/engine.js',"value>2?'Above 2.0'","value>=2?'Above 2.0'"],
 ['v2-figge-slope-drift','src/engine.js','FIGGE_SLOPE = 0.25','FIGGE_SLOPE = 0.24'],
 ['v2-potassium-omitted','src/engine.js',"v.convention==='include'?potassium:0","v.convention==='include'?0:0"],
 ['v2-glucose-conversion-subtle','src/engine.js','GLUCOSE_MG_DL = 18.016','GLUCOSE_MG_DL = 18.0'],
 ['v2-katz-factor-drift','src/engine.js','katz:1.6,hillier:2.4','katz:1.5,hillier:2.4'],
 ['v2-hillier-factor-drift','src/engine.js','katz:1.6,hillier:2.4','katz:1.6,hillier:2.3'],
 ['v2-qtc-rr-conversion-drift','src/engine.js','rr=finite(60/hr','rr=finite(60.1/hr'],
 ['v2-qtc-cubic-root','src/engine.js','qt/Math.cbrt(rr)','qt/Math.sqrt(rr)'],
 ['v2-qtc-framingham-drift','src/engine.js','QTC_FRAMINGHAM = 0.154','QTC_FRAMINGHAM = 0.145'],
 ['v2-qtc-hodges-drift','src/engine.js','QTC_HODGES_MS = 1.75','QTC_HODGES_MS = 1.7'],
 ['v2-homab-denominator','src/engine.js','20*insulinMu/(glucose-3.5)','20*insulinMu/(glucose-3.0)'],
 ['v2-quicki-log-base','src/engine.js','Math.log10(insulinMu)+Math.log10(glucoseMg)','Math.log(insulinMu)+Math.log(glucoseMg)'],
 ['v2-cha-age-overlap','src/engine.js',"'75plus':2","'75plus':3"],
 ['v2-cha-stroke-point','src/engine.js',"['stroke',2]","['stroke',1]"],
 ['v2-cha-sex-point-omitted','src/engine.js',"CHA_AGE_POINTS[v.ageBand]+Number(v.sex==='female')","CHA_AGE_POINTS[v.ageBand]+0"],
 ['v2-has-renal-liver-collapse','src/engine.js',"['hypertension','renal','liver','stroke','bleeding','drugs','alcohol']","['hypertension','renal','stroke','bleeding','drugs','alcohol']"],
 ['v2-has-drugs-alcohol-collapse','src/engine.js',"['hypertension','renal','liver','stroke','bleeding','drugs','alcohol']","['hypertension','renal','liver','stroke','bleeding','drugs']"],
 ['v2-cg-conversion-drift','src/engine.js','CG_CREATININE = 88.4','CG_CREATININE = 88.0'],
 ['v2-cg-rounded-si','src/engine.js','weight*CG_CREATININE)/(72*scr)','weight*1.23)/scr'],
 ['v2-cg-female-factor','src/engine.js','CG_FEMALE = 0.85','CG_FEMALE = 1.0'],
 ['v2-cg-age-range','src/engine.js','age(v.age,18,92)','age(v.age,18,120)'],
 ['v2-bmi-pregnancy-class','src/engine.js',"band:v.pregnantOrLactating==='yes'?null:band",'band:band'],
 ['v2-has-age65-overlap','src/engine.js','Number(years>65)','Number(years>=65)']
];
const base='.browser/mutations';await mkdir('.artifacts',{recursive:true});await mkdir(base,{recursive:true});let killed=0;
// Release packaging has its own isolated Git fixture; mutation sandboxes target clinical/state code only.
const tests=(await readdir('tests')).filter(f=>f.endsWith('.test.js')&&!['release.test.js','package.test.js'].includes(f)).sort().map(f=>'tests/'+f);
const details=[];
for(const [name,file,from,to]of mutations){
 const dir=`${base}/${name}`;await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});
 await cp('src',`${dir}/src`,{recursive:true});await cp('tests',`${dir}/tests`,{recursive:true});await writeFile(`${dir}/package.json`,'{"type":"module"}');
 // The additive offline-fixture regressions also run here and need their CLI dependency.
 await mkdir(`${dir}/scripts`);await cp('scripts/verify-sdk.js',`${dir}/scripts/verify-sdk.js`);
 const original=await readFile(`${dir}/${file}`,'utf8');if(original.split(from).length!==2)throw Error('Mutation target not unique: '+name);
 await writeFile(`${dir}/${file}`,original.replace(from,to));
 const run=spawnSync(process.execPath,['--test','--test-reporter=spec',...tests],{cwd:dir,encoding:'utf8'});
 const output=run.stdout+run.stderr;
 if(run.status!==1||!output.includes('AssertionError')||/SyntaxError|ERR_MODULE_NOT_FOUND|ReferenceError/.test(output))throw Error('Mutation survived or infrastructure failed: '+name+' status '+run.status+' '+output);
 details.push({name,file,from,to,exit:run.status,assertions:output.slice(output.indexOf('✖ failing tests:'))});
 killed++;console.log('DETECTED '+name);
}
await writeFile('.artifacts/v2-mutation-details.json',JSON.stringify(details,null,2)+'\n');
console.log(`${killed}/${mutations.length} deliberate mutations detected by assertion failures; tracked source untouched.`);
