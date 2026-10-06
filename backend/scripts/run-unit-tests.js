#!/usr/bin/env node
/**
 * CI/CD Unit & Offline Acceptance Test Runner
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const unitSuites = [
  { name: 'Native RFC 7519 JWT & Migration Manager', file: 'test_recommendations_jwt_offline.js' },
  { name: 'Phase 3 End-to-End Payments, Delivery & Reconciliation', file: 'test_phase3_acceptance.js' },
  { name: 'Phase 5 SaaS Company Control Center & Domain Routing', file: 'test_phase5_saas_control.js' },
];

function runScript(filePath) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(process.execPath, [filePath], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test', DB_CLIENT: 'mysql' }
    });

    child.on('close', (code) => {
      resolve({ code, duration: ((Date.now() - start) / 1000).toFixed(2) });
    });

    child.on('error', (err) => {
      console.error(`Failed to launch ${filePath}:`, err);
      resolve({ code: 1, duration: 0 });
    });
  });
}

async function main() {
  console.log('================================================================');
  console.log('🧪 RUNNING CI/CD UNIT & OFFLINE ACCEPTANCE SUITES');
  console.log('================================================================\n');

  let allPassed = true;
  const results = [];

  for (const suite of unitSuites) {
    console.log(`\n▶ Running: ${suite.name} (${suite.file})...`);
    const fullPath = path.join(ROOT_DIR, suite.file);
    const result = await runScript(fullPath);
    results.push({ ...suite, ...result });

    if (result.code !== 0) {
      allPassed = false;
      console.error(`❌ Suite failed: ${suite.name} (exit code: ${result.code})`);
    } else {
      console.log(`✅ Suite passed: ${suite.name} (${result.duration}s)`);
    }
  }

  console.log('\n================================================================');
  console.log('📊 UNIT TEST SUITES SUMMARY');
  console.log('================================================================');
  results.forEach(r => {
    const status = r.code === 0 ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status.padEnd(10)} | ${r.name.padEnd(50)} | ${r.duration}s`);
  });
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
