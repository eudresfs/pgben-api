import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { NotificacaoPreferenciasService, CanalNotificacao, FrequenciaAgrupamento } from '../services/notificacao-preferencias.service';
import { NotificacaoService } from '../services/notificacao.service';
import { NotificacaoSistema, TipoNotificacao } from '../../../entities/notification.entity';
import { Usuario } from '../../../entities/usuario.entity';

describe('NotificacaoPreferenciasService', () => {
  let service: NotificacaoPreferenciasService;
  let notificacaoService: jest.Mocked<NotificacaoService>;
  let notificacaoRepository: jest.Mocked<Repository<NotificacaoSistema>>;
  let usuarioRepository: jest.Mocked<Repository<Usuario>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;

  const mockNotificacaoService = {
    criar: jest.fn(),
    criarEBroadcast: jest.fn(),
  };

  const mockNotificacaoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUsuarioRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const usuarioIdTeste = 'user-123';
  const preferenciasDefault = {
    ativo: true,
    idioma: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    tipos: [
      {
        tipo: TipoNotificacao.SISTEMA,
        ativo: true,
        canais: [CanalNotificacao.SSE, CanalNotificacao.EMAIL],
        prioridade_minima: 'low' as const,
        horario_silencioso: {
          ativo: false,
          inicio: '22:00',
          fim: '08:00',
        },
        agrupamento: {
          ativo: false,
          frequencia: FrequenciaAgrupamento.IMEDIATO,
          maximo_por_grupo: 5,
        },
      },
    ],
    configuracoes_globais: {
      pausar_todas: false,
      pausar_ate: null,
      limite_diario: 50,
      som_ativo: true,
      vibrar_ativo: true,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacaoPreferenciasService,
        {
          provide: NotificacaoService,
          useValue: mockNotificacaoService,
        },
        {
          provide: getRepositoryToken(NotificacaoSistema),
          useValue: mockNotificacaoRepository,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockUsuarioRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotificacaoPreferenciasService>(NotificacaoPreferenciasService);
    notificacaoService = module.get(NotificacaoService);
    notificacaoRepository = module.get(getRepositoryToken(NotificacaoSistema));
    usuarioRepository = module.get(getRepositoryToken(Usuario));
    eventEmitter = module.get(EventEmitter2);
    configService = module.get(ConfigService);

    // Configurar valores padrão
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        'NOTIFICACAO_CACHE_TTL': '300000', // 5 minutos
        'NOTIFICACAO_LIMITE_DIARIO_DEFAULT': '50',
      };
      return config[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.limparCache(); // Limpar cache entre testes
  });

  describe('Definição do serviço', () => {
    it('deve estar definido', () => {
      expect(service).toBeDefined();
    });
  });

  describe('obterPreferencias', () => {
    it('deve retornar preferências existentes do usuário', async () => {
      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: preferenciasDefault,
      };

      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);

      const resultado = await service.obterPreferencias(usuarioIdTeste);

      expect(resultado).toEqual(preferenciasDefault);
      expect(mockUsuarioRepository.findOne).toHaveBeenCalledWith({
        where: { id: usuarioIdTeste },
        select: ['id', 'notificacao_preferencias'],
      });
    });

    it('deve retornar preferências padrão para usuário sem configuração', async () => {
      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: null,
      };

      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);

      const resultado = await service.obterPreferencias(usuarioIdTeste);

      expect(resultado.ativo).toBe(true);
      expect(resultado.idioma).toBe('pt-BR');
      expect(resultado.tipos).toHaveLength(6); // Todos os tipos de notificação
    });

    it('deve usar cache para requisições subsequentes', async () => {
      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: preferenciasDefault,
      };

      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);

      // Primeira chamada
      await service.obterPreferencias(usuarioIdTeste);
      // Segunda chamada
      await service.obterPreferencias(usuarioIdTeste);

      // Deve ter consultado o banco apenas uma vez
      expect(mockUsuarioRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('atualizarPreferencias', () => {
    it('deve atualizar preferências do usuário', async () => {
      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: preferenciasDefault,
      };

      const novasPreferencias = {
        ativo: false,
        limite_diario: 20,
      };

      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);
      mockUsuarioRepository.save.mockResolvedValue(usuario as any);

      const resultado = await service.atualizarPreferencias(
        usuarioIdTeste,
        novasPreferencias,
      );

      expect(resultado.ativo).toBe(false);
      expect(mockUsuarioRepository.save).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'notificacao.preferencias.atualizadas',
        expect.objectContaining({
          usuarioId: usuarioIdTeste,
        }),
      );
    });

    it('deve criar preferências para usuário sem configuração', async () => {
      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: null,
      };

      const novasPreferencias = {
        idioma: 'en-US',
      };

      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);
      mockUsuarioRepository.save.mockResolvedValue(usuario as any);

      const resultado = await service.atualizarPreferencias(
        usuarioIdTeste,
        novasPreferencias,
      );

      expect(resultado.idioma).toBe('en-US');
      expect(mockUsuarioRepository.save).toHaveBeenCalled();
    });
  });

  describe('deveEnviarNotificacao', () => {
    beforeEach(() => {
      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: preferenciasDefault,
      };
      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);
    });

    it('deve permitir envio quando todas as condições são atendidas', async () => {
      const resultado = await service.deveEnviarNotificacao(
        usuarioIdTeste,
        TipoNotificacao.SISTEMA,
        'medium',
        CanalNotificacao.SSE,
      );

      expect(resultado).toBe(true);
    });

    it('deve bloquear envio quando notificações estão pausadas', async () => {
      const preferenciasPausadas = {
        ...preferenciasDefault,
        configuracoes_globais: {
          ...preferenciasDefault.configuracoes_globais,
          pausar_todas: true,
        },
      };

      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: preferenciasPausadas,
      };
      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);

      const resultado = await service.deveEnviarNotificacao(
        usuarioIdTeste,
        TipoNotificacao.SISTEMA,
        'medium',
        CanalNotificacao.SSE,
      );

      expect(resultado).toBe(false);
    });

    it('deve bloquear envio durante horário silencioso', async () => {
      const preferenciasSilencioso = {
        ...preferenciasDefault,
        tipos: [
          {
            ...preferenciasDefault.tipos[0],
            horario_silencioso: {
              ativo: true,
              inicio: '22:00',
              fim: '08:00',
            },
          },
        ],
      };

      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: preferenciasSilencioso,
      };
      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);

      // Mock da hora atual para estar no horário silencioso (23:00)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);

      const resultado = await service.deveEnviarNotificacao(
        usuarioIdTeste,
        TipoNotificacao.SISTEMA,
        'medium',
        CanalNotificacao.SSE,
      );

      expect(resultado).toBe(false);
    });

    it('deve permitir envio de notificações urgentes mesmo durante horário silencioso', async () => {
      const preferenciasSilencioso = {
        ...preferenciasDefault,
        tipos: [
          {
            ...preferenciasDefault.tipos[0],
            horario_silencioso: {
              ativo: true,
              inicio: '22:00',
              fim: '08:00',
            },
          },
        ],
      };

      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: preferenciasSilencioso,
      };
      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);

      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);

      const resultado = await service.deveEnviarNotificacao(
        usuarioIdTeste,
        TipoNotificacao.ALERTA,
        'high', // Prioridade alta
        CanalNotificacao.SSE,
      );

      expect(resultado).toBe(true);
    });

    it('deve verificar limite diário de notificações', async () => {
      const preferencasLimitadas = {
        ...preferenciasDefault,
        configuracoes_globais: {
          ...preferenciasDefault.configuracoes_globais,
          limite_diario: 1,
        },
      };

      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: preferencasLimitadas,
      };
      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);

      // Mock para simular que já foi enviada 1 notificação hoje
      mockNotificacaoRepository.count.mockResolvedValue(1);

      const resultado = await service.deveEnviarNotificacao(
        usuarioIdTeste,
        TipoNotificacao.SISTEMA,
        'medium',
        CanalNotificacao.SSE,
      );

      expect(resultado).toBe(false);
    });
  });

  describe('pausarNotificacoes', () => {
    it('deve pausar notificações por período determinado', async () => {
      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: preferenciasDefault,
      };

      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);
      mockUsuarioRepository.save.mockResolvedValue(usuario as any);

      const duracaoMinutos = 60;
      await service.pausarNotificacoes(usuarioIdTeste, duracaoMinutos);

      expect(mockUsuarioRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          notificacao_preferencias: expect.objectContaining({
            configuracoes_globais: expect.objectContaining({
              pausar_todas: true,
              pausar_ate: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('reativarNotificacoes', () => {
    it('deve reativar notificações pausadas', async () => {
      const preferenciasPausadas = {
        ...preferenciasDefault,
        configuracoes_globais: {
          ...preferenciasDefault.configuracoes_globais,
          pausar_todas: true,
          pausar_ate: new Date(Date.now() + 60000),
        },
      };

      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: preferenciasPausadas,
      };

      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);
      mockUsuarioRepository.save.mockResolvedValue(usuario as any);

      await service.reativarNotificacoes(usuarioIdTeste);

      expect(mockUsuarioRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          notificacao_preferencias: expect.objectContaining({
            configuracoes_globais: expect.objectContaining({
              pausar_todas: false,
              pausar_ate: null,
            }),
          }),
        }),
      );
    });
  });

  describe('Agrupamento de notificações', () => {
    describe('deveAgruparNotificacao', () => {
      it('deve retornar true quando agrupamento está ativo', async () => {
        const preferencasAgrupamento = {
          ...preferenciasDefault,
          tipos: [
            {
              ...preferenciasDefault.tipos[0],
              agrupamento: {
                ativo: true,
                frequencia: FrequenciaAgrupamento.CADA_30_MIN,
                maximo_por_grupo: 5,
              },
            },
          ],
        };

        const usuario = {
          id: usuarioIdTeste,
          notificacao_preferencias: preferencasAgrupamento,
        };
        mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);

        const resultado = await service.deveAgruparNotificacao(
          usuarioIdTeste,
          TipoNotificacao.SISTEMA,
        );

        expect(resultado).toBe(true);
      });

      it('deve retornar false quando agrupamento está desativo', async () => {
        const usuario = {
          id: usuarioIdTeste,
          notificacao_preferencias: preferenciasDefault,
        };
        mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);

        const resultado = await service.deveAgruparNotificacao(
          usuarioIdTeste,
          TipoNotificacao.SISTEMA,
        );

        expect(resultado).toBe(false);
      });
    });

    describe('adicionarAoGrupo', () => {
      it('deve adicionar notificação ao grupo', async () => {
        const dadosNotificacao = {
          titulo: 'Teste',
          mensagem: 'Mensagem de teste',
          prioridade: 'medium' as const,
          contexto: { teste: true },
          timestamp: new Date(),
        };

        await service.adicionarAoGrupo(
          usuarioIdTeste,
          TipoNotificacao.SISTEMA,
          dadosNotificacao,
        );

        // Verificar se foi adicionado ao grupo interno
        const estatisticas = await service.obterEstatisticasAgrupamento();
        expect(estatisticas.gruposAtivos).toBeGreaterThan(0);
      });
    });

    describe('processarGruposPorFrequencia', () => {
      it('deve processar grupos da frequência especificada', async () => {
        // Adicionar algumas notificações ao grupo
        const dadosNotificacao = {
          titulo: 'Teste',
          mensagem: 'Mensagem de teste',
          prioridade: 'medium' as const,
          contexto: { teste: true },
          timestamp: new Date(),
        };

        await service.adicionarAoGrupo(
          usuarioIdTeste,
          TipoNotificacao.SISTEMA,
          dadosNotificacao,
        );

        mockNotificacaoService.criarEBroadcast.mockResolvedValue({} as any);

        const resultado = await service.processarGruposPorFrequencia(
          FrequenciaAgrupamento.CADA_15_MIN,
        );

        expect(resultado.gruposProcessados).toBeGreaterThanOrEqual(0);
        expect(resultado.notificacoesEnviadas).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Cache', () => {
    it('deve limpar cache específico do usuário', async () => {
      // Carregar preferências no cache
      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: preferenciasDefault,
      };
      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);
      
      await service.obterPreferencias(usuarioIdTeste);
      
      // Limpar cache do usuário
      service.limparCacheUsuario(usuarioIdTeste);
      
      // Próxima chamada deve consultar o banco novamente
      await service.obterPreferencias(usuarioIdTeste);
      
      expect(mockUsuarioRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('deve limpar todo o cache', () => {
      service.limparCache();
      // Não há como verificar diretamente, mas não deve gerar erro
      expect(true).toBe(true);
    });
  });

  describe('Métodos auxiliares', () => {
    describe('isHorarioSilencioso', () => {
      it('deve identificar horário silencioso corretamente', () => {
        const configuracao = {
          ativo: true,
          inicio: '22:00',
          fim: '08:00',
        };

        // Teste durante horário silencioso (23:00)
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);
        jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);
        
        const resultado = (service as any).isHorarioSilencioso(configuracao);
        expect(resultado).toBe(true);
      });

      it('deve identificar horário normal corretamente', () => {
        const configuracao = {
          ativo: true,
          inicio: '22:00',
          fim: '08:00',
        };

        // Teste durante horário normal (14:00)
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
        jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);
        
        const resultado = (service as any).isHorarioSilencioso(configuracao);
        expect(resultado).toBe(false);
      });
    });

    describe('gerarChaveGrupo', () => {
      it('deve gerar chave única para grupo', () => {
        const chave = (service as any).gerarChaveGrupo(
          usuarioIdTeste,
          TipoNotificacao.SISTEMA,
          FrequenciaAgrupamento.CADA_30_MIN,
        );

        expect(chave).toContain(usuarioIdTeste);
        expect(chave).toContain(TipoNotificacao.SISTEMA);
        expect(chave).toContain(FrequenciaAgrupamento.CADA_30_MIN);
      });
    });
  });

  describe('Tratamento de erros', () => {
    it('deve lidar com erro ao buscar usuário', async () => {
      mockUsuarioRepository.findOne.mockRejectedValue(new Error('Usuário não encontrado'));

      await expect(service.obterPreferencias(usuarioIdTeste)).rejects.toThrow(
        'Usuário não encontrado',
      );
    });

    it('deve lidar com erro ao salvar preferências', async () => {
      const usuario = {
        id: usuarioIdTeste,
        notificacao_preferencias: preferenciasDefault,
      };

      mockUsuarioRepository.findOne.mockResolvedValue(usuario as any);
      mockUsuarioRepository.save.mockRejectedValue(new Error('Erro ao salvar'));

      await expect(
        service.atualizarPreferencias(usuarioIdTeste, { ativo: false }),
      ).rejects.toThrow('Erro ao salvar');
    });
  });
});