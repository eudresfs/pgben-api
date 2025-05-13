import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export class PendenciaSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    console.log('Seed de pendências: Não é possível criar pendências sem solicitações existentes.');
    console.log('Para criar pendências, primeiro crie solicitações e depois execute este seed manualmente.');
    
    // Este seed é apenas um placeholder para demonstrar a estrutura
    // Em um ambiente real, seria necessário ter solicitações criadas primeiro
    
    console.log('Seed de pendências concluído!');
    return;
  }
}