import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { EspecificacaoFuneralRepository } from '../repositories/especificacao-funeral.repository';
import { CreateEspecificacaoFuneralDto } from '../dto/create-especificacao-funeral.dto';
import { UpdateEspecificacaoFuneralDto } from '../dto/update-especificacao-funeral.dto';
import { EspecificacaoFuneral } from '../entities/especificacao-funeral.entity';
import { BeneficioService } from './beneficio.service';

/**
 * Serviço para gerenciar as especificações do Auxílio Funeral
 */
@Injectable()
export class EspecificacaoFuneralService {
  constructor(
    private readonly especificacaoFuneralRepository: EspecificacaoFuneralRepository,
    private readonly beneficioService: BeneficioService,
  ) {}

  /**
   * Busca a especificação de auxílio funeral para um tipo de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Especificação do benefício de auxílio funeral
   */
  async findByTipoBeneficio(tipoBeneficioId: string): Promise<EspecificacaoFuneral> {
    // Verificar se o tipo de benefício existe
    await this.beneficioService.findById(tipoBeneficioId);

    // Buscar a especificação
    const especificacao = await this.especificacaoFuneralRepository.findByTipoBeneficio(tipoBeneficioId);

    if (!especificacao) {
      throw new NotFoundException(
        `Especificação de Auxílio Funeral não encontrada para o benefício ${tipoBeneficioId}`,
      );
    }

    return especificacao;
  }

  /**
   * Cria uma nova especificação de Auxílio Funeral
   * 
   * @param createDto DTO com os dados para criação
   * @returns A especificação criada
   */
  async create(createDto: CreateEspecificacaoFuneralDto): Promise<EspecificacaoFuneral> {
    // Verificar se o tipo de benefício existe
    await this.beneficioService.findById(createDto.tipo_beneficio_id);

    // Verificar se já existe uma especificação para este tipo de benefício
    const existingSpec = await this.especificacaoFuneralRepository.findByTipoBeneficio(
      createDto.tipo_beneficio_id,
    );

    if (existingSpec) {
      throw new ConflictException(
        `Já existe uma especificação de Auxílio Funeral para o benefício ${createDto.tipo_beneficio_id}`,
      );
    }

    // Validações específicas
    if (createDto.valor_maximo && createDto.valor_maximo <= 0) {
      throw new BadRequestException('O valor máximo deve ser maior que zero');
    }

    if (!createDto.permite_cremacao && !createDto.permite_sepultamento) {
      throw new BadRequestException('Pelo menos um tipo de serviço deve ser permitido (cremação ou sepultamento)');
    }

    // Verificar se os documentos necessários estão definidos
    if (!createDto.documentos_necessarios || createDto.documentos_necessarios.length === 0) {
      throw new BadRequestException('Pelo menos um documento necessário deve ser especificado');
    }

    return this.especificacaoFuneralRepository.create(createDto);
  }

  /**
   * Busca uma especificação pelo ID
   * 
   * @param id ID da especificação
   * @returns A especificação encontrada
   */
  async findOne(id: string): Promise<EspecificacaoFuneral> {
    const especificacao = await this.especificacaoFuneralRepository.findOne(id);
    
    if (!especificacao) {
      throw new NotFoundException(`Especificação de Auxílio Funeral com ID ${id} não encontrada`);
    }
    
    return especificacao;
  }

  /**
   * Atualiza uma especificação existente
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @param updateDto Dados para atualização
   * @returns A especificação atualizada
   */
  async update(
    tipoBeneficioId: string, 
    updateDto: UpdateEspecificacaoFuneralDto
  ): Promise<EspecificacaoFuneral> {
    // Buscar a especificação existente
    const especificacao = await this.findByTipoBeneficio(tipoBeneficioId);

    // Validações específicas
    if (updateDto.valor_maximo && updateDto.valor_maximo <= 0) {
      throw new BadRequestException('O valor máximo deve ser maior que zero');
    }

    if (
      (updateDto.permite_cremacao === false && updateDto.permite_sepultamento === false) ||
      (updateDto.permite_cremacao === false && especificacao.permite_sepultamento === false) ||
      (especificacao.permite_cremacao === false && updateDto.permite_sepultamento === false)
    ) {
      throw new BadRequestException('Pelo menos um tipo de serviço deve ser permitido (cremação ou sepultamento)');
    }

    // Verificar se os documentos necessários estão definidos
    if (updateDto.documentos_necessarios && updateDto.documentos_necessarios.length === 0) {
      throw new BadRequestException('Pelo menos um documento necessário deve ser especificado');
    }

    return this.especificacaoFuneralRepository.update(especificacao.id, updateDto);
  }

  /**
   * Remove uma especificação
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Mensagem de confirmação
   */
  async remove(tipoBeneficioId: string) {
    // Buscar a especificação existente
    const especificacao = await this.findByTipoBeneficio(tipoBeneficioId);

    // Remover especificação
    await this.especificacaoFuneralRepository.remove(especificacao.id);

    return {
      message: `Especificação de Auxílio Funeral removida com sucesso para o benefício ${tipoBeneficioId}`,
    };
  }
}
