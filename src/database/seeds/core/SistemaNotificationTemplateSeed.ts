import { DataSource } from 'typeorm';
import {
  NotificationTemplate,
  CanalNotificacao,
} from '../../../entities/notification-template.entity';

/**
 * Seed para templates de notificação gerais do sistema
 *
 * Cria templates HTML profissionais para:
 * - Boas-vindas e onboarding
 * - Alterações de perfil e configurações
 * - Alertas de segurança
 * - Manutenção do sistema
 * - Atualizações importantes
 */
export class SistemaNotificationTemplateSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log(
      'Iniciando seed de templates de notificação gerais do sistema...',
    );

    try {
      const templateRepository = dataSource.getRepository(NotificationTemplate);

      // Array com todos os templates do sistema
      const templates = [
        {
          codigo: 'bem-vindo-sistema',
          nome: 'Boas-vindas ao Sistema',
          tipo: 'sistema',
          descricao:
            'Template de boas-vindas para novos usuários do sistema',
          assunto: '🎉 Bem-vindo ao PGBen - Sua conta foi criada com sucesso!',
          corpo:
            'Bem-vindo {{nome_usuario}}! Sua conta no PGBen foi criada. Acesse com: {{email}} e senha temporária: {{senha_temporaria}}',
          corpo_html: `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Bem-vindo ao PGBen</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
                .header .icon { font-size: 64px; margin-bottom: 15px; }
                .content { padding: 40px 30px; }
                .welcome-message { background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border-left: 4px solid #28a745; padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center; }
                .welcome-message h2 { color: #155724; margin: 0 0 10px 0; font-size: 22px; }
                .credentials-box { background: #f8f9fa; border: 2px solid #dee2e6; padding: 25px; border-radius: 12px; margin: 25px 0; }
                .credentials-box h3 { color: #495057; margin: 0 0 15px 0; font-size: 18px; }
                .credential-item { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 3px solid #28a745; }
                .credential-label { font-weight: 600; color: #495057; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                .credential-value { color: #212529; font-size: 16px; margin-top: 5px; font-family: 'Courier New', monospace; background: #f8f9fa; padding: 8px; border-radius: 4px; }
                .features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
                .feature-item { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-top: 3px solid #28a745; }
                .feature-icon { font-size: 32px; margin-bottom: 10px; }
                .feature-title { font-weight: 600; color: #495057; margin-bottom: 8px; }
                .feature-desc { color: #6c757d; font-size: 14px; }
                .action-buttons { text-align: center; margin: 30px 0; }
                .btn { display: inline-block; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px; transition: all 0.3s ease; }
                .btn-primary { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3); }
                .btn-success { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3); }
                .security-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 25px 0; }
                .security-notice h4 { color: #856404; margin: 0 0 10px 0; }
                .footer { background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #dee2e6; }
                .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
                @media (max-width: 600px) {
                  .features-grid { grid-template-columns: 1fr; }
                  .btn { display: block; margin: 10px 0; }
                  .content { padding: 30px 20px; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="icon">🎉</div>
                  <h1>Bem-vindo ao PGBen!</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Sistema de Gestão de Benefícios</p>
                </div>
                
                <div class="content">
                  <div class="welcome-message">
                    <h2>Olá, {{nome_usuario}}!</h2>
                    <p>Sua conta foi criada com sucesso. Agora você tem acesso completo ao sistema de gestão de benefícios.</p>
                  </div>
                  
                  <div class="credentials-box">
                    <h3>🔐 Suas Credenciais de Acesso</h3>
                    <div class="credential-item">
                      <div class="credential-label">E-mail de Acesso</div>
                      <div class="credential-value">{{email}}</div>
                    </div>
                    <div class="credential-item">
                      <div class="credential-label">Senha Temporária</div>
                      <div class="credential-value">{{senha_temporaria}}</div>
                    </div>
                  </div>
                  
                  <div class="security-notice">
                    <h4>🔒 Importante - Segurança da Conta</h4>
                    <p>Por motivos de segurança, você <strong>deve alterar sua senha</strong> no primeiro acesso. Escolha uma senha forte com pelo menos 8 caracteres, incluindo letras, números e símbolos.</p>
                  </div>
                  
                  <div class="features-grid">
                    <div class="feature-item">
                      <div class="feature-icon">📋</div>
                      <div class="feature-title">Gestão de Benefícios</div>
                      <div class="feature-desc">Consulte e gerencie todos os seus benefícios</div>
                    </div>
                    <div class="feature-item">
                      <div class="feature-icon">📊</div>
                      <div class="feature-title">Relatórios</div>
                      <div class="feature-desc">Acesse relatórios detalhados e análises</div>
                    </div>
                    <div class="feature-item">
                      <div class="feature-icon">🔔</div>
                      <div class="feature-title">Notificações</div>
                      <div class="feature-desc">Receba alertas importantes em tempo real</div>
                    </div>
                    <div class="feature-item">
                      <div class="feature-icon">👥</div>
                      <div class="feature-title">Colaboração</div>
                      <div class="feature-desc">Trabalhe em equipe de forma eficiente</div>
                    </div>
                  </div>
                  
                  <div class="action-buttons">
                    <a href="{{link_primeiro_acesso}}" class="btn btn-success">
                      🚀 Fazer Primeiro Acesso
                    </a>
                    <a href="{{link_documentacao}}" class="btn btn-primary">
                      📖 Ver Documentação
                    </a>
                  </div>
                  
                  <p style="color: #6c757d; text-align: center; margin-top: 30px;">
                    Precisa de ajuda? Entre em contato conosco: <strong>{{email_suporte}}</strong>
                  </p>
                </div>
                
                <div class="footer">
                  <p><strong>Sistema PGBen - Gestão de Benefícios</strong></p>
                  <p>Este é um e-mail automático. Para suporte técnico: {{email_suporte}}</p>
                  <p>Data de criação da conta: {{data_criacao}}</p>
                </div>
              </div>
            </body>
            </html>
          `,
          canais_disponiveis: ['email'],
          variaveis_requeridas: JSON.stringify([
            'nome_usuario',
            'email',
            'senha_temporaria',
            'link_primeiro_acesso',
            'link_documentacao',
            'email_suporte',
            'data_criacao',
          ]),
          ativo: true,
          categoria: 'sistema',
          prioridade: 'alta',
        },
        {
          codigo: 'alteracao-perfil-confirmacao',
          nome: 'Confirmação de Alteração de Perfil',
          tipo: 'sistema',
          descricao:
            'Template para confirmar alterações no perfil do usuário',
          assunto: '✅ Perfil Atualizado - {{tipo_alteracao}}',
          corpo:
            'Seu perfil foi atualizado: {{tipo_alteracao}}. Se não foi você, entre em contato conosco imediatamente.',
          corpo_html: `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Perfil Atualizado</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                .header { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 30px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header .icon { font-size: 48px; margin-bottom: 10px; }
                .content { padding: 30px 20px; }
                .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
                .update-summary { background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%); border-left: 4px solid #17a2b8; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .changes-list { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .change-item { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 3px solid #17a2b8; }
                .change-label { font-weight: 600; color: #495057; font-size: 14px; }
                .change-value { color: #212529; margin-top: 5px; }
                .security-alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .action-buttons { text-align: center; margin: 30px 0; }
                .btn { display: inline-block; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px; transition: all 0.3s ease; }
                .btn-info { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; box-shadow: 0 4px 15px rgba(23, 162, 184, 0.3); }
                .btn-danger { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3); }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; }
                .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
                @media (max-width: 600px) {
                  .btn { display: block; margin: 10px 0; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="icon">✅</div>
                  <h1>Perfil Atualizado</h1>
                </div>
                
                <div class="content">
                  <p class="greeting">Olá <strong>{{nome_usuario}}</strong>,</p>
                  
                  <div class="update-summary">
                    <p><strong>Seu perfil foi atualizado com sucesso!</strong></p>
                    <p>Tipo de alteração: <strong>{{tipo_alteracao}}</strong></p>
                    <p>Data e hora: <strong>{{data_alteracao}}</strong></p>
                  </div>
                  
                  {{#if alteracoes}}
                  <div class="changes-list">
                    <h4 style="margin: 0 0 15px 0; color: #495057;">📝 Detalhes das Alterações</h4>
                    {{#each alteracoes}}
                    <div class="change-item">
                      <div class="change-label">{{this.campo}}</div>
                      <div class="change-value">
                        {{#if this.valor_anterior}}
                        <span style="color: #dc3545; text-decoration: line-through;">{{this.valor_anterior}}</span> → 
                        {{/if}}
                        <span style="color: #28a745; font-weight: 600;">{{this.valor_novo}}</span>
                      </div>
                    </div>
                    {{/each}}
                  </div>
                  {{/if}}
                  
                  <div class="security-alert">
                    <h4 style="color: #856404; margin: 0 0 10px 0;">🔒 Verificação de Segurança</h4>
                    <p><strong>Se você não fez essas alterações</strong>, sua conta pode ter sido comprometida. Clique no botão abaixo para reportar atividade suspeita e proteger sua conta.</p>
                  </div>
                  
                  <div class="action-buttons">
                    <a href="{{link_perfil}}" class="btn btn-info">
                      👤 Ver Meu Perfil
                    </a>
                    <a href="{{link_reportar_problema}}" class="btn btn-danger">
                      🚨 Não Fui Eu
                    </a>
                  </div>
                  
                  <p style="color: #6c757d; font-size: 14px; text-align: center; margin-top: 20px;">
                    <strong>IP de origem:</strong> {{ip_origem}}<br>
                    <strong>Navegador:</strong> {{user_agent}}<br>
                    <strong>Localização:</strong> {{localizacao}}
                  </p>
                </div>
                
                <div class="footer">
                  <p><strong>Sistema PGBen - Gestão de Benefícios</strong></p>
                  <p>Este é um e-mail automático. Para suporte: {{email_suporte}}</p>
                  <p>Data de envio: {{data_envio}}</p>
                </div>
              </div>
            </body>
            </html>
          `,
          canais_disponiveis: ['email', 'in_app'],
          variaveis_requeridas: JSON.stringify([
            'nome_usuario',
            'tipo_alteracao',
            'data_alteracao',
            'alteracoes',
            'link_perfil',
            'link_reportar_problema',
            'ip_origem',
            'user_agent',
            'localizacao',
            'email_suporte',
            'data_envio',
          ]),
          ativo: true,
          categoria: 'sistema',
          prioridade: 'normal',
        },
        {
          codigo: 'manutencao-sistema-programada',
          nome: 'Manutenção Programada do Sistema',
          tipo: 'sistema',
          descricao:
            'Template para notificar sobre manutenção programada do sistema',
          assunto: '🔧 Manutenção Programada - {{data_manutencao}}',
          corpo:
            'Manutenção programada: {{data_inicio}} às {{hora_inicio}} até {{data_fim}} às {{hora_fim}}. Funcionalidades afetadas: {{funcionalidades_afetadas}}',
          corpo_html: `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Manutenção Programada</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                .header { background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; padding: 30px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header .icon { font-size: 48px; margin-bottom: 10px; }
                .content { padding: 30px 20px; }
                .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
                .maintenance-alert { background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 2px solid #ffc107; padding: 25px; margin: 20px 0; border-radius: 12px; text-align: center; }
                .maintenance-alert h3 { color: #856404; margin: 0 0 10px 0; font-size: 18px; }
                .schedule-box { background: #f8f9fa; border: 2px solid #dee2e6; padding: 25px; border-radius: 12px; margin: 25px 0; }
                .schedule-item { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 3px solid #6c757d; }
                .schedule-label { font-weight: 600; color: #495057; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                .schedule-value { color: #212529; font-size: 16px; margin-top: 5px; font-weight: 600; }
                .affected-services { background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .service-item { background: white; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid #ffc107; }
                .impact-level { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; margin-left: 10px; }
                .impact-high { background: #f8d7da; color: #721c24; }
                .impact-medium { background: #fff3cd; color: #856404; }
                .impact-low { background: #d4edda; color: #155724; }
                .preparation-tips { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .action-buttons { text-align: center; margin: 30px 0; }
                .btn { display: inline-block; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px; transition: all 0.3s ease; }
                .btn-secondary { background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3); }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; }
                .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
                @media (max-width: 600px) {
                  .btn { display: block; margin: 10px 0; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="icon">🔧</div>
                  <h1>Manutenção Programada</h1>
                </div>
                
                <div class="content">
                  <p class="greeting">Olá <strong>{{nome_usuario}}</strong>,</p>
                  
                  <div class="maintenance-alert">
                    <h3>⚠️ Manutenção Programada do Sistema</h3>
                    <p>Informamos que será realizada uma manutenção programada em nossos sistemas para melhorar a performance e implementar novas funcionalidades.</p>
                  </div>
                  
                  <div class="schedule-box">
                    <h4 style="margin: 0 0 15px 0; color: #495057;">📅 Cronograma da Manutenção</h4>
                    <div class="schedule-item">
                      <div class="schedule-label">Data de Início</div>
                      <div class="schedule-value">{{data_inicio}} às {{hora_inicio}}</div>
                    </div>
                    <div class="schedule-item">
                      <div class="schedule-label">Data de Término</div>
                      <div class="schedule-value">{{data_fim}} às {{hora_fim}}</div>
                    </div>
                    <div class="schedule-item">
                      <div class="schedule-label">Duração Estimada</div>
                      <div class="schedule-value">{{duracao_estimada}}</div>
                    </div>
                    <div class="schedule-item">
                      <div class="schedule-label">Tipo de Manutenção</div>
                      <div class="schedule-value">{{tipo_manutencao}}</div>
                    </div>
                  </div>
                  
                  {{#if servicos_afetados}}
                  <div class="affected-services">
                    <h4 style="margin: 0 0 15px 0; color: #495057;">🔧 Serviços Afetados</h4>
                    {{#each servicos_afetados}}
                    <div class="service-item">
                      <strong>{{this.nome}}</strong>
                      <span class="impact-level impact-{{this.impacto}}">{{this.nivel_impacto}}</span>
                      <div style="color: #6c757d; font-size: 14px; margin-top: 5px;">{{this.descricao}}</div>
                    </div>
                    {{/each}}
                  </div>
                  {{/if}}
                  
                  <div class="preparation-tips">
                    <h4 style="margin: 0 0 15px 0; color: #0c5460;">💡 Como se Preparar</h4>
                    <ul style="margin: 0; padding-left: 20px;">
                      <li>Finalize trabalhos importantes antes do início da manutenção</li>
                      <li>Salve todos os dados em aberto</li>
                      <li>Planeje atividades que não dependam do sistema durante o período</li>
                      {{#if backup_recomendado}}
                      <li>Faça backup de dados importantes se necessário</li>
                      {{/if}}
                    </ul>
                  </div>
                  
                  {{#if melhorias}}
                  <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <h4 style="margin: 0 0 15px 0; color: #155724;">🚀 Melhorias Incluídas</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #155724;">
                      {{#each melhorias}}
                      <li>{{this}}</li>
                      {{/each}}
                    </ul>
                  </div>
                  {{/if}}
                  
                  <div class="action-buttons">
                    <a href="{{link_status_sistema}}" class="btn btn-secondary">
                      📊 Status do Sistema
                    </a>
                  </div>
                  
                  <p style="color: #6c757d; text-align: center; margin-top: 20px;">
                    Acompanhe atualizações em tempo real: <strong>{{link_status_sistema}}</strong><br>
                    Dúvidas? Entre em contato: <strong>{{email_suporte}}</strong>
                  </p>
                </div>
                
                <div class="footer">
                  <p><strong>Sistema PGBen - Gestão de Benefícios</strong></p>
                  <p>Este é um e-mail automático. Para suporte: {{email_suporte}}</p>
                  <p>Data de envio: {{data_envio}}</p>
                </div>
              </div>
            </body>
            </html>
          `,
          canais_disponiveis: ['email', 'in_app'],
          variaveis_requeridas: JSON.stringify([
            'nome_usuario',
            'data_inicio',
            'hora_inicio',
            'data_fim',
            'hora_fim',
            'duracao_estimada',
            'tipo_manutencao',
            'servicos_afetados',
            'backup_recomendado',
            'melhorias',
            'link_status_sistema',
            'email_suporte',
            'data_envio',
          ]),
          ativo: true,
          categoria: 'sistema',
          prioridade: 'normal',
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
        'Seed de templates de notificação gerais do sistema concluído com sucesso.',
      );
    } catch (error) {
      console.error('Erro no SistemaNotificationTemplateSeed:', error);
      throw error;
    }
  }
}