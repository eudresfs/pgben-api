import { DataSource } from 'typeorm';
import { UsuarioPerfilSeed } from './UsuarioPerfilSeed';
import { SetorSeed } from './SetorSeed';
import { UnidadeSeed } from './UnidadeSeed';
import { TipoBeneficioSeed } from './TipoBeneficioSeed';

/**
 * Executa todos os seeds essenciais (core) do sistema
 *
 * Este runner executa os seeds na ordem correta para garantir
 * as dependências entre os dados
 */
export class CoreSeedRunner {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('======================================================');
    console.log('Iniciando execução dos seeds essenciais (core)');
    console.log('======================================================');

    try {
      // Executando os seeds na ordem correta
      await SetorSeed.run(dataSource);
      await UnidadeSeed.run(dataSource);
      await UsuarioPerfilSeed.run(dataSource);
      await TipoBeneficioSeed.run(dataSource);

      console.log('======================================================');
      console.log('Seeds essenciais (core) executados com sucesso!');
      console.log('======================================================');
    } catch (error) {
      console.error('Erro durante a execução dos seeds essenciais:');
      console.error(error);
      throw error;
    }
  }
}
