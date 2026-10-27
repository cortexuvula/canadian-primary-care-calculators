// Allow ResizeObserver/container layout to settle after synthetic pane resizes.
export async function choose(page,id){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const toggle=page.getByRole('button',{name:/^Change calculator/});
 if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 const row=page.getByTestId('select-'+id);
 while(await row.count()===0&&await page.getByRole('button',{name:'Show more calculators',exact:true}).isVisible())await page.getByRole('button',{name:'Show more calculators',exact:true}).click();
 await row.click();
}
