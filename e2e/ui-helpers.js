// Allow ResizeObserver/container layout to settle after synthetic pane resizes.
export async function choose(page,id){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const toggle=page.getByRole('button',{name:/^Change calculator/});
 if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 await page.getByTestId('select-'+id).click();
}
