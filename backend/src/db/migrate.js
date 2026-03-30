require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function migrate() {
  const sqlPath = path.join(__dirname, 'migrations', '001_schema_inicial.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('Executando migration 001_schema_inicial.sql...');
    await client.query(sql);
    console.log('Migration concluida com sucesso.');
  } catch (err) {
    console.error('Erro na migration:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
