import { Pool } from 'pg';

// This file is imported AFTER dotenv loads in server.ts

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'trackher_db',
  user: 'postgres',
  password: 'Ujwal@12345',
});

console.log('Database Pool Created:');
console.log('  Host:', process.env.DB_HOST);
console.log('  Database:', process.env.DB_NAME);
console.log('  User:', process.env.DB_USER);
console.log('  Password:', process.env.DB_PASSWORD ? '***' : 'NOT SET');

export default pool;