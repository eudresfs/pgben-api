import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AprovacaoNotificationService, AprovacaoNotificationContext } from '../aprovacao-notification.service';
import { NotificacaoSistema } from '../../../../entities/notification.entity';
import { NotificationManagerService } from '../../../notificacao/services/notification-manager.service';
import { AprovacaoTemplateMappingService } from '../aprovacao-template-mapping.service';

describe('AprovacaoNotificationService', () => {
  let service: AprovacaoNotificationService;
  let mockRepository: jest.Mocked<Repository<NotificacaoSistema>>;
  let mockNotificationManager: jest.Mocked<NotificationManagerService>;
  let mockTemplateMapping: jest.Mocked<AprovacaoTemplateMappingService>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const mockRepositoryValue = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockNotificationManagerValue = {
      criarNotificacao: jest.fn(),
    };

    const mockTemplateMappingValue = {
      temTemplateMapeado: jest.fn(),
      prepararDadosTemplate: jest.fn(),
    };

    const mockEventEmitterValue = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AprovacaoNotificationService,
        {
          provide: getRepositoryToken(NotificacaoSistema),
          useValue: mockRepositoryValue,
        },
        {
          provide: NotificationManagerService,
          useValue: mockNotificationManagerValue,
        },
        {
          provide: AprovacaoTemplateMappingService,
          useValue: mockTemplateMappingValue,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitterValue,
        },
      ],
    }).compile();

    service = module.get<AprovacaoNotificationService>(AprovacaoNotificationService);
    mockRepository = module.get(getRepositoryToken(NotificacaoSistema));
    mockNotificationManager = module.get(NotificationManagerService);
    mockTemplateMapping = module.get(AprovacaoTemplateMappingService);
    mockEventEmitter = module.get(EventEmitter2);
  });

  describe('criarNotificacaoAprovacao', () => {
    it('deve mapear corretamente as variáveis do contexto para os templates', async () => {
      // Arrange
      const context: AprovacaoNotificationContext = {
        solicitacao_id: 'sol-123',
        codigo_solicitacao: 'SOL-2024-001',
        tipo_acao: 'CRIAR_USUARIO',
        status_anterior: 'PENDENTE',
        novo_status: 'aprovada',
        aprovador_id: 'aprovador-1',
        solicitante_id: 'solicitante-1',
        solicitante_nome: 'João Silva',
        aprovador_nome: 'Maria Santos',
        justificativa: 'Usuário necessário para o projeto',
        dados_acao: { nome_usuario: 'joao.silva' },
        timestamp: new Date('2024-01-15T10:00:00Z'),
        metadados_adicionais: {
          solicitante_email: 'joao@empresa.com',
          aprovador_email: 'maria@empresa.com',
          observacoes: 'Aprovado conforme política',
          tipo_notificacao: 'aprovacao_pendente'
        }
      };

      const config = {
        tipo: 'APROVACAO_PENDENTE' as any,
        prioridade: 'ALTA' as any,
        titulo: 'Solicitação Pendente',
        conteudo: 'Nova solicitação aguardando aprovação'
        // template_id não fornecido para testar busca automática
      };

      const mockNotificacao = {
        id: 'notif-123',
        titulo: config.titulo,
        conteudo: config.conteudo,
        dados_contexto: expect.any(Object)
      };

      mockTemplateMapping.temTemplateMapeado.mockReturnValue(true);
      mockTemplateMapping.prepararDadosTemplate.mockResolvedValue({
        template_id: 'solicitacao-aprovacao-pendente',
        templateEncontrado: true,
        codigoTemplate: 'solicitacao-aprovacao-pendente'
      });
      mockNotificationManager.criarNotificacao.mockResolvedValue(mockNotificacao as any);

      // Act
      const result = await service.criarNotificacaoAprovacao(
        'aprovador-1',
        config,
        context
      );

      // Assert - Verificar se a notificação foi criada com os dados corretos
      expect(mockNotificationManager.criarNotificacao).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'aprovador-1',
          type: 'APROVACAO_PENDENTE',
          template_id: 'solicitacao-aprovacao-pendente',
          dados_contexto: expect.objectContaining({
            // Variáveis essenciais mapeadas corretamente
            aprovador_nome: 'Maria Santos',
            solicitante_nome: 'João Silva',
            codigo_solicitacao: 'SOL-2024-001',
            justificativa: 'Usuário necessário para o projeto',
            acao_nome: 'CRIAR_USUARIO',
            status: 'aprovada'
          })
        })
      );
      
      // Verificar se o template foi usado corretamente
       expect(mockTemplateMapping.temTemplateMapeado).toHaveBeenCalledWith('APROVACAO_PENDENTE');

      expect(result).toBeDefined();
      expect(result.id).toBe('notif-123');
    });

    it('deve usar valores padrão quando propriedades opcionais não estão presentes', async () => {
      // Arrange
      const context: AprovacaoNotificationContext = {
        solicitacao_id: 'sol-123',
        codigo_solicitacao: 'SOL-2024-001',
        tipo_acao: 'CRIAR_USUARIO',
        solicitante_id: 'solicitante-1',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        metadados_adicionais: {
          tipo_notificacao: 'aprovacao_pendente'
        }
      };

      const config = {
        tipo: 'APROVACAO_PENDENTE' as any,
        prioridade: 'ALTA' as any,
        titulo: 'Solicitação Pendente',
        conteudo: 'Nova solicitação aguardando aprovação'
        // template_id não fornecido para testar busca automática
      };

      const mockNotificacao = {
        id: 'notif-123',
        titulo: config.titulo,
        conteudo: config.conteudo,
        dados_contexto: expect.any(Object)
      };

      mockTemplateMapping.temTemplateMapeado.mockReturnValue(false);
      mockNotificationManager.criarNotificacao.mockResolvedValue(mockNotificacao as any);

      // Act
      await service.criarNotificacaoAprovacao(
        'aprovador-1',
        config,
        context
      );

      // Assert - Verificar se valores padrão são aplicados corretamente
      expect(mockNotificationManager.criarNotificacao).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'aprovador-1',
          type: 'APROVACAO_PENDENTE',
          dados_contexto: expect.objectContaining({
            // Verificar que valores padrão são aplicados quando dados estão ausentes
            justificativa: 'Não informada',
            valor_envolvido: 'N/A',
            prioridade: 'media',
            
            // Dados estruturados com valores padrão
            solicitante: expect.objectContaining({
              nome: 'N/A',
              email: 'N/A',
              id: 'solicitante-1'
            }),
            aprovador: expect.objectContaining({
              nome: 'N/A',
              email: 'N/A'
            })
          })
        })
      );
      
      // Verificar se o template foi verificado mesmo com dados incompletos
       expect(mockTemplateMapping.temTemplateMapeado).toHaveBeenCalledWith('APROVACAO_PENDENTE');
    });
  });
});