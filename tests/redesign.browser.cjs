'use strict';

const { chromium } = require(process.env.PORTFOLIO_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const prefix = '/gao-jiajun-website/';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const name = url.pathname.slice(prefix.length) || 'index.html';
  const file = path.resolve(root, name.endsWith('/') ? name + 'index.html' : name);
  const type = mime[path.extname(file)];
  if (!url.pathname.startsWith(prefix) || !file.startsWith(root + path.sep) || !type) {
    response.writeHead(404).end();
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) response.writeHead(404).end();
    else response.writeHead(200, { 'Content-Type': type }).end(data);
  });
});

const widths = [320, 375, 430, 768, 834, 1280, 1440, 1920];
const services = [
  ['commerce', 'NT$60,000–80,000'],
  ['website', 'NT$2,000'],
  ['crm', 'NT$20,000'],
  ['agents', 'US$5'],
  ['course', 'NT$4,980'],
  ['custom', '諮詢後報價']
];

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const home = 'http://127.0.0.1:' + server.address().port + prefix;
  const catalog = home + 'catalog/';
  const browser = await chromium.launch({ executablePath: process.env.PORTFOLIO_CHROME });
  const errors = [];
  const shots = process.env.PORTFOLIO_SHOTS;
  if (shots) fs.mkdirSync(shots, { recursive: true });

  function watch(page) {
    page.setDefaultTimeout(6500);
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', result => {
      if (result.url().startsWith(home) && result.status() >= 400) errors.push(result.status() + ' ' + result.url());
    });
  }

  async function screenshot(page, name, selector) {
    if (!shots) return;
    const file = path.join(shots, name + '.png');
    if (selector) await page.locator(selector).screenshot({ path: file });
    else await page.screenshot({ path: file });
  }

  try {
    const context = await browser.newContext({ reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    watch(page);

    for (const width of widths) {
      await page.setViewportSize({ width, height: width === 1280 ? 700 : 900 });
      for (const url of [home, catalog, catalog + '#service/agents/flow']) {
        await page.goto(url);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, url + ' width ' + width);
        if (url === home && [768, 1280].includes(width)) {
          const gap = await page.evaluate(() => {
            const image = document.querySelector('.hero-photo').getBoundingClientRect();
            const navigation = document.querySelector('.site-nav').getBoundingClientRect();
            return image.top + image.height * .11 - navigation.bottom;
          });
          assert.ok(gap >= 8, 'short-screen portrait clears navigation at ' + width);
          await screenshot(page, 'home-' + width);
        }
      }
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(home);
    assert.match(await page.title(), /FDE前沿部署工程師/);
    assert.equal(await page.locator('.hero-photo').evaluate(async image => {
      await image.decode();
      return image.naturalWidth;
    }), 1536);
    assert.equal(await page.evaluate(() => ScrollTrigger.getAll().length), 0);
    await screenshot(page, 'home-desktop');
    const stage = page.locator('.project-stage');
    await stage.scrollIntoViewIfNeeded();
    await screenshot(page, 'home-gallery', '.project-stage');
    await stage.press('ArrowRight');
    assert.match(await page.locator('#gallery-status').textContent(), /Commerce OS/);
    const commerce = page.locator('[data-case="commerce"]');
    await commerce.press('Enter');
    assert.equal(await page.locator('.case-dialog').evaluate(dialog => dialog.open), true);
    assert.match(await page.locator('#case-body').textContent(), /責任追蹤/);
    await page.keyboard.press('Escape');
    assert.equal(await commerce.evaluate(link => link === document.activeElement), true);
    await page.locator('[data-view-choice="index"]').click();
    assert.equal(await page.locator('.project-text:visible').count(), 3);
    await page.locator('[data-case="course"]').click();
    assert.match(await page.locator('#case-title').textContent(), /工作坊/);
    await page.locator('#case-contact').click();
    assert.equal(new URL(page.url()).hash, '#contact');
    assert.equal(await page.locator('#contact-title').evaluate(heading => heading === document.activeElement), true);
    await page.locator('[data-view-choice="gallery"]').click();
    assert.equal(await page.locator('.project.is-current').getAttribute('data-project'), 'commerce');

    const method = page.locator('.method-step');
    await method.nth(0).locator('summary').hover();
    assert.equal(await method.nth(0).evaluate(step => step.open), true);
    await method.nth(0).locator('.method-note p').hover();
    assert.equal(await method.nth(0).evaluate(step => step.open), true);
    await method.nth(1).locator('summary').hover();
    assert.equal(await method.nth(0).evaluate(step => step.open), false);
    assert.equal(await method.nth(1).evaluate(step => step.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await method.nth(1).evaluate(step => step.open), false);
    await method.nth(2).locator('summary').press('Enter');
    assert.equal(await method.nth(2).evaluate(step => step.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await method.nth(2).evaluate(step => step.open), false);

    await page.setViewportSize({ width: 707, height: 892 });
    await page.goto(home);
    await page.locator('[data-case="argo"]').click();
    assert.ok(await page.locator('.case-dialog-media img').evaluate(async image => {
      await image.decode();
      const rect = image.getBoundingClientRect();
      return Math.abs(rect.width / rect.height - image.naturalWidth / image.naturalHeight) < .01;
    }));
    await page.keyboard.press('Escape');

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(home);
    await screenshot(page, 'home-mobile');
    const menu = page.locator('.mobile-menu');
    await menu.locator('summary').click();
    await menu.locator('a[href="#lab"]').click();
    assert.equal(await menu.evaluate(details => details.open), false);
    await page.locator('[data-scenario="2"]').click();
    assert.match(await page.locator('#scenario-title').textContent(), /團隊/);
    const exerciseNext = page.locator('#exercise-next');
    await exerciseNext.click();
    assert.match(await page.locator('[aria-current="step"]').textContent(), /交接/);
    await exerciseNext.click();
    assert.match(await exerciseNext.textContent(), /從頭/);
    await exerciseNext.click();
    assert.match(await page.locator('[aria-current="step"]').textContent(), /角色/);

    await menu.locator('summary').click();
    await menu.locator('[data-contact]').click();
    const line = 'https://line.me/ti/p/6uurTkyff9';
    assert.equal(await page.locator('.contact-dialog a', { hasText: 'LINE 加好友' }).getAttribute('href'), line);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('.mobile-menu summary') === document.activeElement);

    const copy = page.locator('#contact [data-copy]');
    await copy.click();
    await page.waitForFunction(() => document.querySelector('.toast').textContent.includes('已複製'));
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await copy.getAttribute('data-copy'));
    await page.route(line, route => route.fulfill({ body: 'LINE' }));
    await page.locator('#contact a', { hasText: 'LINE 加好友' }).click();
    await page.waitForURL(line);
    await page.goto(home);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('.desktop-nav a[href="catalog/"]').click();
    await page.waitForURL(catalog);
    console.log('PASS: home navigation, scenarios, cases and clipboard');
    assert.equal(await page.locator('.product-card').count(), 6);
    for (const [id, price] of services) {
      const print = page.locator('.product-card[href="#service/' + id + '"]');
      assert.ok((await print.locator('.money').textContent()).includes(price), id + ' price');
      await print.locator('img').scrollIntoViewIfNeeded();
      await print.locator('img').evaluate(image => image.decode());
    }
    await page.locator('[data-filter="all"]').click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot(page, 'catalog-desktop');
    const nextService = page.locator('[data-catalog-shift="1"]');
    for (let i = 2; i <= 6; i += 1) {
      await nextService.click();
      assert.equal(await page.locator('#catalog-position').textContent(), '0' + i + ' / 06');
    }
    assert.equal(await nextService.getAttribute('aria-disabled'), 'true');
    await page.locator('[data-layout-choice="index"]').click();
    assert.equal(await page.locator('.product-card:visible').count(), 6);
    await page.locator('[data-layout-choice="gallery"]').click();
    assert.equal(await page.locator('#catalog-position').textContent(), '06 / 06');
    await page.locator('[data-filter="systems"]').click();
    assert.equal(await page.locator('.product-card:visible').count(), 4);
    await page.locator('[data-filter="ai"]').click();
    assert.equal(await page.locator('.product-card:visible').count(), 2);
    await nextService.click();
    const course = page.locator('.product-card[href="#service/course"]');
    await course.click();
    await page.waitForURL(catalog + '#service/course');
    assert.match(await page.locator('#product-view h1').textContent(), /課程/);
    await page.locator('.product-nav a[href$="/flow"]').click();
    await page.waitForURL(catalog + '#service/course/flow');
    const originalStep = await page.locator('#flow-panel h3').textContent();
    await page.locator('[data-step="1"]').click();
    assert.notEqual(await page.locator('#flow-panel h3').textContent(), originalStep);
    await page.locator('.faq summary').first().click();
    assert.equal(await page.locator('.faq details[open]').count(), 1);
    await page.locator('#share-product').click();
    await page.waitForFunction(() => document.querySelector('#share-status').textContent.includes('已複製'));
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), catalog + '#service/course');
    await screenshot(page, 'catalog-detail', '.product-hero');

    await page.locator('.hero-price [data-inquire]').click();
    await page.locator('#inquiry-form button[type="submit"]').click();
    assert.match(await page.locator('.copy-status').textContent(), /先簡單寫下/);
    await page.locator('#need').fill('整理課程的操作流程');
    await page.locator('#inquiry-form button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('.copy-status').textContent.includes('已複製'));
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /整理課程的操作流程/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#inquiry-dialog').evaluate(dialog => dialog.open), false);
    await page.locator('.product-breadcrumb a').click();
    await page.locator('#catalog-view').waitFor();
    assert.equal(await page.locator('.product-card:visible').count(), 2);
    assert.equal(await page.locator('#catalog-position').textContent(), '02 / 02');
    assert.equal(await course.evaluate(link => link === document.activeElement), true);
    const [personal] = await Promise.all([context.waitForEvent('page'), page.locator('.personal-link').click()]);
    await personal.waitForURL(home);
    await personal.close();

    for (const [id, price] of services) {
      await page.goto(catalog + '#service/' + id + '/fees');
      assert.ok((await page.locator('#fees .money').textContent()).includes(price), id + ' detail price');
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(catalog);
    await screenshot(page, 'catalog-mobile');

    console.log('PASS: catalog views, filters, routes, six prices and inquiry');
    const mobile = await browser.newContext({ isMobile: true, hasTouch: true, viewport: { width: 375, height: 812 } });
    const phone = await mobile.newPage();
    watch(phone);
    await phone.goto(home + '#projects');
    await phone.locator('.project-stage').scrollIntoViewIfNeeded();
    await phone.waitForFunction(() => Array.from(document.querySelectorAll('.project')).every(project => !project.getAnimations().some(animation => animation.playState === 'running')));
    const bounds = await phone.locator('.project-open[data-case="argo"]').boundingBox();
    const session = await mobile.newCDPSession(phone);
    const y = bounds.y + bounds.height / 2;
    const start = bounds.x + bounds.width * .8;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start, y }] });
    for (let i = 1; i <= 10; i += 1) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start - i * 15, y }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await phone.waitForFunction(() => document.querySelector('.project.is-current').dataset.project === 'commerce');
    const mobileCase = phone.locator('.case-dialog');
    await phone.locator('.project.is-current .project-open').tap();
    const card = await mobileCase.boundingBox();
    assert.ok(card.x >= 12 && card.y >= 12 && card.x + card.width <= 363 && card.y + card.height <= 800);
    await mobileCase.getByRole('button', { name: '關閉案例' }).tap();
    await mobileCase.waitFor({ state: 'hidden' });
    const phoneSteps = phone.locator('.method-step');
    await phoneSteps.nth(0).locator('summary').tap();
    assert.equal(await phoneSteps.nth(0).evaluate(step => step.open), true);
    await phoneSteps.nth(1).locator('summary').tap();
    assert.equal(await phoneSteps.nth(0).evaluate(step => step.open), false);
    assert.equal(await phoneSteps.nth(1).evaluate(step => step.open), true);
    await phoneSteps.nth(1).locator('summary').tap();
    assert.equal(await phoneSteps.nth(1).evaluate(step => step.open), false);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(home);
    assert.equal(await page.evaluate(() => ScrollTrigger.getAll().length), 1);
    await page.locator('[data-case="argo"]').click();
    assert.equal(await page.locator('.case-dialog').evaluate(dialog => dialog.open), true);
    await page.waitForFunction(() => document.querySelector('.case-dialog').style.transform !== '');
    await page.waitForFunction(() => document.querySelector('.case-dialog').style.transform === '');
    await screenshot(page, 'home-case');
    await page.mouse.click(12, 12);
    await page.locator('.case-dialog').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.querySelector('[data-case="argo"]') === document.activeElement);

    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const fallback = await noJs.newPage();
    await fallback.goto(home);
    assert.equal(await fallback.locator('.project:visible').count(), 3);
    await fallback.locator('#case-argo summary').click();
    assert.equal(await fallback.locator('#case-argo').evaluate(details => details.open), true);
    assert.deepEqual(errors, []);
    console.log('PASS: eight widths, home and catalog, case motion, touch and keyboard, dialogs and clipboard, six prices and deep links, reduced motion and static case details.');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => server.close());
