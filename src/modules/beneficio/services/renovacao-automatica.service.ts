import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, IsNull, Not } from 'typeorm';
import { ConfiguracaoRenovacao } from '../entities/configuracao-renovacao.entity';
import { Solicitacao, StatusSolicitacao } from '../../solicitacao/entities/solicitacao.entity';
import { CreateConfiguracaoRenovacaoDto } from '../dto/create-configuracao-renovacao.dto';
import { UpdateConfiguracaoRenovacaoDto } from '../dto/update-configuracao-renovacao.dto';
import { WorkflowSolicitacaoService } from '../../solicitacao/services/workflow-solicitacao.service';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Serviço de Renovação Automática
 *
 * Responsável por gerenciar as configurações de renovação automática de benefícios
 * e o processo de renovação automática mensal.
 */
@Injectable()
export class RenovacaoAutomaticaService {
  private readonly logger = new Logger(RenovacaoAutomaticaService.name);

  constructor(
    @InjectRepository(ConfiguracaoRenovacao)
    private readonly configuracaoRepository: Repository<ConfiguracaoRenovacao>,
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    private readonly workflowService: WorkflowSolicitacaoService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Cria uma nova configuração de renovação automática
   * @param createConfiguracaoDto Dados da configuração
   * @param usuarioId ID do usuário que está criando a configuração
   * @returns Configuração criada
   */
  async create(
    createConfiguracaoDto: CreateConfiguracaoRenovacaoDto,
    usuarioId: string,
  ): Promise<ConfiguracaoRenovacao> {
    try {
      // Verificar se já existe configuração para o tipo de benefício
      const configuracaoExistente = await this.configuracaoRepository.findOne({
        where: { tipo_beneficio_id: createConfiguracaoDto.tipo_beneficio_id },
      });

      if (configuracaoExistente) {
        throw new ConflictException(
          'Já existe uma configuração de renovação para este tipo de benefício',
        );
      }

      // Criar a configuração
      const novaConfiguracao = this.configuracaoRepository.create({
        ...createConfiguracaoDto,
        usuario_id: usuarioId,
        ativo: true,
      });

      return await this.configuracaoRepository.save(novaConfiguracao);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error(
        `Erro ao criar configuração de renovação: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao criar configuração de renovação',
      );
    }
  }

  /**
   * Busca todas as configurações de renovação
   * @returns Lista de configurações
   */
  async findAll(): Promise<ConfiguracaoRenovacao[]> {
    try {
      return this.configuracaoRepository.find({
        relations: ['tipo_beneficio'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(
        `Erro ao buscar configurações de renovação: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao buscar configurações de renovação',
      );
    }
  }

  /**
   * Busca uma configuração de renovação pelo ID
   * @param id ID da configuração
   * @returns Configuração
   */
  async findById(id: string): Promise<ConfiguracaoRenovacao> {
    try {
      const configuracao = await this.configuracaoRepository.findOne({
        where: { id },
        relations: ['tipo_beneficio'],
      });

      if (!configuracao) {
        throw new NotFoundException('Configuração de renovação não encontrada');
      }

      return configuracao;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao buscar configuração de renovação: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao buscar configuração de renovação',
      );
    }
  }

  /**
   * Busca uma configuração de renovação pelo tipo de benefício
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Configuração
   */
  async findByTipoBeneficio(tipoBeneficioId: string): Promise<ConfiguracaoRenovacao> {
    try {
      const configuracao = await this.configuracaoRepository.findOne({
        where: { tipo_beneficio_id: tipoBeneficioId },
        relations: ['tipo_beneficio'],
      });

      if (!configuracao) {
        throw new NotFoundException('Configuração de renovação não encontrada para este tipo de benefício');
      }

      return configuracao;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao buscar configuração de renovação por tipo de benefício: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao buscar configuração de renovação por tipo de benefício',
      );
    }
  }

  /**
   * Atualiza uma configuração de renovação
   * @param id ID da configuração
   * @param updateConfiguracaoDto Dados para atualização
   * @returns Configuração atualizada
   */
  async update(
    id: string,
    updateConfiguracaoDto: UpdateConfiguracaoRenovacaoDto,
  ): Promise<ConfiguracaoRenovacao> {
    try {
      // Verificar se a configuração existe
      const configuracao = await this.configuracaoRepository.findOne({
        where: { id },
      });

      if (!configuracao) {
        throw new NotFoundException('Configuração de renovação não encontrada');
      }

      // Atualizar a configuração
      await this.configuracaoRepository.update(id, updateConfiguracaoDto);

      // Retornar a configuração atualizada
      return this.findById(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao atualizar configuração de renovação: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao atualizar configuração de renovação',
      );
    }
  }

  /**
   * Remove uma configuração de renovação
   * @param id ID da configuração
   * @returns void
   */
  async remove(id: string): Promise<void> {
    try {
      // Verificar se a configuração existe
      const configuracao = await this.configuracaoRepository.findOne({
        where: { id },
      });

      if (!configuracao) {
        throw new NotFoundException('Configuração de renovação não encontrada');
      }

      // Remover a configuração
      await this.configuracaoRepository.remove(configuracao);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao remover configuração de renovação: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao remover configuração de renovação',
      );
    }
  }

  /**
   * Ativa ou desativa uma configuração de renovação
   * @param id ID da configuração
   * @param ativo Status de ativação
   * @returns Configuração atualizada
   */
  async toggleAtivo(id: string, ativo: boolean): Promise<ConfiguracaoRenovacao> {
    try {
      // Verificar se a configuração existe
      const configuracao = await this.configuracaoRepository.findOne({
        where: { id },
      });

      if (!configuracao) {
        throw new NotFoundException('Configuração de renovação não encontrada');
      }

      // Atualizar o status de ativação
      await this.configuracaoRepository.update(id, { ativo });

      // Retornar a configuração atualizada
      return this.findById(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao atualizar status de ativação: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao atualizar status de ativação',
      );
    }
  }

  /**
   * Configura a renovação automática para uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param renovacaoAutomatica Flag indicando se a renovação automática está ativada
   * @param usuarioId ID do usuário que está configurando a renovação
   * @returns Solicitação atualizada
   */
  async configurarRenovacaoSolicitacao(
    solicitacaoId: string,
    renovacaoAutomatica: boolean,
    usuarioId: string,
  ): Promise<Solicitacao> {
    try {
      // Verificar se a solicitação existe
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
      });

      if (!solicitacao) {
        throw new NotFoundException('Solicitação de benefício não encontrada');
      }

      // Verificar se a solicitação está em um estado que permite renovação
      if (solicitacao.status !== StatusSolicitacao.CONCLUIDA) {
        throw new BadRequestException(
          'Apenas solicitações concluídas podem ser configuradas para renovação automática',
        );
      }

      // Verificar se existe configuração de renovação para o tipo de benefício
      const configuracao = await this.configuracaoRepository.findOne({
        where: { 
          tipo_beneficio_id: solicitacao.tipo_beneficio_id,
          ativo: true,
        },
      });

      if (!configuracao) {
        throw new BadRequestException(
          'Não existe configuração de renovação ativa para este tipo de benefício',
        );
      }

      if (!configuracao.renovacao_automatica) {
        throw new BadRequestException(
          'A renovação automática não está habilitada para este tipo de benefício',
        );
      }

      // Preparar os dados para atualização
      const updateData: any = {
        renovacao_automatica: renovacaoAutomatica,
      };
      
      // Adicionar a data da próxima renovação apenas se estiver ativada
      if (renovacaoAutomatica) {
        updateData.data_proxima_renovacao = this.calcularDataProximaRenovacao(
          configuracao.dias_antecedencia_renovacao
        );
      } else {
        // Usar SQL bruto para definir como NULL
        await this.dataSource
          .createQueryBuilder()
          .update(Solicitacao)
          .set({ renovacao_automatica: false })
          .where("id = :id", { id: solicitacaoId })
          .execute();
          
        await this.dataSource
          .query(
            `UPDATE solicitacao SET data_proxima_renovacao = NULL WHERE id = $1`,
            [solicitacaoId]
          );
          
        // Retornar mais cedo para evitar a segunda atualização
        const solicitacaoAtualizada = await this.solicitacaoRepository.findOne({
          where: { id: solicitacaoId },
        });
        
        if (!solicitacaoAtualizada) {
          throw new NotFoundException(`Solicitação com ID ${solicitacaoId} não encontrada após atualização`);
        }
        
        return solicitacaoAtualizada;
      }
      
      // Atualizar a solicitação se a renovação estiver ativada
      await this.solicitacaoRepository.update(solicitacaoId, updateData);

      // Retornar a solicitação atualizada
      const solicitacaoAtualizada = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
      });
      
      if (!solicitacaoAtualizada) {
        throw new NotFoundException(`Solicitação com ID ${solicitacaoId} não encontrada após atualização`);
      }
      
      return solicitacaoAtualizada;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Erro ao configurar renovação automática: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao configurar renovação automática',
      );
    }
  }

  /**
   * Calcula a data da próxima renovação
   * @param diasAntecedencia Dias de antecedência para a renovação
   * @returns Data da próxima renovação
   */
  private calcularDataProximaRenovacao(diasAntecedencia: number): Date {
    const dataAtual = new Date();
    const dataProximaRenovacao = new Date(dataAtual);
    
    // Adicionar um mês à data atual
    dataProximaRenovacao.setMonth(dataProximaRenovacao.getMonth() + 1);
    
    // Subtrair os dias de antecedência
    dataProximaRenovacao.setDate(dataProximaRenovacao.getDate() - diasAntecedencia);
    
    return dataProximaRenovacao;
  }

  /**
   * Processa as renovações automáticas pendentes
   * Este método é executado automaticamente todos os dias à meia-noite
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processarRenovacoesAutomaticas(): Promise<void> {
    this.logger.log('Iniciando processamento de renovações automáticas');

    const dataAtual = new Date();
    
    try {
      // Buscar solicitações com renovação automática ativada e data de renovação menor ou igual à data atual
      const solicitacoesPendentes = await this.solicitacaoRepository.find({
        where: {
          renovacao_automatica: true,
          data_proxima_renovacao: LessThanOrEqual(dataAtual),
          status: StatusSolicitacao.CONCLUIDA,
        },
        relations: ['tipo_beneficio'],
      });

      this.logger.log(`Encontradas ${solicitacoesPendentes.length} solicitações pendentes de renovação`);

      for (const solicitacao of solicitacoesPendentes) {
        await this.processarRenovacaoSolicitacao(solicitacao);
      }

      this.logger.log('Processamento de renovações automáticas concluído');
    } catch (error) {
      this.logger.error(
        `Erro ao processar renovações automáticas: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa a renovação de uma solicitação específica
   * @param solicitacao Solicitação a ser renovada
   */
  private async processarRenovacaoSolicitacao(solicitacao: Solicitacao): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Buscar configuração de renovação para o tipo de benefício
      const configuracao = await this.configuracaoRepository.findOne({
        where: {
          tipo_beneficio_id: solicitacao.tipo_beneficio_id,
          ativo: true,
        },
      });

      if (!configuracao || !configuracao.renovacao_automatica) {
        this.logger.warn(
          `Configuração de renovação não encontrada ou desativada para a solicitação ${solicitacao.id}`,
        );
        return;
      }

      // Verificar se atingiu o número máximo de renovações
      const numeroMaximoRenovacoes = configuracao.numero_maximo_renovacoes || 0;
      if (
        numeroMaximoRenovacoes > 0 &&
        solicitacao.contador_renovacoes >= numeroMaximoRenovacoes
      ) {
        this.logger.warn(
          `Solicitação ${solicitacao.id} atingiu o número máximo de renovações (${configuracao.numero_maximo_renovacoes})`,
        );
        
        // Desativar renovação automática
        await queryRunner.manager.update(
          Solicitacao,
          { id: solicitacao.id },
          {
            renovacao_automatica: false,
            data_proxima_renovacao: undefined,
          },
        );
        
        await queryRunner.commitTransaction();
        return;
      }

      // Criar nova solicitação como renovação
      const novaSolicitacao = this.solicitacaoRepository.create({
        tipo_beneficio_id: solicitacao.tipo_beneficio_id,
        dados_dinamicos: solicitacao.dados_dinamicos,
        observacoes: `Renovação automática da solicitação ${solicitacao.id}`,
        solicitacao_original_id: solicitacao.solicitacao_original_id || solicitacao.id,
        contador_renovacoes: solicitacao.contador_renovacoes + 1,
        renovacao_automatica: true,
      });
      

      // Definir o status inicial da nova solicitação
      if (configuracao.requer_aprovacao_renovacao) {
        novaSolicitacao.status = StatusSolicitacao.PENDENTE;
      } else {
        novaSolicitacao.status = StatusSolicitacao.APROVADA;
      }

      // Salvar a nova solicitação
      const novaSolicitacaoSalva = await queryRunner.manager.save(novaSolicitacao);

      // Calcular a data da próxima renovação
      const dataProximaRenovacao = this.calcularDataProximaRenovacao(
        configuracao.dias_antecedencia_renovacao,
      );

      // Atualizar a solicitação original
      await queryRunner.manager.update(
        Solicitacao,
        { id: solicitacao.id },
        {
          data_proxima_renovacao: dataProximaRenovacao,
        },
      );

      // Se não requer aprovação, avançar automaticamente para LIBERADA
      if (!configuracao.requer_aprovacao_renovacao) {
        await this.workflowService.liberarSolicitacao(
          novaSolicitacaoSalva.id,
          'sistema', // ID do sistema como usuário
        );
      }

      this.logger.log(
        `Renovação automática processada com sucesso para a solicitação ${solicitacao.id}. Nova solicitação: ${novaSolicitacaoSalva.id}`,
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Erro ao processar renovação da solicitação ${solicitacao.id}: ${error.message}`,
        error.stack,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Verifica a configuração de renovação automática de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Informações sobre a configuração de renovação da solicitação
   */
  async verificarRenovacaoSolicitacao(solicitacaoId: string): Promise<{
    renovacao_automatica: boolean;
    contador_renovacoes: number;
    data_proxima_renovacao: Date | null;
    solicitacao_original_id: string | null;
    configuracao_tipo_beneficio: boolean;
    dias_antecedencia: number | null;
    numero_maximo_renovacoes: number | null;
    requer_aprovacao: boolean | null;
  }> {
    try {
      // Buscar solicitação
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        relations: ['tipo_beneficio'],
      });

      if (!solicitacao) {
        throw new NotFoundException('Solicitação não encontrada');
      }

      // Buscar configuração de renovação para o tipo de benefício
      const configuracao = await this.configuracaoRepository.findOne({
        where: { tipo_beneficio_id: solicitacao.tipo_beneficio_id },
      });

      // Preparar resposta
      return {
        renovacao_automatica: solicitacao.renovacao_automatica,
        contador_renovacoes: solicitacao.contador_renovacoes,
        data_proxima_renovacao: solicitacao.data_proxima_renovacao,
        solicitacao_original_id: solicitacao.solicitacao_original_id,
        configuracao_tipo_beneficio: configuracao ? (configuracao.renovacao_automatica && configuracao.ativo) : false,
        dias_antecedencia: configuracao ? (configuracao.dias_antecedencia_renovacao || null) : null,
        numero_maximo_renovacoes: configuracao ? (configuracao.numero_maximo_renovacoes || null) : null,
        requer_aprovacao: configuracao ? configuracao.requer_aprovacao_renovacao : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao verificar configuração de renovação da solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao verificar configuração de renovação da solicitação',
      );
    }
  }

  /**
   * Verifica e processa manualmente as renovações pendentes
   * @param usuarioId ID do usuário que está executando a verificação
   * @returns Número de solicitações renovadas
   */
  async verificarRenovacoesPendentes(usuarioId: string): Promise<number> {
    this.logger.log(`Verificação manual de renovações pendentes iniciada por ${usuarioId}`);

    const dataAtual = new Date();
    let renovacoesProcessadas = 0;
    
    try {
      // Buscar solicitações com renovação automática ativada e data de renovação menor ou igual à data atual
      const solicitacoesPendentes = await this.solicitacaoRepository.find({
        where: {
          renovacao_automatica: true,
          data_proxima_renovacao: LessThanOrEqual(dataAtual),
          status: StatusSolicitacao.CONCLUIDA,
        },
        relations: ['tipo_beneficio'],
      });

      this.logger.log(`Encontradas ${solicitacoesPendentes.length} solicitações pendentes de renovação`);

      for (const solicitacao of solicitacoesPendentes) {
        await this.processarRenovacaoSolicitacao(solicitacao);
        renovacoesProcessadas++;
      }

      this.logger.log(`Verificação manual concluída. ${renovacoesProcessadas} renovações processadas.`);
      return renovacoesProcessadas;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar renovações pendentes: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao verificar renovações pendentes',
      );
    }
  }
}
