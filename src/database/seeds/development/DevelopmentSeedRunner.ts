import { DataSource } from 'typeorm';
import { CidadaoDevSeed } from './CidadaoDevSeed';
import { SolicitacaoDevSeed } from './SolicitacaoDevSeed';

/**
 * Executa todos os seeds de desenvolvimento do sistema
 *
 * Este runner executa os seeds na ordem correta para garantir
 * as dependências entre os dados
 */
export class DevelopmentSeedRunner {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('======================================================');
    console.log('Iniciando execução dos seeds de desenvolvimento');
    console.log('======================================================');

    try {
      // Executando os seeds na ordem correta
      await CidadaoDevSeed.run(dataSource);
      await SolicitacaoDevSeed.run(dataSource);

      console.log('======================================================');
      console.log('Seeds de desenvolvimento executados com sucesso!');
      console.log('======================================================');
    } catch (error) {
      console.error('Erro durante a execução dos seeds de desenvolvimento:');
      console.error(error);
      throw error;
    }
  }
}
