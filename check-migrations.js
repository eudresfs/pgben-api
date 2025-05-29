const { AppDataSource } = require('./dist/database/data-source.js');

AppDataSource.initialize().then(async () => {
  try {
    const result = await AppDataSource.query(`
      SELECT * FROM migrations 
      WHERE name LIKE '%PermissionScope%' 
      ORDER BY timestamp DESC
    `);
    console.log('Migrations de PermissionScope:', result);
    
    const allMigrations = await AppDataSource.query(`
      SELECT name, timestamp FROM migrations 
      ORDER BY timestamp DESC 
      LIMIT 5
    `);
    console.log('Últimas 5 migrations:', allMigrations);
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await AppDataSource.destroy();
  }
}).catch(console.error);