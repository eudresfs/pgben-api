import { DataSource } from 'typeorm';
import { BaseSeed } from '../base-seed';

/**
 * Seed para criação dos dados iniciais do módulo aprovacao-v2
 * 
 * Cria:
 * - Ações de aprovação básicas para os tipos críticos
 * - Aprovadores padrão para cada ação
 */
export class AprovacaoV2Seed extends BaseSeed {
  protected getNome(): string {
    return 'AprovacaoV2Seed';
  }

  protected async verificarEstruturaDasTabelas(dataSource: DataSource): Promise<void> {
    // Verificar tabela acoes_aprovacao
    const acoesInfo = await this.obterInformacoesTabela(dataSource, 'acoes_aprovacao');
    if (acoesInfo.colunas.length === 0) {
      throw new Error('Tabela acoes_aprovacao não encontrada');
    }

    // Verificar tabela aprovadores
    const aprovadoresInfo = await this.obterInformacoesTabela(dataSource, 'aprovadores');
    if (aprovadoresInfo.colunas.length === 0) {
      throw new Error('Tabela aprovadores não encontrada');
    }

    console.log('Estrutura das tabelas aprovacao-v2 verificada com sucesso');
  }

  protected async executarSeed(dataSource: DataSource): Promise<void> {
    await this.criarAcoesAprovacao(dataSource);
    await this.criarAprovadoresPadrao(dataSource);
  }

  /**
   * Cria as ações de aprovação básicas
   */
  private async criarAcoesAprovacao(dataSource: DataSource): Promise<void> {
    console.log('Criando ações de aprovação...');

    const acoesAprovacao = [
      {
        tipo_acao: 'cancelamento_solicitacao',
        nome: 'Cancelamento de Solicitação',
        descricao: 'Cancelamento de solicitações de benefícios já em andamento',
        estrategia: 'simples',
        min_aprovadores: 1,
        ativo: true
      },
      {
        tipo_acao: 'suspensao_beneficio',
        nome: 'Suspensão de Benefício',
        descricao: 'Suspensão temporária ou definitiva de benefícios concedidos',
        estrategia: 'simples',
        min_aprovadores: 1,
        ativo: true
      },
      {
        tipo_acao: 'alteracao_dados_criticos',
        nome: 'Alteração de Dados Críticos',
        descricao: 'Alteração de dados sensíveis como CPF, RG, dados bancários',
        estrategia: 'maioria',
        min_aprovadores: 2,
        ativo: true
      },
      {
        tipo_acao: 'exclusao_registro',
        nome: 'Exclusão de Registro',
        descricao: 'Exclusão permanente de registros do sistema',
        estrategia: 'maioria',
        min_aprovadores: 2,
        ativo: true
      },
      {
        tipo_acao: 'aprovacao_emergencial',
        nome: 'Aprovação Emergencial',
        descricao: 'Aprovação de benefícios em caráter emergencial',
        estrategia: 'simples',
        min_aprovadores: 1,
        ativo: true
      }
    ];

    for (const acao of acoesAprovacao) {
      await this.executarComTratamento(
        `Inserir ação de aprovação: ${acao.nome}`,
        async () => {
          // Verificar se já existe
          const existente = await dataSource.query(
            'SELECT id FROM acoes_aprovacao WHERE tipo_acao = $1',
            [acao.tipo_acao]
          );

          if (existente.length === 0) {
            await dataSource.query(
              `INSERT INTO acoes_aprovacao (
                tipo_acao, nome, descricao, estrategia, min_aprovadores, ativo
              ) VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                acao.tipo_acao,
                acao.nome,
                acao.descricao,
                acao.estrategia,
                acao.min_aprovadores,
                acao.ativo
              ]
            );
            console.log(`✓ Ação '${acao.nome}' criada com sucesso`);
          } else {
            console.log(`✓ Ação '${acao.nome}' já existe`);
          }
        }
      );
    }
  }

  /**
   * Cria aprovadores padrão para cada ação
   * NOTA: Este método cria aprovadores fictícios para demonstração
   * Em produção, os aprovadores devem ser configurados manualmente
   */
  private async criarAprovadoresPadrao(dataSource: DataSource): Promise<void> {
    console.log('Criando aprovadores padrão...');

    // Buscar todas as ações criadas
    const acoes = await dataSource.query(
      'SELECT id, tipo_acao, nome FROM acoes_aprovacao WHERE ativo = true'
    );

    // IDs fictícios de usuários aprovadores (devem ser substituídos por IDs reais)
    const aprovadoresFicticios = [
      {
        usuario_id: '00000000-0000-0000-0000-000000000001', // Supervisor Geral
        nome: 'Supervisor Geral'
      },
      {
        usuario_id: '00000000-0000-0000-0000-000000000002', // Coordenador
        nome: 'Coordenador'
      },
      {
        usuario_id: '00000000-0000-0000-0000-000000000003', // Gerente
        nome: 'Gerente'
      }
    ];

    for (const acao of acoes) {
      // Determinar quantos aprovadores criar baseado na estratégia
      let numAprovadores = 1;
      if (acao.tipo_acao === 'alteracao_dados_criticos' || acao.tipo_acao === 'exclusao_registro') {
        numAprovadores = 2; // Estratégia maioria precisa de pelo menos 2
      }

      for (let i = 0; i < numAprovadores && i < aprovadoresFicticios.length; i++) {
        const aprovador = aprovadoresFicticios[i];
        
        await this.executarComTratamento(
          `Criar aprovador ${aprovador.nome} para ação ${acao.nome}`,
          async () => {
            // Verificar se já existe
            const existente = await dataSource.query(
              'SELECT id FROM aprovadores WHERE usuario_id = $1 AND acao_aprovacao_id = $2',
              [aprovador.usuario_id, acao.id]
            );

            if (existente.length === 0) {
              await dataSource.query(
                `INSERT INTO aprovadores (
                  usuario_id, acao_aprovacao_id, ativo
                ) VALUES ($1, $2, $3)`,
                [aprovador.usuario_id, acao.id, true]
              );
              console.log(`✓ Aprovador ${aprovador.nome} criado para ação ${acao.nome}`);
            } else {
              console.log(`✓ Aprovador ${aprovador.nome} já existe para ação ${acao.nome}`);
            }
          }
        );
      }
    }

    console.log('\n⚠️  IMPORTANTE: Os aprovadores criados são fictícios!');
    console.log('   Em produção, configure aprovadores reais através da interface administrativa.');
    console.log('   IDs de usuários fictícios utilizados:');
    aprovadoresFicticios.forEach(a => {
      console.log(`   - ${a.nome}: ${a.usuario_id}`);
    });
  }
}

/**
 * Função estática para compatibilidade com o padrão do projeto
 */
export const runAprovacaoV2Seed = async (dataSource: DataSource): Promise<void> => {
  const seed = new AprovacaoV2Seed();
  await seed.run(dataSource);
};