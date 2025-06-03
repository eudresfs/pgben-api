import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Solicitacao, StatusSolicitacao } from '../../../entities/solicitacao.entity';

/**
 * Serviço responsável por validar a exclusividade de papéis dos cidadãos
 * nas solicitações de benefícios.
 * 
 * Conforme requisito crítico (5.1 Exclusividade de Papéis) da especificação técnica,
 * um cidadão não pode simultaneamente ser beneficiário principal e
 * fazer parte da composição familiar de outro beneficiário.
 */
@Injectable()
export class ValidacaoExclusividadeService {
  private readonly logger = new Logger(ValidacaoExclusividadeService.name);

  constructor(
    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,
  ) {}

  /**
   * Valida se um cidadão pode ser beneficiário principal
   * verificando se ele não faz parte da composição familiar de outras solicitações ativas
   * 
   * @param cidadaoId ID do cidadão a ser validado
   * @returns true se o cidadão pode ser beneficiário, false caso contrário
   * @throws BadRequestException se o cidadão já faz parte da composição familiar de outra solicitação
   */
  async validarExclusividadeBeneficiario(cidadaoId: string): Promise<boolean> {
    this.logger.log(`Validando exclusividade de papel para cidadão ${cidadaoId}`);

    // Verifica se o cidadão faz parte da composição familiar de alguma solicitação ativa
    const solicitacoesComCidadaoNaComposicao = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where(`solicitacao.dados_complementares->'composicao_familiar' @> :membro`, {
        membro: JSON.stringify([{ cidadao_id: cidadaoId }]),
      })
      .andWhere(`solicitacao.status NOT IN (:...statusInativos)`, {
        statusInativos: [StatusSolicitacao.CANCELADA, StatusSolicitacao.INDEFERIDA, StatusSolicitacao.ARQUIVADA],
      })
      .getCount();

    if (solicitacoesComCidadaoNaComposicao > 0) {
      this.logger.warn(`Cidadão ${cidadaoId} já faz parte da composição familiar de outra solicitação ativa`);
      throw new BadRequestException(
        'Cidadão não pode ser beneficiário principal pois já faz parte da composição familiar de outra solicitação ativa',
      );
    }

    return true;
  }

  /**
   * Valida se um cidadão pode ser incluído na composição familiar
   * verificando se ele não é beneficiário principal em outras solicitações ativas
   * 
   * @param cidadaoId ID do cidadão a ser validado
   * @returns true se o cidadão pode ser incluído na composição familiar, false caso contrário
   * @throws BadRequestException se o cidadão já é beneficiário principal em outra solicitação
   */
  async validarExclusividadeComposicaoFamiliar(cidadaoId: string): Promise<boolean> {
    this.logger.log(`Validando exclusividade para composição familiar: cidadão ${cidadaoId}`);

    // Verifica se o cidadão é beneficiário principal em alguma solicitação ativa
    const solicitacoesComCidadaoBeneficiario = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where('solicitacao.beneficiario_id = :cidadaoId', { cidadaoId })
      .andWhere(`solicitacao.status NOT IN (:...statusInativos)`, {
        statusInativos: [StatusSolicitacao.CANCELADA, StatusSolicitacao.INDEFERIDA, StatusSolicitacao.ARQUIVADA],
      })
      .getCount();

    if (solicitacoesComCidadaoBeneficiario > 0) {
      this.logger.warn(`Cidadão ${cidadaoId} já é beneficiário principal em outra solicitação ativa`);
      throw new BadRequestException(
        'Cidadão não pode ser incluído na composição familiar pois já é beneficiário principal em outra solicitação ativa',
      );
    }

    return true;
  }

  /**
   * Valida a composição familiar completa, verificando se todos os membros
   * podem ser incluídos (não são beneficiários principais em outras solicitações)
   * 
   * @param composicaoFamiliar Array de IDs de cidadãos da composição familiar
   * @returns true se todos os membros podem ser incluídos na composição familiar
   * @throws BadRequestException se algum membro não pode ser incluído
   */
  async validarComposicaoFamiliarCompleta(composicaoFamiliar: string[]): Promise<boolean> {
    this.logger.log(`Validando composição familiar completa com ${composicaoFamiliar.length} membros`);
    
    // Valida cada membro da composição familiar
    for (const cidadaoId of composicaoFamiliar) {
      await this.validarExclusividadeComposicaoFamiliar(cidadaoId);
    }
    
    return true;
  }
}
