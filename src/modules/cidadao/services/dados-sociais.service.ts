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
    // Verificar se o cidadão existe
    const cidadao = await this.cidadaoRepository.findOne({
      where: { id: cidadaoId },
    });

    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Verificar se já existem dados sociais
    const dadosExistentes = await this.dadosSociaisRepository.findOne({
      where: { cidadao_id: cidadaoId },
    });

    if (dadosExistentes) {
      throw new ConflictException(
        'Cidadão já possui dados sociais cadastrados',
      );
    }

    // Validações básicas de benefícios
    this.validateBeneficios(createDadosSociaisDto);

    // Criar dados sociais
    const dadosSociais = this.dadosSociaisRepository.create({
      ...createDadosSociaisDto,
      cidadao_id: cidadaoId,
    });

    return this.dadosSociaisRepository.save(dadosSociais);
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
      return null; // Dados sociais não encontrados
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
