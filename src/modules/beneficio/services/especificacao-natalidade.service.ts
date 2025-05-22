import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EspecificacaoNatalidadeRepository } from '../repositories/especificacao-natalidade.repository';
import { CreateEspecificacaoNatalidadeDto } from '../dto/create-especificacao-natalidade.dto';
import { UpdateEspecificacaoNatalidadeDto } from '../dto/update-especificacao-natalidade.dto';
import { BeneficioService } from './beneficio.service';

/**
 * Serviço para gerenciamento de especificações do Auxílio Natalidade
 * 
 * Implementa a lógica de negócio relacionada às configurações específicas
 * do benefício de Auxílio Natalidade.
 */
@Injectable()
export class EspecificacaoNatalidadeService {
  constructor(
    private readonly especificacaoRepository: EspecificacaoNatalidadeRepository,
    private readonly beneficioService: BeneficioService,
  ) {}

  /**
   * Obtém a especificação de natalidade para um tipo de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Especificação do benefício de natalidade
   */
  async findByTipoBeneficio(tipoBeneficioId: string) {
    // Verificar se o tipo de benefício existe
    await this.beneficioService.findById(tipoBeneficioId);

    // Buscar a especificação
    const especificacao = await this.especificacaoRepository.findByTipoBeneficio(tipoBeneficioId);

    if (!especificacao) {
      throw new NotFoundException(
        `Especificação de Auxílio Natalidade não encontrada para o benefício ${tipoBeneficioId}`,
      );
    }

    return especificacao;
  }

  /**
   * Cria uma nova especificação de natalidade
   * 
   * @param createDto Dados para criação da especificação
   * @returns Especificação criada
   */
  async create(createDto: CreateEspecificacaoNatalidadeDto) {
    // Verificar se o tipo de benefício existe
    await this.beneficioService.findById(createDto.tipo_beneficio_id);

    // Verificar se já existe uma especificação para este tipo de benefício
    const existingEspecificacao = await this.especificacaoRepository.findByTipoBeneficio(createDto.tipo_beneficio_id);

    if (existingEspecificacao) {
      throw new ConflictException(
        `Já existe uma especificação de Auxílio Natalidade para o benefício ${createDto.tipo_beneficio_id}`,
      );
    }

    // Validações específicas
    if (createDto.tempo_gestacao_minimo && createDto.tempo_gestacao_minimo > 40) {
      throw new BadRequestException(
        'Tempo mínimo de gestação não deve exceder 40 semanas',
      );
    }

    return this.especificacaoRepository.create(createDto);
  }

  /**
   * Atualiza uma especificação de natalidade existente
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @param updateDto Dados para atualização da especificação
   * @returns Especificação atualizada
   */
  async update(tipoBeneficioId: string, updateDto: UpdateEspecificacaoNatalidadeDto) {
    // Buscar a especificação existente
    const especificacao = await this.findByTipoBeneficio(tipoBeneficioId);

    // Validações específicas
    if (updateDto.tempo_gestacao_minimo && updateDto.tempo_gestacao_minimo > 40) {
      throw new BadRequestException(
        'Tempo mínimo de gestação não deve exceder 40 semanas',
      );
    }

    return this.especificacaoRepository.update(especificacao.id, updateDto);
  }

  /**
   * Remove uma especificação de natalidade
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
      message: `Especificação de Auxílio Natalidade removida com sucesso para o benefício ${tipoBeneficioId}`,
    };
  }
}
