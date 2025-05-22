import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EspecificacaoAluguelSocialRepository } from '../repositories/especificacao-aluguel-social.repository';
import { CreateEspecificacaoAluguelSocialDto } from '../dto/create-especificacao-aluguel-social.dto';
import { UpdateEspecificacaoAluguelSocialDto } from '../dto/update-especificacao-aluguel-social.dto';
import { BeneficioService } from './beneficio.service';

/**
 * Serviço para gerenciamento de especificações do Aluguel Social
 * 
 * Implementa a lógica de negócio relacionada às configurações específicas
 * do benefício de Aluguel Social.
 */
@Injectable()
export class EspecificacaoAluguelSocialService {
  constructor(
    private readonly especificacaoRepository: EspecificacaoAluguelSocialRepository,
    private readonly beneficioService: BeneficioService,
  ) {}

  /**
   * Obtém a especificação de aluguel social para um tipo de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Especificação do benefício de aluguel social
   */
  async findByTipoBeneficio(tipoBeneficioId: string) {
    // Verificar se o tipo de benefício existe
    await this.beneficioService.findById(tipoBeneficioId);

    // Buscar a especificação
    const especificacao = await this.especificacaoRepository.findByTipoBeneficio(tipoBeneficioId);

    if (!especificacao) {
      throw new NotFoundException(
        `Especificação de Aluguel Social não encontrada para o benefício ${tipoBeneficioId}`,
      );
    }

    return especificacao;
  }

  /**
   * Cria uma nova especificação de aluguel social
   * 
   * @param createDto Dados para criação da especificação
   * @returns Especificação criada
   */
  async create(createDto: CreateEspecificacaoAluguelSocialDto) {
    // Verificar se o tipo de benefício existe
    await this.beneficioService.findById(createDto.tipo_beneficio_id);

    // Verificar se já existe uma especificação para este tipo de benefício
    const existingEspecificacao = await this.especificacaoRepository.findByTipoBeneficio(createDto.tipo_beneficio_id);

    if (existingEspecificacao) {
      throw new ConflictException(
        `Já existe uma especificação de Aluguel Social para o benefício ${createDto.tipo_beneficio_id}`,
      );
    }

    // Validações específicas
    if (createDto.duracao_maxima_meses > 48) {
      throw new BadRequestException(
        'Duração máxima não pode exceder 48 meses (4 anos)',
      );
    }

    if (createDto.permite_prorrogacao && !createDto.tempo_maximo_prorrogacao_meses) {
      throw new BadRequestException(
        'Tempo máximo de prorrogação é obrigatório quando permite prorrogação',
      );
    }

    // Verificar se os motivos válidos estão definidos
    if (!createDto.motivos_validos || createDto.motivos_validos.length === 0) {
      throw new BadRequestException(
        'Pelo menos um motivo válido deve ser especificado',
      );
    }

    return this.especificacaoRepository.create(createDto);
  }

  /**
   * Atualiza uma especificação de aluguel social existente
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @param updateDto Dados para atualização da especificação
   * @returns Especificação atualizada
   */
  async update(tipoBeneficioId: string, updateDto: UpdateEspecificacaoAluguelSocialDto) {
    // Buscar a especificação existente
    const especificacao = await this.findByTipoBeneficio(tipoBeneficioId);

    // Validações específicas
    if (updateDto.duracao_maxima_meses && updateDto.duracao_maxima_meses > 48) {
      throw new BadRequestException(
        'Duração máxima não pode exceder 48 meses (4 anos)',
      );
    }

    // Verificar consistência de prorrogação
    if (updateDto.permite_prorrogacao === true && 
        !updateDto.tempo_maximo_prorrogacao_meses && 
        !especificacao.tempo_maximo_prorrogacao_meses) {
      throw new BadRequestException(
        'Tempo máximo de prorrogação é obrigatório quando permite prorrogação',
      );
    }

    // Verificar se os motivos válidos estão definidos
    if (updateDto.motivos_validos && updateDto.motivos_validos.length === 0) {
      throw new BadRequestException(
        'Pelo menos um motivo válido deve ser especificado',
      );
    }

    return this.especificacaoRepository.update(especificacao.id, updateDto);
  }

  /**
   * Remove uma especificação de aluguel social
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Mensagem de confirmação
   */
  async remove(tipoBeneficioId: string) {
    // Buscar a especificação existente
    const especificacao = await this.findByTipoBeneficio(tipoBeneficioId);

    // Remover especificação
    await this.especificacaoRepository.remove(especificacao.id);

    return {
      message: `Especificação de Aluguel Social removida com sucesso para o benefício ${tipoBeneficioId}`,
    };
  }
}
