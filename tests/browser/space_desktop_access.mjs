import assert from 'node:assert/strict';
import { launch, page } from './harness.mjs';

const space = 'https://www.totehm.space';
const paths = [
  '/', '/index.html', '/lisbon-space', '/new-york',
  '/origin?from=new-york', '/origins?open=1', '/get_higher?case=1',
  '/play_lisbon_street?board=1', '/think_same_but_opposite?work=figher',
  '/discover', '/discover_lisbon', '/same_but_opposite',
  '/market?tab=mine', '/social', '/stoner', '/stoner_terms'
];
const browser = await launch();

async function assertNotice(pg, network, path) {
  network.length = 0;
  await pg.goto(space + path, { waitUntil:'commit' });
  await pg.waitForURL(space + '/desktop');
  await pg.getByRole('heading', { name:'Open on a computer' }).waitFor();
  assert.match(await pg.locator('main').innerText(), /artwork, sound and controls/);
  assert.equal(await pg.locator('canvas,video,iframe,script').count(), 0);
  assert(!network.some(({ url }) => /\/vendor\/three|\.glb$|\/storage\/v1\/|\/auth\/v1\/|\.mp4$/.test(url.pathname)),
    `Mobile route ${path} must not request the 3D runtime, media, or identity services`);
  console.log('PASS touch-only visitor sees the lightweight desktop notice at ' + path);
}

try {
  const network = [];
  const phone = await page(browser, {
    dir:'space', origin:space, session:false,
    viewport:{ width:390, height:844 }, hasTouch:true,
    network:url => { network.push({ url }); return null; }
  });
  try {
    for (const path of paths) await assertNotice(phone.pg, network, path);
    await phone.pg.setViewportSize({ width:844, height:390 });
    await assertNotice(phone.pg, network, '/new-york');
  } finally {
    await phone.ctx.close();
  }

  const desktop = await page(browser, {
    dir:'space', origin:space, session:false,
    viewport:{ width:590, height:800 }
  });
  try {
    await desktop.pg.goto(space + '/stoner_terms');
    assert.equal(new URL(desktop.pg.url()).pathname, '/stoner_terms');
    assert(await desktop.pg.evaluate(() => !matchMedia('(pointer: coarse)').matches));
    console.log('PASS a narrow computer window still opens the experience routes');
  } finally {
    await desktop.ctx.close();
  }

  const iPad = await page(browser, {
    dir:'space', origin:space, session:false,
    viewport:{ width:1366, height:1024 }, hasTouch:true
  });
  try {
    await iPad.pg.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', { value:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15' });
      Object.defineProperty(navigator, 'maxTouchPoints', { value:5 });
    });
    await assertNotice(iPad.pg, [], '/origins');
  } finally {
    await iPad.ctx.close();
  }

  const com = 'https://www.totehm.com';
  const socialEmbed = await page(browser, {
    dir:'com', origin:com, session:false,
    viewport:{ width:390, height:844 }, hasTouch:true,
    network:url => {
      if (url.origin === space && url.pathname === '/desktop-access.js') {
        return {
          contentType:'text/javascript',
          path:new URL('../../space/desktop-access.js', import.meta.url).pathname
        };
      }
      return null;
    }
  });
  try {
    await socialEmbed.pg.goto(com + '/x/space?embed');
    assert.equal(new URL(socialEmbed.pg.url()).pathname, '/x/space');
    assert(await socialEmbed.pg.locator('script[src$="/desktop-access.js"]').count());
    console.log('PASS the COM social embed retains its original mobile route');
  } finally {
    await socialEmbed.ctx.close();
  }
} finally {
  await browser.close();
}
