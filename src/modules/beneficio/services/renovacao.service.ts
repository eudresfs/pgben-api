import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { IRenovacaoService } from '../interfaces';
import { IniciarRenovacaoDto, ValidarRenovacaoDto, RenovacaoResponseDto, SolicitacaoComElegibilidadeDto } from '../dto/renovacao';
import { Solicitacao, Concessao, TipoBeneficio } from '@/entities';
import { TipoSolicitacaoEnum, StatusSolicitacao } from '@/enums';
import { RenovacaoValidationService } from './renovacao-validation.service';
import { DocumentoReutilizacaoService } from './documento-reutilizacao.service';
import { CacheService } from '@/shared/services/cache.service';

/**
 * Serviço principal para gerenciamento de renovações de benefícios
 * Coordena todo o processo de renovação conforme especificado no ADR
 * Implementa cache Redis para otimização de performance em consultas de elegibilidade
 */
@Injectable()
export class RenovacaoService implements IRenovacaoService {
  private readonly logger = new Logger(RenovacaoService.name);
  
  // Constantes para TTL do cache (em milissegundos)
  private readonly CACHE_TTL_ELEGIBILIDADE = 5 * 60 * 1000; // 5 minutos
  private readonly CACHE_TTL_SOLICITACOES = 10 * 60 * 1000; // 10 minutos

  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    @InjectRepository(Concessao)
    private readonly concessaoRepository: Repository<Concessao>,
    @InjectRepository(TipoBeneficio)
    private readonly tipoBeneficioRepository: Repository<TipoBeneficio>,
    private readonly renovacaoValidationService: RenovacaoValidationService,
    private readonly documentoReutilizacaoService: DocumentoReutilizacaoService,
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Inicia o processo de renovação de uma concessão
   * Valida elegibilidade e cria nova solicitação se aprovada
   */
  async iniciarRenovacao(dto: IniciarRenovacaoDto, usuarioId: string): Promise<Solicitacao> {
    this.logger.log(`Iniciando processo de renovação - Concessão: ${dto.concessaoId}, Usuário: ${usuarioId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validar elegibilidade para renovação
      const validacao = await this.validarElegibilidadeRenovacao(dto.concessaoId, usuarioId);
      
      if (!validacao.podeRenovar) {
        throw new BadRequestException({
          message: 'Concessão não elegível para renovação',
          motivos: validacao.motivos
        });
      }

      // 2. Buscar dados da solicitação original
      const solicitacaoOriginal = await this.buscarSolicitacaoOriginal(dto.concessaoId);
      
      if (!solicitacaoOriginal) {
        throw new NotFoundException('Solicitação original não encontrada');
      }

      // 3. Criar nova solicitação de renovação
      const novaSolicitacao = await this.criarSolicitacaoRenovacao(
        solicitacaoOriginal,
        dto.observacao,
        usuarioId,
        queryRunner
      );

      // 4. Reutilizar documentos da solicitação original
      await this.documentoReutilizacaoService.reutilizarDocumentos(
        solicitacaoOriginal.id,
        novaSolicitacao.id,
        queryRunner
      );

      await queryRunner.commitTransaction();
      
      // Invalidar cache de elegibilidade e solicitações após criar renovação
      await this.invalidarCacheUsuario(usuarioId, dto.concessaoId);
      
      this.logger.log(`Renovação iniciada com sucesso - Nova solicitação: ${novaSolicitacao.id}`);
      
      return novaSolicitacao;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Erro ao iniciar renovação: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Valida se uma concessão é elegível para renovação
   * Implementa cache Redis para otimizar consultas frequentes de elegibilidade
   */
  async validarElegibilidadeRenovacao(concessaoId: string, usuarioId: string): Promise<{ podeRenovar: boolean; motivos?: string[] }> {
    this.logger.log(`Validando elegibilidade para renovação - Concessão: ${concessaoId}`);
    
    // Gerar chave única para cache baseada na concessão e usuário
    const cacheKey = `renovacao:elegibilidade:${concessaoId}:${usuarioId}`;
    
    try {
      // Tentar obter resultado do cache primeiro
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache MISS para elegibilidade - Concessão: ${concessaoId}`);
          return await this.renovacaoValidationService.validarElegibilidade(concessaoId, usuarioId);
        },
        this.CACHE_TTL_ELEGIBILIDADE
      );
    } catch (error) {
      this.logger.error(`Erro ao validar elegibilidade com cache: ${error.message}`, error.stack);
      // Fallback: executar validação diretamente se cache falhar
      return await this.renovacaoValidationService.validarElegibilidade(concessaoId, usuarioId);
    }
  }

  /**
   * Cria uma nova solicitação de renovação baseada na solicitação original
   */
  async criarSolicitacaoRenovacao(
    solicitacaoOriginal: Solicitacao,
    observacao: string,
    usuarioId: string,
    queryRunner?: any
  ): Promise<Solicitacao> {
    this.logger.log(`Criando solicitação de renovação baseada na solicitação: ${solicitacaoOriginal.id}`);

    try {
      // Gerar novo protocolo
      const novoProtocolo = await this.gerarProtocoloRenovacao();

      // Criar nova solicitação com dados da original
      const novaSolicitacao = this.solicitacaoRepository.create({
        protocolo: `REN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        beneficiario_id: solicitacaoOriginal.beneficiario_id,
        tipo_beneficio_id: solicitacaoOriginal.tipo_beneficio_id,
        unidade_id: solicitacaoOriginal.unidade_id,
        tecnico_id: usuarioId,
        data_abertura: new Date(),
        status: StatusSolicitacao.RASCUNHO,
        tipo: TipoSolicitacaoEnum.RENOVACAO,
        solicitacao_original_id: solicitacaoOriginal.id,
        
        // Copiar dados relevantes da solicitação original
        dados_dinamicos: solicitacaoOriginal.dados_dinamicos,
        
        // Dados complementares específicos da renovação
        dados_complementares: {
          ...solicitacaoOriginal.dados_complementares,
          renovacao: {
            motivo: observacao,
            data_solicitacao: new Date(),
            usuario_solicitante: usuarioId
          }
        },
        observacoes: observacao
      });

      // Salvar usando queryRunner se fornecido, senão usar repository normal
      const solicitacaoSalva = queryRunner 
        ? await queryRunner.manager.save(Solicitacao, novaSolicitacao)
        : await this.solicitacaoRepository.save(novaSolicitacao);

      this.logger.log(`Solicitação de renovação criada: ${solicitacaoSalva.id} - Protocolo: ${novoProtocolo}`);
      
      return solicitacaoSalva;

    } catch (error) {
      this.logger.error(`Erro ao criar solicitação de renovação: ${error.message}`, error.stack);
      throw new Error('Erro interno ao criar solicitação de renovação');
    }
  }

  /**
   * Busca a solicitação original associada à concessão
   */
  async buscarSolicitacaoOriginal(concessaoId: string): Promise<Solicitacao | null> {
    try {
      const concessao = await this.concessaoRepository.findOne({
        where: { id: concessaoId },
        relations: ['solicitacao', 'solicitacao.tipo_beneficio']
      });

      return concessao?.solicitacao || null;
    } catch (error) {
      this.logger.error(`Erro ao buscar solicitação original: ${error.message}`);
      return null;
    }
  }

  /**
   * Lista solicitações do usuário com informações de elegibilidade para renovação
   * Implementa cache Redis para otimizar consultas de listagem frequentes
   */
  async listarSolicitacoesComElegibilidade(usuarioId: string): Promise<SolicitacaoComElegibilidadeDto[]> {
    this.logger.log(`Listando solicitações com elegibilidade para usuário: ${usuarioId}`);

    // Gerar chave única para cache baseada no usuário
    const cacheKey = `renovacao:solicitacoes:${usuarioId}`;

    try {
      // Tentar obter resultado do cache primeiro
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache MISS para listagem de solicitações - Usuário: ${usuarioId}`);
          return await this.buscarSolicitacoesComElegibilidade(usuarioId);
        },
        this.CACHE_TTL_SOLICITACOES
      );
    } catch (error) {
      this.logger.error(`Erro ao listar solicitações com cache: ${error.message}`, error.stack);
      // Fallback: executar busca diretamente se cache falhar
      return await this.buscarSolicitacoesComElegibilidade(usuarioId);
    }
  }

  /**
   * Busca solicitações com elegibilidade (método auxiliar para cache)
   */
  private async buscarSolicitacoesComElegibilidade(usuarioId: string): Promise<SolicitacaoComElegibilidadeDto[]> {
    // Buscar solicitações aprovadas do usuário que possuem concessão
    const solicitacoes = await this.solicitacaoRepository.find({
      where: {
        beneficiario_id: usuarioId,
        status: StatusSolicitacao.APROVADA,
        tipo: TipoSolicitacaoEnum.ORIGINAL
      },
      relations: ['concessao', 'tipo_beneficio'],
      order: { data_abertura: 'DESC' }
    });

    const resultado: SolicitacaoComElegibilidadeDto[] = [];

    for (const solicitacao of solicitacoes) {
      if (!solicitacao.concessao) continue;

      // Verificar elegibilidade para renovação (já com cache implementado)
      const elegibilidade = await this.validarElegibilidadeRenovacao(
        solicitacao.concessao.id,
        usuarioId
      );

      resultado.push({
        id: solicitacao.id,
        protocolo: solicitacao.protocolo,
        status: solicitacao.status,
        tipo: solicitacao.tipo,
        podeRenovar: elegibilidade.podeRenovar,
        labelTipo: this.obterLabelTipo(solicitacao.tipo),
        motivosInelegibilidade: elegibilidade.motivos
      });
    }

    return resultado;
  }

  /**
   * Gera um novo protocolo para solicitação de renovação
   */
  private async gerarProtocoloRenovacao(): Promise<string> {
    const ano = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `REN${ano}${timestamp}`;
  }

  /**
   * Obtém o label do tipo de solicitação
   */
  private obterLabelTipo(tipo: TipoSolicitacaoEnum): string {
    const labels = {
      [TipoSolicitacaoEnum.ORIGINAL]: 'Original',
      [TipoSolicitacaoEnum.RENOVACAO]: 'Renovação'
    };
    
    return labels[tipo] || 'Desconhecido';
  }

  /**
   * Valida dados de renovação (método auxiliar para validação simples)
   */
  async validarRenovacao(dto: ValidarRenovacaoDto, usuarioId: string): Promise<{ podeRenovar: boolean; motivos?: string[] }> {
    this.logger.log(`Validando renovação para concessão ${dto.concessaoId}`);
    
    return await this.validarElegibilidadeRenovacao(dto.concessaoId, usuarioId);
  }

  /**
   * Invalida cache relacionado ao usuário após operações que afetam elegibilidade
   */
  private async invalidarCacheUsuario(usuarioId: string, concessaoId?: string): Promise<void> {
    try {
      // Invalidar cache de listagem de solicitações do usuário
      await this.cacheService.delete(`renovacao:solicitacoes:${usuarioId}`);
      
      // Se concessaoId fornecida, invalidar cache específico de elegibilidade
      if (concessaoId) {
        await this.cacheService.delete(`renovacao:elegibilidade:${concessaoId}:${usuarioId}`);
      } else {
        // Invalidar todos os caches de elegibilidade do usuário
        await this.cacheService.deletePattern(`renovacao:elegibilidade:*:${usuarioId}`);
      }
      
      this.logger.debug(`Cache invalidado para usuário: ${usuarioId}`);
    } catch (error) {
      this.logger.error(`Erro ao invalidar cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Valida elegibilidade para renovação baseada no ID da solicitação
   * Busca automaticamente a concessão e o usuário associados
   */
  async validarElegibilidadePorSolicitacao(solicitacaoId: string): Promise<{ podeRenovar: boolean; motivos?: string[] }> {
    try {
      // Buscar a solicitação com sua concessão
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        relations: ['concessao'],
      });

      if (!solicitacao) {
        return {
          podeRenovar: false,
          motivos: ['Solicitação não encontrada']
        };
      }

      if (!solicitacao.concessao) {
        return {
          podeRenovar: false,
          motivos: ['Solicitação não possui concessão associada']
        };
      }

      // Usar a concessão e o beneficiário da solicitação
      return await this.validarElegibilidadeRenovacao(
        solicitacao.concessao.id,
        solicitacao.beneficiario_id
      );
    } catch (error) {
      this.logger.error(`Erro ao validar elegibilidade por solicitação: ${error.message}`, error.stack);
      throw new BadRequestException('Erro interno ao validar elegibilidade para renovação');
    }
  }

  /**
   * Invalida todo o cache de renovação (útil para manutenção)
   */
  async limparCacheRenovacao(): Promise<void> {
    try {
      const deletedCount = await this.cacheService.deletePattern('renovacao:*');
      this.logger.log(`Cache de renovação limpo: ${deletedCount} itens removidos`);
    } catch (error) {
      this.logger.error(`Erro ao limpar cache de renovação: ${error.message}`, error.stack);
    }
  }

  /**
   * Obtém estatísticas do cache de renovação
   */
  async obterEstatisticasCache(): Promise<any> {
    try {
      const stats = this.cacheService.getStats();
      return {
        ...stats,
        ttlElegibilidade: this.CACHE_TTL_ELEGIBILIDADE,
        ttlSolicitacoes: this.CACHE_TTL_SOLICITACOES
      };
    } catch (error) {
      this.logger.error(`Erro ao obter estatísticas do cache: ${error.message}`, error.stack);
      return null;
    }
  }
}