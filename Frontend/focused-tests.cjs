#!/usr/bin/env node
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5174';
const SCREENSHOTS_DIR = path.join(__dirname, 'test-screenshots');
const BUG_REPORT_ADDENDUM = path.join(__dirname, '..', 'BUGREPORT_ADDENDUM.md');

const bugs = [];
const observations = [];

function logBug(category, title, details, severity = 'medium') {
  bugs.push({ category, title, details: details || 'N/A', severity, timestamp: new Date().toISOString() });
  console.log(`[BUG-${severity.toUpperCase()}] [${category}] ${title}`);
}

function logObservation(category, title, details) {
  observations.push({ category, title, details: details || '', timestamp: new Date().toISOString() });
  console.log(`[OBS] [${category}] ${title}`);
}

async function screenshot(page, name, subdir = '') {
  const dir = path.join(SCREENSHOTS_DIR, subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function login(page, username, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const userInput = await page.$('input#username');
  const passInput = await page.$('input#password');
  if (!userInput || !passInput) return false;
  await userInput.fill(username);
  await passInput.fill(password);
  const btn = await page.$('button[type="submit"]');
  if (btn) await btn.click({ force: true });
  await page.waitForTimeout(2000);
  return !page.url().includes('/login');
}

(async () => {
  console.log('Running focused tests...');
  const browser = await chromium.launch({ headless: true });

  // Test 1: Unauthorized access
  console.log('\n=== UNAUTHORIZED ACCESS ===');
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    for (const route of ['/', '/admin', '/trainer-dashboard', '/training', '/progress', '/meals']) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const url = page.url();
      if (!url.includes('/login')) {
        logBug('SECURITY', `${route} accessible without auth`, `Redirected to ${url}`, 'critical');
      }
      await screenshot(page, `unauth-${route.replace(/\//g, '_') || 'root'}`, 'security');
    }
    await context.close();
  }

  // Test 2: 404 page
  console.log('\n=== 404 PAGE ===');
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    if (await login(page, 'testadmin', 'test123')) {
      await page.goto(`${BASE_URL}/nonexistent-page-12345`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const text = await page.evaluate(() => document.body.innerText);
      const has404 = text.includes('404') || text.includes('Not Found') || text.includes('לא נמצא');
      if (!has404) logBug('NAVIGATION', '404 page lacks clear message', text.substring(0, 200), 'medium');
      await screenshot(page, '404-page', 'navigation');
    }
    await context.close();
  }

  // Test 3: Language switch
  console.log('\n=== LANGUAGE SWITCH ===');
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    if (await login(page, 'testadmin', 'test123')) {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await screenshot(page, 'lang-hebrew', 'language');
      
      const langBtn = await page.$('button:has-text("EN"), button:has-text("English"), [aria-label*="English"]');
      if (langBtn) {
        await langBtn.click({ force: true });
        await page.waitForTimeout(2000);
        await screenshot(page, 'lang-english', 'language');
        const dir = await page.evaluate(() => document.documentElement.dir);
        const lang = await page.evaluate(() => document.documentElement.lang);
        if (dir !== 'ltr') logBug('I18N', 'English mode not LTR', `dir="${dir}"`, 'high');
        if (lang !== 'en') logObservation('I18N', `Language attr is "${lang}" after switch`, 'Expected "en"');
      } else {
        logObservation('I18N', 'No EN language button found', 'May use dropdown or different selector');
      }
    }
    await context.close();
  }

  // Test 4: Form validation
  console.log('\n=== FORM VALIDATION ===');
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    if (await login(page, 'testtrainer', 'test123')) {
      await page.goto(`${BASE_URL}/create-exercise`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const submit = await page.$('button[type="submit"]');
      if (submit) {
        await submit.click({ force: true });
        await page.waitForTimeout(1000);
        const invalidCount = await page.$$eval('input:invalid, textarea:invalid, [aria-invalid="true"]', els => els.length);
        const errorMsgs = await page.$$eval('.text-destructive, [role="alert"]', els => els.length);
        if (invalidCount === 0 && errorMsgs === 0) {
          logBug('FORMS', 'Create exercise form has no validation feedback', '', 'high');
        }
        await screenshot(page, 'form-validation-exercise', 'forms');
      }
      
      // Test create workout form
      await page.goto(`${BASE_URL}/create-workout`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const submit2 = await page.$('button[type="submit"]');
      if (submit2) {
        await submit2.click({ force: true });
        await page.waitForTimeout(1000);
        const invalidCount = await page.$$eval('input:invalid, textarea:invalid, [aria-invalid="true"]', els => els.length);
        const errorMsgs = await page.$$eval('.text-destructive, [role="alert"]', els => els.length);
        if (invalidCount === 0 && errorMsgs === 0) {
          logBug('FORMS', 'Create workout form has no validation feedback', '', 'high');
        }
        await screenshot(page, 'form-validation-workout', 'forms');
      }
    }
    await context.close();
  }

  // Test 5: Mobile navigation
  console.log('\n=== MOBILE NAVIGATION ===');
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await context.newPage();
    if (await login(page, 'testadmin', 'test123')) {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      // Look for hamburger menu
      const menuBtn = await page.$('button[aria-label="menu"], button svg[data-lucide="menu"], button:has([name="menu"])');
      if (menuBtn) {
        await menuBtn.click({ force: true });
        await page.waitForTimeout(1000);
        await screenshot(page, 'mobile-menu-open', 'navigation');
      } else {
        logObservation('NAVIGATION', 'No hamburger menu on mobile', 'Sidebar may be always visible or different pattern');
      }
    }
    await context.close();
  }

  // Test 6: Deep UI analysis on key pages
  console.log('\n=== DEEP UI ANALYSIS ===');
  {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    
    // Check login page image
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const brokenBg = await page.evaluate(() => {
      const el = document.querySelector('div[style*="elior.png"]');
      if (el) {
        const style = window.getComputedStyle(el);
        return style.backgroundImage.includes('elior.png');
      }
      return false;
    });
    if (!brokenBg) {
      logObservation('UI', 'Login background image may not load', 'Check elior.png exists');
    }
    
    // Check for console errors on dashboard
    await login(page, 'testadmin', 'test123');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.waitForTimeout(1000);
    page.removeAllListeners('console');
    
    if (errors.length > 0) {
      const unique = [...new Set(errors)].slice(0, 5);
      logBug('CONSOLE', 'Admin dashboard JS errors', unique.join('; '), 'high');
    }
    
    await context.close();
  }

  await browser.close();

  // Write addendum
  let addendum = `\n\n## Additional Tests (${new Date().toISOString()})\n\n`;
  if (bugs.length > 0) {
    addendum += `### New Bugs (${bugs.length})\n\n`;
    for (const b of bugs) {
      addendum += `- **[${b.severity.toUpperCase()}] ${b.category}:** ${b.title} — ${b.details}\n`;
    }
    addendum += `\n`;
  }
  if (observations.length > 0) {
    addendum += `### New Observations (${observations.length})\n\n`;
    for (const o of observations) {
      addendum += `- **${o.category}:** ${o.title}${o.details ? ' — ' + o.details : ''}\n`;
    }
    addendum += `\n`;
  }

  const mainReport = path.join(__dirname, '..', 'BUGREPORT.md');
  const existing = fs.readFileSync(mainReport, 'utf8');
  fs.writeFileSync(mainReport, existing.replace('## Recommendations', addendum + '## Recommendations'));

  console.log(`\n✅ Addendum written to main report`);
  console.log(`Bugs: ${bugs.length}, Observations: ${observations.length}`);
})();
