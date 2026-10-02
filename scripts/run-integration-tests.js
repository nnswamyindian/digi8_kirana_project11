#!/usr/bin/env node
/**
 * CI/CD Integration Test Runner
 * Starts background server, validates health endpoint, executes integration suites, and tears down cleanly.
 */

import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = process.env.TEST_PORT || 5000;
const HEALTH_URL = `http://localhost:${PORT}/api/platform/health`;

const integrationSuites = [
  { name: 'Strict Multi-Tenant Isolation & Role Security', file: 'test_strict_tenant_isolation.cjs' },
  { name: 'Phase 4 Multi-Tenant SaaS & Store Lifecycle', file: 'test_phase4_multi_tenant.cjs' },
  { name: 'Complete Multi-Persona Authentication & Tenant Resolution', file: 'server/test_all_logins.js' },
];

function checkHealth(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function waitForServer(url, maxAttempts = 30, delayMs = 500) {
  for (let i = 1; i <= maxAttempts; i++) {
    const isUp = await checkHealth(url);
    if (isUp) return true;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

function runScript(filePath) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(process.execPath, [filePath], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' }
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
  console.log('🧪 RUNNING CI/CD LIVE INTEGRATION SUITES');
  console.log('================================================================\n');

  console.log(`🚀 Starting backend server on port ${PORT}...`);
  const serverProcess = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT_DIR,
    stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test', DB_CLIENT: process.env.DB_CLIENT || 'sqlite' }
  });

  serverProcess.stdout.on('data', (d) => {
    const msg = d.toString();
    if (process.env.DEBUG_SERVER) {
      process.stdout.write(`[Server] ${msg}`);
    }
  });

  serverProcess.stderr.on('data', (d) => {
    process.stderr.write(`[Server Error] ${d.toString()}`);
  });

  const isServerReady = await waitForServer(HEALTH_URL);
  if (!isServerReady) {
    console.error(`❌ Server failed to start and respond at ${HEALTH_URL} within timeout.`);
    serverProcess.kill();
    process.exit(1);
  }

  console.log(`✅ Backend server is online and healthy at ${HEALTH_URL}!\n`);

  let allPassed = true;
  const results = [];

  try {
    for (const suite of integrationSuites) {
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
  } finally {
    console.log('\n🛑 Shutting down test backend server...');
    serverProcess.kill('SIGINT');
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n================================================================');
  console.log('📊 INTEGRATION TEST SUITES SUMMARY');
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
  console.error('Integration test runner fatal error:', err);
  process.exit(1);
});
