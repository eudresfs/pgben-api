import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager, runSeeder } from 'typeorm-extension';

/**
 * Classe orquestradora para execução das seeds de dados de teste
 * Utiliza a API do typeorm-extension para executar as seeds em sequência
 * Esta classe é executada após as seeds iniciais e popula o banco com dados para testes
 */
export class TestDataSeed implements Seeder {
  /**
   * Executa todas as seeds de dados de teste em ordem específica
   * @param dataSource Conexão com o banco de dados
   * @param factoryManager Gerenciador de factories (não utilizado)
   */
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<void> {
    // As seeds de teste serão adicionadas aqui conforme necessário
    // Exemplo: await runSeeder(dataSource, TestUserSeed);
    // Exemplo: await runSeeder(dataSource, TestBeneficioSeed);
    
    console.log('✅ Seed de dados de teste concluída com sucesso!');
  }
}