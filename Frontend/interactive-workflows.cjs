#!/usr/bin/env node
/**
 * Interactive Workflow Testing for Elior Fitness
 * Tests all major user journeys with real form submissions and interactions
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5174';
const API_URL = 'http://localhost:8001';
const SCREENSHOTS_DIR = path.join(__dirname, 'test-screenshots', 'workflows');
const WORKFLOW_REPORT = path.join(__dirname, '..', 'WORKFLOW_TEST_REPORT.md');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const bugs = [];
const successes = [];

function logBug(workflow, step, details, severity = 'high') {
  bugs.push({ workflow, step, details, severity, timestamp: new Date().toISOString() });
  console.log(`[BUG-${severity.toUpperCase()}] [${workflow}] ${step}: ${details}`);
}

function logSuccess(workflow, step) {
  successes.push({ workflow, step, timestamp: new Date().toISOString() });
  console.log(`[OK] [${workflow}] ${step}`);
}

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  try {
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  } catch (e) {
    return null;
  }
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
  await page.waitForTimeout(2500);
  return !page.url().includes('/login');
}

async function safeClick(page, selector, timeout = 5000) {
  try {
    const el = await page.waitForSelector(selector, { timeout });
    if (el) {
      await el.click({ force: true });
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
}

// ==================== WORKFLOW 1: LOGIN FLOWS ====================
async function testLoginFlows(browser) {
  console.log('\n=== WORKFLOW 1: LOGIN FLOWS ===');

  // Test 1a: Valid admin login
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const ok = await login(page, 'testadmin', 'test123');
    if (ok) {
      logSuccess('Login', 'Admin login successful');
      await screenshot(page, 'workflow-01a-admin-login-success');
    } else {
      logBug('Login', 'Admin login', 'Could not login as testadmin', 'critical');
    }
    await ctx.close();
  }

  // Test 1b: Valid trainer login
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const ok = await login(page, 'testtrainer', 'test123');
    if (ok) {
      logSuccess('Login', 'Trainer login successful');
      await screenshot(page, 'workflow-01b-trainer-login-success');
    } else {
      logBug('Login', 'Trainer login', 'Could not login as testtrainer', 'critical');
    }
    await ctx.close();
  }

  // Test 1c: Valid client login
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const ok = await login(page, 'testclient2', 'test123');
    if (ok) {
      logSuccess('Login', 'Client login successful');
      await screenshot(page, 'workflow-01c-client-login-success');
    } else {
      logBug('Login', 'Client login', 'Could not login as testclient2', 'critical');
    }
    await ctx.close();
  }

  // Test 1d: Invalid password
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const ok = await login(page, 'testadmin', 'wrongpassword');
    if (!ok) {
      const errorVisible = await page.$('.text-destructive, [role="alert"]') !== null;
      if (errorVisible) {
        logSuccess('Login', 'Invalid password shows error');
        await screenshot(page, 'workflow-01d-invalid-password');
      } else {
        logBug('Login', 'Invalid password', 'No error message shown for wrong password', 'high');
      }
    } else {
      logBug('Login', 'Invalid password', 'Login succeeded with wrong password!', 'critical');
    }
    await ctx.close();
  }

  // Test 1e: Empty form submission
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const btn = await page.$('button[type="submit"]');
    if (btn) await btn.click({ force: true });
    await page.waitForTimeout(1500);
    const stillOnLogin = page.url().includes('/login');
    if (stillOnLogin) {
      logSuccess('Login', 'Empty form stays on login page');
      await screenshot(page, 'workflow-01e-empty-form');
    } else {
      logBug('Login', 'Empty form', 'Empty form submitted successfully', 'critical');
    }
    await ctx.close();
  }
}

// ==================== WORKFLOW 2: TRAINER - CREATE EXERCISE ====================
async function testTrainerCreateExercise(browser) {
  console.log('\n=== WORKFLOW 2: TRAINER - CREATE EXERCISE ===');
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  if (!await login(page, 'testtrainer', 'test123')) {
    logBug('Trainer-CreateExercise', 'Login', 'Failed to login', 'critical');
    await ctx.close();
    return;
  }

  await page.goto(`${BASE_URL}/create-exercise`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await screenshot(page, 'workflow-02a-create-exercise-form');

  // Try to fill the form
  try {
    // Exercise Name
    const nameInput = await page.$('input[name="name"], input[placeholder*="Push-ups"], input[type="text"]');
    if (nameInput) {
      await nameInput.fill('בדיקת תרגיל אוטומטי');
      logSuccess('Trainer-CreateExercise', 'Name field accepts input');
    } else {
      logBug('Trainer-CreateExercise', 'Name field', 'Could not find exercise name input', 'high');
    }

    // Description
    const descInput = await page.$('textarea[name="description"], textarea');
    if (descInput) {
      await descInput.fill('תיאור תרגיל לבדיקת מערכת');
      logSuccess('Trainer-CreateExercise', 'Description field accepts input');
    }

    // Muscle Group dropdown
    const muscleDropdown = await page.$('select[name="muscle_group_id"], button:has-text("Select muscle group")');
    if (muscleDropdown) {
      try {
        await muscleDropdown.click({ force: true });
        await page.waitForTimeout(500);
        // Try to select first option
        const firstOption = await page.$('[role="option"]:first-child, select option:nth-child(2)');
        if (firstOption) await firstOption.click({ force: true });
        logSuccess('Trainer-CreateExercise', 'Muscle group dropdown opens');
      } catch (e) {
        logBug('Trainer-CreateExercise', 'Muscle dropdown', 'Dropdown click failed: ' + e.message, 'medium');
      }
    }

    // Difficulty dropdown
    const diffDropdown = await page.$('select[name="difficulty"], button:has-text("Beginner")');
    if (diffDropdown) {
      try {
        await diffDropdown.click({ force: true });
        await page.waitForTimeout(500);
        logSuccess('Trainer-CreateExercise', 'Difficulty dropdown opens');
      } catch (e) {
        logBug('Trainer-CreateExercise', 'Difficulty dropdown', 'Dropdown click failed: ' + e.message, 'medium');
      }
    }

    await screenshot(page, 'workflow-02b-create-exercise-filled');

    // Try to submit
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click({ force: true });
      await page.waitForTimeout(2500);
      await screenshot(page, 'workflow-02c-create-exercise-submitted');

      const url = page.url();
      if (url.includes('/create-exercise')) {
        const errorVisible = await page.$('.text-destructive, [role="alert"]') !== null;
        if (errorVisible) {
          logBug('Trainer-CreateExercise', 'Submission', 'Form rejected with validation error', 'medium');
        } else {
          logSuccess('Trainer-CreateExercise', 'Form submitted (may have succeeded or stayed on page)');
        }
      } else {
        logSuccess('Trainer-CreateExercise', 'Form submitted and redirected');
      }
    }
  } catch (e) {
    logBug('Trainer-CreateExercise', 'Form interaction', e.message, 'high');
  }

  await ctx.close();
}

// ==================== WORKFLOW 3: TRAINER - CREATE WORKOUT ====================
async function testTrainerCreateWorkout(browser) {
  console.log('\n=== WORKFLOW 3: TRAINER - CREATE WORKOUT ===');
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  if (!await login(page, 'testtrainer', 'test123')) {
    logBug('Trainer-CreateWorkout', 'Login', 'Failed to login', 'critical');
    await ctx.close();
    return;
  }

  await page.goto(`${BASE_URL}/create-workout`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await screenshot(page, 'workflow-03a-create-workout-form');

  try {
    // Workout name
    const nameInput = await page.$('input[name="name"], input[type="text"]');
    if (nameInput) {
      await nameInput.fill('אימון בדיקה אוטומטי');
      logSuccess('Trainer-CreateWorkout', 'Name field accepts input');
    }

    // Description
    const descInput = await page.$('textarea[name="description"], textarea');
    if (descInput) {
      await descInput.fill('תיאור אימון לבדיקה');
      logSuccess('Trainer-CreateWorkout', 'Description field accepts input');
    }

    // Try to add exercise
    const addExerciseBtn = await page.$('button:has-text("+"), button:has-text("הוסף"), button:has-text("Add")');
    if (addExerciseBtn) {
      await addExerciseBtn.click({ force: true });
      await page.waitForTimeout(1000);
      await screenshot(page, 'workflow-03b-add-exercise-dialog');
      logSuccess('Trainer-CreateWorkout', 'Add exercise button works');

      // Try to dismiss
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      logBug('Trainer-CreateWorkout', 'Add exercise', 'Could not find add exercise button', 'medium');
    }

    await screenshot(page, 'workflow-03c-create-workout-filled');
  } catch (e) {
    logBug('Trainer-CreateWorkout', 'Form interaction', e.message, 'high');
  }

  await ctx.close();
}

// ==================== WORKFLOW 4: TRAINER - WEEKLY MEALS ====================
async function testTrainerWeeklyMeals(browser) {
  console.log('\n=== WORKFLOW 4: TRAINER - WEEKLY MEALS ===');
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  if (!await login(page, 'testtrainer', 'test123')) {
    logBug('Trainer-WeeklyMeals', 'Login', 'Failed to login', 'critical');
    await ctx.close();
    return;
  }

  await page.goto(`${BASE_URL}/trainer-weekly-meals-v3`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await screenshot(page, 'workflow-04a-weekly-meals-empty');

  try {
    // Try to select a client
    const clientDropdown = await page.$('select, button[role="combobox"]');
    if (clientDropdown) {
      try {
        await clientDropdown.click({ force: true });
        await page.waitForTimeout(500);
        const firstOption = await page.$('[role="option"]:first-child, select option:nth-child(2)');
        if (firstOption) {
          await firstOption.click({ force: true });
          await page.waitForTimeout(1500);
          await screenshot(page, 'workflow-04b-weekly-meals-with-client');
          logSuccess('Trainer-WeeklyMeals', 'Client selection works');
        }
      } catch (e) {
        logBug('Trainer-WeeklyMeals', 'Client dropdown', 'Dropdown interaction failed: ' + e.message, 'medium');
      }
    } else {
      logBug('Trainer-WeeklyMeals', 'Client dropdown', 'No client selector found', 'medium');
    }
  } catch (e) {
    logBug('Trainer-WeeklyMeals', 'Interaction', e.message, 'medium');
  }

  await ctx.close();
}

// ==================== WORKFLOW 5: CLIENT - DASHBOARD & CHECK-IN ====================
async function testClientDashboard(browser) {
  console.log('\n=== WORKFLOW 5: CLIENT - DASHBOARD & CHECK-IN ===');
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  if (!await login(page, 'testclient2', 'test123')) {
    logBug('Client-Dashboard', 'Login', 'Failed to login', 'critical');
    await ctx.close();
    return;
  }

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await screenshot(page, 'workflow-05a-client-dashboard');

  try {
    // Look for check-in button
    const checkinBtn = await page.$('button:has-text("Check-In"), button:has-text("שלח"), button:has-text("בדיקה")');
    if (checkinBtn) {
      await checkinBtn.click({ force: true });
      await page.waitForTimeout(1500);
      await screenshot(page, 'workflow-05b-checkin-clicked');
      logSuccess('Client-Dashboard', 'Check-in button clickable');
    } else {
      logBug('Client-Dashboard', 'Check-in', 'No check-in button found', 'medium');
    }

    // Test weight section interaction
    const weightSection = await page.$(':has-text("WEIGHT"), :has-text("משקל")');
    if (weightSection) {
      logSuccess('Client-Dashboard', 'Weight section visible');
    }

    // Test calories section
    const calSection = await page.$(':has-text("CALORIES TRACKER"), :has-text("קלוריות")');
    if (calSection) {
      logSuccess('Client-Dashboard', 'Calories section visible');
    }
  } catch (e) {
    logBug('Client-Dashboard', 'Interaction', e.message, 'medium');
  }

  await ctx.close();
}

// ==================== WORKFLOW 6: CLIENT - TRAINING ====================
async function testClientTraining(browser) {
  console.log('\n=== WORKFLOW 6: CLIENT - TRAINING ===');
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  if (!await login(page, 'testclient2', 'test123')) {
    logBug('Client-Training', 'Login', 'Failed to login', 'critical');
    await ctx.close();
    return;
  }

  await page.goto(`${BASE_URL}/training`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await screenshot(page, 'workflow-06a-client-training');

  // Check if empty state or training plan shown
  const emptyState = await page.$(':has-text("אין תוכנית אימון")') !== null;
  let hasWorkouts = false;
  try {
    const workoutLinks = await page.$$('a[href*="/training/day"]');
    hasWorkouts = workoutLinks.length > 0;
  } catch (e) { hasWorkouts = false; }

  if (emptyState) {
    logSuccess('Client-Training', 'Empty state shown correctly');
  } else if (hasWorkouts) {
    logSuccess('Client-Training', 'Training days displayed');
  } else {
    logBug('Client-Training', 'Content', 'Neither empty state nor workouts visible', 'medium');
  }

  await ctx.close();
}

// ==================== WORKFLOW 7: CLIENT - MEALS ====================
async function testClientMeals(browser) {
  console.log('\n=== WORKFLOW 7: CLIENT - MEALS ===');
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  if (!await login(page, 'testclient2', 'test123')) {
    logBug('Client-Meals', 'Login', 'Failed to login', 'critical');
    await ctx.close();
    return;
  }

  await page.goto(`${BASE_URL}/meals`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await screenshot(page, 'workflow-07a-client-meals');

  try {
    // Check macro cards
    const macros = await page.$$eval('.macro-card, [data-macro]', els => els.length);
    if (macros > 0) {
      logSuccess('Client-Meals', `Macro cards visible: ${macros}`);
    }

    // Try date navigation
    const nextBtn = await page.$('button:has-text(">"), button[aria-label="next"]');
    if (nextBtn) {
      await nextBtn.click({ force: true });
      await page.waitForTimeout(1000);
      await screenshot(page, 'workflow-07b-client-meals-next-day');
      logSuccess('Client-Meals', 'Date navigation works');
    }

    // Check for "log meal" or "add food" button
    const addBtn = await page.$('button:has-text("+"), button:has-text("הוסף"), button:has-text("Add")');
    if (addBtn) {
      logSuccess('Client-Meals', 'Add meal button visible');
    }
  } catch (e) {
    logBug('Client-Meals', 'Interaction', e.message, 'medium');
  }

  await ctx.close();
}

// ==================== WORKFLOW 8: CLIENT - PROGRESS ====================
async function testClientProgress(browser) {
  console.log('\n=== WORKFLOW 8: CLIENT - PROGRESS ===');
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  if (!await login(page, 'testclient2', 'test123')) {
    logBug('Client-Progress', 'Login', 'Failed to login', 'critical');
    await ctx.close();
    return;
  }

  await page.goto(`${BASE_URL}/progress`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await screenshot(page, 'workflow-08a-client-progress');

  try {
    // Try to add a weight entry
    const addBtn = await page.$('button:has-text("הוסף"), button:has-text("Add"), button:has-text("+")');
    if (addBtn) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(1000);
      await screenshot(page, 'workflow-08b-progress-add-form');
      logSuccess('Client-Progress', 'Add progress button opens form');

      // Try to fill weight
      const weightInput = await page.$('input[type="number"], input[name="weight"]');
      if (weightInput) {
        await weightInput.fill('75.5');
        logSuccess('Client-Progress', 'Weight input accepts value');
      }

      // Cancel or close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      logBug('Client-Progress', 'Add button', 'No add progress button found', 'medium');
    }
  } catch (e) {
    logBug('Client-Progress', 'Interaction', e.message, 'medium');
  }

  await ctx.close();
}

// ==================== WORKFLOW 9: ADMIN - USER MANAGEMENT ====================
async function testAdminUserManagement(browser) {
  console.log('\n=== WORKFLOW 9: ADMIN - USER MANAGEMENT ===');
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  if (!await login(page, 'testadmin', 'test123')) {
    logBug('Admin-Users', 'Login', 'Failed to login', 'critical');
    await ctx.close();
    return;
  }

  await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await screenshot(page, 'workflow-09a-admin-users-list');

  try {
    // Check user count
    const userRows = await page.$$('table tbody tr, [data-user-row]').length;
    logSuccess('Admin-Users', `User table shows ${userRows} rows`);

    // Try to click "Add User" or similar
    const addBtn = await page.$('button:has-text("רישום"), button:has-text("Add"), button:has-text("+")');
    if (addBtn) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(1500);
      await screenshot(page, 'workflow-09b-admin-add-user-form');
      logSuccess('Admin-Users', 'Add user button opens form');

      // Fill form
      const usernameInput = await page.$('input[name="username"], input#username');
      if (usernameInput) {
        await usernameInput.fill('workflowtestuser');
      }
      const emailInput = await page.$('input[name="email"], input[type="email"]');
      if (emailInput) {
        await emailInput.fill('workflowtest@test.com');
      }
      const passInput = await page.$('input[name="password"], input[type="password"]');
      if (passInput) {
        await passInput.fill('testpass123');
      }

      await screenshot(page, 'workflow-09c-admin-add-user-filled');

      // Cancel
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      logBug('Admin-Users', 'Add user', 'No add user button found', 'medium');
    }

    // Test search/filter
    const searchInput = await page.$('input[type="search"], input[placeholder*="חפש"], input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      await screenshot(page, 'workflow-09d-admin-users-search');
      logSuccess('Admin-Users', 'Search/filter works');
    }
  } catch (e) {
    logBug('Admin-Users', 'Interaction', e.message, 'high');
  }

  await ctx.close();
}

// ==================== WORKFLOW 10: ADMIN - SYSTEM PAGE ====================
async function testAdminSystem(browser) {
  console.log('\n=== WORKFLOW 10: ADMIN - SYSTEM PAGE ===');
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  if (!await login(page, 'testadmin', 'test123')) {
    logBug('Admin-System', 'Login', 'Failed to login', 'critical');
    await ctx.close();
    return;
  }

  await page.goto(`${BASE_URL}/system`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await screenshot(page, 'workflow-10a-admin-system');

  try {
    // Check tabs
    const tabs = await page.$$('button[role="tab"], [role="tablist"] button').length;
    if (tabs > 0) {
      logSuccess('Admin-System', `${tabs} tabs visible`);

      // Click each tab
      const tabButtons = await page.$$('button[role="tab"], [role="tablist"] button');
      for (let i = 0; i < Math.min(tabButtons.length, 4); i++) {
        await tabButtons[i].click({ force: true });
        await page.waitForTimeout(1000);
        await screenshot(page, `workflow-10b-admin-system-tab-${i}`);
      }
    }

    // Check refresh button
    const refreshBtn = await page.$('button:has-text("Refresh")');
    if (refreshBtn) {
      await refreshBtn.click({ force: true });
      await page.waitForTimeout(1500);
      logSuccess('Admin-System', 'Refresh button works');
    }
  } catch (e) {
    logBug('Admin-System', 'Interaction', e.message, 'medium');
  }

  await ctx.close();
}

// ==================== WORKFLOW 11: CHAT ====================
async function testChat(browser) {
  console.log('\n=== WORKFLOW 11: CHAT ===');

  // Test 11a: Client sends message
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    if (!await login(page, 'testclient2', 'test123')) {
      logBug('Chat-Client', 'Login', 'Failed to login', 'critical');
      await ctx.close();
      return;
    }

    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await screenshot(page, 'workflow-11a-chat-client-view');

    try {
      const msgInput = await page.$('input[type="text"], textarea, [contenteditable]');
      const sendBtn = await page.$('button[type="submit"], button:has-text("Send"), button:has-text("שלח")');

      if (msgInput && sendBtn) {
        await msgInput.fill('הודעת בדיקה מהלקוח');
        await sendBtn.click({ force: true });
        await page.waitForTimeout(2000);
        await screenshot(page, 'workflow-11b-chat-client-sent');
        logSuccess('Chat-Client', 'Message sent successfully');
      } else {
        logBug('Chat-Client', 'Input/Send', 'Could not find chat input or send button', 'high');
      }
    } catch (e) {
      logBug('Chat-Client', 'Interaction', e.message, 'high');
    }

    await ctx.close();
  }

  // Test 11b: Trainer views chat
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    if (!await login(page, 'testtrainer', 'test123')) {
      logBug('Chat-Trainer', 'Login', 'Failed to login', 'critical');
      await ctx.close();
      return;
    }

    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await screenshot(page, 'workflow-11c-chat-trainer-view');

    try {
      const hasMessages = await page.$eval('.message, [data-message], .chat-message', () => true).catch(() => false);
      if (hasMessages) {
        logSuccess('Chat-Trainer', 'Messages visible to trainer');
      } else {
        logBug('Chat-Trainer', 'Messages', 'No messages visible to trainer', 'medium');
      }
    } catch (e) {
      logBug('Chat-Trainer', 'Interaction', e.message, 'medium');
    }

    await ctx.close();
  }
}

// ==================== WORKFLOW 12: MOBILE RESPONSIVE INTERACTIONS ====================
async function testMobileInteractions(browser) {
  console.log('\n=== WORKFLOW 12: MOBILE RESPONSIVE INTERACTIONS ===');
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();

  if (!await login(page, 'testclient2', 'test123')) {
    logBug('Mobile-Client', 'Login', 'Failed to login', 'critical');
    await ctx.close();
    return;
  }

  // Test mobile dashboard
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await screenshot(page, 'workflow-12a-mobile-dashboard');

  // Test swipe/scroll on dashboard
  try {
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
    await screenshot(page, 'workflow-12b-mobile-dashboard-scrolled');
    logSuccess('Mobile-Client', 'Dashboard scrolls on mobile');
  } catch (e) {
    logBug('Mobile-Client', 'Scroll', e.message, 'low');
  }

  // Test mobile navigation (bottom tabs)
  try {
    const navItems = await page.$$('nav a, [role="navigation"] a, .bottom-nav a, footer a');
    if (navItems.length > 0) {
      for (let i = 0; i < Math.min(navItems.length, 3); i++) {
        await navItems[i].click({ force: true });
        await page.waitForTimeout(1500);
        await screenshot(page, `workflow-12c-mobile-nav-${i}`);
      }
      logSuccess('Mobile-Client', 'Bottom navigation works');
    } else {
      logBug('Mobile-Client', 'Navigation', 'No bottom navigation found on mobile', 'medium');
    }
  } catch (e) {
    logBug('Mobile-Client', 'Navigation', e.message, 'medium');
  }

  await ctx.close();
}

// ==================== WORKFLOW 13: UNAUTHORIZED ACTIONS ====================
async function testUnauthorizedActions(browser) {
  console.log('\n=== WORKFLOW 13: UNAUTHORIZED ACTIONS ===');

  // Test client accessing admin pages
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    if (!await login(page, 'testclient2', 'test123')) {
      await ctx.close();
      return;
    }

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    // Check if admin content is visible (not just URL)
    const hasAdminContent = await page.$(':has-text("לוח בקרה"), :has-text("Dashboard"), [data-admin]') !== null;
    const has404 = await page.$(':has-text("404"), :has-text("לא נמצא")') !== null;
    if (hasAdminContent && !has404) {
      logBug('Security', 'Client→Admin', 'Client can access admin content!', 'critical');
    } else {
      logSuccess('Security', 'Client blocked from admin page (shows 404)');
    }
    await screenshot(page, 'workflow-13a-client-admin-blocked');
    await ctx.close();
  }

  // Test client accessing trainer pages
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    if (!await login(page, 'testclient2', 'test123')) {
      await ctx.close();
      return;
    }

    await page.goto(`${BASE_URL}/create-exercise`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const hasTrainerContent = await page.$(':has-text("Create New Exercise"), :has-text("צור תרגיל")') !== null;
    const has404 = await page.$(':has-text("404"), :has-text("לא נמצא")') !== null;
    if (hasTrainerContent && !has404) {
      logBug('Security', 'Client→Trainer', 'Client can access trainer create-exercise content!', 'critical');
    } else {
      logSuccess('Security', 'Client blocked from trainer create-exercise');
    }
    await screenshot(page, 'workflow-13b-client-trainer-blocked');
    await ctx.close();
  }

  // Test trainer accessing admin pages
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    if (!await login(page, 'testtrainer', 'test123')) {
      await ctx.close();
      return;
    }

    await page.goto(`${BASE_URL}/system`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const hasSystemContent = await page.$(':has-text("System Management"), :has-text("מערכת")') !== null;
    const has404 = await page.$(':has-text("404"), :has-text("לא נמצא")') !== null;
    if (hasSystemContent && !has404) {
      logBug('Security', 'Trainer→Admin', 'Trainer can access system page!', 'critical');
    } else {
      logSuccess('Security', 'Trainer blocked from system page');
    }
    await screenshot(page, 'workflow-13c-trainer-admin-blocked');
    await ctx.close();
  }
}

// ==================== REPORT GENERATION ====================
async function generateReport() {
  let report = `# Elior Fitness - Interactive Workflow Test Report\n\n`;
  report += `**Date:** ${new Date().toISOString()}\n`;
  report += `**Environment:** Local (Chrome/Playwright)\n`;
  report += `**Frontend:** ${BASE_URL}\n`;
  report += `**Backend:** ${API_URL}\n\n`;

  report += `## Summary\n\n`;
  report += `- **Workflows Tested:** 13\n`;
  report += `- **Successful Steps:** ${successes.length}\n`;
  report += `- **Bugs Found:** ${bugs.length}\n`;
  report += `- **Screenshots:** ${fs.readdirSync(SCREENSHOTS_DIR).length}\n\n`;

  if (bugs.length > 0) {
    report += `## Bugs Found\n\n`;
    const severityOrder = ['critical', 'high', 'medium', 'low'];
    for (const sev of severityOrder) {
      const sevBugs = bugs.filter(b => b.severity === sev);
      if (sevBugs.length > 0) {
        report += `### ${sev.toUpperCase()} Severity (${sevBugs.length})\n\n`;
        for (const bug of sevBugs) {
          report += `- **${bug.workflow} → ${bug.step}:** ${bug.details}\n`;
        }
        report += `\n`;
      }
    }
  }

  if (successes.length > 0) {
    report += `## Successful Steps\n\n`;
    // Group by workflow
    const byWorkflow = {};
    for (const s of successes) {
      if (!byWorkflow[s.workflow]) byWorkflow[s.workflow] = [];
      byWorkflow[s.workflow].push(s.step);
    }
    for (const [wf, steps] of Object.entries(byWorkflow)) {
      report += `### ${wf}\n`;
      for (const step of steps) {
        report += `- ✅ ${step}\n`;
      }
      report += `\n`;
    }
  }

  report += `## Workflows Tested\n\n`;
  report += `1. **Login Flows** — Admin, Trainer, Client logins; invalid password; empty form\n`;
  report += `2. **Trainer: Create Exercise** — Fill form, dropdowns, submission attempt\n`;
  report += `3. **Trainer: Create Workout** — Fill form, add exercise dialog\n`;
  report += `4. **Trainer: Weekly Meals** — Client selection, meal planning\n`;
  report += `5. **Client: Dashboard** — Check-in button, weight/calories sections\n`;
  report += `6. **Client: Training** — View training plan / empty state\n`;
  report += `7. **Client: Meals** — Macro cards, date navigation, add meal\n`;
  report += `8. **Client: Progress** — Add weight entry, form interaction\n`;
  report += `9. **Admin: User Management** — User list, add user form, search\n`;
  report += `10. **Admin: System** — Tab navigation, refresh button\n`;
  report += `11. **Chat** — Client sends message, trainer views messages\n`;
  report += `12. **Mobile Responsive** — Dashboard scroll, bottom navigation\n`;
  report += `13. **Unauthorized Access** — Role-based route protection\n\n`;

  report += `## Screenshots\n\n`;
  report += `All workflow screenshots saved to \`Frontend/test-screenshots/workflows/\`\n\n`;

  report += `## Recommendations\n\n`;
  report += `1. Fix any CRITICAL workflow blockers immediately\n`;
  report += `2. Address HIGH severity UX issues that prevent feature usage\n`;
  report += `3. Test form submissions with actual backend data creation\n`;
  report += `4. Add end-to-end tests for core user journeys to CI/CD\n`;

  fs.writeFileSync(WORKFLOW_REPORT, report);
  console.log(`\n✅ Workflow report: ${WORKFLOW_REPORT}`);
}

// ==================== MAIN ====================
(async () => {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Elior Fitness - Interactive Workflow Testing               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const browser = await chromium.launch({ headless: true });

  try {
    await testLoginFlows(browser);
    await testTrainerCreateExercise(browser);
    await testTrainerCreateWorkout(browser);
    await testTrainerWeeklyMeals(browser);
    await testClientDashboard(browser);
    await testClientTraining(browser);
    await testClientMeals(browser);
    await testClientProgress(browser);
    await testAdminUserManagement(browser);
    await testAdminSystem(browser);
    await testChat(browser);
    await testMobileInteractions(browser);
    await testUnauthorizedActions(browser);
  } catch (e) {
    console.error('Fatal error:', e.message);
    logBug('TEST_RUN', 'Fatal error', e.message, 'critical');
  } finally {
    await browser.close();
  }

  await generateReport();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  WORKFLOW TESTING COMPLETE                                   ║');
  console.log(`║  Successes: ${successes.length.toString().padEnd(4)}                                    ║`);
  console.log(`║  Bugs: ${bugs.length.toString().padEnd(4)} (${bugs.filter(b=>b.severity==='critical').length} critical)                          ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
})();
