import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DadosSociais } from '../../../entities/dados-sociais.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { CreateDadosSociaisDto } from '../dto/create-dados-sociais.dto';
import { UpdateDadosSociaisDto } from '../dto/update-dados-sociais.dto';

@Injectable()
export class DadosSociaisService {
  constructor(
    @InjectRepository(DadosSociais)
    private readonly dadosSociaisRepository: Repository<DadosSociais>,
    @InjectRepository(Cidadao)
    private readonly cidadaoRepository: Repository<Cidadao>,
  ) {}

  async create(
    cidadaoId: string,
    createDadosSociaisDto: CreateDadosSociaisDto,
  ): Promise<DadosSociais> {
    return this.upsert(cidadaoId, createDadosSociaisDto);
  }

  async upsert(
    cidadaoId: string,
    createDadosSociaisDto: CreateDadosSociaisDto,
  ): Promise<DadosSociais> {
    // Verificar se o cidadão existe
    const cidadao = await this.cidadaoRepository.findOne({
      where: { id: cidadaoId },
    });

    if (!cidadao) {
      throw new NotFoundException(`Cidadão com ID ${cidadaoId} não encontrado`);
    }

    // Validar benefícios
    this.validateBeneficios(createDadosSociaisDto);

    // Buscar dados existentes
    const dadosExistentes = await this.dadosSociaisRepository.findOne({
      where: { cidadao_id: cidadaoId },
    });

    if (dadosExistentes) {
      // Atualizar dados existentes usando merge + save para garantir persistência
      this.dadosSociaisRepository.merge(dadosExistentes, {
        // Campos obrigatórios sempre atualizados
        escolaridade: createDadosSociaisDto.escolaridade,
        exerce_atividade_remunerada:
          createDadosSociaisDto.exerce_atividade_remunerada ?? false,
        recebe_pbf: createDadosSociaisDto.recebe_pbf ?? false,
        recebe_bpc: createDadosSociaisDto.recebe_bpc ?? false,
        recebe_tributo_crianca:
          createDadosSociaisDto.recebe_tributo_crianca ?? false,
        pensao_morte: createDadosSociaisDto.pensao_morte ?? false,
        aposentadoria: createDadosSociaisDto.aposentadoria ?? false,
        outros_beneficios: createDadosSociaisDto.outros_beneficios ?? false,

        // Campos opcionais - limpar se não enviados
        publico_prioritario: createDadosSociaisDto.publico_prioritario ?? null,
        renda: createDadosSociaisDto.renda ?? null,
        ocupacao_beneficiario:
          createDadosSociaisDto.ocupacao_beneficiario ?? null,
        tipo_insercao_beneficiario:
          createDadosSociaisDto.tipo_insercao_beneficiario ?? null,
        valor_pbf: createDadosSociaisDto.valor_pbf ?? null,
        modalidade_bpc: createDadosSociaisDto.modalidade_bpc ?? null,
        valor_bpc: createDadosSociaisDto.valor_bpc ?? null,
        valor_tributo_crianca:
          createDadosSociaisDto.valor_tributo_crianca ?? null,
        descricao_outros_beneficios:
          createDadosSociaisDto.descricao_outros_beneficios ?? null,
        curso_profissionalizante:
          createDadosSociaisDto.curso_profissionalizante ?? null,
        interesse_curso_profissionalizante:
          createDadosSociaisDto.interesse_curso_profissionalizante ?? null,
        situacao_trabalho: createDadosSociaisDto.situacao_trabalho ?? null,
        area_trabalho: createDadosSociaisDto.area_trabalho ?? null,
        familiar_apto_trabalho:
          createDadosSociaisDto.familiar_apto_trabalho ?? null,
      });

      return await this.dadosSociaisRepository.save(dadosExistentes);
    } else {
      // Criar nova entidade
      const dadosSociais = this.dadosSociaisRepository.create({
        ...createDadosSociaisDto,
        cidadao_id: cidadaoId,
      });

      return await this.dadosSociaisRepository.save(dadosSociais);
    }
  }

  async findByCidadaoId(cidadaoId: string): Promise<DadosSociais | null> {
    // Verificar se o cidadão existe
    const cidadao = await this.cidadaoRepository.findOne({
      where: { id: cidadaoId },
    });

    if (!cidadao) {
      return null; // Cidadão não existe
    }

    // Buscar dados sociais
    const dadosSociais = await this.dadosSociaisRepository.findOne({
      where: { cidadao_id: cidadaoId },
    });

    return dadosSociais; // Retorna null se não encontrar
  }

  async update(
    cidadaoId: string,
    updateDadosSociaisDto: UpdateDadosSociaisDto,
  ): Promise<DadosSociais | null> {
    // Buscar dados sociais existentes
    const dadosSociais = await this.dadosSociaisRepository.findOne({
      where: { cidadao_id: cidadaoId },
    });

    if (!dadosSociais) {
      throw new BadRequestException(
        'Dados sociais não encontrados para este cidadão',
      );
    }

    // Validações básicas de benefícios
    this.validateBeneficios({
      ...dadosSociais,
      ...updateDadosSociaisDto,
    });

    // Atualizar dados
    Object.assign(dadosSociais, updateDadosSociaisDto);

    return this.dadosSociaisRepository.save(dadosSociais);
  }

  async remove(cidadaoId: string): Promise<boolean> {
    const dadosSociais = await this.dadosSociaisRepository.findOne({
      where: { cidadao_id: cidadaoId },
    });

    if (!dadosSociais) {
      return false; // Dados não encontrados
    }

    await this.dadosSociaisRepository.softDelete({ cidadao_id: cidadaoId });
    return true; // Removido com sucesso
  }

  private validateBeneficios(data: any): void {
    const errors: string[] = [];

    // Validar PBF
    if (data.recebe_pbf === true) {
      if (!data.valor_pbf || data.valor_pbf <= 0) {
        errors.push(
          'Valor do PBF é obrigatório quando recebe_pbf é verdadeiro',
        );
      }
    }

    // Validar BPC
    if (data.recebe_bpc === true) {
      if (!data.valor_bpc || data.valor_bpc <= 0) {
        errors.push(
          'Valor do BPC é obrigatório quando recebe_bpc é verdadeiro',
        );
      }
      if (!data.modalidade_bpc) {
        errors.push(
          'Modalidade do BPC é obrigatória quando recebe_bpc é verdadeiro',
        );
      }
    }

    // Validar Tributo Criança
    if (data.recebe_tributo_crianca === true) {
      if (!data.valor_tributo_crianca || data.valor_tributo_crianca <= 0) {
        errors.push(
          'Valor do Tributo Criança é obrigatório quando recebe_tributo_crianca é verdadeiro',
        );
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Dados de benefícios inválidos',
        errors: errors,
      });
    }
  }
}
