import {writeFile} from 'node:fs/promises';
import {startFixture} from './fixture.mjs';
import {installObserver, inspectPage} from '../observer.mjs';
export async function diagnose(taskSpace) {
 const fixture = await startFixture(); const task = await taskSpace('UI research diagnostic and review'); const page = task.page('p1');
 const evidence = {spaceId: task.spaceId};
 const save = () => writeFile('/tmp/ui-research-diagnostic.json', JSON.stringify(evidence,null,2));
 async function cdpShot(path) {const r = await page.cdp('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:true}); await writeFile(path,Buffer.from(r.data,'base64'));}
 try {
   await page.goto(fixture.url); await page.evaluate(installObserver); evidence.fixture = await page.evaluate(inspectPage); await save();
   try {await page.screenshot({path:'/tmp/ui-research-normal.png',fullPage:true}); evidence.screenshot='passed';} catch(e) {evidence.screenshot=e.message;} await save();
   try {await cdpShot('/tmp/ui-research-cdp.png'); evidence.cdp='passed';} catch(e) {evidence.cdp=e.message;} await save();
   await page.goto('http://127.0.0.1:4317');
   evidence.desktop = await page.evaluate(() => ({title:document.title,text:document.body.innerText,scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
   await cdpShot('/tmp/ui-research-desktop.png'); await save();
   await page.cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
   evidence.mobile = await page.evaluate(() => ({text:document.body.innerText,scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
   await cdpShot('/tmp/ui-research-mobile.png'); await save();
 } catch(e) {evidence.error=e.message;await save();}
 finally {await fixture.close();await task.finish({keep:[]});}
 console.log(JSON.stringify(evidence));
}
