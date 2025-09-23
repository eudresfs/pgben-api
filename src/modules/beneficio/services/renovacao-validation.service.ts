import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IRenovacaoValidationService } from '../interfaces';
import { Concessao, Solicitacao, TipoBeneficio } from '@/entities';
import { StatusConcessao, TipoSolicitacaoEnum, StatusSolicitacao } from '@/enums';

/**
 * Serviço responsável por validar a elegibilidade de concessões para renovação
 * Implementa todas as regras de negócio definidas no ADR de renovação
 */
@Injectable()
export class RenovacaoValidationService implements IRenovacaoValidationService {
  private readonly logger = new Logger(RenovacaoValidationService.name);

  constructor(
    @InjectRepository(Concessao)
    private readonly concessaoRepository: Repository<Concessao>,
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    @InjectRepository(TipoBeneficio)
    private readonly tipoBeneficioRepository: Repository<TipoBeneficio>,
  ) {}

  /**
   * Valida se uma concessão é elegível para renovação
   * @param concessaoId ID da concessão a ser validada
   * @param usuarioId ID do usuário solicitante (usado apenas para verificar renovações em andamento)
   * @returns Resultado da validação com motivos se não elegível
   */
  async validarElegibilidade(
    concessaoId: string,
    usuarioId: string,
  ): Promise<{ podeRenovar: boolean; motivos?: string[] }> {
    try {
      const motivos: string[] = [];

      // Verificar se a concessão existe (removida restrição de proprietário)
      const concessao = await this.concessaoRepository.findOne({
        where: { id: concessaoId },
        relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
      });

      if (!concessao) {
        motivos.push('Concessão não encontrada');
        return { podeRenovar: false, motivos };
      }

      let podeRenovar = true;

      // Nota: Removida validação de proprietário - renovação pode ser feita por qualquer usuário autorizado

      // 2. Verificar status da concessão
      const statusValido = await this.verificarStatusConcessao(concessaoId);
      if (!statusValido) {
        motivos.push('Concessão deve estar com status CESSADO para ser renovada');
        podeRenovar = false;
      }

      // 3. Verificar se o tipo de benefício permite renovação
      const tipoBeneficioPermiteRenovacao = await this.verificarTipoBeneficioPermiteRenovacao(
        concessao.solicitacao.tipo_beneficio_id
      );
      if (!tipoBeneficioPermiteRenovacao) {
        motivos.push('Este tipo de benefício não permite renovação');
        podeRenovar = false;
      }

      // 4. Verificar se a solicitação original já foi renovada
      const jaFoiRenovada = await this.verificarSolicitacaoJaRenovada(concessao.solicitacao.id);
      if (jaFoiRenovada) {
        motivos.push('Esta solicitação já foi renovada');
        podeRenovar = false;
      }

      // 5. Verificar se já existe renovação em andamento
      const renovacaoEmAndamento = await this.verificarRenovacaoEmAndamento(concessaoId, usuarioId);
      if (renovacaoEmAndamento) {
        motivos.push('Já existe uma solicitação de renovação em andamento para esta concessão');
        podeRenovar = false;
      }

      // 6. Verificar período mínimo entre renovações (se aplicável)
      const periodoMinimoRespeitado = await this.verificarPeriodoMinimoRenovacao(
        concessao.solicitacao.tipo_beneficio_id,
        concessaoId
      );
      if (!periodoMinimoRespeitado) {
        motivos.push('Período mínimo entre renovações não foi respeitado');
        podeRenovar = false;
      }

      this.logger.log(`Validação concluída - Pode renovar: ${podeRenovar}, Motivos: ${motivos.length}`);
      
      return {
        podeRenovar,
        motivos: motivos.length > 0 ? motivos : undefined,
      };
    } catch (error) {
      this.logger.error(`Erro ao validar elegibilidade para renovação: ${error.message}`, error.stack);
      throw new BadRequestException('Erro interno ao validar elegibilidade para renovação');
    }
  }

  /**
   * Verifica se já existe uma renovação em andamento para a concessão
   */
  async verificarRenovacaoEmAndamento(concessaoId: string, usuarioId: string): Promise<boolean> {
    try {
      const renovacaoExistente = await this.solicitacaoRepository.findOne({
        where: {
          beneficiario_id: usuarioId,
          tipo: TipoSolicitacaoEnum.RENOVACAO,
          status: StatusSolicitacao.RASCUNHO || StatusSolicitacao.PENDENTE || StatusSolicitacao.EM_ANALISE,
          dados_complementares: {
            concessao_renovada_id: concessaoId
          }
        }
      });

      return !!renovacaoExistente;
    } catch (error) {
      this.logger.error(`Erro ao verificar renovação em andamento: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifica se a concessão está no status adequado para renovação
   * Apenas concessões CESSADAS podem ser renovadas
   */
  async verificarStatusConcessao(concessaoId: string): Promise<boolean> {
    try {
      const concessao = await this.concessaoRepository.findOne({
        where: { id: concessaoId },
        select: ['status']
      });

      return concessao?.status === StatusConcessao.CESSADO;
    } catch (error) {
      this.logger.error(`Erro ao verificar status da concessão: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifica se o tipo de benefício permite renovação
   */
  async verificarTipoBeneficioPermiteRenovacao(tipoBeneficioId: string): Promise<boolean> {
    try {
      const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
        where: { id: tipoBeneficioId },
        select: ['permiteRenovacao']
      });

      return tipoBeneficio?.permiteRenovacao === true;
    } catch (error) {
      this.logger.error(`Erro ao verificar se tipo de benefício permite renovação: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifica se o período mínimo entre renovações foi respeitado
   */
  private async verificarPeriodoMinimoRenovacao(tipoBeneficioId: string, concessaoId: string): Promise<boolean> {
    try {
      // Buscar configuração do período mínimo
      const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
        where: { id: tipoBeneficioId },
        select: ['periodoMinimoRenovacao']
      });

      // Se não há período mínimo configurado, permite renovação
      if (!tipoBeneficio?.periodoMinimoRenovacao) {
        return true;
      }

      // Buscar a última renovação aprovada para este beneficiário
      const ultimaRenovacao = await this.solicitacaoRepository
        .createQueryBuilder('solicitacao')
        .innerJoin('solicitacao.concessao', 'concessao')
        .where('solicitacao.tipo = :tipo', { tipo: TipoSolicitacaoEnum.RENOVACAO })
        .andWhere('solicitacao.status = :status', { status: StatusSolicitacao.APROVADA })
        .andWhere('solicitacao.dados_complementares ->> \'concessao_renovada_id\' = :concessaoId', { concessaoId })
        .orderBy('solicitacao.data_aprovacao', 'DESC')
        .getOne();

      if (!ultimaRenovacao) {
        return true; // Primeira renovação, pode prosseguir
      }

      // Calcular diferença em meses
      const agora = new Date();
      const dataUltimaRenovacao = ultimaRenovacao.data_aprovacao;
      const mesesDecorridos = this.calcularMesesEntreDatas(dataUltimaRenovacao, agora);

      return mesesDecorridos >= tipoBeneficio.periodoMinimoRenovacao;
    } catch (error) {
      this.logger.error(`Erro ao verificar período mínimo de renovação: ${error.message}`);
      return true; // Em caso de erro, permite renovação
    }
  }

  /**
   * Verifica se a solicitação original já foi renovada
   * @param solicitacaoId ID da solicitação original
   * @returns Promise<boolean> - true se já foi renovada
   */
  private async verificarSolicitacaoJaRenovada(solicitacaoId: string): Promise<boolean> {
    try {
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        select: ['solicitacao_renovada_id']
      });

      // Se solicitacao_renovada_id não é null, significa que já foi renovada
      return !!solicitacao?.solicitacao_renovada_id;
    } catch (error) {
      this.logger.error(`Erro ao verificar se solicitação já foi renovada: ${error.message}`);
      return false; // Em caso de erro, permite renovação
    }
  }

  /**
   * Calcula a diferença em meses entre duas datas
   */
  private calcularMesesEntreDatas(dataInicial: Date, dataFinal: Date): number {
    const anosDiff = dataFinal.getFullYear() - dataInicial.getFullYear();
    const mesesDiff = dataFinal.getMonth() - dataInicial.getMonth();
    return anosDiff * 12 + mesesDiff;
  }
}