/**
 * Script para diagnosticar problemas na inicialização do TypeORM
 * 
 * Este script tenta inicializar uma conexão simples com o banco de dados
 * e mostra informações detalhadas sobre qualquer erro que ocorra.
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Configuração do ambiente
config();

/**
 * Verifica problemas em uma entidade específica tentando inicializar apenas ela
 */
async function testarEntidadeIndividual(arquivo: string, nome: string) {
  console.log(`Testando entidade: ${nome} (${path.basename(arquivo)})`);
  
  try {
    // Importar dinamicamente a entidade
    const entidade = await import(arquivo);
    
    // Tentar inicializar com apenas esta entidade
    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'pgben',
      entities: [entidade[nome]],
      synchronize: false,
      logging: false,
    });
    
    try {
      await dataSource.initialize();
      console.log(`  ✅ Entidade ${nome} inicializada com sucesso`);
      await dataSource.destroy();
      return true;
    } catch (error) {
      console.error(`  ❌ Erro ao inicializar entidade ${nome}:`);
      console.error(`  ${error.message}`);
      return false;
    }
  } catch (error) {
    console.error(`  ⚠️ Erro ao importar entidade ${nome}:`, error.message);
    return false;
  }
}

// Lista de arquivos de entidade para testar (foco nas métricas que estavam dando problema)
const arquivosParaTestar = [
  // Entidades de Métricas
  { caminho: '../modules/metricas/entities/metrica-snapshot.entity.ts', nome: 'MetricaSnapshot' },
  { caminho: '../modules/metricas/entities/metrica-definicao.entity.ts', nome: 'MetricaDefinicao' },
  { caminho: '../modules/metricas/entities/metrica-configuracao.entity.ts', nome: 'MetricaConfiguracao' },
];

async function diagnosticar() {
  console.log('Iniciando diagnóstico de entidades do TypeORM...\n');
  
  // Testar entidades individualmente
  for (const arquivo of arquivosParaTestar) {
    const caminhoCompleto = path.resolve(__dirname, arquivo.caminho);
    await testarEntidadeIndividual(caminhoCompleto, arquivo.nome);
    console.log(); // Separador
  }
  
  // Tentar conexão simples sem entidades
  console.log('Testando conexão básica com o banco de dados...');
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'pgben',
    entities: [],
    synchronize: false,
  });
  
  try {
    await dataSource.initialize();
    console.log('✅ Conexão básica estabelecida com sucesso!');
    
    // Verificar tabelas existentes
    const tabelas = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`\nTabelas no banco de dados (${tabelas.length}):`);
    tabelas.slice(0, 10).forEach((tabela: any) => {
      console.log(`- ${tabela.table_name}`);
    });
    if (tabelas.length > 10) {
      console.log(`... e mais ${tabelas.length - 10} tabelas`);
    }
    
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Erro na conexão básica:', error.message);
  }
  
  console.log('\nDiagnóstico concluído.');
}

// Executar diagnóstico
diagnosticar().catch(error => {
  console.error('Erro não tratado:', error);
});
