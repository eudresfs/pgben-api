import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplateValidationService } from '../template-validation.service';
import { NotificationTemplate } from '../../../../entities/notification-template.entity';
import { BaseNotificationContext, NotificationType, NotificationPriority, NotificationChannel } from '../../interfaces/base-notification.interface';

describe('TemplateValidationService', () => {
  let service: TemplateValidationService;
  let mockRepository: jest.Mocked<Repository<NotificationTemplate>>;

  const contextoValido: BaseNotificationContext = {
    destinatario_id: 'user123',
    tipo: NotificationType.PAGAMENTO,
    prioridade: NotificationPriority.MEDIA,
    titulo: 'Pagamento Aprovado',
    conteudo: 'Seu pagamento foi aprovado com sucesso',
    url: '/pagamentos/123',
    template_email: 'pagamento-aprovado',
    canais: [NotificationChannel.EMAIL],
    dados_contexto: {
      nome_usuario: 'João',
      valor_pagamento: 'R$ 100,00'
    },
    metadata: {
      origem: 'sistema-pagamento'
    }
  };

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateValidationService,
        {
          provide: getRepositoryToken(NotificationTemplate),
          useValue: mockRepository
        }
      ]
    }).compile();

    service = module.get<TemplateValidationService>(TemplateValidationService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('validarTemplate', () => {
    const contextoValido: BaseNotificationContext = {
      destinatario_id: 'user123',
      tipo: NotificationType.PAGAMENTO,
      prioridade: NotificationPriority.ALTA,
      titulo: 'Pagamento Aprovado',
      conteudo: 'Seu pagamento foi aprovado com sucesso',
      url: '/pagamentos/123',
      template_email: 'pagamento-aprovado',
      dados_contexto: { valor: 100.50 },
      canais: [NotificationChannel.EMAIL],
      metadata: { origem: 'api' }
    };

    it('deve validar template com sucesso quando template existe e está ativo', async () => {
      // Arrange
      const templateMock: NotificationTemplate = {
        id: '1',
        codigo: 'PAGAMENTO_APROVADO',
        nome: 'pagamento-aprovado',
        tipo: 'sistema',
        descricao: 'Template para pagamento aprovado',
        assunto: 'Pagamento Aprovado',
        corpo: 'Template content',
        corpo_html: '<p>Template content</p>',
        canais_disponiveis: ['email'],
        variaveis_requeridas: '[]',
        ativo: true,
        categoria: 'pagamento',
        prioridade: 'normal',
        criado_por: null,
        atualizado_por: null,
        created_at: new Date(),
        updated_at: new Date()
      };
      mockRepository.findOne.mockResolvedValue(templateMock);

      // Act
      const resultado = await service.validarTemplate(contextoValido);

      // Assert
      expect(resultado.valido).toBe(true);
      expect(resultado.existe).toBe(true);
      expect(resultado.ativo).toBe(true);
      expect(resultado.erros).toHaveLength(0);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { nome: 'pagamento-aprovado' }
      });
    });

    it('deve falhar quando template_email não é fornecido e canal EMAIL está especificado', async () => {
      // Arrange
      const contextoSemTemplate = {
        ...contextoValido,
        template_email: undefined
      };

      // Act
      const resultado = await service.validarTemplate(contextoSemTemplate);

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.existe).toBe(false);
      expect(resultado.ativo).toBe(false);
      expect(resultado.erros).toContain('Template de e-mail é obrigatório quando canal EMAIL está especificado');
    });

    it('deve falhar quando template não é encontrado no banco', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const resultado = await service.validarTemplate(contextoValido);

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.existe).toBe(false);
      expect(resultado.ativo).toBe(false);
      expect(resultado.erros).toContain("Template 'pagamento-aprovado' não encontrado no sistema");
    });

    it('deve falhar quando template existe mas está inativo', async () => {
      // Arrange
      const templateInativo: NotificationTemplate = {
        id: '1',
        codigo: 'PAGAMENTO_APROVADO',
        nome: 'pagamento-aprovado',
        tipo: 'sistema',
        descricao: 'Template para pagamento aprovado',
        assunto: 'Pagamento Aprovado',
        corpo: 'Template content',
        corpo_html: '<p>Template content</p>',
        canais_disponiveis: ['email'],
        variaveis_requeridas: '[]',
        ativo: false,
        categoria: 'pagamento',
        prioridade: 'normal',
        criado_por: null,
        atualizado_por: null,
        created_at: new Date(),
        updated_at: new Date()
      };
      mockRepository.findOne.mockResolvedValue(templateInativo);

      // Act
      const resultado = await service.validarTemplate(contextoValido);

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.existe).toBe(true);
      expect(resultado.ativo).toBe(false);
      expect(resultado.erros).toContain("Template 'pagamento-aprovado' está inativo");
    });

    it('deve validar com sucesso quando canal EMAIL não está especificado', async () => {
      // Arrange
      const contextoSemEmail = {
        ...contextoValido,
        canais: [NotificationChannel.IN_APP],
        template_email: undefined
      };

      // Act
      const resultado = await service.validarTemplate(contextoSemEmail);

      // Assert
      expect(resultado.valido).toBe(true);
      expect(resultado.existe).toBe(true);
      expect(resultado.ativo).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('deve lidar com erros durante busca no banco', async () => {
      // Arrange
      mockRepository.findOne.mockRejectedValue(new Error('Erro de conexão'));

      // Act
      const resultado = await service.validarTemplate(contextoValido);

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.existe).toBe(false);
      expect(resultado.ativo).toBe(false);
      expect(resultado.erros).toContain('Erro interno durante validação: Erro de conexão');
    });

  });

  describe('validarTemplatesLote', () => {
    it('deve validar múltiplos templates em lote', async () => {
      // Arrange
      const contextos = [contextoValido, { ...contextoValido, destinatario_id: 'user456' }];
      const templateMock: NotificationTemplate = {
        id: '1',
        codigo: 'PAGAMENTO_APROVADO',
        nome: 'pagamento-aprovado',
        tipo: 'sistema',
        descricao: 'Template para pagamento aprovado',
        assunto: 'Pagamento Aprovado',
        corpo: 'Template content',
        corpo_html: '<p>Template content</p>',
        canais_disponiveis: ['email'],
        variaveis_requeridas: '[]',
        ativo: true,
        categoria: 'pagamento',
        prioridade: 'normal',
        criado_por: null,
        atualizado_por: null,
        created_at: new Date(),
        updated_at: new Date()
      };
      mockRepository.findOne.mockResolvedValue(templateMock);

      // Act
      const resultados = await service.validarTemplatesLote(contextos);

      // Assert
      expect(resultados).toHaveLength(2);
      expect(resultados[0].valido).toBe(true);
      expect(resultados[1].valido).toBe(true);
    });
  });

  describe('listarTemplatesAtivos', () => {
    it('deve retornar lista de templates ativos', async () => {
      // Arrange
      const templatesAtivos: NotificationTemplate[] = [
        {
          id: '1',
          codigo: 'PAGAMENTO_APROVADO',
          nome: 'pagamento-aprovado',
          tipo: 'sistema',
          descricao: 'Template para pagamento aprovado',
          assunto: 'Pagamento Aprovado',
          corpo: 'Content 1',
          corpo_html: '<p>Content 1</p>',
          canais_disponiveis: ['email'],
          variaveis_requeridas: '[]',
          ativo: true,
          categoria: 'pagamento',
          prioridade: 'normal',
          criado_por: null,
          atualizado_por: null,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '2',
          codigo: 'PAGAMENTO_REJEITADO',
          nome: 'pagamento-rejeitado',
          tipo: 'sistema',
          descricao: 'Template para pagamento rejeitado',
          assunto: 'Pagamento Rejeitado',
          corpo: 'Content 2',
          corpo_html: '<p>Content 2</p>',
          canais_disponiveis: ['email'],
          variaveis_requeridas: '[]',
          ativo: true,
          categoria: 'pagamento',
          prioridade: 'normal',
          criado_por: null,
          atualizado_por: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      mockRepository.find.mockResolvedValue(templatesAtivos);

      // Act
      const templates = await service.listarTemplatesAtivos();

      // Assert
      expect(templates).toHaveLength(2);
      expect(templates[0].nome).toBe('pagamento-aprovado');
      expect(templates[1].nome).toBe('pagamento-rejeitado');
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { ativo: true },
        order: { nome: 'ASC' }
      });
    });

    it('deve lidar com erros ao listar templates', async () => {
      // Arrange
      mockRepository.find.mockRejectedValue(new Error('Erro de banco'));

      // Act & Assert
      await expect(service.listarTemplatesAtivos()).rejects.toThrow('Erro de banco');
    });
  });

  describe('templateExisteEAtivo', () => {
    it('deve retornar true quando template existe e está ativo', async () => {
      // Arrange
      const templateAtivo: NotificationTemplate = {
        id: '1',
        codigo: 'PAGAMENTO_APROVADO',
        nome: 'pagamento-aprovado',
        tipo: 'sistema',
        descricao: 'Template para pagamento aprovado',
        assunto: 'Pagamento Aprovado',
        corpo: 'Template content',
        corpo_html: '<p>Template content</p>',
        canais_disponiveis: ['email'],
        variaveis_requeridas: '[]',
        ativo: true,
        categoria: 'pagamento',
        prioridade: 'normal',
        criado_por: null,
        atualizado_por: null,
        created_at: new Date(),
        updated_at: new Date()
      };
      mockRepository.findOne.mockResolvedValue(templateAtivo);

      // Act
      const existe = await service.templateExisteEAtivo('pagamento-aprovado');

      // Assert
      expect(existe).toBe(true);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { nome: 'pagamento-aprovado', ativo: true }
      });
    });

    it('deve retornar false quando template não existe', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const existe = await service.templateExisteEAtivo('template-inexistente');

      // Assert
      expect(existe).toBe(false);
    });

    it('deve retornar false quando ocorre erro na consulta', async () => {
      // Arrange
      mockRepository.findOne.mockRejectedValue(new Error('Erro de banco'));

      // Act
      const existe = await service.templateExisteEAtivo('pagamento-aprovado');

      // Assert
      expect(existe).toBe(false);
    });
  });
});