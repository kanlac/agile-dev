#!/usr/bin/env node
/**
 * Playwright Authentication State Saver
 *
 * Saves browser authentication state (cookies, localStorage) to a JSON file
 * for use with Playwright MCP Server.
 *
 * This script does NOT manage user permissions or access control. It simply
 * saves the authentication state from whatever account you log in to.
 *
 * Usage:
 *   node save-auth-state.js [options]
 *
 * Options:
 *   --url <url>       Starting URL (required)
 *   --domain <name>   Domain identifier (e.g., localhost3000, github) (required)
 *   --user <name>     User/session identifier (e.g., jack, alice) (required)
 *   --output <file>   Custom output path (optional, overrides domain/user pattern)
 *
 * Examples:
 *   node save-auth-state.js --url https://localhost:3000/login --domain localhost3000 --user jack
 *   node save-auth-state.js --url https://github.com/login --domain github --user alice
 *   node save-auth-state.js --url https://app.example.com/login --output ./custom/path.json
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Skill root directory (for loading dependencies)
const SKILL_ROOT = path.dirname(__dirname);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    url: null,
    domain: null,
    user: null,
    output: null
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        options.url = args[++i];
        break;
      case '--domain':
        options.domain = args[++i];
        break;
      case '--user':
        options.user = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Playwright Authentication State Saver

This script saves the authentication state from whatever account you log in to.
It does NOT manage user permissions or access control.

Usage:
  node save-auth-state.js [options]

Options:
  --url <url>       Starting URL (required)
  --domain <name>   Domain identifier (e.g., localhost3000, github) (required unless --output is provided)
  --user <name>     User/session identifier (e.g., jack, alice) (required unless --output is provided)
  --output <file>   Custom output path (optional, overrides domain/user pattern)

Examples:
  node save-auth-state.js --url https://localhost:3000/login --domain localhost3000 --user jack
  node save-auth-state.js --url https://github.com/login --domain github --user alice
  node save-auth-state.js --url https://app.example.com/login --output ./custom/path.json

Naming Convention:
  When using --domain and --user, the file will be saved as:
    .playwright-auth/{domain}-{user}.json
  This matches the MCP server naming pattern: playwright-{domain}-{user}
        `);
        process.exit(0);
    }
  }

  // Validate required parameters
  if (!options.url) {
    console.error('❌ Error: --url is required');
    console.log('Usage: node save-auth-state.js --url <url> --domain <name> --user <name>');
    console.log('Run with --help for more information');
    process.exit(1);
  }

  // Generate output path
  if (!options.output) {
    if (!options.domain || !options.user) {
      console.error('❌ Error: --domain and --user are required when --output is not provided');
      console.log('Usage: node save-auth-state.js --url <url> --domain <name> --user <name>');
      console.log('Run with --help for more information');
      process.exit(1);
    }
    options.output = `./.playwright-auth/${options.domain}-${options.user}.json`;
  }

  return options;
}

// Check if .playwright-auth/ directory should be added to .gitignore
function checkGitignore(authFilePath) {
  const gitignorePath = path.join(process.cwd(), '.gitignore');

  // Check if .gitignore exists
  if (!fs.existsSync(gitignorePath)) {
    console.log('\n⚠️  No .gitignore file found in current directory');
    console.log('💡 Consider creating one to avoid committing auth files:');
    console.log(`   echo ".playwright-auth/" >> .gitignore`);
    return;
  }

  // Check if .playwright-auth/ is already in .gitignore
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  const lines = gitignoreContent.split('\n');

  const hasPattern = lines.some(line => {
    const trimmed = line.trim();
    return trimmed === '.playwright-auth/' ||
           trimmed === '.playwright-auth' ||
           trimmed === 'playwright-auth/';
  });

  if (!hasPattern) {
    console.log('\n⚠️  .playwright-auth/ directory not found in .gitignore');
    console.log('💡 Add this line to .gitignore to avoid committing auth files:');
    console.log(`   .playwright-auth/`);
  }
}

async function saveAuthState() {
  const options = parseArgs();

  // Load playwright from skill directory (not project directory)
  let chromium;
  try {
    const playwrightPath = path.join(SKILL_ROOT, 'node_modules', 'playwright');
    chromium = require(playwrightPath).chromium;
  } catch (e) {
    console.error('❌ Playwright not found in skill directory.');
    console.error('   Please run setup first:');
    console.error(`   cd ${SKILL_ROOT} && npm install`);
    console.error('   npx playwright install chromium');
    process.exit(1);
  }

  console.log('🚀 Starting browser...');
  console.log(`📍 Starting URL: ${options.url}`);

  let browser;
  try {
    // Try to launch with Chrome channel first
    try {
      browser = await chromium.launch({
        headless: false,
        channel: 'chrome',
        args: [
          '--disable-blink-features=AutomationControlled',  // 隐藏自动化标记
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--no-default-browser-check'
        ]
      });
    } catch (e) {
      // Fallback to default chromium
      console.log('⚠️  Chrome not found, using default Chromium');
      browser = await chromium.launch({
        headless: false,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage'
        ]
      });
    }

    const context = await browser.newContext({
      // 隐藏 webdriver 标记
      userAgent: undefined,  // 使用默认 UA，不添加 HeadlessChrome 标记
    });
    const page = await context.newPage();

    // Navigate to the starting URL
    await page.goto(options.url);

    console.log('\n📝 Please complete login in the browser window...');
    console.log('⏳ After logging in, return here and press Enter to save auth state');

    // Wait for user to press Enter
    await new Promise(resolve => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('\nPress Enter when ready to save...', () => {
        rl.close();
        resolve();
      });
    });

    // Ensure output directory exists
    const outputDir = path.dirname(options.output);
    if (outputDir !== '.' && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save authentication state
    const authStatePath = path.resolve(options.output);
    await context.storageState({ path: authStatePath });

    // Fix sameSite attribute for better compatibility
    const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf8'));
    if (authState.cookies) {
      authState.cookies = authState.cookies.map(cookie => {
        // Change Strict to Lax for better compatibility with Playwright
        if (cookie.sameSite === 'Strict') {
          console.log(`   ⚠️  Fixing cookie "${cookie.name}" sameSite: Strict → Lax`);
          cookie.sameSite = 'Lax';
        }
        return cookie;
      });
      fs.writeFileSync(authStatePath, JSON.stringify(authState, null, 2));
    }

    console.log(`\n✅ Authentication state saved to: ${authStatePath}`);

    // Show what was saved
    const cookieCount = authState.cookies ? authState.cookies.length : 0;
    const originCount = authState.origins ? authState.origins.length : 0;

    console.log('\n📊 Saved data:');
    console.log(`   - ${cookieCount} cookie(s)`);
    console.log(`   - ${originCount} origin(s) with localStorage`);

    // Check .gitignore
    checkGitignore(authStatePath);

    await browser.close();

    console.log('\n🎉 Done! Authentication state saved successfully.');
    console.log('\n💡 Next steps:');
    console.log('   1. Add to MCP config: --storage-state=' + authStatePath);
    console.log('   2. Ensure .playwright-auth/ is in .gitignore');
    if (options.domain && options.user) {
      console.log(`   3. Configure MCP Server as: playwright-${options.domain}-${options.user}`);
      console.log(`      Example MCP config: See references/how-to-install-mcp.md`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('Executable doesn\'t exist')) {
      console.log('\n💡 Playwright browser not installed. Run:');
      console.log('   npx playwright install chromium');
    }
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

saveAuthState().catch(console.error);
