import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite, { schema });

function generateManagerCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function init() {
  try {
    // Generate a manager code
    const code = generateManagerCode();

    console.log('\n🎯 Football Match Management App - Initialization\n');
    console.log('Database initialized successfully!\n');
    console.log('📋 Manager Access Link:');
    console.log(`   http://localhost:3000/manager/${code}`);
    console.log('\n💡 Save this link to access manager features!');
    console.log('   The first person to visit this link will set up the manager account.\n');
    console.log('⚠️  Important: Save this code, you will need it: ' + code + '\n');

    sqlite.close();
    process.exit(0);
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
}

init();
