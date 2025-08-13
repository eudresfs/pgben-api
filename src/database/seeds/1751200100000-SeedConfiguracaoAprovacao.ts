import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { ConfiguracaoAprovacao } from '../../modules/aprovacao/entities/configuracao-aprovacao.entity';
import { AcaoCritica } from '../../modules/aprovacao/entities/acao-critica.entity';
import { TipoAcaoCritica, EstrategiaAprovacao } from '../../modules/aprovacao/enums/aprovacao.enums';

/**
 * Seed para criar as configurações de aprovação padrão para cada ação crítica
 * 
 * Define as regras de aprovação, estratégias, tempos limite e configurações
 * de escalação e notificação para cada tipo de ação crítica do sistema.
 */
export class SeedConfiguracaoAprovacao1751200100000 implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<any> {
    const configuracaoRepository = dataSource.getRepository(ConfiguracaoAprovacao);
    const acaoCriticaRepository = dataSource.getRepository(AcaoCritica);

    // Verificar se já existem configurações
    const existingCount = await configuracaoRepository.count();
    if (existingCount > 0) {
      console.log('Configurações de aprovação já existem, pulando seed...');
      return;
    }

    console.log('Criando configurações de aprovação padrão...');

    // Buscar todas as ações críticas criadas no seed anterior
    const acoesCriticas = await acaoCriticaRepository.find();
    
    if (acoesCriticas.length === 0) {
      console.log('⚠️  Nenhuma ação crítica encontrada. Execute primeiro o seed de ações críticas.');
      return;
    }

    const configuracoes = [];

    for (const acao of acoesCriticas) {
      let configuracao: Partial<ConfiguracaoAprovacao>;

      switch (acao.codigo as TipoAcaoCritica) {
        // === AÇÕES DE BAIXA CRITICIDADE (Nível 1-2) ===
        case TipoAcaoCritica.SUSPENSAO_BENEFICIO:
        case TipoAcaoCritica.REATIVACAO_BENEFICIO:
        case TipoAcaoCritica.DESBLOQUEIO_USUARIO:
          configuracao = {
            acao_critica_id: acao.id,
            estrategia: EstrategiaAprovacao.QUALQUER_UM,
            min_aprovacoes: 1,
            tempo_limite_horas: 24,
            permite_auto_aprovacao: true,
            ativa: true
          };
          break;

        // === AÇÕES DE MÉDIA CRITICIDADE (Nível 3) ===
        case TipoAcaoCritica.BLOQUEIO_USUARIO:
          configuracao = {
            acao_critica_id: acao.id,
            estrategia: EstrategiaAprovacao.QUALQUER_UM,
            min_aprovacoes: 1,
            tempo_limite_horas: 48,
            permite_auto_aprovacao: false,
            ativa: true
          };
          break;

        // === AÇÕES DE ALTA CRITICIDADE (Nível 4) ===
        case TipoAcaoCritica.ALTERACAO_PERMISSAO:
          configuracao = {
            acao_critica_id: acao.id,
            estrategia: EstrategiaAprovacao.MAIORIA,
            min_aprovacoes: 2,
            tempo_limite_horas: 72,
            permite_auto_aprovacao: false,
            ativa: true
          };
          break;

        // === AÇÕES CRÍTICAS (Nível 5) ===
        case TipoAcaoCritica.CANCELAMENTO_SOLICITACAO:
        case TipoAcaoCritica.EXCLUSAO_BENEFICIARIO:
        case TipoAcaoCritica.CONFIGURACAO_SISTEMA:
        case TipoAcaoCritica.EXCLUSAO_DOCUMENTO:
          configuracao = {
            acao_critica_id: acao.id,
            estrategia: EstrategiaAprovacao.UNANIME,
            min_aprovacoes: 3,
            tempo_limite_horas: 168, // 7 dias
            permite_auto_aprovacao: false,
            ativa: true
          };
          break;

        default:
          // Configuração padrão para ações não mapeadas
          configuracao = {
            acao_critica_id: acao.id,
            estrategia: EstrategiaAprovacao.QUALQUER_UM,
            min_aprovacoes: 1,
            tempo_limite_horas: 48,
            permite_auto_aprovacao: false,
            ativa: true
          };
      }

      configuracoes.push(configuracao);
    }

    // Inserir configurações em lotes
    const batchSize = 5;
    for (let i = 0; i < configuracoes.length; i += batchSize) {
      const batch = configuracoes.slice(i, i + batchSize);
      await configuracaoRepository.save(batch);
      console.log(`Inseridas ${batch.length} configurações de aprovação (lote ${Math.floor(i / batchSize) + 1})`);
    }

    console.log(`✅ Seed concluído: ${configuracoes.length} configurações de aprovação criadas com sucesso!`);
    
    // Exibir resumo das configurações criadas
    console.log('\n📊 Resumo das configurações criadas:');
    console.log('- Ações com auto-aprovação:', configuracoes.filter(c => c.permite_auto_aprovacao).length);
    console.log('- Ações com estratégia QUALQUER_UM:', configuracoes.filter(c => c.estrategia === EstrategiaAprovacao.QUALQUER_UM).length);
    console.log('- Ações com estratégia MAIORIA:', configuracoes.filter(c => c.estrategia === EstrategiaAprovacao.MAIORIA).length);
    console.log('- Ações com estratégia UNANIME:', configuracoes.filter(c => c.estrategia === EstrategiaAprovacao.UNANIME).length);
    console.log('- Configurações criadas:', configuracoes.length);
  }
}