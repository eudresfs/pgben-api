import { DataSource } from 'typeorm';
import { NotificationTemplate, CanalNotificacao } from '../../../modules/notificacao/entities/notification-template.entity';

/**
 * Seed para templates de notificação do sistema
 * 
 * Cria os templates essenciais para o funcionamento do sistema de notificações,
 * incluindo templates para credenciais de usuário, recuperação de senha, etc.
 */
export class NotificationTemplateSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const templateRepository = dataSource.getRepository(NotificationTemplate);
    
    console.log('Iniciando seed de templates de notificação...');

    const templates = [
      {
        codigo: 'usuario-credenciais-acesso',
        nome: 'Credenciais de Acesso - Novo Usuário',
        descricao: 'Template para envio de credenciais de acesso para usuários recém-criados',
        assunto: 'Credenciais de Acesso - SEMTAS',
        tipo: 'email',
        template_path: 'usuario-credenciais-acesso',
        variaveis_contexto: {
          nome: 'Nome do usuário',
          email: 'Email do usuário',
          senha: 'Senha temporária gerada',
          matricula: 'Matrícula do usuário',
          sistema_url: 'URL do sistema',
          data_criacao: 'Data de criação da conta',
          supportEmail: 'Email de suporte técnico',
          year: 'Ano atual'
        },
        ativo: true,
        versao: '1.0.0',
        criado_por: 'system',
        atualizado_por: 'system'
      },
      {
        codigo: 'password-reset',
        nome: 'Recuperação de Senha',
        descricao: 'Template para envio de link de recuperação de senha',
        assunto: 'Recuperação de Senha - SEMTAS',
        tipo: 'email',
        template_path: 'password-reset',
        variaveis_contexto: {
          name: 'Nome do usuário',
          resetUrl: 'URL para redefinição de senha',
          expiresAt: 'Data e hora de expiração do token',
          expiresInMinutes: 'Tempo em minutos até a expiração',
          supportEmail: 'Email de suporte técnico',
          year: 'Ano atual'
        },
        ativo: true,
        versao: '1.0.0',
        criado_por: 'system',
        atualizado_por: 'system'
      },
      {
        codigo: 'password-reset-confirmation',
        nome: 'Confirmação de Alteração de Senha',
        descricao: 'Template para confirmação de alteração de senha realizada com sucesso',
        assunto: 'Senha Alterada com Sucesso - SEMTAS',
        tipo: 'email',
        template_path: 'password-reset-confirmation',
        variaveis_contexto: {
          name: 'Nome do usuário',
          changedAt: 'Data e hora da alteração',
          ipAddress: 'Endereço IP da alteração',
          supportEmail: 'Email de suporte técnico',
          year: 'Ano atual'
        },
        ativo: true,
        versao: '1.0.0',
        criado_por: 'system',
        atualizado_por: 'system'
      },
      {
        codigo: 'suspicious-activity',
        nome: 'Atividade Suspeita Detectada',
        descricao: 'Template para notificação de atividade suspeita na conta',
        assunto: 'Atividade Suspeita Detectada - SEMTAS',
        tipo: 'email',
        template_path: 'suspicious-activity',
        variaveis_contexto: {
          name: 'Nome do usuário',
          activityType: 'Tipo de atividade suspeita',
          detectedAt: 'Data e hora da detecção',
          ipAddress: 'Endereço IP da atividade',
          location: 'Localização estimada',
          supportEmail: 'Email de suporte técnico',
          year: 'Ano atual'
        },
        ativo: true,
        versao: '1.0.0',
        criado_por: 'system',
        atualizado_por: 'system'
      }
    ];

    for (const templateData of templates) {
      try {
        // Verificar se o template já existe pelo nome
        const existingTemplate = await templateRepository.findOne({
          where: { nome: templateData.nome }
        });

        if (existingTemplate) {
            // Atualizar template existente
            await templateRepository.update(existingTemplate.id, {
              descricao: templateData.descricao,
              assunto: templateData.assunto,
              template_conteudo: '',
              canais_suportados: [CanalNotificacao.EMAIL],
              ativo: templateData.ativo
            });
            console.log(`Template ${templateData.nome} atualizado com sucesso`);
          } else {
            // Criar novo template
            const newTemplate = templateRepository.create({
              nome: templateData.nome,
              descricao: templateData.descricao,
              assunto: templateData.assunto,
              template_conteudo: '',
              canais_suportados: [CanalNotificacao.EMAIL],
              ativo: templateData.ativo
            });
            await templateRepository.save(newTemplate);
            console.log(`Template ${templateData.nome} criado com sucesso`);
          }
      } catch (error) {
        console.error(`Erro ao processar template ${templateData.nome}:`, error);
        throw error;
      }
    }

    console.log('Seed de templates de notificação concluído com sucesso!');
  }
}