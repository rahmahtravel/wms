const db = require('../config/database');

async function hasColumn(tableName, columnName) {
  try {
    const [rows] = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `, [process.env.DB_NAME, tableName, columnName]);
    return rows && rows.length > 0;
  } catch (err) {
    console.warn('hasColumn check failed:', err.message);
    return false;
  }
}

// Pick first existing column name from candidates.
const _pickCache = new Map();
async function pickColumn(tableName, candidates = []) {
  const cacheKey = `${tableName}|${candidates.join(',')}`;
  if (_pickCache.has(cacheKey)) return _pickCache.get(cacheKey);
  for (const c of candidates) {
    if (await hasColumn(tableName, c)) {
      _pickCache.set(cacheKey, c);
      return c;
    }
  }
  _pickCache.set(cacheKey, null);
  return null;
}

module.exports = { hasColumn, pickColumn };
