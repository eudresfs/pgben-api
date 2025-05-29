import { DataSource } from 'typeorm';
import { UsuarioPerfilSeed } from './UsuarioPerfilSeed';
import { SetorSeed } from './SetorSeed';
import { UnidadeSeed } from './UnidadeSeed';
import { TipoBeneficioSeed } from './TipoBeneficioSeed';
import { PermissionSeeder } from './permission.seed';
import { PermissionRoleMappingSeed } from './permission-role-mapping.seed';
import { NotificationTemplateSeed } from './NotificationTemplateSeed';

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

    // Array para armazenar erros encontrados durante a execução
    interface ErroSeed {
      seed: string;
      erro: string;
    }
    
    const erros: ErroSeed[] = [];

    // Verificar se o banco de dados está acessível
    try {
      await dataSource.query('SELECT 1');
      console.log('Conexão com o banco de dados estabelecida com sucesso.');
    } catch (error) {
      console.error('Erro ao conectar ao banco de dados:');
      console.error(error);
      throw new Error(`Falha na conexão com o banco de dados: ${error.message}`);
    }

    // Função auxiliar para executar um seed com tratamento de erros
    async function executarSeedComTratamento(nome: string, seedFunction: () => Promise<void>) {
      try {
        console.log(`Executando seed: ${nome}...`);
        await seedFunction();
        console.log(`Seed ${nome} executado com sucesso.`);
        return true;
      } catch (error: any) {
        console.error(`Erro durante a execução do seed ${nome}:`);
        console.error(error);
        erros.push({ 
          seed: nome, 
          erro: error.message || 'Erro desconhecido' 
        });
        return false;
      }
    }

    // Executando os seeds na ordem correta com tratamento de erros
    // Importante: UnidadeSeed deve ser executado antes do SetorSeed
    console.log('\nExecutando seeds em ordem sequencial com dependências...');
    
    // Executar UnidadeSeed e verificar sucesso
    const unidadeSeedSuccessful = await executarSeedComTratamento('UnidadeSeed', () => UnidadeSeed.run(dataSource));
    
    // Só executar SetorSeed se UnidadeSeed foi bem-sucedido
    if (unidadeSeedSuccessful) {
      await executarSeedComTratamento('SetorSeed', () => SetorSeed.run(dataSource));
    } else {
      console.error('\nSETORSEED NÃO EXECUTADO: UnidadeSeed falhou, que é uma dependência.');
      erros.push({
        seed: 'SetorSeed',
        erro: 'Não executado porque UnidadeSeed falhou (dependência)'
      });
    }
    
    // Continuar com os outros seeds
    await executarSeedComTratamento('UsuarioPerfilSeed', async () => {
      const usuarioPerfilSeed = new UsuarioPerfilSeed();
      await usuarioPerfilSeed.run(dataSource);
    });
    
    await executarSeedComTratamento('TipoBeneficioSeed', () => TipoBeneficioSeed.run(dataSource));
    
    // Executando os seeds de permissões
    console.log('Iniciando seeds de permissões granulares...');
    await executarSeedComTratamento('PermissionSeeder', async () => {
      const permissionSeeder = new PermissionSeeder();
      await permissionSeeder.run(dataSource);
    });
    
    // Mapeamento de permissões para roles
    console.log('Iniciando mapeamento de permissões para roles...');
    await executarSeedComTratamento('PermissionRoleMappingSeed', () => 
      PermissionRoleMappingSeed.run(dataSource)
    );
    
    // Templates de notificação
    console.log('Iniciando seed de templates de notificação...');
    await executarSeedComTratamento('NotificationTemplateSeed', () => 
      NotificationTemplateSeed.run(dataSource)
    );

    console.log('======================================================');
    
    // Verificar se houve erros durante a execução
    if (erros.length > 0) {
      console.log('Seeds essenciais (core) executados com erros:');
      erros.forEach((erro, index) => {
        console.log(`${index + 1}. Seed: ${erro.seed} - Erro: ${erro.erro}`);
      });
      console.log('======================================================');
      console.log('ATENÇÃO: Alguns seeds falharam. Verifique os logs acima.');
      console.log('O sistema pode não funcionar corretamente.');
    } else {
      console.log('Seeds essenciais (core) executados com sucesso!');
    }
    console.log('======================================================');
    
    // Se houver erros críticos que impedem o funcionamento do sistema, lançar exceção
    if (erros.some(e => e.seed === 'SetorSeed' || e.seed === 'UsuarioPerfilSeed')) {
      throw new Error('Falha em seeds críticos para o funcionamento do sistema.');
    }
  }
}
