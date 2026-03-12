import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = path.resolve(__dirname, '../../test-data/e2e.db');

export default function globalSetup() {
  // Ensure the test-data directory exists
  mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });

  // Push the schema to the test database
  execSync('pnpm --filter server db:push', {
    cwd: path.resolve(__dirname, '../..'),
    env: { ...process.env, DB_PATH: TEST_DB_PATH },
    stdio: 'inherit',
  });
}
