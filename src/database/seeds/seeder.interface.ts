import { DataSource } from 'typeorm';

/**
 * Interface para implementação de seeders
 * 
 * Todos os seeders devem implementar esta interface para garantir
 * uma estrutura consistente e permitir a execução padronizada.
 */
export interface Seeder {
  /**
   * Executa o seeder
   * 
   * @param dataSource Conexão com o banco de dados
   */
  run(dataSource: DataSource): Promise<void>;
}
