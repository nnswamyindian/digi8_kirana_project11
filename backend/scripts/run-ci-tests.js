#!/usr/bin/env node
/**
 * Master CI/CD Test Pipeline Runner
 * Orchestrates Unit/Acceptance Tests and End-to-End Live Integration Tests
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function runStep(scriptName) {
  return new Promise((resolve) => {
    const fullPath = path.join(ROOT_DIR, 'scripts', scriptName);
    const child = spawn(process.execPath, [fullPath], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: process.env
    });

    child.on('close', (code) => {
      resolve(code);
    });

    child.on('error', (err) => {
      console.error(`Error running ${scriptName}:`, err);
      resolve(1);
    });
  });
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       KIRANA SAAS PLATFORM — COMPLETE CI TEST PIPELINE       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Stage 1: Unit & Offline Verification
  console.log('➡️  STAGE 1: Executing Unit & Acceptance Test Suites...');
  const unitCode = await runStep('run-unit-tests.js');
  if (unitCode !== 0) {
    console.error('\n❌ CI Pipeline Aborted: Unit & Acceptance test suites failed.');
    process.exit(1);
  }

  // Stage 2: Live Integration Tests
  console.log('\n➡️  STAGE 2: Executing Live Multi-Tenant Integration Suites...');
  const integrationCode = await runStep('run-integration-tests.js');
  if (integrationCode !== 0) {
    console.error('\n❌ CI Pipeline Aborted: Integration test suites failed.');
    process.exit(1);
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🎉 ALL CI TEST SUITES PASSED (UNIT + LIVE INTEGRATION)      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  process.exit(0);
}

main().catch(err => {
  console.error('CI master test runner failed:', err);
  process.exit(1);
});
