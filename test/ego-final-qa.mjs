import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {runSmoke} from './ego-smoke.mjs';
export async function finalQa(taskSpace) {
 const task = await taskSpace('UI research final fixture and responsive QA');
 const page = task.page('p1');
 const evidence = {spaceId:task.spaceId};
 try {
  await runSmoke(async () => ({spaceId:task.spaceId,page:label=>task.page(label),finish:async()=>{}}));
  evidence.capture = 'passed';
  for (const [name,width,height,mobile] of [['desktop',1440,1000,false],['mobile',390,844,true]]) {
   await page.cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
   await page.goto('http://127.0.0.1:4317'); await page.cdp('Page.bringToFront',{});
   evidence[name] = await page.evaluate(() => ({title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth, controls:[...document.querySelectorAll('input,button,summary')].map(el=>({tag:el.tagName,type:el.type,label:el.labels?.[0]?.innerText||el.getAttribute('aria-label')||el.innerText,visible:el.getBoundingClientRect().width>0,disabled:!!el.disabled}))}));
   assert.ok(evidence[name].scrollWidth<=width, `${name} horizontal overflow`);
   assert.ok(evidence[name].controls.some(c=>c.tag==='BUTTON'&&/Start capture/.test(c.label)&&c.visible&&!c.disabled));
   await page.screenshot({path:`/tmp/ui-research-final-${name}.png`,fullPage:true});
  }
  evidence.verdict = 'passed';
 } catch(error) {evidence.error=error.message;throw error;}
 finally {await writeFile('/tmp/ui-research-final-qa.json',JSON.stringify(evidence,null,2));await task.finish({keep:[]});}
 console.log(JSON.stringify(evidence));
}
