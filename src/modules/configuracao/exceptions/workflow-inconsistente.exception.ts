import { BadRequestException } from '@nestjs/common';

/**
 * Exceção lançada quando um workflow possui inconsistências em sua definição.
 * Estende a BadRequestException padrão do NestJS com mensagem personalizada.
 */
export class WorkflowInconsistenteException extends BadRequestException {
  /**
   * Cria uma nova instância da exceção.
   * @param tipoBeneficioId - ID do tipo de benefício
   * @param motivo - Motivo da inconsistência
   */
  constructor(tipoBeneficioId: string, motivo: string) {
    super(
      `Workflow para tipo de benefício '${tipoBeneficioId}' inconsistente: ${motivo}`,
    );
  }
}
