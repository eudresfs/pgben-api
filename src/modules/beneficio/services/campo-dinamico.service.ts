import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampoDinamicoBeneficio } from '../../../entities/campo-dinamico-beneficio.entity';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import { CreateCampoDinamicoDto } from '../dto/create-campo-dinamico.dto';
import { TipoBeneficioSchema } from '../../../entities/tipo-beneficio-schema.entity';

/**
 * Serviço de Campos Dinâmicos
 *
 * Responsável pela lógica de negócio relacionada aos campos dinâmicos
 * de benefícios, incluindo criação, atualização e versionamento de schema.
 */
@Injectable()
export class CampoDinamicoService {
  constructor(
    @InjectRepository(CampoDinamicoBeneficio)
    private campoDinamicoRepository: Repository<CampoDinamicoBeneficio>,

    @InjectRepository(TipoBeneficio)
    private tipoBeneficioRepository: Repository<TipoBeneficio>,

    @InjectRepository(TipoBeneficioSchema)
    private tipoBeneficioSchemaRepository: Repository<TipoBeneficioSchema>,
  ) {}

  /**
   * Lista todos os campos dinâmicos de um tipo de benefício
   *
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Lista de campos dinâmicos
   */
  async findByTipoBeneficio(tipoBeneficioId: string) {
    // Verificar se o tipo de benefício existe
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
      where: { id: tipoBeneficioId },
    });

    if (!tipoBeneficio) {
      throw new NotFoundException(
        `Tipo de benefício com ID ${tipoBeneficioId} não encontrado`,
      );
    }

    // Buscar campos dinâmicos
    return this.campoDinamicoRepository.find({
      where: { tipo_beneficio_id: tipoBeneficioId },
      order: { ordem: 'ASC' },
    });
  }

  /**
   * Cria um novo campo dinâmico para um tipo de benefício
   *
   * @param tipoBeneficioId ID do tipo de benefício
   * @param createCampoDinamicoDto Dados do campo dinâmico
   * @returns Campo dinâmico criado
   */
  async create(
    tipoBeneficioId: string,
    createCampoDinamicoDto: CreateCampoDinamicoDto,
  ) {
    // Verificar se o tipo de benefício existe
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
      where: { id: tipoBeneficioId },
    });

    if (!tipoBeneficio) {
      throw new NotFoundException(
        `Tipo de benefício com ID ${tipoBeneficioId} não encontrado`,
      );
    }

    // Verificar se já existe um campo com o mesmo nome para este tipo de benefício
    const campoExistente = await this.campoDinamicoRepository.findOne({
      where: {
        tipo_beneficio_id: tipoBeneficioId,
        nome: createCampoDinamicoDto.nome,
      },
    });

    if (campoExistente) {
      throw new ConflictException(
        `Já existe um campo com o nome '${createCampoDinamicoDto.nome}' para este tipo de benefício`,
      );
    }

    // Adaptar os tipos para garantir compatibilidade
    const { validacoes, ...restoCampos } = createCampoDinamicoDto;

    // Criar o objeto de campo dinâmico com os tipos corretos
    // Para resolver o erro de TypeScript, precisamos garantir que o tipo do campo validacoes
    // seja compatível com a definição da entidade
    const campoDinamico = this.campoDinamicoRepository.create({
      ...restoCampos,
      tipo_beneficio_id: tipoBeneficioId,
      validacoes: validacoes
        ? {
            min:
              typeof validacoes.min === 'string'
                ? parseFloat(validacoes.min)
                : validacoes.min,
            max:
              typeof validacoes.max === 'string'
                ? parseFloat(validacoes.max)
                : validacoes.max,
            minLength: validacoes.minLength,
            maxLength: validacoes.maxLength,
            pattern: validacoes.pattern,
            enum: validacoes.enum,
            format: validacoes.format,
          }
        : undefined,
    });

    const campoCriado = await this.campoDinamicoRepository.save(campoDinamico);

    // Atualizar versionamento do schema
    await this.criarNovaVersaoSchema(tipoBeneficioId);

    return campoCriado;
  }

  /**
   * Atualiza um campo dinâmico existente
   *
   * @param id ID do campo dinâmico
   * @param updateCampoDinamicoDto Dados atualizados do campo dinâmico
   * @returns Campo dinâmico atualizado
   */
  async update(
    id: string,
    updateCampoDinamicoDto: Partial<CreateCampoDinamicoDto>,
  ) {
    // Verificar se o campo dinâmico existe
    const campoDinamico = await this.campoDinamicoRepository.findOne({
      where: { id },
      relations: ['tipo_beneficio'],
    });

    if (!campoDinamico) {
      throw new NotFoundException(`Campo dinâmico com ID ${id} não encontrado`);
    }

    // Se estiver alterando o nome, verificar se já existe outro com o mesmo nome
    if (
      updateCampoDinamicoDto.nome &&
      updateCampoDinamicoDto.nome !== campoDinamico.nome
    ) {
      const campoExistente = await this.campoDinamicoRepository.findOne({
        where: {
          tipo_beneficio_id: campoDinamico.tipo_beneficio_id,
          nome: updateCampoDinamicoDto.nome,
        },
      });

      if (campoExistente) {
        throw new ConflictException(
          `Já existe um campo com o nome '${updateCampoDinamicoDto.nome}' para este tipo de benefício`,
        );
      }
    }

    // Atualizar campo dinâmico
    Object.assign(campoDinamico, updateCampoDinamicoDto);
    const campoAtualizado =
      await this.campoDinamicoRepository.save(campoDinamico);

    // Atualizar versionamento do schema
    await this.criarNovaVersaoSchema(campoDinamico.tipo_beneficio_id);

    return campoAtualizado;
  }

  /**
   * Remove um campo dinâmico (soft delete)
   *
   * @param id ID do campo dinâmico
   * @returns Resultado da operação
   */
  async remove(id: string) {
    // Verificar se o campo dinâmico existe
    const campoDinamico = await this.campoDinamicoRepository.findOne({
      where: { id },
    });

    if (!campoDinamico) {
      throw new NotFoundException(`Campo dinâmico com ID ${id} não encontrado`);
    }

    // Remover campo dinâmico (soft delete)
    const tipoBeneficioId = campoDinamico.tipo_beneficio_id;
    await this.campoDinamicoRepository.softRemove(campoDinamico);

    // Atualizar versionamento do schema
    await this.criarNovaVersaoSchema(tipoBeneficioId);

    return { message: 'Campo dinâmico removido com sucesso' };
  }

  /**
   * Cria uma nova versão do schema para um tipo de benefício
   *
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Nova versão do schema
   */
  private async criarNovaVersaoSchema(tipoBeneficioId: string) {
    // Buscar campos dinâmicos ativos
    const campos = await this.campoDinamicoRepository.find({
      where: { tipo_beneficio_id: tipoBeneficioId, ativo: true },
      order: { ordem: 'ASC' },
    });

    // Buscar última versão do schema
    const ultimaVersao = await this.tipoBeneficioSchemaRepository.findOne({
      where: { tipo_beneficio_id: tipoBeneficioId },
      order: { versao: 'DESC' },
    });

    const novaVersao = ultimaVersao ? ultimaVersao.versao + 1 : 1;

    // Construir estrutura de campos
    const camposEstrutura = campos.map((campo) => {
      // Mapear TipoDado para os tipos aceitos por CampoEstrutura
      let tipoMapeado:
        | 'string'
        | 'number'
        | 'boolean'
        | 'date'
        | 'enum'
        | 'array';
      switch (campo.tipo) {
        case 'string':
          tipoMapeado = 'string';
          break;
        case 'number':
          tipoMapeado = 'number';
          break;
        case 'boolean':
          tipoMapeado = 'boolean';
          break;
        case 'date':
          tipoMapeado = 'date';
          break;
        case 'array':
          tipoMapeado = 'array';
          break;
        case 'object':
        default:
          tipoMapeado = 'string'; // Fallback para string
          break;
      }

      return {
        nome: campo.nome,
        tipo: tipoMapeado,
        obrigatorio: campo.obrigatorio,
        label: campo.label,
        descricao: campo.descricao,
        validacoes: campo.validacoes,
      };
    });

    // Desativar versões anteriores
    if (ultimaVersao) {
      await this.tipoBeneficioSchemaRepository.update(
        { tipo_beneficio_id: tipoBeneficioId },
        { ativo: false },
      );
    }

    // Criar nova versão
    const novaVersaoSchema = this.tipoBeneficioSchemaRepository.create({
      tipo_beneficio_id: tipoBeneficioId,
      entidade_dados: 'DadosDinamicos',
      schema_estrutura: {
        campos: camposEstrutura,
        metadados: {
          versao: `${novaVersao}.0.0`,
          descricao: `Versão ${novaVersao} - Atualização automática`,
          categoria: 'beneficio_eventual',
          tags: ['dinamico'],
        },
      },
      versao: `${novaVersao}.0.0`,
      ativo: true,
    });

    return this.tipoBeneficioSchemaRepository.save(novaVersaoSchema);
  }

  /**
   * Cria um novo schema baseado nos campos dinâmicos ativos
   *
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Novo schema
   */
  private async criarNovoSchema(tipoBeneficioId: string) {
    // Buscar campos dinâmicos ativos
    const campos = await this.campoDinamicoRepository.find({
      where: { tipo_beneficio_id: tipoBeneficioId, ativo: true },
      order: { ordem: 'ASC' },
    });

    // Buscar schema existente
    const schemaExistente = await this.tipoBeneficioSchemaRepository.findOne({
      where: { tipo_beneficio_id: tipoBeneficioId },
    });

    // Desativar schema anterior se existir
    if (schemaExistente) {
      await this.tipoBeneficioSchemaRepository.update(
        { tipo_beneficio_id: tipoBeneficioId },
        { ativo: false },
      );
    }

    // Construir estrutura de campos
    const camposEstrutura = campos.map((campo) => {
      // Mapear TipoDado para os tipos aceitos por CampoEstrutura
      let tipoMapeado:
        | 'string'
        | 'number'
        | 'boolean'
        | 'date'
        | 'enum'
        | 'array';
      switch (campo.tipo) {
        case 'string':
          tipoMapeado = 'string';
          break;
        case 'number':
          tipoMapeado = 'number';
          break;
        case 'boolean':
          tipoMapeado = 'boolean';
          break;
        case 'date':
          tipoMapeado = 'date';
          break;
        case 'array':
          tipoMapeado = 'array';
          break;
        case 'object':
        default:
          tipoMapeado = 'string'; // Fallback para string
          break;
      }

      return {
        nome: campo.nome,
        tipo: tipoMapeado,
        obrigatorio: campo.obrigatorio,
        label: campo.label,
        descricao: campo.descricao,
        validacoes: campo.validacoes,
      };
    });

    // Criar novo schema
    const novoSchema = this.tipoBeneficioSchemaRepository.create({
      tipo_beneficio_id: tipoBeneficioId,
      entidade_dados: 'DadosDinamicos',
      schema_estrutura: {
        campos: camposEstrutura,
        metadados: {
          versao: '1.0.0',
          descricao:
            'Schema gerado automaticamente a partir de campos dinâmicos',
          categoria: 'beneficio_eventual',
          tags: ['dinamico'],
        },
      },
      versao: '1.0.0',
      ativo: true,
    });

    return this.tipoBeneficioSchemaRepository.save(novoSchema);
  }

  /**
   * Obtém o schema ativo de um tipo de benefício
   *
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Schema ativo
   */
  async getSchemaAtivo(tipoBeneficioId: string) {
    // Verificar se o tipo de benefício existe
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
      where: { id: tipoBeneficioId },
    });

    if (!tipoBeneficio) {
      throw new NotFoundException(
        `Tipo de benefício com ID ${tipoBeneficioId} não encontrado`,
      );
    }

    // Buscar schema ativo
    const schemaAtivo = await this.tipoBeneficioSchemaRepository.findOne({
      where: { tipo_beneficio_id: tipoBeneficioId, ativo: true },
    });

    if (!schemaAtivo) {
      // Se não houver schema ativo, criar um
      return this.criarNovoSchema(tipoBeneficioId);
    }

    return schemaAtivo;
  }

  /**
   * Obtém o histórico de versões do schema de um tipo de benefício
   *
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Lista de versões do schema
   */
  async getHistoricoVersoes(tipoBeneficioId: string) {
    // Verificar se o tipo de benefício existe
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
      where: { id: tipoBeneficioId },
    });

    if (!tipoBeneficio) {
      throw new NotFoundException(
        `Tipo de benefício com ID ${tipoBeneficioId} não encontrado`,
      );
    }

    // Buscar versões do schema
    return this.tipoBeneficioSchemaRepository.find({
      where: { tipo_beneficio_id: tipoBeneficioId },
      order: { versao: 'DESC' },
    });
  }
}
