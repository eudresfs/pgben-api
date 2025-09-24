import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { IRenovacaoService } from '../interfaces';
import { IniciarRenovacaoDto, ValidarRenovacaoDto, RenovacaoResponseDto, SolicitacaoComElegibilidadeDto } from '../dto/renovacao';
import { Solicitacao, Concessao, TipoBeneficio } from '@/entities';
import { TipoSolicitacaoEnum, StatusSolicitacao } from '@/enums';
import { RenovacaoValidationService } from './renovacao-validation.service';
import { DocumentoReutilizacaoService } from './documento-reutilizacao.service';
import { CacheService } from '@/shared/services/cache.service';
import { DadosBeneficioFactoryService } from './dados-beneficio-factory.service';

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
    private readonly dadosBeneficioFactory: DadosBeneficioFactoryService,
  ) { }

  /**
   * Inicia o processo de renovação de uma concessão
   * Valida elegibilidade e cria nova solicitação se aprovada
   */
  async iniciarRenovacao(dto: IniciarRenovacaoDto, usuarioId: string): Promise<Solicitacao> {
    this.logger.log(`Iniciando processo de renovação - Concessão: ${dto.concessaoId}, Usuário: ${usuarioId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let novaSolicitacao: Solicitacao;
    let solicitacaoOriginal: Solicitacao;

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
      solicitacaoOriginal = await this.buscarSolicitacaoOriginal(dto.concessaoId);

      if (!solicitacaoOriginal) {
        throw new NotFoundException('Solicitação original não encontrada');
      }

      // 3. Criar nova solicitação de renovação (SEM atualizar a original)
      novaSolicitacao = await this.criarSolicitacaoRenovacaoSemAtualizarOriginal(
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

      // COMMIT da transação principal ANTES de atualizar a original
      await queryRunner.commitTransaction();
      
      this.logger.log(`Transação principal commitada com sucesso. Atualizando referência da solicitação original.`);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Erro ao iniciar renovação: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }

    // 5. Atualizar solicitação original FORA da transação principal
    this.logger.log(`[TRACE] Iniciando atualização da solicitação original fora da transação`);
    await this.atualizarSolicitacaoOriginalSeparada(
      solicitacaoOriginal.id,
      novaSolicitacao.id
    );
    this.logger.log(`[TRACE] Atualização da solicitação original concluída com sucesso`);

    // Invalidar cache após sucesso total
    await this.invalidarCacheUsuario(usuarioId, dto.concessaoId);

    this.logger.log(`Renovação iniciada com sucesso - Nova solicitação: ${novaSolicitacao.id}`);

    return novaSolicitacao;
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
          this.logger.log(`Cache MISS para elegibilidade - Concessão: ${concessaoId}`);
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
      // Gerar um UUID único para usar no protocolo e como ID da solicitação
      const { v4: uuidv4 } = await import('uuid');
      const uniqueId = uuidv4();

      // Gerar o protocolo com o UUID único
      const novoProtocolo = this.generateProtocol(
        solicitacaoOriginal.tipo_beneficio?.codigo,
        uniqueId
      );

      // Criar nova solicitação com dados da original
      const novaSolicitacao = this.solicitacaoRepository.create({
        id: uniqueId, // Definir o ID explicitamente
        beneficiario_id: solicitacaoOriginal.beneficiario_id,
        protocolo: novoProtocolo, // Protocolo já gerado
        tipo_beneficio_id: solicitacaoOriginal.tipo_beneficio_id,
        unidade_id: solicitacaoOriginal.unidade_id,
        tecnico_id: usuarioId,
        data_abertura: new Date(),
        status: StatusSolicitacao.EM_ANALISE,
        tipo: TipoSolicitacaoEnum.RENOVACAO,
        solicitacao_original_id: solicitacaoOriginal.id,

        // Copiar dados específicos do benefício da solicitação original
        solicitante_id: solicitacaoOriginal.solicitante_id,
        valor: solicitacaoOriginal.valor,
        quantidade_parcelas: solicitacaoOriginal.quantidade_parcelas,
        prioridade: solicitacaoOriginal.prioridade,
        dados_dinamicos: solicitacaoOriginal.dados_dinamicos,

        // Dados complementares específicos da renovação
        dados_complementares: {
          ...solicitacaoOriginal.dados_complementares,
          renovacao: {
            motivo: observacao,
            data_solicitacao: new Date(),
            usuario_solicitante: usuarioId,
            solicitacao_original_protocolo: solicitacaoOriginal.protocolo
          }
        },
        observacoes: observacao
      });

      // Salvar a solicitação com o protocolo já gerado
      const solicitacaoSalva = queryRunner
        ? await queryRunner.manager.save(Solicitacao, novaSolicitacao)
        : await this.solicitacaoRepository.save(novaSolicitacao);

      this.logger.log(`Nova solicitação salva - ID: ${solicitacaoSalva?.id}, Protocolo: ${solicitacaoSalva?.protocolo}`);

      if (!solicitacaoSalva?.id) {
        this.logger.error(`ERRO CRÍTICO: Nova solicitação foi salva mas não tem ID válido`);
        throw new Error('Falha na criação da nova solicitação - ID inválido');
      }

      // Copiar dados específicos do benefício da solicitação original
      await this.copiarDadosEspecificosBeneficio(
          solicitacaoOriginal,
          solicitacaoSalva,
          queryRunner,
        );

      // Copiar documentos requisitais da solicitação original
      await this.copiarDocumentosRequisitais(
        solicitacaoOriginal.id,
        solicitacaoSalva.id,
        queryRunner
      );

      // Atualizar solicitação original para referenciar a nova renovação
      await this.atualizarSolicitacaoOriginal(
        solicitacaoOriginal.id,
        solicitacaoSalva.id,
        queryRunner
      );

      this.logger.log(`Solicitação de renovação criada com sucesso: ${solicitacaoSalva.id}`);
      return solicitacaoSalva;

    } catch (error) {
      this.logger.error(`Erro ao criar solicitação de renovação: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cria solicitação de renovação SEM atualizar a original (para evitar abort da transação)
   * Versão modificada do método principal que não chama atualizarSolicitacaoOriginal
   */
  private async criarSolicitacaoRenovacaoSemAtualizarOriginal(
    solicitacaoOriginal: Solicitacao,
    observacao: string,
    usuarioId: string,
    queryRunner: any
  ): Promise<Solicitacao> {
    this.logger.log(`[TRACE] Iniciando criação de solicitação de renovação - Original: ${solicitacaoOriginal.id}`);

    try {
      // Gerar um UUID único para usar no protocolo e como ID da solicitação
      this.logger.log(`[TRACE] Gerando UUID único para nova solicitação`);
      const { v4: uuidv4 } = await import('uuid');
      const uniqueId = uuidv4();
      this.logger.log(`[TRACE] UUID gerado: ${uniqueId}`);

      // Gerar o protocolo com o UUID único
      this.logger.log(`[TRACE] Gerando protocolo para tipo: ${solicitacaoOriginal.tipo_beneficio?.codigo}`);
      const novoProtocolo = this.generateProtocol(
        solicitacaoOriginal.tipo_beneficio?.codigo,
        uniqueId
      );
      this.logger.log(`[TRACE] Protocolo gerado: ${novoProtocolo}`);

      // Criar nova solicitação com dados da original
      this.logger.log(`[TRACE] Criando entidade solicitação em memória`);
      const novaSolicitacao = this.solicitacaoRepository.create({
        id: uniqueId, // Definir o ID explicitamente
        beneficiario_id: solicitacaoOriginal.beneficiario_id,
        protocolo: novoProtocolo, // Protocolo já gerado
        tipo_beneficio_id: solicitacaoOriginal.tipo_beneficio_id,
        unidade_id: solicitacaoOriginal.unidade_id,
        tecnico_id: usuarioId,
        data_abertura: new Date(),
        status: StatusSolicitacao.EM_ANALISE,
        tipo: TipoSolicitacaoEnum.RENOVACAO,
        solicitacao_original_id: solicitacaoOriginal.id,

        // Copiar dados específicos do benefício da solicitação original
        solicitante_id: solicitacaoOriginal.solicitante_id,
        valor: solicitacaoOriginal.valor,
        quantidade_parcelas: solicitacaoOriginal.quantidade_parcelas,
        prioridade: solicitacaoOriginal.prioridade,
        dados_dinamicos: solicitacaoOriginal.dados_dinamicos,

        // Dados complementares específicos da renovação
        dados_complementares: {
          ...solicitacaoOriginal.dados_complementares,
          renovacao: {
            motivo: observacao,
            data_solicitacao: new Date(),
            usuario_solicitante: usuarioId,
            solicitacao_original_protocolo: solicitacaoOriginal.protocolo
          }
        },
        observacoes: observacao
      });
      this.logger.log(`[TRACE] Entidade criada em memória - ID: ${novaSolicitacao.id}, Protocolo: ${novaSolicitacao.protocolo}`);

      // Verificar estado da transação antes do save
      if (queryRunner) {
        this.logger.log(`[TRACE] Verificando estado da transação antes do save`);
        this.logger.log(`[TRACE] QueryRunner conectado: ${queryRunner.isConnected}`);
        this.logger.log(`[TRACE] Transação ativa: ${queryRunner.isTransactionActive}`);
      }

      // Salvar a solicitação com o protocolo já gerado
      this.logger.log(`[TRACE] Iniciando save da solicitação no banco de dados`);
      const solicitacaoSalva = queryRunner
        ? await queryRunner.manager.save(Solicitacao, novaSolicitacao)
        : await this.solicitacaoRepository.save(novaSolicitacao);
      
      this.logger.log(`[TRACE] Save executado - Resultado: ${JSON.stringify({
        id: solicitacaoSalva?.id,
        protocolo: solicitacaoSalva?.protocolo,
        status: solicitacaoSalva?.status,
        tipo: solicitacaoSalva?.tipo
      })}`);

      if (!solicitacaoSalva?.id) {
        this.logger.error(`[TRACE] CRÍTICO: Save retornou objeto sem ID válido`);
        throw new Error('Falha na criação da nova solicitação - ID inválido retornado pelo save');
      }

      // VERIFICAÇÃO IMEDIATA: Confirmar se a solicitação foi realmente persistida
      this.logger.log(`[TRACE] Verificando persistência imediata da solicitação`);
      const verificacao = queryRunner
        ? await queryRunner.manager.findOne(Solicitacao, { where: { id: solicitacaoSalva.id } })
        : await this.solicitacaoRepository.findOne({ where: { id: solicitacaoSalva.id } });

      if (!verificacao) {
        this.logger.error(`[TRACE] CRÍTICO: Solicitação não encontrada após save - ID: ${solicitacaoSalva.id}`);
        throw new Error(`CRÍTICO: Solicitação não foi persistida no banco - ID: ${solicitacaoSalva.id}`);
      }

      this.logger.log(`[TRACE] Verificação pós-save: SUCESSO - Solicitação encontrada no banco`);
      this.logger.log(`Nova solicitação salva e verificada - ID: ${solicitacaoSalva.id}, Protocolo: ${solicitacaoSalva.protocolo}`);

      // Copiar dados específicos do benefício da solicitação original
      await this.copiarDadosEspecificosBeneficio(
          solicitacaoOriginal,
          solicitacaoSalva,
          queryRunner,
        );

      // Copiar documentos requisitais da solicitação original
      await this.copiarDocumentosRequisitais(
        solicitacaoOriginal.id,
        solicitacaoSalva.id,
        queryRunner
      );

      // NÃO chamar atualizarSolicitacaoOriginal aqui - será feito fora da transação

      this.logger.log(`Solicitação de renovação criada com sucesso (sem atualizar original): ${solicitacaoSalva.id}`);
      return solicitacaoSalva;

    } catch (error) {
      this.logger.error(`Erro ao criar solicitação de renovação (sem atualizar original): ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Atualiza a solicitação original para referenciar a nova solicitação de renovação
   * Isso é essencial para a lógica de elegibilidade funcionar corretamente
   */
  private async atualizarSolicitacaoOriginal(
    solicitacaoOriginalId: string,
    novaSolicitacaoId: string,
    queryRunner?: any
  ): Promise<void> {
    this.logger.log(`[TRACE] Atualizando solicitação original ${solicitacaoOriginalId} para referenciar renovação ${novaSolicitacaoId}`);

    try {
      this.logger.log(`[TRACE] Obtendo repository - QueryRunner disponível: ${!!queryRunner}`);
      const repository = queryRunner 
        ? queryRunner.manager.getRepository(Solicitacao)
        : this.solicitacaoRepository;

      // Atualizar a solicitação original para referenciar a nova renovação
      this.logger.log(`[TRACE] Executando update na solicitação original`);
      const updateResult = await repository.update(solicitacaoOriginalId, {
        solicitacao_renovada_id: novaSolicitacaoId
      });

      this.logger.log(`[TRACE] Update executado - Linhas afetadas: ${updateResult.affected}`);

      // VERIFICAÇÃO IMEDIATA após update
      this.logger.log(`[TRACE] Verificando se update foi persistido`);
      const verificacao = await repository.findOne({
        where: { id: solicitacaoOriginalId },
        select: ['id', 'solicitacao_renovada_id']
      });

      if (!verificacao || verificacao.solicitacao_renovada_id !== novaSolicitacaoId) {
        throw new Error(`CRÍTICO: Update da solicitação original não foi persistido - ID: ${solicitacaoOriginalId}`);
      }

      this.logger.log(`[TRACE] Verificação pós-update: SUCESSO - solicitacao_renovada_id: ${verificacao.solicitacao_renovada_id}`);
      this.logger.log(`[TRACE] Solicitação original atualizada com sucesso: ${solicitacaoOriginalId}`);

    } catch (error) {
      this.logger.error(`Erro ao atualizar solicitação original: ${error.message}`, error.stack);
      throw error; // Propagar o erro para interromper a transação
    }
  }

  /**
   * Atualiza a solicitação original fora da transação principal
   * Método separado para evitar abort da transação principal em caso de erro
   */
  private async atualizarSolicitacaoOriginalSeparada(
    solicitacaoOriginalId: string,
    novaSolicitacaoId: string
  ): Promise<void> {
    this.logger.log(`Atualizando referência da solicitação original ${solicitacaoOriginalId} -> ${novaSolicitacaoId}`);

    try {
      // Usar o repository diretamente (sem transação)
      await this.solicitacaoRepository.update(solicitacaoOriginalId, {
        solicitacao_renovada_id: novaSolicitacaoId,
        updated_at: new Date()
      });

      this.logger.log(`Referência da solicitação original atualizada com sucesso`);
    } catch (error) {
      this.logger.error(`Erro ao atualizar referência da solicitação original: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Copia documentos requisitais da solicitação original para a renovação
   * Utiliza o DocumentoReutilizacaoService para reutilizar documentos válidos
   */
  private async copiarDocumentosRequisitais(
    solicitacaoOriginalId: string,
    novaSolicitacaoId: string,
    queryRunner?: any
  ): Promise<void> {
    this.logger.log(`[TRACE] Iniciando cópia de documentos - Original: ${solicitacaoOriginalId}, Nova: ${novaSolicitacaoId}`);

    try {
      // Utilizar o serviço especializado para reutilização de documentos
      this.logger.log(`[TRACE] Chamando documentoReutilizacaoService.reutilizarDocumentos`);
      await this.documentoReutilizacaoService.reutilizarDocumentos(
        solicitacaoOriginalId,
        novaSolicitacaoId,
        queryRunner
      );

      this.logger.log(`[TRACE] Documentos processados pelo serviço de reutilização`);

      // VERIFICAÇÃO IMEDIATA após cópia de documentos
      this.logger.log(`[TRACE] Verificando se documentos foram realmente copiados`);
      const documentosCopiados = await this.documentoReutilizacaoService.buscarDocumentosSolicitacao(novaSolicitacaoId);
      
      this.logger.log(`[TRACE] Verificação pós-cópia: ${documentosCopiados?.length || 0} documentos encontrados`);
      this.logger.log(`[TRACE] Documentos copiados com sucesso para a renovação: ${novaSolicitacaoId} (${documentosCopiados?.length || 0} documentos)`);

    } catch (error) {
      this.logger.error(`[TRACE] CRÍTICO: Falha na cópia de documentos para renovação: ${error.message}`, error.stack);
      throw error; // Propagar erro para diagnóstico
    }
  }

  /**
   * Copia dados específicos do benefício da solicitação original para a nova solicitação
   * Usa inserção SQL direta para operação de cópia eficiente e confiável
   */
  private async copiarDadosEspecificosBeneficio(
    solicitacaoOriginal: Solicitacao,
    novaSolicitacao: Solicitacao,
    queryRunner?: any,
  ): Promise<void> {
    // VALIDAÇÃO CRÍTICA: Garantir que novaSolicitacao.id seja válido
    if (!novaSolicitacao || !novaSolicitacao.id) {
      this.logger.error(
        `Erro crítico: novaSolicitacao.id é inválido. Valor recebido: ${novaSolicitacao?.id}`
      );
      throw new Error('Nova solicitação deve ter ID válido para copiar dados específicos');
    }

    this.logger.log(
      `[TRACE] Iniciando cópia de dados específicos - Original: ${solicitacaoOriginal.id}, Nova: ${novaSolicitacao.id}`,
    );

    // Usar o EntityManager da transação se disponível
    this.logger.log(`[TRACE] Obtendo EntityManager - QueryRunner disponível: ${!!queryRunner}`);
    const entityManager = queryRunner?.manager || this.dataSource.manager;
    this.logger.log(`[TRACE] EntityManager obtido: ${!!entityManager}`);

    // Mapear tipo de benefício para nome da tabela correspondente
    const tabelasPorTipo = {
      'aluguel-social': 'dados_aluguel_social',
      'cesta-basica': 'dados_cesta_basica', 
      'ataude': 'dados_funeral',
      'natalidade': 'dados_natalidade',
    };

    // Buscar o tipo de benefício para determinar a tabela correta
    const tipoBeneficio = await entityManager.findOne(TipoBeneficio, {
      where: { id: novaSolicitacao.tipo_beneficio_id }
    });

    if (!tipoBeneficio) {
      throw new Error(`Tipo de benefício não encontrado: ${novaSolicitacao.tipo_beneficio_id}`);
    }

    const nomeTabela = tabelasPorTipo[tipoBeneficio.codigo];
    if (!nomeTabela) {
      this.logger.warn(
        `Tipo de benefício ${tipoBeneficio.codigo} não possui dados específicos para copiar`
      );
      return;
    }

    this.logger.log(`[TRACE] Verificando existência de dados na tabela ${nomeTabela} para solicitação: ${novaSolicitacao.id}`);

    // 1. VERIFICAÇÃO: Prevenir duplicatas
    const existingDataResult = await entityManager.query(`
      SELECT COUNT(*) as count 
      FROM ${nomeTabela} 
      WHERE solicitacao_id = $1
    `, [novaSolicitacao.id]);

    const count = parseInt(existingDataResult[0]?.count || '0');

    if (count > 0) {
      this.logger.warn(
        `Dados específicos já existem para a solicitação ${novaSolicitacao.id} (${count} registros na tabela ${nomeTabela}). Pulando cópia.`
      );
      return;
    }

    // 2. BUSCAR: Dados originais com query simples
    this.logger.log(`[TRACE] Buscando dados originais da solicitação: ${solicitacaoOriginal.id}`);
    const dadosOriginaisResult = await entityManager.query(`
      SELECT * FROM ${nomeTabela} 
      WHERE solicitacao_id = $1
    `, [solicitacaoOriginal.id]);

    if (!dadosOriginaisResult || dadosOriginaisResult.length === 0) {
      this.logger.warn(
        `[TRACE] Nenhum dado específico encontrado para a solicitação original ${solicitacaoOriginal.id}`,
      );
      return;
    }

    const dadosOriginais = dadosOriginaisResult[0];
    this.logger.log(`[TRACE] Dados originais encontrados - ID: ${dadosOriginais.id}, solicitacao_id: ${dadosOriginais.solicitacao_id}`);

    // 3. INSERIR: Diretamente com SQL - SEM usar AbstractDadosBeneficioService
    this.logger.log(`[TRACE] Preparando inserção SQL direta para nova solicitação: ${novaSolicitacao.id}`);

    // Construir query de inserção dinamicamente baseada nas colunas dos dados originais
    const colunas = Object.keys(dadosOriginais).filter(col => 
      col !== 'id' && 
      col !== 'created_at' && 
      col !== 'updated_at' && 
      col !== 'removed_at'
    );

    // Substituir solicitacao_id pelos dados da nova solicitação
    const valores = colunas.map(col => {
      if (col === 'solicitacao_id') {
        return novaSolicitacao.id;
      }
      return dadosOriginais[col];
    });

    const placeholders = colunas.map((_, index) => `$${index + 1}`).join(', ');
    const colunasStr = colunas.join(', ');

    const insertQuery = `
      INSERT INTO ${nomeTabela} (${colunasStr})
      VALUES (${placeholders})
      RETURNING id, created_at, updated_at
    `;

    this.logger.log(`[TRACE] Executando inserção SQL direta`);
    this.logger.log(`[TRACE] Query: ${insertQuery}`);
    this.logger.log(`[TRACE] Valores: ${JSON.stringify(valores)}`);

    // 4. TRATAR: Apenas constraint violations reais (concorrência)
    try {
      const insertResult = await entityManager.query(insertQuery, valores);
      
      if (!insertResult || insertResult.length === 0) {
        throw new Error('Inserção SQL não retornou resultado');
      }

      const novoRegistro = insertResult[0];
      this.logger.log(`[TRACE] Inserção SQL concluída - Novo ID: ${novoRegistro.id}`);

      // VERIFICAÇÃO IMEDIATA: Confirmar persistência
      this.logger.log(`[TRACE] Verificando persistência dos dados copiados`);
      const verificacaoResult = await entityManager.query(`
        SELECT id FROM ${nomeTabela} 
        WHERE solicitacao_id = $1
      `, [novaSolicitacao.id]);

      if (!verificacaoResult || verificacaoResult.length === 0) {
        throw new Error(`CRÍTICO: Dados não encontrados após inserção - Solicitação: ${novaSolicitacao.id}`);
      }

      this.logger.log(`[TRACE] Verificação pós-inserção: SUCESSO - Dados persistidos com ID: ${verificacaoResult[0].id}`);
      this.logger.log(
        `[TRACE] Dados específicos copiados com sucesso para a solicitação ${novaSolicitacao.id}`,
      );

    } catch (insertError) {
      // Tratar apenas constraint violations de concorrência real
      if (insertError.code === '23505' && insertError.constraint?.includes('solicitacao')) {
        this.logger.warn(
          `[TRACE] Constraint violation por concorrência detectada - outro processo já inseriu dados para solicitação ${novaSolicitacao.id}`
        );
        // Verificar se os dados existem agora
        const recheck = await entityManager.query(`
          SELECT COUNT(*) as count FROM ${nomeTabela} WHERE solicitacao_id = $1
        `, [novaSolicitacao.id]);
        
        if (parseInt(recheck[0]?.count || '0') > 0) {
          this.logger.log(`[TRACE] Dados já existem devido à concorrência - operação bem-sucedida`);
          return;
        }
      }
      
      this.logger.error(`[TRACE] CRÍTICO: Falha na inserção SQL direta - Código: ${insertError.code}, Constraint: ${insertError.constraint}`, insertError);
      throw insertError;
    }
  }

  /**
   * Busca a solicitação original através da concessão
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
   * Lista solicitações do usuário com logrmações de elegibilidade para renovação
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
          this.logger.log(`Cache MISS para listagem de solicitações - Usuário: ${usuarioId}`);
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
  * Gera o protocolo da solicitação de renovação no formato: REN-Ano-Código
  * Este método deve ser chamado pelo serviço antes da criação da solicitação
  * @param codigoBeneficio Código do tipo de benefício (não usado para renovações)
  * @param uniqueId ID único gerado previamente para usar como código
  */
  private generateProtocol(codigoBeneficio?: string, uniqueId?: string) {
    const date = new Date();
    const ano = date.getFullYear();

    if (uniqueId) {
      // Para renovações, sempre usar o prefixo "REN"
      const prefixoRenovacao = 'REN';

      // Usar os primeiros 8 caracteres do ID único como código
      const codigo = uniqueId.substring(0, 8).toUpperCase();

      return `${prefixoRenovacao}-${ano}-${codigo}`;
    } else {
      // Fallback para formato padrão se não houver ID
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      return `REN-${ano}-${random}`;
    }
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

      this.logger.log(`Cache invalidado para usuário: ${usuarioId}`);
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