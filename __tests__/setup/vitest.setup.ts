import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanDatabase } from './test-db';

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Ensure we're in test mode
if (process.env.NODE_ENV !== 'test') {
  throw new Error('Tests must run with NODE_ENV=test to prevent data corruption');
}

// Ensure we're using test database
if (!process.env.DATABASE_URL?.includes('_test')) {
  throw new Error('DATABASE_URL must include "_test" to prevent production data corruption');
}

console.log('🧪 Test Environment Initialized');
console.log('📦 Database:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));

// Global setup - runs once before all tests
beforeAll(async () => {
  console.log('\n🔧 Running database migrations for test database...');
  
  try {
    // Push Prisma schema to test database
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env },
    });
    
    console.log('✅ Database migrations completed\n');
  } catch (error) {
    console.error('❌ Failed to run migrations:', error);
    throw error;
  }
}, 60000); // 60 second timeout for migrations

// Clean database before each test for isolation
beforeEach(async () => {
  await cleanDatabase();
});

// Global teardown - runs once after all tests
afterAll(async () => {
  console.log('\n🧹 Test suite completed');
});
