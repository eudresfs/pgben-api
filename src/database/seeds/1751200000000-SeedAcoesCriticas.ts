import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { AcaoCritica } from '../../modules/aprovacao/entities/acao-critica.entity';
import { TipoAcaoCritica } from '../../modules/aprovacao/enums/aprovacao.enums';

/**
 * Seed para popular a tabela de ações críticas com as ações fundamentais do sistema
 * 
 * Este seed cria as ações críticas básicas que requerem aprovação no sistema PGBEN,
 * organizadas por módulo e nível de criticidade.
 */
export class SeedAcoesCriticas1751200000000 implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<any> {
    const acoesCriticasRepository = dataSource.getRepository(AcaoCritica);

    // Verificar se já existem ações críticas
    const existingCount = await acoesCriticasRepository.count();
    if (existingCount > 0) {
      console.log('Ações críticas já existem, pulando seed...');
      return;
    }

    console.log('Criando ações críticas iniciais...');

    const acoesCriticas = [
      // === MÓDULO SOLICITAÇÃO ===
      {
        codigo: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
        nome: 'Cancelar Solicitação de Benefício',
        descricao: 'Cancelamento de uma solicitação de benefício em andamento',
        modulo: 'solicitacao',
        entidade_alvo: 'SolicitacaoBeneficio',
        requer_aprovacao: true,
        nivel_criticidade: 3,
        tags: ['solicitacao', 'cancelamento', 'beneficio'],
        ativo: true,
        metadados: {
          impacto: 'ALTO',
          reversivel: false,
          requer_justificativa: true,
          notificar_cidadao: true,
          gerar_auditoria: true
        }
      },
      {
        codigo: TipoAcaoCritica.SUSPENSAO_BENEFICIO,
        nome: 'Suspender Solicitação de Benefício',
        descricao: 'Suspensão temporária de uma solicitação de benefício',
        modulo: 'solicitacao',
        entidade_alvo: 'SolicitacaoBeneficio',
        requer_aprovacao: true,
        nivel_criticidade: 2,
        tags: ['solicitacao', 'suspensao', 'beneficio'],
        ativo: true,
        metadados: {
          impacto: 'MEDIO',
          reversivel: true,
          requer_justificativa: true,
          notificar_cidadao: true,
          gerar_auditoria: true
        }
      },
      {
        codigo: TipoAcaoCritica.REATIVACAO_BENEFICIO,
        nome: 'Reativar Solicitação de Benefício',
        descricao: 'Reativação de uma solicitação de benefício suspensa',
        modulo: 'solicitacao',
        entidade_alvo: 'SolicitacaoBeneficio',
        requer_aprovacao: true,
        nivel_criticidade: 2,
        tags: ['solicitacao', 'reativacao', 'beneficio'],
        ativo: true,
        metadados: {
          impacto: 'MEDIO',
          reversivel: true,
          requer_justificativa: true,
          notificar_cidadao: true,
          gerar_auditoria: true
        }
      },

      // === MÓDULO BENEFÍCIO ===
      {
        codigo: TipoAcaoCritica.SUSPENSAO_BENEFICIO,
        nome: 'Suspender Benefício',
        descricao: 'Suspensão temporária de um benefício ativo',
        modulo: 'beneficio',
        entidade_alvo: 'Beneficio',
        requer_aprovacao: true,
        nivel_criticidade: 4,
        tags: ['beneficio', 'suspensao', 'pagamento'],
        ativo: true,
        metadados: {
          impacto: 'ALTO',
          reversivel: true,
          requer_justificativa: true,
          notificar_cidadao: true,
          gerar_auditoria: true,
          afeta_pagamento: true
        }
      },
      {
        codigo: TipoAcaoCritica.BLOQUEIO_USUARIO,
        nome: 'Bloquear Benefício',
        descricao: 'Bloqueio de um benefício por irregularidades ou suspeitas',
        modulo: 'beneficio',
        entidade_alvo: 'Beneficio',
        requer_aprovacao: true,
        nivel_criticidade: 4,
        tags: ['beneficio', 'bloqueio', 'irregularidade'],
        ativo: true,
        metadados: {
          impacto: 'ALTO',
          reversivel: true,
          requer_justificativa: true,
          notificar_cidadao: true,
          gerar_auditoria: true,
          afeta_pagamento: true,
          requer_investigacao: true
        }
      },
      {
        codigo: TipoAcaoCritica.DESBLOQUEIO_USUARIO,
        nome: 'Desbloquear Benefício',
        descricao: 'Desbloqueio de um benefício previamente bloqueado',
        modulo: 'beneficio',
        entidade_alvo: 'Beneficio',
        requer_aprovacao: true,
        nivel_criticidade: 3,
        tags: ['beneficio', 'desbloqueio', 'reativacao'],
        ativo: true,
        metadados: {
          impacto: 'ALTO',
          reversivel: true,
          requer_justificativa: true,
          notificar_cidadao: true,
          gerar_auditoria: true,
          afeta_pagamento: true
        }
      },
      {
        codigo: TipoAcaoCritica.REATIVACAO_BENEFICIO,
        nome: 'Liberar Benefício',
        descricao: 'Liberação de um benefício para pagamento',
        modulo: 'beneficio',
        entidade_alvo: 'Beneficio',
        requer_aprovacao: true,
        nivel_criticidade: 3,
        tags: ['beneficio', 'liberacao', 'pagamento'],
        ativo: true,
        metadados: {
          impacto: 'ALTO',
          reversivel: false,
          requer_justificativa: true,
          notificar_cidadao: true,
          gerar_auditoria: true,
          afeta_pagamento: true
        }
      },
      {
        codigo: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
        nome: 'Cancelar Benefício',
        descricao: 'Cancelamento definitivo de um benefício',
        modulo: 'beneficio',
        entidade_alvo: 'Beneficio',
        requer_aprovacao: true,
        nivel_criticidade: 5,
        tags: ['beneficio', 'cancelamento', 'definitivo'],
        ativo: true,
        metadados: {
          impacto: 'CRITICO',
          reversivel: false,
          requer_justificativa: true,
          notificar_cidadao: true,
          gerar_auditoria: true,
          afeta_pagamento: true,
          requer_dupla_aprovacao: true
        }
      },

      // === MÓDULO CIDADÃO ===
      {
        codigo: TipoAcaoCritica.EXCLUSAO_BENEFICIARIO,
        nome: 'Inativar Cidadão',
        descricao: 'Inativação de um cadastro de cidadão',
        modulo: 'cidadao',
        entidade_alvo: 'Cidadao',
        requer_aprovacao: true,
        nivel_criticidade: 4,
        tags: ['cidadao', 'inativacao', 'cadastro'],
        ativo: true,
        metadados: {
          impacto: 'ALTO',
          reversivel: true,
          requer_justificativa: true,
          notificar_cidadao: true,
          gerar_auditoria: true,
          afeta_beneficios: true
        }
      },
      {
        codigo: TipoAcaoCritica.REATIVACAO_BENEFICIO,
        nome: 'Reativar Cidadão',
        descricao: 'Reativação de um cadastro de cidadão inativo',
        modulo: 'cidadao',
        entidade_alvo: 'Cidadao',
        requer_aprovacao: true,
        nivel_criticidade: 3,
        tags: ['cidadao', 'reativacao', 'cadastro'],
        ativo: true,
        metadados: {
          impacto: 'ALTO',
          reversivel: true,
          requer_justificativa: true,
          notificar_cidadao: true,
          gerar_auditoria: true,
          afeta_beneficios: true
        }
      },
      {
        codigo: TipoAcaoCritica.EXCLUSAO_BENEFICIARIO,
        nome: 'Excluir Cidadão',
        descricao: 'Exclusão definitiva de um cadastro de cidadão',
        modulo: 'cidadao',
        entidade_alvo: 'Cidadao',
        requer_aprovacao: true,
        nivel_criticidade: 5,
        tags: ['cidadao', 'exclusao', 'definitivo'],
        ativo: true,
        metadados: {
          impacto: 'CRITICO',
          reversivel: false,
          requer_justificativa: true,
          notificar_cidadao: false,
          gerar_auditoria: true,
          afeta_beneficios: true,
          requer_dupla_aprovacao: true,
          requer_backup_dados: true
        }
      },

      // === MÓDULO USUÁRIO ===
      {
        codigo: TipoAcaoCritica.BLOQUEIO_USUARIO,
        nome: 'Inativar Usuário do Sistema',
        descricao: 'Inativação de um usuário do sistema',
        modulo: 'usuario',
        entidade_alvo: 'Usuario',
        requer_aprovacao: true,
        nivel_criticidade: 3,
        tags: ['usuario', 'inativacao', 'acesso'],
        ativo: true,
        metadados: {
          impacto: 'MEDIO',
          reversivel: true,
          requer_justificativa: true,
          notificar_usuario: true,
          gerar_auditoria: true,
          afeta_acesso: true
        }
      },
      {
        codigo: TipoAcaoCritica.DESBLOQUEIO_USUARIO,
        nome: 'Reativar Usuário do Sistema',
        descricao: 'Reativação de um usuário inativo do sistema',
        modulo: 'usuario',
        entidade_alvo: 'Usuario',
        requer_aprovacao: true,
        nivel_criticidade: 2,
        tags: ['usuario', 'reativacao', 'acesso'],
        ativo: true,
        metadados: {
          impacto: 'MEDIO',
          reversivel: true,
          requer_justificativa: true,
          notificar_usuario: true,
          gerar_auditoria: true,
          afeta_acesso: true
        }
      },
      {
        codigo: TipoAcaoCritica.ALTERACAO_PERMISSAO,
        nome: 'Alterar Permissões de Usuário',
        descricao: 'Alteração das permissões de acesso de um usuário',
        modulo: 'usuario',
        entidade_alvo: 'Usuario',
        requer_aprovacao: true,
        nivel_criticidade: 4,
        tags: ['usuario', 'permissoes', 'seguranca'],
        ativo: true,
        metadados: {
          impacto: 'ALTO',
          reversivel: true,
          requer_justificativa: true,
          notificar_usuario: true,
          gerar_auditoria: true,
          afeta_acesso: true,
          requer_validacao_seguranca: true
        }
      },

      // === MÓDULO DOCUMENTO ===
      {
        codigo: TipoAcaoCritica.EXCLUSAO_DOCUMENTO,
        nome: 'Excluir Documento',
        descricao: 'Exclusão definitiva de um documento do sistema',
        modulo: 'documento',
        entidade_alvo: 'Documento',
        requer_aprovacao: true,
        nivel_criticidade: 4,
        tags: ['documento', 'exclusao', 'arquivo'],
        ativo: true,
        metadados: {
          impacto: 'ALTO',
          reversivel: false,
          requer_justificativa: true,
          notificar_cidadao: true,
          gerar_auditoria: true,
          requer_backup: true
        }
      },
      {
        codigo: TipoAcaoCritica.EXCLUSAO_DOCUMENTO,
        nome: 'Substituir Documento',
        descricao: 'Substituição de um documento por uma nova versão',
        modulo: 'documento',
        entidade_alvo: 'Documento',
        requer_aprovacao: true,
        nivel_criticidade: 3,
        tags: ['documento', 'substituicao', 'versao'],
        ativo: true,
        metadados: {
          impacto: 'MEDIO',
          reversivel: true,
          requer_justificativa: true,
          notificar_cidadao: true,
          gerar_auditoria: true,
          manter_historico: true
        }
      },

      // === MÓDULO CONFIGURAÇÃO ===
      {
        codigo: TipoAcaoCritica.CONFIGURACAO_SISTEMA,
        nome: 'Alterar Configuração Crítica',
        descricao: 'Alteração de configurações críticas do sistema',
        modulo: 'configuracao',
        entidade_alvo: 'Configuracao',
        requer_aprovacao: true,
        nivel_criticidade: 5,
        tags: ['configuracao', 'sistema', 'critico'],
        ativo: true,
        metadados: {
          impacto: 'CRITICO',
          reversivel: true,
          requer_justificativa: true,
          notificar_administradores: true,
          gerar_auditoria: true,
          requer_dupla_aprovacao: true,
          afeta_sistema_completo: true,
          requer_backup_configuracao: true
        }
      }
    ];

    // Inserir ações críticas em lotes para melhor performance
    const batchSize = 5;
    for (let i = 0; i < acoesCriticas.length; i += batchSize) {
      const batch = acoesCriticas.slice(i, i + batchSize);
      await acoesCriticasRepository.save(batch);
      console.log(`Inseridas ${batch.length} ações críticas (lote ${Math.floor(i / batchSize) + 1})`);
    }

    console.log(`✅ Seed concluído: ${acoesCriticas.length} ações críticas criadas com sucesso!`);
  }
}