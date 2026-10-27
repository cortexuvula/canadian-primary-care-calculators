import {test,expect} from '@playwright/test';
async function select(page,id){await page.getByTestId('select-'+id).click();}
async function homaReady(page){await select(page,'homa1-ir');await page.getByLabel('Fasting glucose (mmol/L)',{exact:true}).fill('5.8');await page.getByLabel('Fasting insulin (pmol/L)',{exact:true}).fill('114');await page.locator('#cpc-fasting').selectOption('yes');await page.locator('#cpc-exogenous').selectOption('no');await page.locator('#cpc-population').selectOption('yes');await page.getByRole('button',{name:'Calculate',exact:true}).click();await expect(page.getByRole('region',{name:'Result',exact:true})).toContainText('4.90');}
test('compiled SDK registration, navigation, search and category exploration',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{level:1})).toHaveText('Canadian Primary Care');
 const registrations=await page.evaluate(()=>window.probe.contributions.map(c=>({id:c.id,area:c.area,order:c.order,data:{...c.data,run:typeof c.data?.run}})));
 expect(registrations.map(c=>c.area)).toEqual(['routes','sidebar.nav','palette']);
 expect(registrations[1].order).toBe(63); // Resetwatch is 62; host registry sorts ascending.
 await expect(page.locator('header')).toContainText('No patient identifiers. Not a diagnosis.');
 await expect(page.locator('header')).toContainText('Clinician decision support — verify applicability and consult the model references. Release review evidence is recorded in the project documentation.');
 expect(registrations[0].data.path).toBe('/canadian-primary-care');expect(registrations[1].data.path).toBe('/canadian-primary-care');
 await page.evaluate(()=>window.probe.contributions[2].data.run());expect(await page.evaluate(()=>window.probe.navigation)).toEqual(['/canadian-primary-care']);
 await page.getByLabel('Search calculators',{exact:true}).fill(' insulin ');await expect(page.getByTestId('select-homa1-ir')).toBeVisible();await expect(page.getByTestId('select-framingham')).toHaveCount(0);
 await page.getByLabel('Search calculators',{exact:true}).fill('zzzz');await expect(page.getByText(/No calculators match/)).toBeVisible();await page.getByRole('button',{name:'Clear search'}).click();await expect(page.getByTestId('select-framingham')).toBeVisible();
});
test('compiled HOMA valid calculation, explicit copy, synchronous stale edit/reset/switch and privacy',async({page})=>{
 const requests=[],logs=[];await page.goto('/');await expect(page.getByRole('heading',{level:1})).toBeVisible();page.on('request',r=>requests.push(r.url()));page.on('console',m=>logs.push(m.text()));page.on('pageerror',e=>logs.push(e.message));
 await select(page,'homa1-ir');await page.getByRole('button',{name:'Calculate',exact:true}).click();await expect(page.locator('#cpc-glucose')).toBeFocused();await expect(page.getByRole('region',{name:'Result',exact:true})).toHaveCount(0);
 await homaReady(page);expect(await page.evaluate(()=>window.probe.clipboard)).toEqual([]);
 await page.getByRole('button',{name:'Copy result',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Result copied'})).toBeVisible();const copied=await page.evaluate(()=>window.probe.clipboard);expect(copied).toHaveLength(1);expect(copied[0]).toContain('4.90 index (unitless)');expect(copied[0]).toContain('Matthews 1985');expect(copied[0]).not.toContain('114');
 await page.locator('#cpc-glucose').fill('6');await expect(page.getByRole('region',{name:'Result',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Copy result',exact:true})).toHaveCount(0);await expect(page.getByText('Inputs changed — calculate again',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Calculate',exact:true}).click();await page.getByRole('button',{name:'Reset inputs'}).click();await expect(page.locator('#cpc-glucose')).toHaveValue('');await expect(page.locator('#cpc-fasting')).toHaveValue('');expect(await page.evaluate(()=>window.probe.clipboard)).toEqual(copied);
 await homaReady(page);await select(page,'egfr-2021');await expect(page.locator('#cpc-age')).toHaveValue('');await expect(page.getByRole('region',{name:'Result',exact:true})).toHaveCount(0);await select(page,'homa1-ir');await expect(page.locator('#cpc-insulin')).toHaveValue('');
 expect(requests).toEqual([]);expect(logs).toEqual([]);expect(await page.evaluate(()=>window.probe.storage)).toEqual([]);expect(await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),url:location.search+location.hash}))).toEqual({local:[],session:[],url:''});
});
