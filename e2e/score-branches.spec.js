import {test,expect} from '@playwright/test';
test('compiled isolated score components match published point tables',async({page})=>{
 test.setTimeout(120000);await page.goto('/');
 const calc=async()=>{await page.getByRole('button',{name:'Calculate',exact:true}).click();};
 async function set(v){for(const [f,n]of Object.entries(v)){const p=page.locator('#cpc-'+f);if(await p.evaluate(e=>e.tagName==='SELECT'))await p.selectOption(n);else await p.fill(n);}}
 const result=page.getByRole('region',{name:'Result',exact:true});
 await page.getByTestId('select-cha2ds2-vasc').click();
 const c={af:'yes',ageBand:'under65',sex:'male',chf:'no',hypertension:'no',diabetes:'no',stroke:'no',vascular:'no'};
 for(const [f,n,points]of [['chf','yes',1],['hypertension','yes',1],['diabetes','yes',1],['stroke','yes',2],['vascular','yes',1],['ageBand','65-74',1],['ageBand','75plus',2],['sex','female',1]]){await set({...c,[f]:n});await calc();await expect(result.locator('dd').first()).toHaveText(`${points} points`);}
 await page.getByTestId('select-has-bled').click();
 const h={af:'yes',age:'50',hypertension:'no',renal:'no',liver:'no',stroke:'no',bleeding:'no',anticoagulant:'vka',labile:'no',drugs:'no',alcohol:'no'};
 for(const f of ['hypertension','renal','liver','stroke','bleeding','labile','drugs','alcohol']){await set({...h,[f]:'yes'});await calc();await expect(result.locator('dd').first()).toHaveText('1 points');}
 for(const [age,points]of [['65',0],['66',1]]){await set({...h,age});await calc();await expect(result.locator('dd').first()).toHaveText(`${points} points`);}
 await set({...h,anticoagulant:'non-vka',labile:'na'});await calc();await expect(result).toContainText('Labile INR: N/A');await expect(result.locator('dd').first()).toHaveText('0 points');
});
