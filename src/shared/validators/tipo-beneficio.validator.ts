import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidateBy,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Solicitacao } from '@/entities/solicitacao.entity';
import { TipoBeneficio } from '@/entities/tipo-beneficio.entity';

/**
 * Validator que verifica se o tipo de benefício da solicitação corresponde ao código esperado
 */
@ValidatorConstraint({ name: 'tipoBeneficio', async: true })
@Injectable()
export class TipoBeneficioValidator implements ValidatorConstraintInterface {
  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepo: Repository<Solicitacao>,
    @InjectRepository(TipoBeneficio)
    private readonly tipoBeneficioRepo: Repository<TipoBeneficio>,
  ) {}

  async validate(
    solicitacaoId: string,
    args: ValidationArguments,
  ): Promise<boolean> {
    if (!solicitacaoId) {
      return false;
    }

    const codigoEsperado = args.constraints[0];
    if (!codigoEsperado) {
      return false;
    }

    try {
      const solicitacao = await this.solicitacaoRepo.findOne({
        where: { id: solicitacaoId },
        relations: ['tipo_beneficio'],
      });

      if (!solicitacao) {
        return false;
      }

      return solicitacao.tipo_beneficio?.codigo === codigoEsperado;
    } catch (error) {
      // Em caso de erro na consulta, consideramos inválido
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const codigoEsperado = args.constraints[0];
    return `O tipo de benefício da solicitação deve corresponder a '${codigoEsperado}'`;
  }
}

/**
 * Decorator para validar se o tipo de benefício da solicitação corresponde ao código esperado
 *
 * @param codigo - Código do tipo de benefício esperado (ex: 'aluguel-social', 'natalidade')
 * @returns Decorator de validação
 *
 * @example
 * ```typescript
 * class CreateDadosDto {
 *   @ValidateTipoBeneficio('aluguel-social')
 *   solicitacao_id: string;
 * }
 * ```
 */
export function ValidateTipoBeneficio(codigo: string) {
  return ValidateBy({
    name: 'tipoBeneficio',
    constraints: [codigo],
    validator: TipoBeneficioValidator,
  });
}
