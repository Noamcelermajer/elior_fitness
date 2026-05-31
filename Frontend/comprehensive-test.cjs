#!/usr/bin/env node
/**
 * Comprehensive Testing Script for Elior Fitness
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5174';
const API_URL = 'http://localhost:8001';
const SCREENSHOTS_DIR = path.join(__dirname, 'test-screenshots');
const BUG_REPORT_PATH = path.join(__dirname, '..', 'BUGREPORT.md');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

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
  try {
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  } catch (e) {
    return null;
  }
}

async function dismissOverlays(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

async function login(page, username, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await dismissOverlays(page);
  
  const usernameInput = await page.$('input#username');
  const passwordInput = await page.$('input#password');
  
  if (!usernameInput || !passwordInput) {
    logBug('LOGIN', 'Login form inputs missing', `Found username: ${!!usernameInput}, password: ${!!passwordInput}`, 'critical');
    await screenshot(page, 'login-missing-inputs', 'login');
    return false;
  }
  
  await usernameInput.fill(username);
  await passwordInput.fill(password);
  
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click({ force: true });
  } else {
    await page.keyboard.press('Enter');
  }
  
  await page.waitForTimeout(2000);
  
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    const errorText = await page.$eval('.text-destructive, [role="alert"]', el => el.textContent).catch(() => null);
    logObservation('LOGIN', `Login failed for ${username}`, errorText || 'No error message shown');
    await screenshot(page, `login-failed-${username}`, 'login');
    return false;
  }
  return true;
}

async function testPage(page, route, name, subdir, viewportName) {
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await dismissOverlays(page);
    
    // Check for JS errors
    const errors = [];
    const errorHandler = msg => { if (msg.type() === 'error') errors.push(msg.text()); };
    page.on('console', errorHandler);
    await page.waitForTimeout(800);
    page.off('console', errorHandler);
    
    if (errors.length > 0) {
      const unique = [...new Set(errors)].slice(0, 3);
      logBug('CONSOLE', `${name}: JS errors`, unique.join('; '), 'medium');
    }
    
    // Check translations
    const html = await page.content();
    const keyLeaks = html.match(/>[a-z_]+\.[a-z_.]+</gi) || [];
    if (keyLeaks.length > 0) {
      logBug('TRANSLATION', `${name}: i18n key leaks`, keyLeaks.slice(0, 5).join(', '), 'high');
    }
    
    // Check responsive
    const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (hasHorizontalScroll) {
      logBug('RESPONSIVE', `${name}: Horizontal scroll on ${viewportName}`, `Route ${route}`, 'medium');
    }
    
    // Count buttons and check labels
    const btnInfo = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      let unlabeled = 0;
      for (const b of btns) {
        if (!b.textContent.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title') && b.offsetWidth > 0) {
          unlabeled++;
        }
      }
      return { total: btns.length, unlabeled };
    });
    
    if (btnInfo.unlabeled > 0) {
      logBug('A11Y', `${name}: ${btnInfo.unlabeled} unlabeled buttons`, `Route ${route}`, 'low');
    }
    
    // Broken images
    const brokenImgs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).filter(img => img.naturalWidth === 0 && img.complete && img.src && !img.src.startsWith('data:')).length;
    });
    if (brokenImgs > 0) {
      logBug('ASSETS', `${name}: ${brokenImgs} broken images`, `Route ${route}`, 'medium');
    }
    
    // Screenshot
    await screenshot(page, `${name}_${viewportName}`, subdir);
    
    return true;
  } catch (e) {
    logBug('PAGE_LOAD', `${name}: Failed to load`, `${route} - ${e.message}`, 'high');
    return false;
  }
}

async function testLoginPage(browser) {
  console.log('\n=== LOGIN PAGE ===');
  for (const device of [
    { name: 'desktop', size: { width: 1920, height: 1080 } },
    { name: 'mobile', size: { width: 375, height: 667 } },
    { name: 'tablet', size: { width: 768, height: 1024 } },
  ]) {
    const context = await browser.newContext({ viewport: device.size });
    const page = await context.newPage();
    
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    await screenshot(page, `login-${device.name}`, 'login');
    
    // Check form elements
    const hasUsername = await page.$('input#username') !== null;
    const hasPassword = await page.$('input#password') !== null;
    const hasSubmit = await page.$('button[type="submit"]') !== null;
    
    if (!hasUsername) logBug('LOGIN', `Missing username input on ${device.name}`, '', 'critical');
    if (!hasPassword) logBug('LOGIN', `Missing password input on ${device.name}`, '', 'critical');
    if (!hasSubmit) logBug('LOGIN', `Missing submit button on ${device.name}`, '', 'critical');
    
    // Test invalid login
    if (hasUsername && hasPassword) {
      await page.fill('input#username', 'wronguser');
      await page.fill('input#password', 'wrongpass');
      const btn = await page.$('button[type="submit"]');
      if (btn) await btn.click({ force: true });
      await page.waitForTimeout(1500);
      await screenshot(page, `login-invalid-${device.name}`, 'login');
      
      const errorVisible = await page.$('.text-destructive, [role="alert"]') !== null;
      if (!errorVisible) {
        logBug('LOGIN', `No error shown for invalid credentials on ${device.name}`, '', 'medium');
      }
    }
    
    // Check RTL/LTR
    const dir = await page.evaluate(() => document.documentElement.dir);
    const lang = await page.evaluate(() => document.documentElement.lang);
    logObservation('UI', `Login page: dir=${dir}, lang=${lang} on ${device.name}`, '');
    
    await context.close();
  }
}

async function testRole(browser, role, username, pages) {
  console.log(`\n=== ${role} PAGES ===`);
  const viewports = [
    { name: 'desktop', size: { width: 1920, height: 1080 } },
    { name: 'mobile', size: { width: 375, height: 667 } },
    { name: 'tablet', size: { width: 768, height: 1024 } },
  ];
  
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: vp.size });
    const page = await context.newPage();
    
    const loginSuccess = await login(page, username, 'test123');
    if (!loginSuccess) {
      logBug('AUTH', `Cannot login as ${role}`, '', 'critical');
      await context.close();
      continue;
    }
    
    for (const { route, name } of pages) {
      await testPage(page, route, name, `${role}-${vp.size.width}x${vp.size.height}`, vp.name);
    }
    
    await context.close();
  }
}

async function testUnauthorized(browser) {
  console.log('\n=== UNAUTHORIZED ACCESS ===');
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  
  for (const route of ['/', '/admin', '/trainer-dashboard', '/training', '/progress']) {
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

async function test404(browser) {
  console.log('\n=== 404 PAGE ===');
  const context = await browser.newContext();
  const page = await context.newPage();
  
  if (await login(page, 'testadmin', 'test123')) {
    await page.goto(`${BASE_URL}/nonexistent-page-12345`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.body.innerText);
    const has404 = text.includes('404') || text.includes('Not Found') || text.includes('לא נמצא');
    if (!has404) {
      logBug('NAVIGATION', '404 page lacks clear message', text.substring(0, 150), 'medium');
    }
    await screenshot(page, '404-page', 'navigation');
  }
  
  await context.close();
}

async function testLanguageSwitch(browser) {
  console.log('\n=== LANGUAGE SWITCH ===');
  const context = await browser.newContext();
  const page = await context.newPage();
  
  if (await login(page, 'testadmin', 'test123')) {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await screenshot(page, 'lang-hebrew', 'language');
    
    const langBtn = await page.$('button:has-text("EN"), button:has-text("English")');
    if (langBtn) {
      await langBtn.click({ force: true });
      await page.waitForTimeout(2000);
      await screenshot(page, 'lang-english', 'language');
      
      const dir = await page.evaluate(() => document.documentElement.dir);
      if (dir !== 'ltr') {
        logBug('I18N', 'English mode not LTR', `dir="${dir}"`, 'high');
      }
    } else {
      logObservation('I18N', 'No language switcher found', 'May be in settings');
    }
  }
  
  await context.close();
}

async function testFormValidation(browser) {
  console.log('\n=== FORM VALIDATION ===');
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
        logBug('FORMS', 'Create exercise form has no validation', '', 'high');
      }
      await screenshot(page, 'form-validation', 'forms');
    }
  }
  
  await context.close();
}

async function testApi() {
  console.log('\n=== API TESTS ===');
  try {
    const health = await fetch(`${API_URL}/health`);
    if (!health.ok) logBug('API', 'Health endpoint failed', `Status ${health.status}`, 'high');
    else console.log('Health: OK');
  } catch (e) {
    logBug('API', 'Health unreachable', e.message, 'critical');
  }
  
  try {
    const login = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testadmin', password: 'test123' })
    });
    if (!login.ok) logBug('API', 'Login endpoint failed', `Status ${login.status}`, 'critical');
    else console.log('Login API: OK');
  } catch (e) {
    logBug('API', 'Login unreachable', e.message, 'critical');
  }
}

async function generateReport() {
  let report = `# Elior Fitness - Comprehensive Test Report\n\n`;
  report += `**Date:** ${new Date().toISOString()}\n`;
  report += `**Environment:** Local (Chromium/Playwright)\n`;
  report += `**Frontend:** ${BASE_URL}\n`;
  report += `**Backend:** ${API_URL}\n\n`;
  
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  bugs.forEach(b => counts[b.severity]++);
  
  report += `## Summary\n\n`;
  report += `- **Total Bugs:** ${bugs.length}\n`;
  report += `- **Critical:** ${counts.critical}\n`;
  report += `- **High:** ${counts.high}\n`;
  report += `- **Medium:** ${counts.medium}\n`;
  report += `- **Low:** ${counts.low}\n`;
  report += `- **Observations:** ${observations.length}\n\n`;
  
  if (bugs.length > 0) {
    report += `## Bugs\n\n`;
    for (const sev of ['critical', 'high', 'medium', 'low']) {
      const list = bugs.filter(b => b.severity === sev);
      if (list.length > 0) {
        report += `### ${sev.toUpperCase()} (${list.length})\n\n`;
        list.forEach((b, i) => {
          report += `${i + 1}. **${b.title}** (${b.category})\n   ${b.details}\n\n`;
        });
      }
    }
  }
  
  if (observations.length > 0) {
    report += `## Observations\n\n`;
    observations.forEach(o => {
      report += `- **${o.category}:** ${o.title}${o.details ? ' — ' + o.details : ''}\n`;
    });
    report += `\n`;
  }
  
  report += `## Screenshots\n\n`;
  report += `All screenshots saved to \`Frontend/test-screenshots/\` organized by role and viewport.\n\n`;
  
  report += `## Coverage\n\n`;
  report += `- Login page (desktop, mobile, tablet, invalid credentials)\n`;
  report += `- Admin: Dashboard, Users, System, Secret Users, Trainer Dashboard, Exercise Bank, Meal Bank, Progress, Chat\n`;
  report += `- Trainer: Dashboard, Exercise Bank, Meal Bank, Create Exercise, Create Workout, Create Workout Plan, Weekly Meals, Progress, Chat\n`;
  report += `- Client: Home, Training, Progress, Meals, Sandbox Meals, Chat\n`;
  report += `- 404 page, unauthorized access, language switch, form validation\n`;
  report += `- Console errors, translations, responsive issues, accessibility, broken images\n\n`;
  
  report += `## Recommendations\n\n`;
  report += `1. Fix CRITICAL bugs immediately (auth/security issues)\n`;
  report += `2. Address HIGH severity items (translation leaks, console errors)\n`;
  report += `3. Test on real mobile devices (iOS Safari, Android Chrome)\n`;
  report += `4. Add CI/CD integration for automated regression testing\n`;
  
  fs.writeFileSync(BUG_REPORT_PATH, report);
  console.log(`\n✅ Report: ${BUG_REPORT_PATH}`);
}

(async () => {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Elior Fitness - Comprehensive Test Suite           ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  
  const browser = await chromium.launch({ headless: true });
  
  try {
    await testApi();
    await testLoginPage(browser);
    
    await testRole(browser, 'ADMIN', 'testadmin', [
      { route: '/', name: 'Admin-Home' },
      { route: '/admin', name: 'Admin-Dashboard' },
      { route: '/users', name: 'Admin-Users' },
      { route: '/system', name: 'Admin-System' },
      { route: '/secret-users', name: 'Admin-SecretUsers' },
      { route: '/trainer-dashboard', name: 'Admin-TrainerDashboard' },
      { route: '/exercises', name: 'Admin-ExerciseBank' },
      { route: '/meal-bank', name: 'Admin-MealBank' },
      { route: '/progress', name: 'Admin-Progress' },
      { route: '/chat', name: 'Admin-Chat' },
    ]);
    
    await testRole(browser, 'TRAINER', 'testtrainer', [
      { route: '/', name: 'Trainer-Home' },
      { route: '/trainer-dashboard', name: 'Trainer-Dashboard' },
      { route: '/exercises', name: 'Trainer-ExerciseBank' },
      { route: '/meal-bank', name: 'Trainer-MealBank' },
      { route: '/create-exercise', name: 'Trainer-CreateExercise' },
      { route: '/create-workout', name: 'Trainer-CreateWorkout' },
      { route: '/create-workout-plan-v2', name: 'Trainer-CreateWorkoutPlanV2' },
      { route: '/trainer-weekly-meals-v3', name: 'Trainer-WeeklyMealsV3' },
      { route: '/progress', name: 'Trainer-Progress' },
      { route: '/chat', name: 'Trainer-Chat' },
    ]);
    
    await testRole(browser, 'CLIENT', 'testclient2', [
      { route: '/', name: 'Client-Home' },
      { route: '/training', name: 'Client-Training' },
      { route: '/progress', name: 'Client-Progress' },
      { route: '/meals', name: 'Client-Meals' },
      { route: '/sandbox/meals-v3', name: 'Client-SandboxMeals' },
      { route: '/chat', name: 'Client-Chat' },
    ]);
    
    await testUnauthorized(browser);
    await test404(browser);
    await testLanguageSwitch(browser);
    await testFormValidation(browser);
  } catch (e) {
    console.error('Fatal error:', e.message);
    logBug('TEST_RUN', 'Fatal test error', e.message, 'critical');
  } finally {
    await browser.close();
  }
  
  await generateReport();
  
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  TEST COMPLETE                                       ║');
  console.log(`║  Bugs: ${bugs.length} (C:${bugs.filter(b=>b.severity==='critical').length} H:${bugs.filter(b=>b.severity==='high').length} M:${bugs.filter(b=>b.severity==='medium').length} L:${bugs.filter(b=>b.severity==='low').length})                ║`);
  console.log(`║  Observations: ${observations.length}                                    ║`);
  console.log('╚══════════════════════════════════════════════════════╝');
})();
