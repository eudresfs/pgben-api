import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { Concessao } from '../../../entities/concessao.entity';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { addMonths, isAfter } from 'date-fns';
import { UnifiedLoggerService } from '../../../shared/logging/unified-logger.service';

/**
 * Serviço responsável por centralizar as validações específicas para benefícios
 * conforme as regras definidas no ADR de Separação entre Solicitações e Concessões
 */
@Injectable()
export class ValidacaoBeneficioService {
  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    @InjectRepository(Concessao)
    private readonly concessaoRepository: Repository<Concessao>,
    @InjectRepository(TipoBeneficio)
    private readonly tipoBeneficioRepository: Repository<TipoBeneficio>,
    private readonly logger: UnifiedLoggerService,
  ) {}

  /**
   * Valida todas as regras para criar uma nova solicitação de benefício
   * - Duplicidade de solicitação em andamento
   * - Duplicidade de concessão ativa 
   * - Respeito ao período de carência
   * - Validação de quantidade de parcelas
   * 
   * @param solicitacaoData Dados da solicitação a ser criada
   * @throws BadRequestException caso alguma regra seja violada
   */
  async validarCriacaoSolicitacao(solicitacaoData: Partial<Solicitacao>): Promise<void> {
    const { beneficiario_id, tipo_beneficio_id, determinacao_judicial_flag, quantidade_parcelas, determinacao_judicial_id } = solicitacaoData;

    if (!beneficiario_id || !tipo_beneficio_id) {
      throw new BadRequestException('Beneficiário e tipo de benefício são obrigatórios');
    }

    // Se for determinação judicial, algumas validações são ignoradas
    if (determinacao_judicial_flag) {
      // Validação de documento judicial obrigatório
      if (!determinacao_judicial_id) {
        throw new BadRequestException('Determinação judicial é obrigatória para solicitações com flag determinacao_judicial_flag');
      }
      
      // Validar se a determinação judicial existe e está ativa
      await this.validarDocumentoJudicial(determinacao_judicial_id);
      
      this.logger.log(`Criando solicitação por determinação judicial para beneficiário ${beneficiario_id}`);
      // Ignoramos duplicidade e carência, mas validamos quantidade de parcelas
      await this.validarQuantidadeParcelas(tipo_beneficio_id, quantidade_parcelas, true);
      return;
    }

    // Validar duplicidade de solicitação em andamento
    await this.validarDuplicidadeSolicitacao(beneficiario_id, tipo_beneficio_id);
    
    // Validar duplicidade de concessão ativa
    await this.validarDuplicidadeConcessao(beneficiario_id, tipo_beneficio_id);
    
    // Validar período de carência
    await this.validarCarencia(beneficiario_id, tipo_beneficio_id);
    
    // Validar quantidade de parcelas
    await this.validarQuantidadeParcelas(tipo_beneficio_id, quantidade_parcelas);
  }

  /**
   * Valida se o beneficiário já possui solicitação em andamento para o mesmo tipo de benefício
   * 
   * @param beneficiarioId ID do beneficiário
   * @param tipoBeneficioId ID do tipo de benefício
   * @throws BadRequestException se já existir solicitação em andamento
   */
  private async validarDuplicidadeSolicitacao(beneficiarioId: string, tipoBeneficioId: string): Promise<void> {
    // Estados em andamento: rascunho, aberta, pendente, em_analise
    const solicitacaoEmAndamento = await this.solicitacaoRepository.findOne({
      where: {
        beneficiario_id: beneficiarioId,
        tipo_beneficio_id: tipoBeneficioId,
        status: In([
          StatusSolicitacao.RASCUNHO,
          StatusSolicitacao.ABERTA,
          StatusSolicitacao.PENDENTE,
          StatusSolicitacao.EM_ANALISE,
        ]),
      },
    });

    if (solicitacaoEmAndamento) {
      throw new BadRequestException(
        `O beneficiário já possui solicitação em andamento deste tipo (Protocolo: ${solicitacaoEmAndamento.protocolo}, Status: ${solicitacaoEmAndamento.status})`
      );
    }
  }

  /**
   * Valida se o beneficiário já possui concessão ativa (pendente, concedida, suspensa, bloqueada)
   * 
   * @param beneficiarioId ID do beneficiário
   * @param tipoBeneficioId ID do tipo de benefício 
   * @throws BadRequestException se já existir concessão ativa
   */
  private async validarDuplicidadeConcessao(beneficiarioId: string, tipoBeneficioId: string): Promise<void> {
    // Buscar concessões ativas para o beneficiário e tipo de benefício
    const concessoes = await this.concessaoRepository
      .createQueryBuilder('concessao')
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .where('solicitacao.beneficiario_id = :beneficiarioId', { beneficiarioId })
      .andWhere('tipo_beneficio.id = :tipoBeneficioId', { tipoBeneficioId })
      .andWhere('concessao.status != :encerradaStatus', { encerradaStatus: StatusConcessao.ENCERRADA })
      .getMany();

    if (concessoes.length > 0) {
      throw new BadRequestException(
        'O beneficiário já possui concessão ativa (pendente, concedida, suspensa ou bloqueada) para este tipo de benefício'
      );
    }
  }

  /**
   * Valida período de carência para nova solicitação
   * - Após a 2ª concessão ENCERRADA, o beneficiário deve aguardar 12 meses
   * - Aplica-se apenas a benefícios com periodicidade diferente de 'unico'
   * 
   * @param beneficiarioId ID do beneficiário
   * @param tipoBeneficioId ID do tipo de benefício
   */
  private async validarCarencia(beneficiarioId: string, tipoBeneficioId: string): Promise<void> {
    // Verificar tipo periodicidade do benefício
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({ where: { id: tipoBeneficioId } });
    if (!tipoBeneficio) {
      throw new BadRequestException('Tipo de benefício não encontrado');
    }

    // Para periodicidade 'unica', não aplicamos carência
    if (tipoBeneficio.periodicidade === 'unico') {
      return;
    }

    // Buscar concessões encerradas para este beneficiário e tipo
    const concessoesEncerradas = await this.concessaoRepository
      .createQueryBuilder('concessao')
      .innerJoin('concessao.solicitacao', 'solicitacao')
      .innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .where('solicitacao.beneficiario_id = :beneficiarioId', { beneficiarioId })
      .andWhere('tipo_beneficio.id = :tipoBeneficioId', { tipoBeneficioId })
      .andWhere('concessao.status = :encerradaStatus', { encerradaStatus: StatusConcessao.ENCERRADA })
      .andWhere('concessao.data_encerramento IS NOT NULL')
      .orderBy('concessao.data_encerramento', 'DESC')
      .getMany();

    // Verificar se há pelo menos 2 concessões encerradas
    if (concessoesEncerradas.length >= 2) {
      const ultimaEncerrada = concessoesEncerradas[0]; // A primeira é a mais recente
      const fimCarencia = addMonths(ultimaEncerrada.dataEncerramento!, 12);
      
      if (isAfter(fimCarencia, new Date())) {
        throw new BadRequestException(
          `Carência: o beneficiário deve aguardar até ${fimCarencia.toLocaleDateString('pt-BR')} para solicitar novamente este benefício`
        );
      }
    }
  }

  /**
   * Valida quantidade de parcelas conforme periodicidade e limites do tipo de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @param quantidadeParcelas Quantidade solicitada
   * @param isJudicial Flag indicando se é determinação judicial
   */
  private async validarQuantidadeParcelas(
    tipoBeneficioId: string, 
    quantidadeParcelas?: number,
    isJudicial: boolean = false
  ): Promise<void> {
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({ where: { id: tipoBeneficioId } });
    if (!tipoBeneficio) {
      throw new BadRequestException('Tipo de benefício não encontrado');
    }

    const { periodicidade } = tipoBeneficio;
    // Acessa propriedade quantidade_maxima_parcelas dentro do objeto criterios_elegibilidade
    const quantidadeMaximaParcelas = tipoBeneficio.criterios_elegibilidade?.quantidade_maxima_parcelas || 12;

    // Verificar se quantidade foi informada
    if (!quantidadeParcelas) {
      throw new BadRequestException('Quantidade de parcelas é obrigatória');
    }

    // Para determinação judicial, apenas validar que é maior que zero
    if (isJudicial) {
      if (quantidadeParcelas <= 0) {
        throw new BadRequestException('Quantidade de parcelas deve ser maior que zero');
      }
      return;
    }

    // Para periodicidade 'unico', sempre 1 parcela
    if (periodicidade === 'unico' && quantidadeParcelas !== 1) {
      throw new BadRequestException('Benefícios de periodicidade única devem ter exatamente 1 parcela');
    }

    // Para outras periodicidades, entre 1 e o máximo permitido
    if (periodicidade !== 'unico') {
      if (quantidadeParcelas < 1 || quantidadeParcelas > quantidadeMaximaParcelas) {
        throw new BadRequestException(
          `Quantidade de parcelas deve estar entre 1 e ${quantidadeMaximaParcelas} para este tipo de benefício`
        );
      }
    }
  }

  /**
   * Valida se o documento judicial existe, está ativo e possui anexo
   * 
   * @param determinacaoJudicialId ID da determinação judicial
   * @throws BadRequestException se o documento não for válido
   */
  private async validarDocumentoJudicial(determinacaoJudicialId: string): Promise<void> {
    // Importar DeterminacaoJudicial dinamicamente para evitar dependência circular
    const { DeterminacaoJudicial } = await import('../../../entities/determinacao-judicial.entity');
    const determinacaoRepo = this.solicitacaoRepository.manager.getRepository(DeterminacaoJudicial);
    
    const determinacao = await determinacaoRepo.findOne({
      where: { id: determinacaoJudicialId }
    });
    
    if (!determinacao) {
      throw new BadRequestException(`Determinação judicial com ID ${determinacaoJudicialId} não encontrada`);
    }
    
    if (!determinacao.ativo) {
      throw new BadRequestException('A determinação judicial informada não está ativa');
    }
    
    if (!determinacao.documento_url) {
      throw new BadRequestException('A determinação judicial deve possuir documento anexado');
    }
    
    this.logger.debug(`Determinação judicial ${determinacaoJudicialId} validada com sucesso`);
  }
}
