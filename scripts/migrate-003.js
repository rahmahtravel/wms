const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('🚀 Starting migration 003: Add warehouse columns to existing tables...\n');

  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL server');

    // Use the database
    await connection.query(`USE ${process.env.DB_NAME}`);
    console.log(`✅ Using database '${process.env.DB_NAME}'`);

    // Check if required tables exist
    console.log('\n🔍 Checking existing tables...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
      AND TABLE_NAME IN ('purchasing_incoming', 'purchasing_barang_keluar', 'warehouse_locations', 'warehouse_racks', 'warehouse_bins')
    `);
    
    const existingTables = tables.map(t => t.TABLE_NAME);
    console.log('✅ Found existing tables:', existingTables.join(', '));

    if (!existingTables.includes('warehouse_locations') || 
        !existingTables.includes('purchasing_incoming') || 
        !existingTables.includes('purchasing_barang_keluar')) {
      console.log('\n⚠️  ERROR: Required tables not found!');
      console.log('   Please run migration 002 first to create warehouse tables.');
      process.exit(1);
    }

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/003_add_warehouse_columns_to_existing_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📄 Running migration file: 003_add_warehouse_columns_to_existing_tables.sql');
    console.log('   Adding warehouse columns to existing tables...\n');

    // Execute migration
    await connection.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Changes applied:');
    console.log('   ✅ Added warehouse_id, rack_id, bin_id to purchasing_incoming');
    console.log('   ✅ Added warehouse_id, rack_id, bin_id to purchasing_barang_keluar');
    console.log('   ✅ Added foreign key constraints');

    console.log('\n✨ Database schema updated successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

// Run migration
runMigration();
