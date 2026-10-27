import {test,expect} from '@playwright/test';
import {fictionalCatalog} from '../tests/fixtures/fictional-catalog.js';
import {mkdir,writeFile} from 'node:fs/promises';
test('FICTIONAL scale matrix: bounded discovery at all pane widths appearances and 200 percent text',async({page})=>{
 test.setTimeout(120000);const runs=[];await page.goto('/');await page.waitForFunction(()=>typeof window.probe?.mountScale==='function');
 for(const size of [50,150,300])for(const width of [320,640,1200])for(const theme of ['light','dark'])for(const scale of [1,2]){
 await page.setViewportSize({width,height:1000});await page.evaluate(({size,width,theme,scale})=>{window.probe.unmount();document.querySelector('#root').style.width=width+'px';document.documentElement.dataset.hermesMode=theme;document.documentElement.style.fontSize=scale*16+'px';return window.probe.mountScale(size);},{size,width,theme,scale});
 await expect(page.locator('.cpc-row')).toHaveCount(24);await expect(page.locator('#cpc-count')).toHaveText(`Showing 24 of ${size} calculators`);
 const geometry=await page.locator('.cpc').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,document:document.documentElement.scrollWidth,targets:[...e.querySelectorAll('button,input,select')].filter(e=>e.getClientRects().length).map(e=>({height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width}))}));
 expect(geometry.scroll).toBeLessThanOrEqual(geometry.width+1);expect(geometry.document).toBe(width);expect(geometry.targets.every(t=>t.width>=44&&t.height>=44)).toBe(true);
 runs.push({size,width,theme,scale,rendered:24,...geometry});
 }
 await mkdir('.artifacts/precision',{recursive:true});await writeFile('.artifacts/precision/scale-reflow.json',JSON.stringify({runs},null,2)+'\n');
});
for(const size of [50,150,300])test(`FICTIONAL ${size}: actual Library bounded reveal keyboard filters and counts`,async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>typeof window.probe?.mountScale==='function');await page.evaluate(size=>window.probe.mountScale(size),size);
 await expect(page.locator('.cpc-row')).toHaveCount(24);await expect(page.locator('#cpc-count')).toHaveText(`Showing 24 of ${size} calculators`);
 let count=24;
 while(count<size){const more=page.getByRole('button',{name:'Show more calculators',exact:true});await more.focus();await page.keyboard.press('Enter');await expect(page.getByTestId('select-fictional-'+count)).toBeFocused();count=Math.min(count+24,size);await expect(page.locator('.cpc-row')).toHaveCount(count);}
 await expect(page.getByRole('button',{name:'Show more calculators',exact:true})).toHaveCount(0);
 await page.getByLabel('Search calculators',{exact:true}).fill('fictional-alias-27-exact');await expect(page.locator('.cpc-row')).toHaveCount(1);await expect(page.getByTestId('select-fictional-27')).toBeVisible();
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();await expect(page.locator('.cpc-row')).toHaveCount(24);
 await page.getByLabel('Filter by clinical category').selectOption('Fictional category 0');await page.getByLabel('Browse first letter').selectOption('A');
 const expected=fictionalCatalog(size).filter(d=>d.category==='Fictional category 0'&&d.name.startsWith('A'));
 await expect(page.locator('.cpc-row')).toHaveCount(expected.length);await expect(page.locator('#cpc-count')).toHaveText(`Showing ${expected.length} of ${expected.length} ${expected.length===1?'calculator':'calculators'}`);
 await page.getByRole('button',{name:'Show favourites',exact:true}).click();await expect(page.getByText('No favourites yet',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.probe.storage)).toEqual([]);
});
for(const size of [50,150,300])test(`FICTIONAL growth to ${size} with 15 real models: favourites and clinical draft survive composed discovery`,async({page})=>{
 await page.setViewportSize({width:1200,height:1000});await page.goto('/');await page.waitForFunction(()=>typeof window.probe?.mountScale==='function');await page.evaluate(size=>window.probe.mountScale(size,true),size);
 await expect(page.locator('#cpc-count')).toHaveText(`Showing 24 of ${size} calculators`);
 await page.getByRole('button',{name:'Add to favourites: Adult BMI',exact:true}).click();
 await page.getByTestId('select-bmi').click();await page.locator('#cpc-height').fill('170');
 await page.getByRole('button',{name:'Show favourites',exact:true}).click();await page.getByLabel('Filter by clinical category').selectOption('Anthropometry');await page.getByLabel('Search calculators',{exact:true}).fill('BMI');await page.getByLabel('Browse first letter').selectOption('A');
 await expect(page.locator('.cpc-row')).toHaveCount(1);await expect(page.getByTestId('select-bmi')).toHaveAttribute('aria-current','true');await expect(page.locator('#cpc-height')).toHaveValue('170');
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();await expect(page.locator('.cpc-row')).toHaveCount(24);await page.getByRole('button',{name:'Show more calculators',exact:true}).click();await expect(page.locator('.cpc-row')).toHaveCount(48);await expect(page.locator('#cpc-height')).toHaveValue('170');
 expect(await page.evaluate(()=>window.probe.storage)).toEqual([{key:'favourites.v1',value:['bmi']}]);
});
