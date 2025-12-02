const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rahmah_purchasing_logistics',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Starting migration 006: Update purchasing_barang and stock_movements tables...');
    
    connection = await mysql.createConnection(dbConfig);
    
    // Begin transaction
    await connection.beginTransaction();
    
    console.log('\n📋 Step 1: Adding warehouse_id, rack_id, bin_id to purchasing_barang...');
    
    // Check if columns already exist before adding
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'purchasing_barang' 
      AND COLUMN_NAME IN ('warehouse_id', 'rack_id', 'bin_id')
    `, [dbConfig.database]);
    
    const existingColumns = columns.map(c => c.COLUMN_NAME);
    
    if (!existingColumns.includes('warehouse_id')) {
      await connection.query(`
        ALTER TABLE purchasing_barang
        ADD COLUMN warehouse_id INT NULL AFTER stock_akhir
      `);
      console.log('✅ Added warehouse_id column to purchasing_barang');
    } else {
      console.log('⏭️  warehouse_id already exists in purchasing_barang');
    }
    
    if (!existingColumns.includes('rack_id')) {
      await connection.query(`
        ALTER TABLE purchasing_barang
        ADD COLUMN rack_id INT NULL AFTER warehouse_id
      `);
      console.log('✅ Added rack_id column to purchasing_barang');
    } else {
      console.log('⏭️  rack_id already exists in purchasing_barang');
    }
    
    if (!existingColumns.includes('bin_id')) {
      await connection.query(`
        ALTER TABLE purchasing_barang
        ADD COLUMN bin_id INT NULL AFTER rack_id
      `);
      console.log('✅ Added bin_id column to purchasing_barang');
    } else {
      console.log('⏭️  bin_id already exists in purchasing_barang');
    }
    
    console.log('\n📋 Step 2: Adding foreign key constraints to purchasing_barang...');
    
    // Check existing constraints
    const [constraints] = await connection.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'purchasing_barang' 
      AND CONSTRAINT_NAME IN ('fk_barang_warehouse', 'fk_barang_rack', 'fk_barang_bin')
    `, [dbConfig.database]);
    
    const existingConstraints = constraints.map(c => c.CONSTRAINT_NAME);
    
    if (!existingConstraints.includes('fk_barang_warehouse')) {
      await connection.query(`
        ALTER TABLE purchasing_barang
        ADD CONSTRAINT fk_barang_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouse_locations(id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('✅ Added foreign key constraint fk_barang_warehouse');
    } else {
      console.log('⏭️  fk_barang_warehouse constraint already exists');
    }
    
    if (!existingConstraints.includes('fk_barang_rack')) {
      await connection.query(`
        ALTER TABLE purchasing_barang
        ADD CONSTRAINT fk_barang_rack
        FOREIGN KEY (rack_id) REFERENCES warehouse_racks(id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('✅ Added foreign key constraint fk_barang_rack');
    } else {
      console.log('⏭️  fk_barang_rack constraint already exists');
    }
    
    if (!existingConstraints.includes('fk_barang_bin')) {
      await connection.query(`
        ALTER TABLE purchasing_barang
        ADD CONSTRAINT fk_barang_bin
        FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('✅ Added foreign key constraint fk_barang_bin');
    } else {
      console.log('⏭️  fk_barang_bin constraint already exists');
    }
    
    console.log('\n📋 Step 3: Removing foreign key constraints from stock_movements...');
    
    // Check if constraints exist before dropping
    const [movementConstraints] = await connection.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'stock_movements' 
      AND CONSTRAINT_NAME IN ('fk_movement_warehouse', 'fk_movement_rack', 'fk_movement_bin')
    `, [dbConfig.database]);
    
    const existingMovementConstraints = movementConstraints.map(c => c.CONSTRAINT_NAME);
    
    if (existingMovementConstraints.includes('fk_movement_warehouse')) {
      await connection.query(`
        ALTER TABLE stock_movements
        DROP FOREIGN KEY fk_movement_warehouse
      `);
      console.log('✅ Dropped foreign key constraint fk_movement_warehouse');
    } else {
      console.log('⏭️  fk_movement_warehouse constraint does not exist');
    }
    
    if (existingMovementConstraints.includes('fk_movement_rack')) {
      await connection.query(`
        ALTER TABLE stock_movements
        DROP FOREIGN KEY fk_movement_rack
      `);
      console.log('✅ Dropped foreign key constraint fk_movement_rack');
    } else {
      console.log('⏭️  fk_movement_rack constraint does not exist');
    }
    
    if (existingMovementConstraints.includes('fk_movement_bin')) {
      await connection.query(`
        ALTER TABLE stock_movements
        DROP FOREIGN KEY fk_movement_bin
      `);
      console.log('✅ Dropped foreign key constraint fk_movement_bin');
    } else {
      console.log('⏭️  fk_movement_bin constraint does not exist');
    }
    
    console.log('\n📋 Step 4: Removing columns from stock_movements...');
    
    // Check if columns exist before dropping
    const [movementColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'stock_movements' 
      AND COLUMN_NAME IN ('warehouse_id', 'rack_id', 'bin_id')
    `, [dbConfig.database]);
    
    const existingMovementColumns = movementColumns.map(c => c.COLUMN_NAME);
    
    if (existingMovementColumns.includes('warehouse_id')) {
      await connection.query(`
        ALTER TABLE stock_movements
        DROP COLUMN warehouse_id
      `);
      console.log('✅ Dropped warehouse_id column from stock_movements');
    } else {
      console.log('⏭️  warehouse_id column does not exist in stock_movements');
    }
    
    if (existingMovementColumns.includes('rack_id')) {
      await connection.query(`
        ALTER TABLE stock_movements
        DROP COLUMN rack_id
      `);
      console.log('✅ Dropped rack_id column from stock_movements');
    } else {
      console.log('⏭️  rack_id column does not exist in stock_movements');
    }
    
    if (existingMovementColumns.includes('bin_id')) {
      await connection.query(`
        ALTER TABLE stock_movements
        DROP COLUMN bin_id
      `);
      console.log('✅ Dropped bin_id column from stock_movements');
    } else {
      console.log('⏭️  bin_id column does not exist in stock_movements');
    }
    
    // Commit transaction
    await connection.commit();
    
    console.log('\n✅ Migration 006 completed successfully!\n');
    console.log('Summary:');
    console.log('- Added warehouse_id, rack_id, bin_id to purchasing_barang');
    console.log('- Added foreign key constraints to purchasing_barang');
    console.log('- Removed warehouse_id, rack_id, bin_id from stock_movements');
    console.log('- Removed related foreign key constraints from stock_movements');
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.error('❌ Migration rolled back due to error');
    }
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
runMigration().then(() => {
  console.log('🎉 Migration script finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Migration script error:', error);
  process.exit(1);
});
