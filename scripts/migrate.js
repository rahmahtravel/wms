const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function runMigration() {
  console.log('🚀 Starting warehouse tables migration...\n');

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
      AND TABLE_NAME IN ('branches', 'purchasing_barang', 'users', 'super_admin')
    `);
    
    const existingTables = tables.map(t => t.TABLE_NAME);
    console.log('✅ Found existing tables:', existingTables.join(', '));

    if (!existingTables.includes('branches') || !existingTables.includes('purchasing_barang')) {
      console.log('\n⚠️  WARNING: Required tables (branches, purchasing_barang) not found!');
      console.log('📝 Please ensure your existing database has these tables.');
      console.log('   Migration will continue but may fail due to foreign key constraints.\n');
    }

    // Read warehouse migration file
    const migrationPath = path.join(__dirname, '../migrations/002_create_warehouse_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📄 Running migration file: 002_create_warehouse_tables.sql');
    console.log('   Creating 7 new warehouse tables...\n');

    // Execute migration
    await connection.query(migrationSQL);

    console.log('✅ Warehouse tables created successfully!');
    console.log('   - warehouse_locations');
    console.log('   - warehouse_racks');
    console.log('   - warehouse_bins');
    console.log('   - warehouse_stock');
    console.log('   - stock_movements');
    console.log('   - warehouse_transfers');
    console.log('   - warehouse_transfer_items');
    console.log('\n📝 NOTE: Tables created empty (no sample data inserted)');

    // Check if users and super_admin need to be created
    if (!existingTables.includes('users') || !existingTables.includes('super_admin')) {
      console.log('\n🔐 Creating authentication tables...');
      
      // Create super_admin table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS super_admin (
          id int NOT NULL AUTO_INCREMENT,
          name varchar(255) NOT NULL,
          whatsapp varchar(15) NOT NULL,
          password varchar(255) NOT NULL,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_whatsapp (whatsapp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      // Create users table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id int NOT NULL AUTO_INCREMENT,
          branch_id int DEFAULT NULL,
          name varchar(255) NOT NULL,
          whatsapp varchar(15) NOT NULL,
          password varchar(255) NOT NULL,
          role_name enum('sales','admin','purchasing','content','jamaah','logistik','superadmin') NOT NULL,
          jabatan varchar(100) DEFAULT NULL,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted_at timestamp NULL DEFAULT NULL,
          deleted_by int DEFAULT NULL,
          PRIMARY KEY (id),
          KEY idx_branch_id (branch_id),
          KEY idx_whatsapp (whatsapp),
          KEY idx_deleted_by (deleted_by),
          CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE SET NULL,
          CONSTRAINT fk_users_deleted_by FOREIGN KEY (deleted_by) REFERENCES users (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      // Generate hashed passwords
      const adminPassword = await bcrypt.hash('admin123', 10);
      const userPassword = await bcrypt.hash('user123', 10);

      // Insert Super Admin
      await connection.query(
        'INSERT INTO super_admin (name, whatsapp, password) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password)',
        ['Super Admin', '081234567890', adminPassword]
      );
      console.log('✅ Super Admin created (WhatsApp: 081234567890, Password: admin123)');

      // Insert sample users
      const [branches] = await connection.query('SELECT id FROM branches LIMIT 2');
      
      if (branches.length >= 2) {
        await connection.query(
          `INSERT INTO users (branch_id, name, whatsapp, password, role_name, jabatan) VALUES 
          (?, 'Admin Jakarta', '081234567891', ?, 'admin', 'Admin Kantor Pusat'),
          (?, 'Admin Surabaya', '081234567892', ?, 'admin', 'Admin Cabang'),
          (?, 'Staff Purchasing', '081234567893', ?, 'purchasing', 'Staff Purchasing'),
          (?, 'Staff Logistik', '081234567894', ?, 'logistik', 'Staff Gudang')
          ON DUPLICATE KEY UPDATE password = VALUES(password)`,
          [
            branches[0].id, userPassword,
            branches[1].id, userPassword,
            branches[0].id, userPassword,
            branches[0].id, userPassword
          ]
        );
        console.log('✅ Sample users created (Password for all: user123)');
      }
    }

    console.log('\n✨ Migration completed successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('─────────────────────────────────────');
    console.log('Super Admin:');
    console.log('  WhatsApp: 081234567890');
    console.log('  Password: admin123');
    console.log('');
    console.log('Users (081234567891-894):');
    console.log('  Password: user123');
    console.log('─────────────────────────────────────\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run migration
runMigration();
