import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { EspecificacaoCestaBasicaRepository } from '../repositories/especificacao-cesta-basica.repository';
import { CreateEspecificacaoCestaBasicaDto } from '../dto/create-especificacao-cesta-basica.dto';
import { UpdateEspecificacaoCestaBasicaDto } from '../dto/update-especificacao-cesta-basica.dto';
import { EspecificacaoCestaBasica } from '../entities/especificacao-cesta-basica.entity';
import { BeneficioService } from './beneficio.service';

/**
 * Serviço para gerenciar as especificações da Cesta Básica
 */
@Injectable()
export class EspecificacaoCestaBasicaService {
  constructor(
    private readonly especificacaoCestaBasicaRepository: EspecificacaoCestaBasicaRepository,
    private readonly beneficioService: BeneficioService,
  ) {}

  /**
   * Busca a especificação de cesta básica para um tipo de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Especificação do benefício de cesta básica
   */
  async findByTipoBeneficio(tipoBeneficioId: string): Promise<EspecificacaoCestaBasica> {
    // Verificar se o tipo de benefício existe
    await this.beneficioService.findById(tipoBeneficioId);

    // Buscar a especificação
    const especificacao = await this.especificacaoCestaBasicaRepository.findByTipoBeneficio(tipoBeneficioId);

    if (!especificacao) {
      throw new NotFoundException(
        `Especificação de Cesta Básica não encontrada para o benefício ${tipoBeneficioId}`,
      );
    }

    return especificacao;
  }

  /**
   * Cria uma nova especificação de Cesta Básica
   * 
   * @param createDto DTO com os dados para criação
   * @returns A especificação criada
   */
  async create(createDto: CreateEspecificacaoCestaBasicaDto): Promise<EspecificacaoCestaBasica> {
    // Verificar se o tipo de benefício existe
    await this.beneficioService.findById(createDto.tipo_beneficio_id);

    // Verificar se já existe uma especificação para este tipo de benefício
    const existingSpec = await this.especificacaoCestaBasicaRepository.findByTipoBeneficio(
      createDto.tipo_beneficio_id,
    );

    if (existingSpec) {
      throw new ConflictException(
        `Já existe uma especificação de Cesta Básica para o benefício ${createDto.tipo_beneficio_id}`,
      );
    }

    // Verificar se os itens obrigatórios estão definidos
    if (!createDto.itens_obrigatorios || createDto.itens_obrigatorios.length === 0) {
      throw new BadRequestException('Pelo menos um item obrigatório deve ser especificado');
    }

    return this.especificacaoCestaBasicaRepository.create(createDto);
  }

  /**
   * Busca uma especificação pelo ID
   * 
   * @param id ID da especificação
   * @returns A especificação encontrada
   */
  async findOne(id: string): Promise<EspecificacaoCestaBasica> {
    const especificacao = await this.especificacaoCestaBasicaRepository.findOne(id);
    if (!especificacao) {
      throw new NotFoundException(`Especificação de Cesta Básica com ID ${id} não encontrada`);
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
    updateDto: UpdateEspecificacaoCestaBasicaDto
  ): Promise<EspecificacaoCestaBasica> {
    // Buscar a especificação existente
    const especificacao = await this.findByTipoBeneficio(tipoBeneficioId);

    // Validações específicas
    if (updateDto.peso_total_kg && updateDto.peso_total_kg <= 0) {
      throw new BadRequestException('O peso total deve ser maior que zero');
    }

    if (updateDto.valor_estimado && updateDto.valor_estimado <= 0) {
      throw new BadRequestException('O valor estimado deve ser maior que zero');
    }

    // Verificar se os itens obrigatórios estão definidos
    if (updateDto.itens_obrigatorios && updateDto.itens_obrigatorios.length === 0) {
      throw new BadRequestException('Pelo menos um item obrigatório deve ser especificado');
    }

    return this.especificacaoCestaBasicaRepository.update(especificacao.id, updateDto);
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
    await this.especificacaoCestaBasicaRepository.remove(especificacao.id);

    return {
      message: `Especificação de Cesta Básica removida com sucesso para o benefício ${tipoBeneficioId}`,
    };
  }
}
