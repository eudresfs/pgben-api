import { DataSource } from 'typeorm';
import {
  NotificationTemplate,
  CanalNotificacao,
} from '../../../entities/notification-template.entity';

/**
 * Seed para templates de notificação do sistema de aprovação de ações críticas
 *
 * Cria templates HTML profissionais para:
 * - Nova solicitação de aprovação
 * - Aprovação processada (aprovada/rejeitada)
 * - Prazo vencendo
 * - Escalação automática
 * - Delegação de aprovação
 */
export class AprovacaoNotificationTemplateSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log(
      'Iniciando seed de templates de notificação para aprovação de ações críticas...',
    );

    try {
      const templateRepository = dataSource.getRepository(NotificationTemplate);

      // Array com todos os templates de aprovação
      const templates = [
        {
          codigo: 'nova-solicitacao-aprovacao',
          nome: 'Nova Solicitação de Aprovação',
          tipo: 'aprovacao',
          descricao:
            'Template para notificar aprovadores sobre nova solicitação pendente',
          assunto: '🔔 Nova Solicitação de Aprovação - {{acao_nome}}',
          corpo:
            'Nova solicitação de aprovação: {{acao_nome}} por {{solicitante_nome}}. Prazo: {{prazo_limite}}. Acesse o sistema para processar.',
          corpo_html: `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Nova Solicitação de Aprovação</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header .icon { font-size: 48px; margin-bottom: 10px; }
                .content { padding: 30px 20px; }
                .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
                .alert-box { background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 3px solid #007bff; }
                .info-label { font-weight: 600; color: #495057; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                .info-value { color: #212529; font-size: 14px; margin-top: 5px; }
                .justification-box { background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .justification-box h4 { margin: 0 0 10px 0; color: #495057; }
                .action-buttons { text-align: center; margin: 30px 0; }
                .btn { display: inline-block; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px; transition: all 0.3s ease; }
                .btn-primary { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3); }
                .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4); }
                .priority-high { border-left-color: #dc3545 !important; }
                .priority-critical { border-left-color: #dc3545 !important; background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; }
                .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
                .urgency-indicator { background: #dc3545; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; margin-bottom: 15px; }
                @media (max-width: 600px) {
                  .info-grid { grid-template-columns: 1fr; }
                  .btn { display: block; margin: 10px 0; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="icon">🔔</div>
                  <h1>Nova Solicitação de Aprovação</h1>
                </div>
                
                <div class="content">
                  <p class="greeting">Olá <strong>{{aprovador_nome}}</strong>,</p>
                  
                  {{#if (eq prioridade "critica")}}
                  <div class="urgency-indicator">⚠️ AÇÃO CRÍTICA - APROVAÇÃO URGENTE</div>
                  {{/if}}
                  
                  <div class="alert-box">
                    <p><strong>Você tem uma nova solicitação de aprovação pendente que requer sua análise.</strong></p>
                  </div>
                  
                  <div class="info-grid">
                    <div class="info-item {{#if (eq prioridade "critica")}}priority-critical{{else if (eq prioridade "alta")}}priority-high{{/if}}">
                      <div class="info-label">Tipo de Ação</div>
                      <div class="info-value">{{acao_nome}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Solicitante</div>
                      <div class="info-value">{{solicitante_nome}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Data da Solicitação</div>
                      <div class="info-value">{{data_solicitacao}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Prazo Limite</div>
                      <div class="info-value">{{prazo_limite}}</div>
                    </div>
                    {{#if valor_envolvido}}
                    <div class="info-item">
                      <div class="info-label">Valor Envolvido</div>
                      <div class="info-value">R$ {{valor_envolvido}}</div>
                    </div>
                    {{/if}}
                    <div class="info-item">
                      <div class="info-label">Código da Solicitação</div>
                      <div class="info-value">{{codigo_solicitacao}}</div>
                    </div>
                  </div>
                  
                  {{#if justificativa}}
                  <div class="justification-box">
                    <h4>📝 Justificativa</h4>
                    <p>{{justificativa}}</p>
                  </div>
                  {{/if}}
                  
                  <div class="action-buttons">
                    <a href="{{link_aprovacao}}" class="btn btn-primary">
                      🔍 Processar Aprovação
                    </a>
                  </div>
                  
                  <p style="color: #6c757d; font-size: 14px; text-align: center; margin-top: 20px;">
                    <strong>⏰ Tempo restante:</strong> {{tempo_restante}}<br>
                    <strong>📊 Prioridade:</strong> {{prioridade}}
                  </p>
                </div>
                
                <div class="footer">
                  <p><strong>Sistema de Aprovação - PGBen</strong></p>
                  <p>Este é um e-mail automático. Para suporte: {{email_suporte}}</p>
                  <p>Data de envio: {{data_envio}}</p>
                </div>
              </div>
            </body>
            </html>
          `,
          canais_disponiveis: ['email', 'in_app'],
          variaveis_requeridas: JSON.stringify([
            'aprovador_nome',
            'acao_nome',
            'solicitante_nome',
            'data_solicitacao',
            'prazo_limite',
            'valor_envolvido',
            'codigo_solicitacao',
            'justificativa',
            'link_aprovacao',
            'tempo_restante',
            'prioridade',
            'email_suporte',
            'data_envio',
          ]),
          ativo: true,
          categoria: 'aprovacao',
          prioridade: 'alta',
        },
        {
          codigo: 'solicitacao-aprovacao-processada',
          nome: 'Solicitação de Aprovação Processada',
          tipo: 'aprovacao',
          descricao:
            'Template para notificar solicitante sobre resultado da aprovação',
          assunto: '{{#if aprovada}}✅ Solicitação Aprovada{{else}}❌ Solicitação Rejeitada{{/if}} - {{acao_nome}}',
          corpo:
            'Sua solicitação {{codigo_solicitacao}} foi {{status}}. {{#if observacoes}}Observações: {{observacoes}}{{/if}}',
          corpo_html: `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Resultado da Aprovação</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                .header { color: white; padding: 30px 20px; text-align: center; }
                .header-approved { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); }
                .header-rejected { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header .icon { font-size: 48px; margin-bottom: 10px; }
                .content { padding: 30px 20px; }
                .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
                .status-box { padding: 25px; margin: 20px 0; border-radius: 12px; text-align: center; }
                .status-approved { background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border: 2px solid #28a745; }
                .status-rejected { background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); border: 2px solid #dc3545; }
                .status-title { font-size: 20px; font-weight: 600; margin-bottom: 10px; }
                .status-approved .status-title { color: #155724; }
                .status-rejected .status-title { color: #721c24; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 3px solid #007bff; }
                .info-label { font-weight: 600; color: #495057; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                .info-value { color: #212529; font-size: 14px; margin-top: 5px; }
                .observations-box { background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .observations-box h4 { margin: 0 0 10px 0; color: #495057; }
                .action-buttons { text-align: center; margin: 30px 0; }
                .btn { display: inline-block; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px; transition: all 0.3s ease; }
                .btn-primary { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3); }
                .btn-success { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3); }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; }
                .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
                @media (max-width: 600px) {
                  .info-grid { grid-template-columns: 1fr; }
                  .btn { display: block; margin: 10px 0; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header {{#if aprovada}}header-approved{{else}}header-rejected{{/if}}">
                  <div class="icon">{{#if aprovada}}✅{{else}}❌{{/if}}</div>
                  <h1>{{#if aprovada}}Solicitação Aprovada{{else}}Solicitação Rejeitada{{/if}}</h1>
                </div>
                
                <div class="content">
                  <p class="greeting">Olá <strong>{{solicitante_nome}}</strong>,</p>
                  
                  <div class="status-box {{#if aprovada}}status-approved{{else}}status-rejected{{/if}}">
                    <div class="status-title">
                      {{#if aprovada}}
                        🎉 Sua solicitação foi APROVADA!
                      {{else}}
                        ⚠️ Sua solicitação foi REJEITADA
                      {{/if}}
                    </div>
                    <p>{{#if aprovada}}Você já pode prosseguir com a ação solicitada.{{else}}Revise os motivos abaixo e, se necessário, submeta uma nova solicitação.{{/if}}</p>
                  </div>
                  
                  <div class="info-grid">
                    <div class="info-item">
                      <div class="info-label">Tipo de Ação</div>
                      <div class="info-value">{{acao_nome}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Código da Solicitação</div>
                      <div class="info-value">{{codigo_solicitacao}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">{{#if aprovada}}Aprovado por{{else}}Rejeitado por{{/if}}</div>
                      <div class="info-value">{{aprovador_nome}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Data de Processamento</div>
                      <div class="info-value">{{data_processamento}}</div>
                    </div>
                  </div>
                  
                  {{#if observacoes}}
                  <div class="observations-box">
                    <h4>📝 {{#if aprovada}}Observações{{else}}Motivo da Rejeição{{/if}}</h4>
                    <p>{{observacoes}}</p>
                  </div>
                  {{/if}}
                  
                  <div class="action-buttons">
                    <a href="{{link_solicitacao}}" class="btn {{#if aprovada}}btn-success{{else}}btn-primary{{/if}}">
                      📋 Ver Detalhes da Solicitação
                    </a>
                    {{#unless aprovada}}
                    <a href="{{link_nova_solicitacao}}" class="btn btn-primary">
                      🔄 Nova Solicitação
                    </a>
                    {{/unless}}
                  </div>
                </div>
                
                <div class="footer">
                  <p><strong>Sistema de Aprovação - PGBen</strong></p>
                  <p>Este é um e-mail automático. Para suporte: {{email_suporte}}</p>
                  <p>Data de envio: {{data_envio}}</p>
                </div>
              </div>
            </body>
            </html>
          `,
          canais_disponiveis: ['email', 'in_app'],
          variaveis_requeridas: JSON.stringify([
            'aprovada',
            'solicitante_nome',
            'acao_nome',
            'codigo_solicitacao',
            'aprovador_nome',
            'data_processamento',
            'observacoes',
            'link_solicitacao',
            'link_nova_solicitacao',
            'email_suporte',
            'data_envio',
          ]),
          ativo: true,
          categoria: 'aprovacao',
          prioridade: 'alta',
        },
        {
          codigo: 'prazo-aprovacao-vencendo',
          nome: 'Prazo de Aprovação Vencendo',
          tipo: 'aprovacao',
          descricao:
            'Template para alertar sobre prazo de aprovação próximo do vencimento',
          assunto: '⚠️ URGENTE: Prazo de Aprovação Vencendo - {{acao_nome}}',
          corpo:
            'ATENÇÃO: Solicitação {{codigo_solicitacao}} vence em {{horas_restantes}} horas. Ação urgente necessária.',
          corpo_html: `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Prazo de Aprovação Vencendo</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                .header { background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%); color: #212529; padding: 30px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header .icon { font-size: 48px; margin-bottom: 10px; }
                .content { padding: 30px 20px; }
                .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
                .urgent-alert { background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 2px solid #ffc107; padding: 25px; margin: 20px 0; border-radius: 12px; text-align: center; }
                .urgent-alert h3 { color: #856404; margin: 0 0 10px 0; font-size: 18px; }
                .countdown { background: #dc3545; color: white; padding: 15px; border-radius: 8px; font-size: 20px; font-weight: 600; margin: 15px 0; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 3px solid #ffc107; }
                .info-label { font-weight: 600; color: #495057; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                .info-value { color: #212529; font-size: 14px; margin-top: 5px; }
                .action-buttons { text-align: center; margin: 30px 0; }
                .btn { display: inline-block; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px; transition: all 0.3s ease; }
                .btn-warning { background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%); color: #212529; box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3); }
                .btn-danger { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3); }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; }
                .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
                .escalation-warning { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px 0; }
                @media (max-width: 600px) {
                  .info-grid { grid-template-columns: 1fr; }
                  .btn { display: block; margin: 10px 0; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="icon">⚠️</div>
                  <h1>PRAZO DE APROVAÇÃO VENCENDO</h1>
                </div>
                
                <div class="content">
                  <p class="greeting">Olá <strong>{{aprovador_nome}}</strong>,</p>
                  
                  <div class="urgent-alert">
                    <h3>🚨 AÇÃO URGENTE NECESSÁRIA</h3>
                    <p>Você tem uma solicitação de aprovação com prazo próximo do vencimento!</p>
                    <div class="countdown">
                      ⏰ {{horas_restantes}} HORAS RESTANTES
                    </div>
                  </div>
                  
                  <div class="info-grid">
                    <div class="info-item">
                      <div class="info-label">Tipo de Ação</div>
                      <div class="info-value">{{acao_nome}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Solicitante</div>
                      <div class="info-value">{{solicitante_nome}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Código da Solicitação</div>
                      <div class="info-value">{{codigo_solicitacao}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Prazo Limite</div>
                      <div class="info-value">{{prazo_limite}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Data da Solicitação</div>
                      <div class="info-value">{{data_solicitacao}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Prioridade</div>
                      <div class="info-value">{{prioridade}}</div>
                    </div>
                  </div>
                  
                  {{#if escalacao_automatica}}
                  <div class="escalation-warning">
                    <p><strong>⚠️ Aviso de Escalação:</strong> Se esta solicitação não for processada até {{prazo_limite}}, ela será automaticamente escalada para {{proximo_aprovador}}.</p>
                  </div>
                  {{/if}}
                  
                  <div class="action-buttons">
                    <a href="{{link_aprovacao}}" class="btn btn-danger">
                      🚀 PROCESSAR AGORA
                    </a>
                    <a href="{{link_delegar}}" class="btn btn-warning">
                      👥 Delegar Aprovação
                    </a>
                  </div>
                  
                  <p style="color: #dc3545; font-weight: 600; text-align: center; margin-top: 20px;">
                    ⚠️ Esta solicitação requer ação imediata para evitar escalação automática.
                  </p>
                </div>
                
                <div class="footer">
                  <p><strong>Sistema de Aprovação - PGBen</strong></p>
                  <p>Este é um e-mail automático. Para suporte: {{email_suporte}}</p>
                  <p>Data de envio: {{data_envio}}</p>
                </div>
              </div>
            </body>
            </html>
          `,
          canais_disponiveis: ['email', 'in_app', 'sms'],
          variaveis_requeridas: JSON.stringify([
            'aprovador_nome',
            'horas_restantes',
            'acao_nome',
            'solicitante_nome',
            'codigo_solicitacao',
            'prazo_limite',
            'data_solicitacao',
            'prioridade',
            'escalacao_automatica',
            'proximo_aprovador',
            'link_aprovacao',
            'link_delegar',
            'email_suporte',
            'data_envio',
          ]),
          ativo: true,
          categoria: 'aprovacao',
          prioridade: 'critica',
        },
        {
          codigo: 'delegacao-aprovacao-criada',
          nome: 'Delegação de Aprovação Criada',
          tipo: 'aprovacao',
          descricao:
            'Template para notificar sobre criação de delegação de aprovação',
          assunto: '👥 Delegação de Aprovação Criada - {{acao_nome}}',
          corpo:
            'Delegação criada: {{delegante_nome}} delegou aprovação de {{acao_nome}} para {{delegado_nome}}. Válida até {{data_expiracao}}.',
          corpo_html: `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Delegação de Aprovação</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                .header { background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%); color: white; padding: 30px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header .icon { font-size: 48px; margin-bottom: 10px; }
                .content { padding: 30px 20px; }
                .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
                .delegation-box { background: linear-gradient(135deg, #e2e3f0 0%, #d1d2e8 100%); border-left: 4px solid #6f42c1; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 3px solid #6f42c1; }
                .info-label { font-weight: 600; color: #495057; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                .info-value { color: #212529; font-size: 14px; margin-top: 5px; }
                .action-buttons { text-align: center; margin: 30px 0; }
                .btn { display: inline-block; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px; transition: all 0.3s ease; }
                .btn-primary { background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%); color: white; box-shadow: 0 4px 15px rgba(111, 66, 193, 0.3); }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; }
                .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
                @media (max-width: 600px) {
                  .info-grid { grid-template-columns: 1fr; }
                  .btn { display: block; margin: 10px 0; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="icon">👥</div>
                  <h1>Delegação de Aprovação</h1>
                </div>
                
                <div class="content">
                  <p class="greeting">Olá <strong>{{destinatario_nome}}</strong>,</p>
                  
                  <div class="delegation-box">
                    <p><strong>Uma nova delegação de aprovação foi criada:</strong></p>
                    <p><strong>{{delegante_nome}}</strong> delegou a aprovação de <strong>{{acao_nome}}</strong> para <strong>{{delegado_nome}}</strong>.</p>
                  </div>
                  
                  <div class="info-grid">
                    <div class="info-item">
                      <div class="info-label">Delegante</div>
                      <div class="info-value">{{delegante_nome}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Delegado</div>
                      <div class="info-value">{{delegado_nome}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Tipo de Ação</div>
                      <div class="info-value">{{acao_nome}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Data de Criação</div>
                      <div class="info-value">{{data_criacao}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Válida Até</div>
                      <div class="info-value">{{data_expiracao}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Status</div>
                      <div class="info-value">{{status_delegacao}}</div>
                    </div>
                  </div>
                  
                  {{#if motivo}}
                  <div style="background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #495057;">📝 Motivo da Delegação</h4>
                    <p>{{motivo}}</p>
                  </div>
                  {{/if}}
                  
                  <div class="action-buttons">
                    <a href="{{link_delegacao}}" class="btn btn-primary">
                      📋 Ver Detalhes da Delegação
                    </a>
                  </div>
                </div>
                
                <div class="footer">
                  <p><strong>Sistema de Aprovação - PGBen</strong></p>
                  <p>Este é um e-mail automático. Para suporte: {{email_suporte}}</p>
                  <p>Data de envio: {{data_envio}}</p>
                </div>
              </div>
            </body>
            </html>
          `,
          canais_disponiveis: ['email', 'in_app'],
          variaveis_requeridas: JSON.stringify([
            'destinatario_nome',
            'delegante_nome',
            'delegado_nome',
            'acao_nome',
            'data_criacao',
            'data_expiracao',
            'status_delegacao',
            'motivo',
            'link_delegacao',
            'email_suporte',
            'data_envio',
          ]),
          ativo: true,
          categoria: 'aprovacao',
          prioridade: 'normal',
        },
        {
          codigo: 'escalacao-automatica-aprovacao',
          nome: 'Escalação Automática de Aprovação',
          tipo: 'aprovacao',
          descricao:
            'Template para notificar sobre escalação automática por prazo vencido',
          assunto: '🔺 Escalação Automática - {{acao_nome}}',
          corpo:
            'Escalação automática: Solicitação {{codigo_solicitacao}} foi escalada para {{novo_aprovador}} devido ao vencimento do prazo.',
          corpo_html: `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Escalação Automática</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                .header { background: linear-gradient(135deg, #fd7e14 0%, #e55a00 100%); color: white; padding: 30px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header .icon { font-size: 48px; margin-bottom: 10px; }
                .content { padding: 30px 20px; }
                .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
                .escalation-alert { background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 2px solid #fd7e14; padding: 25px; margin: 20px 0; border-radius: 12px; }
                .escalation-alert h3 { color: #856404; margin: 0 0 10px 0; font-size: 18px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 3px solid #fd7e14; }
                .info-label { font-weight: 600; color: #495057; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                .info-value { color: #212529; font-size: 14px; margin-top: 5px; }
                .timeline-box { background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .timeline-item { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; border-left: 3px solid #fd7e14; }
                .action-buttons { text-align: center; margin: 30px 0; }
                .btn { display: inline-block; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px; transition: all 0.3s ease; }
                .btn-warning { background: linear-gradient(135deg, #fd7e14 0%, #e55a00 100%); color: white; box-shadow: 0 4px 15px rgba(253, 126, 20, 0.3); }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; }
                .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
                @media (max-width: 600px) {
                  .info-grid { grid-template-columns: 1fr; }
                  .btn { display: block; margin: 10px 0; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="icon">🔺</div>
                  <h1>Escalação Automática</h1>
                </div>
                
                <div class="content">
                  <p class="greeting">Olá <strong>{{destinatario_nome}}</strong>,</p>
                  
                  <div class="escalation-alert">
                    <h3>📈 Solicitação Escalada Automaticamente</h3>
                    <p>Uma solicitação de aprovação foi escalada devido ao vencimento do prazo limite.</p>
                  </div>
                  
                  <div class="info-grid">
                    <div class="info-item">
                      <div class="info-label">Tipo de Ação</div>
                      <div class="info-value">{{acao_nome}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Código da Solicitação</div>
                      <div class="info-value">{{codigo_solicitacao}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Solicitante Original</div>
                      <div class="info-value">{{solicitante_nome}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Aprovador Anterior</div>
                      <div class="info-value">{{aprovador_anterior}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Novo Aprovador</div>
                      <div class="info-value">{{novo_aprovador}}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Data de Escalação</div>
                      <div class="info-value">{{data_escalacao}}</div>
                    </div>
                  </div>
                  
                  <div class="timeline-box">
                    <h4 style="margin: 0 0 15px 0; color: #495057;">📅 Histórico da Solicitação</h4>
                    <div class="timeline-item">
                      <strong>{{data_solicitacao}}:</strong> Solicitação criada por {{solicitante_nome}}
                    </div>
                    <div class="timeline-item">
                      <strong>{{prazo_original}}:</strong> Prazo limite para {{aprovador_anterior}}
                    </div>
                    <div class="timeline-item">
                      <strong>{{data_escalacao}}:</strong> Escalação automática para {{novo_aprovador}}
                    </div>
                  </div>
                  
                  {{#if novo_prazo}}
                  <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>⏰ Novo Prazo:</strong> {{novo_prazo}}</p>
                    <p><strong>⚠️ Tempo Restante:</strong> {{tempo_restante_novo}}</p>
                  </div>
                  {{/if}}
                  
                  <div class="action-buttons">
                    <a href="{{link_aprovacao}}" class="btn btn-warning">
                      🔍 Processar Aprovação
                    </a>
                  </div>
                </div>
                
                <div class="footer">
                  <p><strong>Sistema de Aprovação - PGBen</strong></p>
                  <p>Este é um e-mail automático. Para suporte: {{email_suporte}}</p>
                  <p>Data de envio: {{data_envio}}</p>
                </div>
              </div>
            </body>
            </html>
          `,
          canais_disponiveis: ['email', 'in_app'],
          variaveis_requeridas: JSON.stringify([
            'destinatario_nome',
            'acao_nome',
            'codigo_solicitacao',
            'solicitante_nome',
            'aprovador_anterior',
            'novo_aprovador',
            'data_escalacao',
            'data_solicitacao',
            'prazo_original',
            'novo_prazo',
            'tempo_restante_novo',
            'link_aprovacao',
            'email_suporte',
            'data_envio',
          ]),
          ativo: true,
          categoria: 'aprovacao',
          prioridade: 'alta',
        },
      ];

      // Criar cada template se não existir
      for (const templateData of templates) {
        const existingTemplate = await templateRepository.findOne({
          where: { codigo: templateData.codigo },
        });

        if (!existingTemplate) {
          const novoTemplate = templateRepository.create(templateData);
          await templateRepository.save(novoTemplate);
          console.log(`Template ${templateData.codigo} criado com sucesso.`);
        } else {
          console.log(`Template ${templateData.codigo} já existe.`);
        }
      }

      console.log(
        'Seed de templates de notificação para aprovação concluído com sucesso.',
      );
    } catch (error) {
      console.error('Erro no AprovacaoNotificationTemplateSeed:', error);
      throw error;
    }
  }
}