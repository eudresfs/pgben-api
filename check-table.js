const { AppDataSource } = require('./dist/database/data-source.js');

AppDataSource.initialize().then(async () => {
  try {
    const result = await AppDataSource.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'escopo_permissao'
    `);
    console.log('Colunas da tabela escopo_permissao:', result.map(r => r.column_name));
    
    const tableExists = await AppDataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'escopo_permissao'
    `);
    console.log('Tabela existe:', tableExists.length > 0);
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await AppDataSource.destroy();
  }
}).catch(console.error);