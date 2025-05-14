import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager, runSeeder } from 'typeorm-extension';
import { TipoDocumentoSeed } from './initial/TipoDocumentoSeed';
import { UnidadeSeed } from './initial/UnidadeSeed';
import { UserSeed } from './initial/UserSeed';
import { SetorTipoBeneficioSeed } from './initial/SetorTipoBeneficioSeed';
import { RequisitoDocumentoSeed } from './initial/RequisitoDocumentoSeed';
import { DemandaMotivoSeed } from './initial/DemandaMotivoSeed';
import { OcorrenciaSeed } from './initial/OcorrenciaSeed';
import { PendenciaSeed } from './initial/PendenciaSeed';

/**
 * Classe orquestradora para execução das seeds de dados iniciais do sistema
 * Utiliza a API do typeorm-extension para executar as seeds em sequência
 */
export class InitialDataSeed implements Seeder {
  /**
   * Executa todas as seeds de dados iniciais em ordem específica
   * @param dataSource Conexão com o banco de dados
   * @param factoryManager Gerenciador de factories (não utilizado)
   */
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<void> {
    // Executa as seeds em ordem específica para respeitar dependências
    await runSeeder(dataSource, TipoDocumentoSeed);
    await runSeeder(dataSource, UnidadeSeed);
    await runSeeder(dataSource, UserSeed);
    await runSeeder(dataSource, SetorTipoBeneficioSeed);
    await runSeeder(dataSource, RequisitoDocumentoSeed);
    await runSeeder(dataSource, DemandaMotivoSeed);
    await runSeeder(dataSource, OcorrenciaSeed);
    await runSeeder(dataSource, PendenciaSeed);

    console.log('✅ Seed de dados iniciais concluída com sucesso!');
  }
}