import { DataSource } from 'typeorm';
import {
  NotificationTemplate,
  CanalNotificacao,
} from '../../../entities/notification-template.entity';

/**
 * Seed para templates de notificação do sistema
 *
 * Cria os templates essenciais para o funcionamento do sistema de notificações,
 * incluindo templates para credenciais de usuário, recuperação de senha, etc.
 */
export class NotificationTemplateSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('Iniciando seed de templates de notificação...');

    try {
      const templateRepository = dataSource.getRepository(NotificationTemplate);

      // Array com todos os templates a serem criados
      const templates = [
        {
          codigo: 'usuario-credenciais-acesso',
          nome: 'Credenciais de Acesso - Novo Usuário',
          tipo: 'sistema',
          descricao:
            'Template para envio de credenciais de acesso para novos usuários',
          assunto: 'Credenciais de Acesso - PGBen',
          corpo:
            'Credenciais de acesso criadas. Email: {{email}}, Senha: {{senha}}, Matrícula: {{matricula}}',
          corpo_html: `
            <h2>Credenciais de Acesso - Sistema PGBen</h2>
            <p>Olá <strong>{{nome}}</strong>,</p>
            <p>Suas credenciais de acesso ao Sistema PGBen foram criadas:</p>
            <ul>
              <li><strong>Email:</strong> {{email}}</li>
              <li><strong>Senha Temporária:</strong> {{senha}}</li>
              <li><strong>Matrícula:</strong> {{matricula}}</li>
            </ul>
            <p><a href="{{sistema_url}}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Acessar o Sistema</a></p>
            <p><em>⚠️ Por motivos de segurança, você será obrigado a alterar esta senha no seu primeiro acesso.</em></p>
            <p><small>Data de criação: {{data_criacao}}</small></p>
            <p><small>Suporte: {{supportEmail}}</small></p>
          `,
          canais_disponiveis: ['email'],
          variaveis_requeridas: JSON.stringify([
            'nome',
            'email',
            'senha',
            'matricula',
            'sistema_url',
            'data_criacao',
            'supportEmail',
          ]),
          ativo: true,
          categoria: 'autenticacao',
          prioridade: 'alta',
        },
        {
          codigo: 'reset-senha',
          nome: 'Recuperação de Senha',
          tipo: 'sistema',
          descricao: 'Template para envio de link de recuperação de senha',
          assunto: 'Recuperação de Senha - PGBen',
          corpo:
            'Link para redefinir senha: {{resetUrl}}. Expira em {{expiresInMinutes}} minutos.',
          corpo_html: `
            <h2>Recuperação de Senha - Sistema PGBen</h2>
            <p>Olá <strong>{{name}}</strong>,</p>
            <p>Recebemos uma solicitação para redefinir sua senha no Sistema de Gestão de Benefícios Eventuais da SEMTAS.</p>
            <p><a href="{{resetUrl}}" style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Senha</a></p>
            <p><strong>⏰ Este link expira em {{expiresInMinutes}} minutos ({{expiresAt}}).</strong></p>
            <p>Se você não solicitou esta alteração, ignore este email com segurança.</p>
            <p><small>Para suporte técnico: {{supportEmail}}</small></p>
          `,
          canais_disponiveis: ['email'],
          variaveis_requeridas: JSON.stringify([
            'name',
            'resetUrl',
            'expiresInMinutes',
            'expiresAt',
            'supportEmail',
          ]),
          ativo: true,
          categoria: 'autenticacao',
          prioridade: 'alta',
        },
        {
          codigo: 'alteracao-senha',
          nome: 'Confirmação de Alteração de Senha',
          tipo: 'sistema',
          descricao: 'Template de confirmação após alteração de senha',
          assunto: 'Senha Alterada com Sucesso - PGBEN',
          corpo:
            'Sua senha foi alterada com sucesso em {{changedAt}} pelo IP {{ipAddress}}.',
          corpo_html: `
            <h2>✅ Senha Alterada com Sucesso!</h2>
            <p>Olá <strong>{{name}}</strong>,</p>
            <p>Sua senha foi redefinida com sucesso no Sistema de Gestão de Benefícios Eventuais da SEMTAS.</p>
            <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
              <p><strong>📅 Data e Hora:</strong> {{changedAt}}</p>
              <p><strong>🌐 IP de Origem:</strong> {{ipAddress}}</p>
              <p><strong>🖥️ Navegador:</strong> {{userAgent}}</p>
            </div>
            <p>Agora você pode fazer login no sistema usando sua nova senha.</p>
            <p><a href="{{loginUrl}}" style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Fazer Login</a></p>
            <p><strong>🔒 Se você não fez esta alteração, entre em contato conosco imediatamente.</strong></p>
            <p><small>Para suporte técnico: {{supportEmail}}</small></p>
          `,
          canais_disponiveis: ['email'],
          variaveis_requeridas: JSON.stringify([
            'name',
            'changedAt',
            'ipAddress',
            'userAgent',
            'loginUrl',
            'supportEmail',
          ]),
          ativo: true,
          categoria: 'seguranca',
          prioridade: 'normal',
        },
        {
          codigo: 'atividade-suspeita',
          nome: 'Notificação de Atividade Suspeita',
          tipo: 'sistema',
          descricao:
            'Template para notificação de atividades suspeitas na conta',
          assunto: '⚠️ Atividade Suspeita Detectada - PGBen',
          corpo:
            'Atividade suspeita detectada: {{activityType}} em {{detectedAt}} do IP {{ipAddress}}.',
          corpo_html: `
            <h2>🚨 Atividade Suspeita Detectada</h2>
            <p>Olá <strong>{{name}}</strong>,</p>
            <p>Detectamos uma atividade suspeita em sua conta no Sistema de Gestão de Benefícios Eventuais da SEMTAS.</p>
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 20px; margin: 20px 0;">
              <p><strong>Tipo de Atividade:</strong> {{activityType}}</p>
              <p><strong>Severidade:</strong> {{severity}}</p>
              <p><strong>Data e Hora:</strong> {{detectedAt}}</p>
              <p><strong>IP de Origem:</strong> {{ipAddress}}</p>
              <p><strong>Localização:</strong> {{location}}</p>
              <p><strong>Navegador:</strong> {{userAgent}}</p>
              <p><strong>Ação Realizada:</strong> {{action}}</p>
              {{#if description}}<p><strong>Descrição:</strong> {{description}}</p>{{/if}}
            </div>
            <p><strong>Se foi você:</strong> Não é necessário tomar nenhuma ação.</p>
            <p><strong>Se não foi você:</strong> Sua conta pode ter sido comprometida. Tome as medidas abaixo:</p>
            <p>
              <a href="{{changePasswordUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Alterar Senha</a>
              <a href="{{reviewActivityUrl}}" style="background-color: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Revisar Atividade</a>
            </p>
            <p><small>Para suporte técnico urgente: {{supportEmail}}</small></p>
          `,
          canais_disponiveis: ['email'],
          variaveis_requeridas: JSON.stringify([
            'name',
            'activityType',
            'severity',
            'detectedAt',
            'ipAddress',
            'location',
            'userAgent',
            'action',
            'description',
            'changePasswordUrl',
            'reviewActivityUrl',
            'supportEmail',
          ]),
          ativo: true,
          categoria: 'seguranca',
          prioridade: 'critica',
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

      console.log('Seed de templates de notificação concluído com sucesso.');
    } catch (error) {
      console.error('Erro no NotificationTemplateSeed:', error);
      throw error;
    }
  }
}
