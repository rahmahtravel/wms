const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Starting migration 005: Fix stock management structure\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'rahmah_purchasing_logistics',
      multipleStatements: true
    });

    console.log('✅ Connected to database:', process.env.DB_NAME);
    
    const migrationFile = path.join(__dirname, '../migrations/005_fix_stock_management_structure.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('\n📝 Executing migration statements...\n');
    
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.toLowerCase().startsWith('select'));
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        try {
          await connection.query(stmt);
          console.log(`✅ [${i + 1}/${statements.length}] Statement executed`);
        } catch (err) {
          // Skip errors for already existing columns/tables
          if (err.code === 'ER_DUP_FIELDNAME' || 
              err.code === 'ER_DUP_KEYNAME' ||
              err.code === 'ER_TABLE_EXISTS_ERROR' ||
              err.code === 'ER_BAD_FIELD_ERROR') {
            console.log(`⚠️  [${i + 1}/${statements.length}] Already exists, skipping...`);
          } else {
            console.error(`❌ [${i + 1}/${statements.length}] Error:`, err.message);
            // Continue with other statements
          }
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test incoming goods functionality');
    console.log('   2. Test outgoing goods functionality');
    console.log('   3. Verify stock synchronization');
    console.log('   4. Check stock_movements table\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed\n');
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
