import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {registry} from '../src/registry.js';
import {choose} from './ui-helpers.js';
const mode=process.env.CPC_SDK_FIXTURE?'public-sdk':'adapters';
const dir=`.artifacts/batch-a-evidence/${mode}`;
test('SYNTHETIC Batch A compiled examples bind actual artifact and rendered input/result state',async({page,browser})=>{
 await mkdir(dir,{recursive:true});const runs=[];
 for(const [id,width,theme,name]of [['ga-from-edd',1200,'dark','ga-dark'],['posttest-lr',1200,'light','lr-light'],['urine-acr',320,'light','acr-narrow']]){
  await page.setViewportSize({width,height:1000});await page.goto('/');await page.evaluate(theme=>{document.documentElement.dataset.hermesMode=theme;const note=document.createElement('div');note.textContent='SYNTHETIC example · compiled plugin · browser harness, NOT live Desktop';note.style.cssText='box-sizing:border-box;padding:8px 12px;font:12px system-ui;color:white;background:#243b53;overflow-wrap:anywhere';document.body.prepend(note);},theme);
  await choose(page,id);const d=registry.find(d=>d.id===id),values={...d.vectors[0].inputs,...(id==='posttest-lr'?{pretestProbabilityPct:'20',likelihoodRatios:'5, 2',independent:'yes'}:{})};
  for(const f of d.inputs){const c=page.locator('#cpc-'+f.id);if(f.type==='choice')await c.selectOption(values[f.id]??'');else await c.fill(values[f.id]??'');}
  await page.getByRole('button',{name:'Calculate',exact:true}).click();await expect(page.getByRole('region',{name:'Result',exact:true})).toBeVisible();await page.evaluate(()=>{document.activeElement.blur();window.scrollTo(0,0);});
  const file=`${dir}/${name}.png`;await page.screenshot({path:file,fullPage:true});runs.push({id,width,theme,file,synthetic:true,display:await page.locator('.cpc-result').innerText()});
 }
 await writeFile(`${dir}/receipt.json`,JSON.stringify({mode,browser:browser.version(),runtimeSha256:createHash('sha256').update(readFileSync('plugin.js')).digest('hex'),boundary:'Compiled plugin + real React; registration/storage/clipboard adapters, not live Desktop or OS clipboard.',runs},null,2)+'\n');
});
