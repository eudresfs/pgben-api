import { DataSource } from 'typeorm';
import { AcaoCritica } from '../../../modules/aprovacao/entities/acao-critica.entity';
import { ConfiguracaoAprovacao } from '../../../modules/aprovacao/entities/configuracao-aprovacao.entity';
import { Aprovador } from '../../../modules/aprovacao/entities/aprovador.entity';
import { TipoAcaoCritica } from '../../../modules/aprovacao/enums/aprovacao.enums';

/**
 * Seed para o Sistema de Aprovação de Ações Críticas
 * 
 * Popula as tabelas com:
 * - Ações críticas básicas do sistema
 * - Configurações padrão de aprovação
 * - Aprovadores básicos por perfil
 */
export class SistemaAprovacaoSeed {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    console.log('🔄 Executando seed do Sistema de Aprovação...');

    await this.seedAcoesCriticas();
    await this.seedConfiguracoes();
    await this.seedAprovadores();

    console.log('✅ Seed do Sistema de Aprovação concluído!');
  }

  private async seedAcoesCriticas(): Promise<void> {
    const repository = this.dataSource.getRepository(AcaoCritica);

    const acoesCriticas = [
      // Ações de Solicitação
      {
        codigo: 'cancelar_solicitacao',
        tipo: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
        nome: 'Cancelar Solicitação',
        descricao: 'Cancelamento de solicitação de benefício em andamento',
        modulo: 'solicitacao',
        entidade_alvo: 'Solicitacao',
        controlador: 'SolicitacaoController',
        metodo: 'cancelar',
        nivel_criticidade: 3,
        tags: ['solicitacao', 'cancelamento', 'critica'],
        ativo: true
      },
      {
        codigo: 'suspender_solicitacao',
        tipo: TipoAcaoCritica.SUSPENSAO_BENEFICIO,
        nome: 'Suspender Solicitação',
        descricao: 'Suspensão temporária de solicitação de benefício',
        modulo: 'solicitacao',
        entidade_alvo: 'Solicitacao',
        controlador: 'SolicitacaoController',
        metodo: 'suspender',
        nivel_criticidade: 2,
        tags: ['solicitacao', 'suspensao', 'temporaria'],
        ativo: true
      },
      {
        codigo: 'reativar_solicitacao',
        tipo: TipoAcaoCritica.REATIVACAO_BENEFICIO,
        nome: 'Reativar Solicitação',
        descricao: 'Reativação de solicitação suspensa ou cancelada',
        modulo: 'solicitacao',
        entidade_alvo: 'Solicitacao',
        controlador: 'SolicitacaoController',
        metodo: 'reativar',
        nivel_criticidade: 2,
        tags: ['solicitacao', 'reativacao'],
        ativo: true
      },

      // Ações de Benefício
      {
        codigo: 'suspender_beneficio',
        tipo: TipoAcaoCritica.SUSPENSAO_BENEFICIO,
        nome: 'Suspender Benefício',
        descricao: 'Suspensão de benefício ativo',
        modulo: 'beneficio',
        entidade_alvo: 'Beneficio',
        controlador: 'BeneficioController',
        metodo: 'suspender',
        nivel_criticidade: 4,
        tags: ['beneficio', 'suspensao', 'critica'],
        ativo: true
      },
      {
        codigo: 'bloquear_beneficio',
        tipo: TipoAcaoCritica.BLOQUEIO_USUARIO,
        nome: 'Bloquear Benefício',
        descricao: 'Bloqueio temporário de benefício por irregularidade',
        modulo: 'beneficio',
        entidade_alvo: 'Beneficio',
        controlador: 'BeneficioController',
        metodo: 'bloquear',
        nivel_criticidade: 4,
        tags: ['beneficio', 'bloqueio', 'irregularidade'],
        ativo: true
      },
      {
        codigo: 'desbloquear_beneficio',
        tipo: TipoAcaoCritica.DESBLOQUEIO_USUARIO,
        nome: 'Desbloquear Benefício',
        descricao: 'Desbloqueio de benefício previamente bloqueado',
        modulo: 'beneficio',
        entidade_alvo: 'Beneficio',
        controlador: 'BeneficioController',
        metodo: 'desbloquear',
        nivel_criticidade: 3,
        tags: ['beneficio', 'desbloqueio'],
        ativo: true
      },
      {
        codigo: 'liberar_beneficio',
        tipo: TipoAcaoCritica.ALTERACAO_STATUS_PAGAMENTO,
        nome: 'Liberar Benefício',
        descricao: 'Liberação de benefício para pagamento',
        modulo: 'beneficio',
        entidade_alvo: 'Beneficio',
        controlador: 'BeneficioController',
        metodo: 'liberar',
        nivel_criticidade: 3,
        tags: ['beneficio', 'liberacao', 'pagamento'],
        ativo: true
      },
      {
        codigo: 'cancelar_beneficio',
        tipo: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
        nome: 'Cancelar Benefício',
        descricao: 'Cancelamento definitivo de benefício',
        modulo: 'beneficio',
        entidade_alvo: 'Beneficio',
        controlador: 'BeneficioController',
        metodo: 'cancelar',
        nivel_criticidade: 5,
        tags: ['beneficio', 'cancelamento', 'definitivo'],
        ativo: true
      },

      // Ações de Cidadão
      {
        codigo: 'inativar_cidadao',
        tipo: TipoAcaoCritica.EXCLUSAO_BENEFICIARIO,
        nome: 'Inativar Cidadão',
        descricao: 'Inativação de cadastro de cidadão',
        modulo: 'cidadao',
        entidade_alvo: 'Cidadao',
        controlador: 'CidadaoController',
        metodo: 'inativar',
        nivel_criticidade: 3,
        tags: ['cidadao', 'inativacao'],
        ativo: true
      },
      {
        codigo: 'reativar_cidadao',
        tipo: TipoAcaoCritica.REATIVACAO_BENEFICIO,
        nome: 'Reativar Cidadão',
        descricao: 'Reativação de cadastro de cidadão inativo',
        modulo: 'cidadao',
        entidade_alvo: 'Cidadao',
        controlador: 'CidadaoController',
        metodo: 'reativar',
        nivel_criticidade: 2,
        tags: ['cidadao', 'reativacao'],
        ativo: true
      },
      {
        codigo: 'excluir_cidadao',
        tipo: TipoAcaoCritica.EXCLUSAO_BENEFICIARIO,
        nome: 'Excluir Cidadão',
        descricao: 'Exclusão definitiva de cadastro de cidadão (LGPD)',
        modulo: 'cidadao',
        entidade_alvo: 'Cidadao',
        controlador: 'CidadaoController',
        metodo: 'excluir',
        nivel_criticidade: 5,
        tags: ['cidadao', 'exclusao', 'lgpd', 'definitivo'],
        ativo: true
      },

      // Ações de Usuário
      {
        codigo: 'inativar_usuario',
        tipo: TipoAcaoCritica.BLOQUEIO_USUARIO,
        nome: 'Inativar Usuário',
        descricao: 'Inativação de usuário do sistema',
        modulo: 'usuario',
        entidade_alvo: 'Usuario',
        controlador: 'UsuarioController',
        metodo: 'inativar',
        nivel_criticidade: 3,
        tags: ['usuario', 'inativacao', 'acesso'],
        ativo: true
      },
      {
        codigo: 'reativar_usuario',
        tipo: TipoAcaoCritica.DESBLOQUEIO_USUARIO,
        nome: 'Reativar Usuário',
        descricao: 'Reativação de usuário inativo',
        modulo: 'usuario',
        entidade_alvo: 'Usuario',
        controlador: 'UsuarioController',
        metodo: 'reativar',
        nivel_criticidade: 2,
        tags: ['usuario', 'reativacao', 'acesso'],
        ativo: true
      },
      {
        codigo: 'alterar_permissoes',
        tipo: TipoAcaoCritica.ALTERACAO_PERMISSAO,
        nome: 'Alterar Permissões',
        descricao: 'Alteração de permissões críticas de usuário',
        modulo: 'usuario',
        entidade_alvo: 'Usuario',
        controlador: 'UsuarioController',
        metodo: 'alterarPermissoes',
        nivel_criticidade: 4,
        tags: ['usuario', 'permissoes', 'seguranca'],
        ativo: true
      },

      // Ações de Documento
      {
        codigo: 'excluir_documento',
        tipo: TipoAcaoCritica.EXCLUSAO_DOCUMENTO,
        nome: 'Excluir Documento',
        descricao: 'Exclusão definitiva de documento',
        modulo: 'documento',
        entidade_alvo: 'Documento',
        controlador: 'DocumentoController',
        metodo: 'excluir',
        nivel_criticidade: 3,
        tags: ['documento', 'exclusao'],
        ativo: true
      },
      {
        codigo: 'substituir_documento',
        tipo: TipoAcaoCritica.EXCLUSAO_DOCUMENTO,
        nome: 'Substituir Documento',
        descricao: 'Substituição de documento oficial',
        modulo: 'documento',
        entidade_alvo: 'Documento',
        controlador: 'DocumentoController',
        metodo: 'substituir',
        nivel_criticidade: 2,
        tags: ['documento', 'substituicao'],
        ativo: true
      },

      // Ações de Configuração
      {
        codigo: 'alterar_configuracao_critica',
        tipo: TipoAcaoCritica.CONFIGURACAO_SISTEMA,
        nome: 'Alterar Configuração Crítica',
        descricao: 'Alteração de configurações críticas do sistema',
        modulo: 'configuracao',
        entidade_alvo: 'Configuracao',
        controlador: 'ConfiguracaoController',
        metodo: 'alterarCritica',
        nivel_criticidade: 5,
        tags: ['configuracao', 'sistema', 'critica'],
        ativo: true
      }
    ];

    for (const acao of acoesCriticas) {
      const existente = await repository.findOne({
        where: { codigo: acao.codigo }
      });

      if (!existente) {
        await repository.save(repository.create(acao));
        console.log(`  ✓ Ação crítica criada: ${acao.nome}`);
      } else {
        console.log(`  ⚠ Ação crítica já existe: ${acao.nome}`);
      }
    }
  }

  private async seedConfiguracoes(): Promise<void> {
    const acaoRepository = this.dataSource.getRepository(AcaoCritica);
    const configRepository = this.dataSource.getRepository(ConfiguracaoAprovacao);

    const configuracoes = [
      // Configurações para ações de alta criticidade
      {
        codigo_acao: 'cancelar_beneficio',
        estrategia_aprovacao: 'unanime',
        min_aprovacoes: 2,
        tempo_limite_horas: 48,
        permite_auto_aprovacao: false,
        escalacao_ativa: true,
        tempo_escalacao_horas: 24
      },
      {
        codigo_acao: 'excluir_cidadao',
        estrategia_aprovacao: 'unanime',
        min_aprovacoes: 2,
        tempo_limite_horas: 72,
        permite_auto_aprovacao: false,
        escalacao_ativa: true,
        tempo_escalacao_horas: 48
      },
      {
        codigo_acao: 'alterar_configuracao_critica',
        estrategia_aprovacao: 'unanime',
        min_aprovacoes: 3,
        tempo_limite_horas: 24,
        permite_auto_aprovacao: false,
        escalacao_ativa: true,
        tempo_escalacao_horas: 12
      },

      // Configurações para ações de criticidade normal
      {
        codigo_acao: 'suspender_beneficio',
        estrategia_aprovacao: 'maioria',
        min_aprovacoes: 2,
        tempo_limite_horas: 24,
        permite_auto_aprovacao: false,
        escalacao_ativa: true,
        tempo_escalacao_horas: 48
      },
      {
        codigo_acao: 'bloquear_beneficio',
        estrategia_aprovacao: 'qualquer_um',
        min_aprovacoes: 1,
        tempo_limite_horas: 12,
        permite_auto_aprovacao: true,
        escalacao_ativa: true,
        tempo_escalacao_horas: 24,
        condicoes_auto_aprovacao: {
          roles_permitidas: ['ADMIN', 'GESTOR'],
          valor_maximo: 5000
        }
      },

      // Configurações para ações menos críticas
      {
        codigo_acao: 'suspender_solicitacao',
        estrategia_aprovacao: 'qualquer_um',
        min_aprovacoes: 1,
        tempo_limite_horas: 24,
        permite_auto_aprovacao: true,
        escalacao_ativa: false,
        tempo_escalacao_horas: 48,
        condicoes_auto_aprovacao: {
          roles_permitidas: ['ADMIN', 'GESTOR', 'TECNICO_SEMTAS']
        }
      }
    ];

    for (const config of configuracoes) {
      const acao = await acaoRepository.findOne({
        where: { codigo: config.codigo_acao }
      });

      if (acao) {
        const existente = await configRepository.findOne({
          where: { acao_critica_id: acao.id }
        });

        if (!existente) {
          const novaConfig = configRepository.create({
            acao_critica_id: acao.id,
            nome: `Configuração para ${acao.nome}`,
            estrategia: config.estrategia_aprovacao as any,
            min_aprovacoes: config.min_aprovacoes,
            tempo_limite_horas: config.tempo_limite_horas,
            permite_auto_aprovacao: config.permite_auto_aprovacao,
            condicoes_adicionais: config.condicoes_auto_aprovacao || null,
            tempo_escalacao_horas: config.tempo_escalacao_horas,
            ativa: true
          });

          await configRepository.save(novaConfig);
          console.log(`  ✓ Configuração criada para: ${acao.nome}`);
        } else {
          console.log(`  ⚠ Configuração já existe para: ${acao.nome}`);
        }
      }
    }
  }

  private async seedAprovadores(): Promise<void> {
    const configRepository = this.dataSource.getRepository(ConfiguracaoAprovacao);
    const aprovadorRepository = this.dataSource.getRepository(Aprovador);

    // Definir aprovadores por perfil para diferentes tipos de ação
    const aprovadoresPorPerfil = [
      {
        perfil: 'ADMIN',
        tipo: 'perfil',
        ordem_aprovacao: 1,
        valor_maximo: null // Sem limite
      },
      {
        perfil: 'GESTOR',
        tipo: 'perfil',
        ordem_aprovacao: 2,
        valor_maximo: 50000
      },
      {
        perfil: 'COORDENADOR',
        tipo: 'perfil',
        ordem_aprovacao: 3,
        valor_maximo: 10000
      },
      {
        perfil: 'TECNICO_SEMTAS',
        tipo: 'perfil',
        ordem_aprovacao: 4,
        valor_maximo: 5000
      }
    ];

    const configuracoes = await configRepository.find();

    for (const configuracao of configuracoes) {
      for (const aprovadorConfig of aprovadoresPorPerfil) {
        const existente = await aprovadorRepository.findOne({
          where: {
            configuracao_aprovacao_id: configuracao.id,
            perfil: aprovadorConfig.perfil
          }
        });

        if (!existente) {
          const aprovador = aprovadorRepository.create({
            configuracao_aprovacao_id: configuracao.id,
            tipo: aprovadorConfig.tipo as any,
            perfil: aprovadorConfig.perfil,
            ordem_aprovacao: aprovadorConfig.ordem_aprovacao,
            valor_maximo_aprovacao: aprovadorConfig.valor_maximo,
            ativo: true,
            obrigatorio: false,
            pode_delegar: true,
            pode_escalar: true
          });

          await aprovadorRepository.save(aprovador);
        }
      }

      console.log(`  ✓ Aprovadores configurados para configuração ID: ${configuracao.id}`);
    }
  }
}