import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'anatolia_user',
  password: process.env.DB_PASSWORD ?? 'AnatoliaBDD2026!',
  database: process.env.DB_NAME || 'anatolia_sofrasi',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

export async function pingDatabase() {
  const [rows] = await pool.query('SELECT DATABASE() AS database_name, NOW() AS checked_at');
  return rows[0];
}
