// Before/after artwork comparison on phone and desktop. Existing boutique
// sources stay as the baseline; all storage, prices and media calls are mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { launch, page } from './harness.mjs';

const out = process.argv[2] || '/tmp/totehm-art-migration';
fs.mkdirSync(out, { recursive:true });
// Tiny deterministic, locally generated stand-in for private signed media.
const fixture = out + '/fixture.mp4';
execFileSync('ffmpeg', ['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=0x333366:s=64x64:r=10','-t','1','-c:v','libx264','-threads','1','-preset','ultrafast','-pix_fmt','yuv420p','-movflags','+faststart',fixture]);
const media = fs.readFileSync(fixture);
const urls = Object.fromEntries(Array.from({ length:11 }, (_, i) => [i, 'https://art-fixture.test/' + i + '.mp4']));
const names = ['get_higher','stoner','stoner_terms','play_lisbon_street','discover','discover_lisbon','origins'];
const browser = await launch();
let comparisons = 0;
try {
  for(const viewport of [{ width:390,height:844 }, { width:1440,height:900 }]){
    for(const name of names){
      const snapshots = [];
      for(const [dir, origin] of [['boutique','https://www.higher.boutique'], ['space','https://www.totehm.space']]){
        const { pg, ctx, log } = await page(browser, {
          dir, origin, viewport,
          rpc:{ higher_count:7, set_entry_mode:null }, tables:{ artworks:[] },
          functions:{ 'stoner-gate':{ access:true, urls, expires_in:900 }, 'higher-checkout':{ amount:1700, currency:'usd' } },
          network:url => url.host === 'art-fixture.test' ? { status:200, contentType:'video/mp4', body:media } : null
        });
        await pg.emulateMedia({ reducedMotion:'reduce' });
        await pg.goto(origin + '/' + name + '?compare=1');
        if(name === 'stoner') await pg.waitForFunction(() => {
          const d = window.__totehm_stoner?.(); return d?.access === true && d.step === 0 && !d.busy;
        });
        if(name === 'play_lisbon_street') await pg.waitForSelector('.sign');
        // Wait for the local mocked requests and microtasks; no live media is loaded.
        await pg.waitForTimeout(120);
        const snapshot = await pg.evaluate(() => {
          const style = getComputedStyle(document.body);
          return {
            title:document.title,
            text:document.body.innerText,
            styles:[...document.querySelectorAll('style')].map(e => e.textContent),
            svgs:[...document.querySelectorAll('svg')].map(e => e.outerHTML),
            body:{ color:style.color, background:style.backgroundColor, font:style.fontFamily },
            signs:[...document.querySelectorAll('img[src*="assets/signs/"]')].map(e => e.getAttribute('src')),
            controls:[...document.querySelectorAll('button,input,a')].map(e => [e.tagName,e.id,e.textContent,e.getAttribute('href'),e.getAttribute('type')])
          };
        });
        snapshots.push(snapshot);
        assert.equal(log.errors.filter(e => e.startsWith('pageerror:')).length, 0, `${dir}/${name} JavaScript errors: ${log.errors.join(' | ')}`);
        await pg.screenshot({ path:`${out}/${viewport.width}-${name}-${dir}.png`, animations:'disabled' });
        await ctx.close();
      }
      assert.deepEqual(snapshots[1], snapshots[0], `${name} preserves artwork, visible copy, SVGs, styling and controls at ${viewport.width}px`);
      comparisons++;
    }
  }
  console.log(`${comparisons} phone/desktop artwork comparisons passed; before/after screenshots: ${out}`);
} finally { await browser.close(); }
