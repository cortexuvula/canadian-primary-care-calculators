import {test,expect} from '@playwright/test';
import {registry,summary} from '../src/registry.js';
import {unsupported} from '../tests/unsupported-cases.js';
// Original twelve v2 additions retain their complete journeys. Batch A has its own suite.
const additions=registry.slice(3,15);
import {choose} from './ui-helpers.js';
const calc=page=>page.getByRole('button',{name:'Calculate',exact:true}).click();
const result=page=>page.getByRole('region',{name:'Result',exact:true});
async function fill(page,d,v=d.vectors[0].inputs){for(const f of d.inputs){const p=page.locator('#cpc-'+f.id);if(f.type==='choice')await p.selectOption(v[f.id]??'');else await p.fill(v[f.id]??'');}}
async function edit(page,d,field,value){const f=d.inputs.find(f=>f.id===field),p=page.locator('#cpc-'+field);if(f.type==='choice')await p.selectOption(value);else await p.fill(value);}
for(const d of additions){
 test(`v2 compiled ${d.id}: every registry vector, copy, reset and switch`,async({page})=>{
  await page.goto('/');await choose(page,d.id);
  for(const v of d.vectors){await fill(page,d,v.inputs);await calc(page);await expect(result(page)).toBeVisible();
   for(const [key,value]of Object.entries(v.expected))await expect(result(page)).toContainText(`${value} ${d.outputs.find(o=>o.key===key).unit}`);
   await page.getByRole('button',{name:'Copy result',exact:true}).click();await expect(page.getByText('Result copied',{exact:true})).toBeVisible();
   const copies=await page.evaluate(()=>window.probe.clipboard);expect(copies.at(-1)).toBe(summary(d,d.calculate(v.inputs)));
   await page.getByRole('button',{name:'Reset inputs',exact:true}).click();await expect(result(page)).toHaveCount(0);
   for(const f of d.inputs)await expect(page.locator('#cpc-'+f.id)).toHaveValue('');
  }
  await fill(page,d);await calc(page);await page.getByTestId('select-homa1-ir').click();await choose(page,d.id);await expect(result(page)).toHaveCount(0);for(const f of d.inputs)await expect(page.locator('#cpc-'+f.id)).toHaveValue('');
 });
 test(`v2 compiled ${d.id}: missing/invalid fields and unsupported use have focus and no copy`,async({page})=>{
  test.setTimeout(120000);await page.goto('/');await choose(page,d.id);
  for(const f of d.inputs){
   if(!f.optional){await fill(page,d);await edit(page,d,f.id,'');await calc(page);await expect(page.locator('#cpc-'+f.id)).toBeFocused();await expect(result(page)).toHaveCount(0);await expect(page.getByRole('button',{name:'Copy result',exact:true})).toHaveCount(0);}
   if(f.type==='number'){await fill(page,d);await edit(page,d,f.id,'bad');await calc(page);await expect(page.locator('#cpc-'+f.id)).toHaveAttribute('aria-invalid','true');await expect(result(page)).toHaveCount(0);}
  }
  for(const v of unsupported[d.id]??[]){await fill(page,d);await edit(page,d,v.field,v.value);for(const [f,value]of Object.entries(v.also??{}))await edit(page,d,f,value);await calc(page);await expect(page.locator('#cpc-'+(v.errorField??v.field))).toBeFocused();await expect(result(page)).toHaveCount(0);await expect(page.getByRole('button',{name:'Copy result',exact:true})).toHaveCount(0);}
 });
}
test('v2 expanded search, categories and ordered v1+v2 favourites; no clinical persistence',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Show more calculators',exact:true}).click();expect(await page.locator('[data-testid^="select-"]').count()).toBe(registry.length);
 for(const category of new Set(registry.map(d=>d.category)))await expect(page.getByRole('region',{name:category,exact:true})).toBeVisible();
 for(const d of additions){await page.getByLabel('Search calculators',{exact:true}).fill(d.aliases[0]);await expect(page.getByTestId('select-'+d.id)).toBeVisible();}
 await page.getByRole('button',{name:'Clear search'}).click();
 for(const id of ['homa1-ir',...additions.map(d=>d.id)]){const d=registry.find(d=>d.id===id);await page.getByRole('button',{name:`Add to favourites: ${d.name}`,exact:true}).click();}
 const writes=await page.evaluate(()=>window.probe.storage);expect(writes.at(-1)).toEqual({key:'favourites.v1',value:['homa1-ir',...additions.map(d=>d.id)]});
 await page.getByRole('button',{name:'Show favourites',exact:true}).click();expect(await page.locator('[data-testid^="select-"]').count()).toBe(additions.length+1);
 await page.evaluate(()=>{window.probe.unmount();});await expect(page.locator('h1')).toHaveCount(0);await page.evaluate(()=>window.probe.mount());
 for(const d of additions)await expect(page.getByRole('button',{name:`Remove from favourites: ${d.name}`,exact:true})).toHaveAttribute('aria-pressed','true');
});
test('v2 point scores: all yes/no and age branches compiled, offline without clinical persistence',async({page})=>{
 await page.goto('/');await expect(page.locator('h1')).toBeVisible();await page.context().setOffline(true);
 const requests=[],logs=[];page.on('request',r=>requests.push(r.url()));page.on('console',m=>logs.push(m.text()));page.on('pageerror',e=>logs.push(e.message));
 for(const id of ['cha2ds2-vasc','has-bled']){const d=registry.find(d=>d.id===id);await page.getByTestId('select-'+id).click();
  for(const f of d.inputs){for(const o of f.options??[]){await fill(page,d);if(f.id==='af'&&o.value==='no')continue;if(f.id==='labile'&&o.value==='na')await edit(page,d,'anticoagulant','non-vka');if(f.id==='anticoagulant'&&o.value==='non-vka')await edit(page,d,'labile','na');await edit(page,d,f.id,o.value);await calc(page);await expect(result(page)).toBeVisible();}}
 }
 expect(requests).toEqual([]);expect(logs).toEqual([]);expect(await page.evaluate(()=>window.probe.storage)).toEqual([]);expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual([]);
});

test('v2 all forms narrow/wide and light/dark without horizontal clipping',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 for(const theme of ['light','dark'])for(const width of [320,1200]){
  await page.evaluate(({theme,width})=>{document.body.classList.toggle('dark',theme==='dark');document.querySelector('#root').style.width=width+'px';},{theme,width});
  for(const d of additions){await choose(page,d.id);await fill(page,d);await calc(page);await expect(result(page)).toBeVisible();
   const geometry=await page.locator('.cpc').evaluate(main=>({scroll:main.scrollWidth,client:main.clientWidth,overflow:[...main.querySelectorAll('button,input,select')].filter(e=>e.getBoundingClientRect().right>main.getBoundingClientRect().right+1).length}));expect(geometry.scroll).toBeLessThanOrEqual(geometry.client+1);expect(geometry.overflow).toBe(0);
  }
  await choose(page,'has-bled');await fill(page,registry.find(d=>d.id==='has-bled'));await calc(page);await page.evaluate(()=>{document.activeElement.blur();window.scrollTo(0,0);});await page.screenshot({path:`.browser/screenshots/v2-${theme}-${width}.png`,fullPage:true});
 }
});
