import {test,expect} from '@playwright/test';
import {registry,summary} from '../src/registry.js';
import {choose} from './ui-helpers.js';
const additions=registry.slice(15);
const result=page=>page.getByRole('region',{name:'Result',exact:true});
const calculate=page=>page.getByRole('button',{name:'Calculate',exact:true}).click();
async function fill(page,d,v=d.vectors[0].inputs){for(const f of d.inputs){const c=page.locator('#cpc-'+f.id);if(f.type==='choice')await c.selectOption(v[f.id]??'');else await c.fill(v[f.id]??'');}}
test('Batch A actual typed civil-date and bounded LR-list controls',async({page})=>{
 await page.goto('/');await choose(page,'ga-from-edd');
 for(const id of ['edd','asOf']){await expect(page.locator('#cpc-'+id)).toHaveAttribute('type','date');await expect(page.locator('#cpc-'+id)).toHaveValue('');}
 await fill(page,additions.find(d=>d.id==='ga-from-edd'));await calculate(page);await expect(result(page)).toContainText('35+4 as of 2026-10-01');
 await choose(page,'posttest-lr');await expect(page.locator('#cpc-likelihoodRatios')).toHaveAttribute('inputmode','text');
 await page.locator('#cpc-pretestProbabilityPct').fill('20');await page.locator('#cpc-likelihoodRatios').fill('5, 2');await calculate(page);
 await expect(page.locator('#cpc-independent')).toBeFocused();await expect(result(page)).toHaveCount(0);
 await page.locator('#cpc-independent').selectOption('yes');await calculate(page);await expect(result(page)).toContainText('71.4 %');await expect(result(page)).toContainText('conditional independence acknowledged');
});
for(const d of additions){
 test(`Batch A compiled ${d.id}: all independent displays, qualified copy, blank/reset/switch`,async({page})=>{
  test.setTimeout(120000);await page.goto('/');await choose(page,d.id);
  for(const f of d.inputs)await expect(page.locator('#cpc-'+f.id)).toHaveValue('');
  for(const v of d.vectors){await fill(page,d,v.inputs);await calculate(page);await expect(result(page)).toBeVisible();for(const [k,n]of Object.entries(v.expected))await expect(result(page)).toContainText(`${n} ${d.outputs.find(o=>o.key===k).unit}`);
   await page.getByRole('button',{name:'Copy result',exact:true}).click();await expect(page.getByText('Result copied',{exact:true})).toBeVisible();expect((await page.evaluate(()=>window.probe.clipboard)).at(-1)).toBe(summary(d,d.calculate(v.inputs)));
  }
  await page.getByRole('button',{name:'Reset inputs',exact:true}).click();await expect(result(page)).toHaveCount(0);for(const f of d.inputs)await expect(page.locator('#cpc-'+f.id)).toHaveValue('');
  await fill(page,d);await calculate(page);await choose(page,'bsa-mosteller');await choose(page,d.id);await expect(result(page)).toHaveCount(0);for(const f of d.inputs)await expect(page.locator('#cpc-'+f.id)).toHaveValue('');
 });
 test(`Batch A compiled ${d.id}: missing-field focus, stale invalidation and viewport error`,async({page})=>{
  test.setTimeout(120000);await page.setViewportSize({width:640,height:900});await page.goto('/');await choose(page,d.id);
  await page.evaluate(()=>document.documentElement.style.fontSize='24px');
  for(const f of d.inputs){await fill(page,d);if(d.id==='posttest-lr'&&f.id==='independent')await page.locator('#cpc-likelihoodRatios').fill('2, 3');await calculate(page);await expect(result(page)).toBeVisible();
   const c=page.locator('#cpc-'+f.id);if(f.type==='choice')await c.selectOption('');else await c.fill('');await expect(result(page)).toHaveCount(0);await expect(page.getByRole('button',{name:'Copy result',exact:true})).toHaveCount(0);await calculate(page);await expect(c).toBeFocused();await expect(c).toHaveAttribute('aria-invalid','true');
   const error=page.locator('#cpc-'+f.id+'-error');await expect(error).toBeVisible();const controlBox=await c.boundingBox(),errorBox=await error.boundingBox();expect(controlBox.y).toBeGreaterThanOrEqual(0);expect(errorBox.y+errorBox.height).toBeLessThanOrEqual(901);
  }
 });
}
test('Batch A discovery includes all 26 through pagination, aliases, categories, favourites and A–Z',async({page})=>{
 await page.goto('/');await expect(page.locator('#cpc-count')).toHaveText('Showing 24 of 26 calculators');await page.getByRole('button',{name:'Show more calculators',exact:true}).click();await expect(page.locator('[data-testid^="select-"]')).toHaveCount(26);
 for(const d of additions){await page.getByLabel('Search calculators',{exact:true}).fill(d.aliases[0]);await expect(page.getByTestId('select-'+d.id)).toBeVisible();await page.getByRole('button',{name:`Add to favourites: ${d.name}`,exact:true}).click();}
 await page.getByRole('button',{name:'Clear search',exact:true}).click();await page.getByRole('button',{name:'Show favourites',exact:true}).click();await expect(page.locator('[data-testid^="select-"]')).toHaveCount(11);await page.getByRole('button',{name:'Sort A–Z',exact:true}).click();const names=await page.locator('.cpc-name').allTextContents();expect(names).toEqual([...names].sort((a,b)=>a.localeCompare(b,'en')));
 expect((await page.evaluate(()=>window.probe.storage)).at(-1).value).toEqual(additions.map(d=>d.id));
});
test('Batch A date and LR errors never retain old results; unit selection and copy remain qualified',async({page})=>{
 await page.goto('/');await choose(page,'ga-from-edd');await page.locator('#cpc-edd').fill('2026-10-01');await page.locator('#cpc-asOf').fill('2026-10-21');await calculate(page);await expect(result(page)).toContainText('42+6');await expect(result(page)).toContainText('Past 42+0');await page.locator('#cpc-asOf').fill('2027-10-21');await calculate(page);await expect(page.locator('#cpc-asOf')).toBeFocused();await expect(result(page)).toHaveCount(0);
 await choose(page,'posttest-lr');const d=additions.find(d=>d.id==='posttest-lr');await fill(page,d);await calculate(page);await page.locator('#cpc-likelihoodRatios').fill('2, alert(1)');await calculate(page);await expect(page.locator('#cpc-likelihoodRatios')).toBeFocused();await expect(result(page)).toHaveCount(0);
 await choose(page,'urine-acr');await fill(page,additions.find(d=>d.id==='urine-acr'));await page.locator('#cpc-outputUnit').selectOption('mg/g');await calculate(page);await expect(result(page)).toContainText('selected reporting value: 27 mg/g');await expect(page.locator('.cpc-values dd').first()).toContainText('27 mg/g');await expect(result(page)).toContainText('no diagnosis or classification');
});
test('Batch A layouts and selected criteria at 320/640/1200, light/dark, enlarged text',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:1440,height:1100});await page.goto('/');
 for(const theme of ['light','dark'])for(const width of [320,640,1200]){
  await page.evaluate(({theme,width})=>{document.documentElement.dataset.hermesMode=theme;document.documentElement.style.fontSize='24px';document.querySelector('#root').style.width=width+'px';},{theme,width});
  for(const d of additions){await choose(page,d.id);await fill(page,d);await calculate(page);await expect(result(page)).toBeVisible();
   const geo=await page.locator('.cpc').evaluate(main=>({scroll:main.scrollWidth,client:main.clientWidth,overflow:[...main.querySelectorAll('button,input,select,.cpc-selected-choice')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>main.getBoundingClientRect().right+1).length}));expect(geo.scroll).toBeLessThanOrEqual(geo.client+1);expect(geo.overflow).toBe(0);
  }
 }
});
