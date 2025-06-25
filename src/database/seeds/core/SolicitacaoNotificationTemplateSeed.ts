import { DataSource } from 'typeorm';
import {
  NotificationTemplate,
  CanalNotificacao,
} from '../../../entities/notification-template.entity';

/**
 * Seed para templates de notificação específicos de solicitações
 * 
 * Cria templates para eventos relacionados ao workflow de solicitações:
 * - Aprovação/Rejeição de solicitações
 * - Criação e resolução de pendências
 * - Cancelamento e suspensão
 */
export class SolicitacaoNotificationTemplateSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('Iniciando seed de templates de notificação para solicitações...');

    try {
      const templateRepository = dataSource.getRepository(NotificationTemplate);

      // Array com todos os templates de solicitação
      const templates = [
        {
          codigo: 'solicitacao-aprovada',
          nome: 'Solicitação Aprovada',
          tipo: 'solicitacao',
          descricao: 'Template para notificar quando uma solicitação é aprovada',
          assunto: 'Solicitação {{numero_protocolo}} - Aprovada',
          corpo: 'Sua solicitação {{numero_protocolo}} para {{tipo_beneficio}} foi aprovada. Observações: {{observacoes}}',
          corpo_html: `
            <h2>✅ Solicitação Aprovada!</h2>
            <p>Olá <strong>{{nome_cidadao}}</strong>,</p>
            <p>Temos uma ótima notícia! Sua solicitação foi <strong>aprovada</strong>.</p>
            <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
              <p><strong>📋 Protocolo:</strong> {{numero_protocolo}}</p>
              <p><strong>🎯 Benefício:</strong> {{tipo_beneficio}}</p>
              <p><strong>📅 Data de Aprovação:</strong> {{data_aprovacao}}</p>
              <p><strong>👤 Aprovado por:</strong> {{nome_tecnico}}</p>
            </div>
            {{#if observacoes}}
            <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; margin: 20px 0;">
              <p><strong>📝 Observações:</strong></p>
              <p>{{observacoes}}</p>
            </div>
            {{/if}}
            <p><a href="{{link_solicitacao}}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Detalhes da Solicitação</a></p>
            <p><small>Data de envio: {{data_envio}}</small></p>
          `,
          canais_disponiveis: ['email', 'in_app'],
          variaveis_requeridas: JSON.stringify([
            'nome_cidadao', 'numero_protocolo', 'tipo_beneficio', 
            'data_aprovacao', 'nome_tecnico', 'observacoes', 
            'link_solicitacao', 'data_envio'
          ]),
          ativo: true,
          categoria: 'solicitacao',
          prioridade: 'alta'
        },
        {
          codigo: 'solicitacao-indeferida',
          nome: 'Solicitação Indeferida',
          tipo: 'solicitacao',
          descricao: 'Template para notificar quando uma solicitação é indeferida',
          assunto: 'Solicitação {{numero_protocolo}} - Indeferida',
          corpo: 'Sua solicitação {{numero_protocolo}} para {{tipo_beneficio}} foi indeferida. Motivo: {{motivo_rejeicao}}',
          corpo_html: `
            <h2>❌ Solicitação Indeferida</h2>
            <p>Olá <strong>{{nome_cidadao}}</strong>,</p>
            <p>Infelizmente, sua solicitação foi <strong>indeferida</strong>.</p>
            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
              <p><strong>📋 Protocolo:</strong> {{numero_protocolo}}</p>
              <p><strong>🎯 Benefício:</strong> {{tipo_beneficio}}</p>
              <p><strong>📅 Data de Rejeição:</strong> {{data_rejeicao}}</p>
              <p><strong>👤 Rejeitado por:</strong> {{nome_tecnico}}</p>
            </div>
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0;">
              <p><strong>📝 Motivo da Rejeição:</strong></p>
              <p>{{motivo_rejeicao}}</p>
            </div>
            <p>Você pode entrar em contato conosco para esclarecimentos ou submeter uma nova solicitação.</p>
            <p><a href="{{link_solicitacao}}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Detalhes</a></p>
          `,
          canais_disponiveis: ['email', 'in_app'],
          variaveis_requeridas: JSON.stringify([
            'nome_cidadao', 'numero_protocolo', 'tipo_beneficio',
            'data_rejeicao', 'nome_tecnico', 'motivo_rejeicao',
            'link_solicitacao'
          ]),
          ativo: true,
          categoria: 'solicitacao',
          prioridade: 'alta'
        },
        {
          codigo: 'solicitacao-cancelada',
          nome: 'Solicitação Cancelada',
          tipo: 'solicitacao',
          descricao: 'Template para notificar quando uma solicitação é cancelada',
          assunto: 'Solicitação {{numero_protocolo}} - Cancelada',
          corpo: 'Sua solicitação {{numero_protocolo}} para {{tipo_beneficio}} foi cancelada. Motivo: {{motivo_cancelamento}}',
          corpo_html: `
            <h2>🚫 Solicitação Cancelada</h2>
            <p>Olá <strong>{{nome_cidadao}}</strong>,</p>
            <p>Sua solicitação foi <strong>cancelada</strong>.</p>
            <div style="background-color: #f8d7da; border-left: 4px solid #6c757d; padding: 15px; margin: 20px 0;">
              <p><strong>📋 Protocolo:</strong> {{numero_protocolo}}</p>
              <p><strong>🎯 Benefício:</strong> {{tipo_beneficio}}</p>
              <p><strong>📅 Data de Cancelamento:</strong> {{data_cancelamento}}</p>
            </div>
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0;">
              <p><strong>📝 Motivo do Cancelamento:</strong></p>
              <p>{{motivo_cancelamento}}</p>
            </div>
            <p><a href="{{link_solicitacao}}" style="background-color: #6c757d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Detalhes</a></p>
          `,
          canais_disponiveis: ['email', 'in_app'],
          variaveis_requeridas: JSON.stringify([
            'nome_cidadao', 'numero_protocolo', 'tipo_beneficio',
            'data_cancelamento', 'motivo_cancelamento', 'link_solicitacao'
          ]),
          ativo: true,
          categoria: 'solicitacao',
          prioridade: 'normal'
        },
        {
          codigo: 'solicitacao-suspensa',
          nome: 'Solicitação Suspensa',
          tipo: 'solicitacao',
          descricao: 'Template para notificar quando uma solicitação é suspensa',
          assunto: 'Solicitação {{numero_protocolo}} - Suspensa',
          corpo: 'Sua solicitação {{numero_protocolo}} para {{tipo_beneficio}} foi suspensa. Motivo: {{motivo_suspensao}}',
          corpo_html: `
            <h2>⏸️ Solicitação Suspensa</h2>
            <p>Olá <strong>{{nome_cidadao}}</strong>,</p>
            <p>Sua solicitação foi <strong>suspensa temporariamente</strong>.</p>
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p><strong>📋 Protocolo:</strong> {{numero_protocolo}}</p>
              <p><strong>🎯 Benefício:</strong> {{tipo_beneficio}}</p>
              <p><strong>📅 Data de Suspensão:</strong> {{data_suspensao}}</p>
            </div>
            <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; margin: 20px 0;">
              <p><strong>📝 Motivo da Suspensão:</strong></p>
              <p>{{motivo_suspensao}}</p>
            </div>
            <p>Entre em contato conosco para mais informações sobre como proceder.</p>
            <p><a href="{{link_solicitacao}}" style="background-color: #ffc107; color: #212529; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Detalhes</a></p>
          `,
          canais_disponiveis: ['email', 'in_app'],
          variaveis_requeridas: JSON.stringify([
            'nome_cidadao', 'numero_protocolo', 'tipo_beneficio',
            'data_suspensao', 'motivo_suspensao', 'link_solicitacao'
          ]),
          ativo: true,
          categoria: 'solicitacao',
          prioridade: 'alta'
        },
        {
          codigo: 'solicitacao-bloqueada',
          nome: 'Solicitação Bloqueada',
          tipo: 'solicitacao',
          descricao: 'Template para notificar quando uma solicitação é bloqueada',
          assunto: 'Solicitação {{numero_protocolo}} - Bloqueada',
          corpo: 'Sua solicitação {{numero_protocolo}} para {{tipo_beneficio}} foi bloqueada. Motivo: {{motivo_bloqueio}}',
          corpo_html: `
            <h2>🔒 Solicitação Bloqueada</h2>
            <p>Olá <strong>{{nome_cidadao}}</strong>,</p>
            <p>Sua solicitação foi <strong>bloqueada</strong>.</p>
            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
              <p><strong>📋 Protocolo:</strong> {{numero_protocolo}}</p>
              <p><strong>🎯 Benefício:</strong> {{tipo_beneficio}}</p>
              <p><strong>📅 Data de Bloqueio:</strong> {{data_bloqueio}}</p>
            </div>
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0;">
              <p><strong>📝 Motivo do Bloqueio:</strong></p>
              <p>{{motivo_bloqueio}}</p>
            </div>
            <p>Entre em contato com nossa equipe para esclarecimentos.</p>
            <p><a href="{{link_solicitacao}}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Detalhes</a></p>
          `,
          canais_disponiveis: ['email', 'in_app'],
          variaveis_requeridas: JSON.stringify([
            'nome_cidadao', 'numero_protocolo', 'tipo_beneficio',
            'data_bloqueio', 'motivo_bloqueio', 'link_solicitacao'
          ]),
          ativo: true,
          categoria: 'solicitacao',
          prioridade: 'alta'
        },
        {
          codigo: 'solicitacao-pendencia',
          nome: 'Pendência em Solicitação',
          tipo: 'solicitacao',
          descricao: 'Template para notificar quando uma pendência é criada em uma solicitação',
          assunto: 'Pendência na Solicitação {{numero_protocolo}}',
          corpo: 'Foi identificada uma pendência na solicitação {{numero_protocolo}} para {{tipo_beneficio}}. Descrição: {{descricao_pendencia}}',
          corpo_html: `
            <h2>⚠️ Pendência Identificada</h2>
            <p>Olá <strong>{{nome_cidadao}}</strong>,</p>
            <p>Foi identificada uma <strong>pendência</strong> em sua solicitação que precisa ser resolvida.</p>
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p><strong>📋 Protocolo:</strong> {{numero_protocolo}}</p>
              <p><strong>🎯 Benefício:</strong> {{tipo_beneficio}}</p>
              <p><strong>📅 Data da Pendência:</strong> {{data_pendencia}}</p>
              <p><strong>👤 Identificado por:</strong> {{nome_tecnico}}</p>
            </div>
            <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; margin: 20px 0;">
              <p><strong>📝 Descrição da Pendência:</strong></p>
              <p>{{descricao_pendencia}}</p>
              {{#if observacoes}}
              <p><strong>Observações:</strong> {{observacoes}}</p>
              {{/if}}
            </div>
            <p>Por favor, providencie a documentação ou informação solicitada o mais breve possível.</p>
            <p><a href="{{link_solicitacao}}" style="background-color: #ffc107; color: #212529; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Resolver Pendência</a></p>
          `,
          canais_disponiveis: ['email', 'in_app'],
          variaveis_requeridas: JSON.stringify([
            'nome_cidadao', 'numero_protocolo', 'tipo_beneficio',
            'data_pendencia', 'nome_tecnico', 'descricao_pendencia',
            'observacoes', 'link_solicitacao'
          ]),
          ativo: true,
          categoria: 'solicitacao',
          prioridade: 'alta'
        },
        {
          codigo: 'solicitacao-pendencia-resolvida',
          nome: 'Pendência Resolvida',
          tipo: 'solicitacao',
          descricao: 'Template para notificar quando uma pendência é resolvida',
          assunto: 'Pendência Resolvida - Solicitação {{numero_protocolo}}',
          corpo: 'A pendência da solicitação {{numero_protocolo}} para {{tipo_beneficio}} foi resolvida. Observações: {{observacoes_resolucao}}',
          corpo_html: `
            <h2>✅ Pendência Resolvida</h2>
            <p>Olá <strong>{{nome_cidadao}}</strong>,</p>
            <p>A pendência em sua solicitação foi <strong>resolvida</strong> com sucesso!</p>
            <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
              <p><strong>📋 Protocolo:</strong> {{numero_protocolo}}</p>
              <p><strong>🎯 Benefício:</strong> {{tipo_beneficio}}</p>
              <p><strong>📅 Data de Resolução:</strong> {{data_resolucao}}</p>
              <p><strong>👤 Resolvido por:</strong> {{nome_tecnico}}</p>
            </div>
            {{#if observacoes_resolucao}}
            <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; margin: 20px 0;">
              <p><strong>📝 Observações da Resolução:</strong></p>
              <p>{{observacoes_resolucao}}</p>
            </div>
            {{/if}}
            <p>Sua solicitação agora pode prosseguir no processo de análise.</p>
            <p><a href="{{link_solicitacao}}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Solicitação</a></p>
          `,
          canais_disponiveis: ['email', 'in_app'],
          variaveis_requeridas: JSON.stringify([
            'nome_cidadao', 'numero_protocolo', 'tipo_beneficio',
            'data_resolucao', 'nome_tecnico', 'observacoes_resolucao',
            'link_solicitacao'
          ]),
          ativo: true,
          categoria: 'solicitacao',
          prioridade: 'normal'
        }
      ];

      // Processa cada template
      for (const templateData of templates) {
        // Verifica se o template já existe
        const existingTemplate = await templateRepository.findOne({
          where: { codigo: templateData.codigo }
        });

        if (existingTemplate) {
          console.log(`Template '${templateData.codigo}' já existe, atualizando...`);
          
          // Atualiza o template existente
          await templateRepository.update(
            { id: existingTemplate.id },
            templateData
          );
        } else {
          console.log(`Criando template '${templateData.codigo}'...`);
          
          // Cria novo template
          const template = templateRepository.create(templateData);
          await templateRepository.save(template);
        }
      }

      console.log(`✅ Seed de templates de notificação para solicitações concluída! ${templates.length} templates processados.`);
    } catch (error) {
      console.error('❌ Erro ao executar seed de templates de notificação para solicitações:', error);
      throw error;
    }
  }
}