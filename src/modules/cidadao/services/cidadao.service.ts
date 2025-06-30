import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CidadaoRepository } from '../repositories/cidadao.repository';
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';
import { CidadaoResponseDto, CidadaoPaginatedResponseDto } from '../dto/cidadao-response.dto';
import { plainToInstance } from 'class-transformer';
import { ContatoService } from './contato.service';
import { EnderecoService } from './endereco.service';
import { ContatoDto } from '../dto/contato.dto';
import { EnderecoDto } from '../dto/endereco.dto';
import { ConfigService } from '@nestjs/config';
import { AuditEventEmitter, AuditEventType } from '../../auditoria';

@Injectable()
export class CidadaoService {
  constructor(
    private readonly cidadaoRepository: CidadaoRepository,
    private readonly contatoService: ContatoService,
    private readonly enderecoService: EnderecoService,
    private readonly configService: ConfigService,
    private readonly auditEmitter: AuditEventEmitter,
  ) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    bairro?: string;
    unidade_id?: string;
    includeRelations?: boolean;
  } = {}): Promise<CidadaoPaginatedResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      bairro,
      unidade_id,
      includeRelations = false,
    } = options;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const [cidadaos, total] = await this.cidadaoRepository.findAll({
      skip,
      take,
      search,
      bairro,
      unidade_id,
      includeRelations,
    });

    const items = cidadaos.map(cidadao =>
      plainToInstance(CidadaoResponseDto, cidadao, {
        excludeExtraneousValues: true,
      })
    );

    return {
      items,
      meta: {
        total,
        page,
        limit: take,
        pages: Math.ceil(total / take),
        hasNext: page < Math.ceil(total / take),
        hasPrev: page > 1,
      },
    };
  }

  async findById(id: string, includeRelations = false, userId?: string): Promise<CidadaoResponseDto> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('ID inválido');
    }

    const cidadao = await this.cidadaoRepository.findById(id, includeRelations);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Auditoria de acesso a dados sensíveis
    await this.auditEmitter.emitEntityAccessed(
      'Cidadao',
      id,
      userId,
    );

    return plainToInstance(CidadaoResponseDto, cidadao, {
      excludeExtraneousValues: true,
    });
  }

  async findByCpf(cpf: string, includeRelations = false, userId?: string): Promise<CidadaoResponseDto> {
    if (!cpf || cpf.trim() === '') {
      throw new BadRequestException('CPF é obrigatório');
    }

    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      throw new BadRequestException('CPF deve ter 11 dígitos');
    }

    const cidadao = await this.cidadaoRepository.findByCpf(cpfClean, includeRelations);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Auditoria de acesso a dados sensíveis por CPF
    await this.auditEmitter.emitSensitiveDataEvent(
      AuditEventType.SENSITIVE_DATA_ACCESSED,
      'Cidadao',
      cidadao.id,
      userId || 'system',
      ['cpf'],
      'Consulta por CPF',
    );

    return plainToInstance(CidadaoResponseDto, cidadao, {
      excludeExtraneousValues: true,
    });
  }

  async findByNis(nis: string, includeRelations = false, userId?: string): Promise<CidadaoResponseDto> {
    if (!nis || nis.trim() === '') {
      throw new BadRequestException('NIS é obrigatório');
    }

    const nisClean = nis.replace(/\D/g, '');
    if (nisClean.length !== 11) {
      throw new BadRequestException('NIS deve ter 11 dígitos');
    }

    const cidadao = await this.cidadaoRepository.findByNis(nisClean, includeRelations);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Auditoria de acesso a dados sensíveis por NIS
    await this.auditEmitter.emitSensitiveDataEvent(
      AuditEventType.SENSITIVE_DATA_ACCESSED,
      'Cidadao',
      cidadao.id,
      userId || 'system',
      ['nis'],
      'Consulta por NIS',
    );

    return plainToInstance(CidadaoResponseDto, cidadao, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Verifica se o feature flag para nova estrutura está ativado
   */
  private isNovaEstruturaAtiva(): boolean {
    return this.configService.get<boolean>('READ_NOVA_ESTRUTURA_CONTATO', false);
  }

  async create(
    createCidadaoDto: CreateCidadaoDto,
    unidade_id: string,
    usuario_id: string,
  ): Promise<CidadaoResponseDto> {
    // Validações básicas
    if (!createCidadaoDto.cpf) {
      throw new BadRequestException('CPF é obrigatório');
    }

    const cpfClean = createCidadaoDto.cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      throw new BadRequestException('CPF deve ter 11 dígitos');
    }

    let nisClean: string | undefined = undefined;
    if (createCidadaoDto.nis) {
      nisClean = createCidadaoDto.nis.replace(/\D/g, '');
      if (nisClean.length !== 11) {
        throw new BadRequestException('NIS deve ter 11 dígitos');
      }
    }

    // Separar campos que não pertencem à entidade Cidadao
    const { 
      papeis, 
      composicao_familiar, 
      contatos, 
      enderecos, 
      ...cidadaoData 
    } = createCidadaoDto;

    // Preparar dados para criação
    const dadosParaCriacao = {
      ...cidadaoData,
      cpf: cpfClean,
      nis: nisClean,
      unidade_id,
      usuario_id,
    };

    const cidadao = await this.cidadaoRepository.create(dadosParaCriacao);
    
    // Processar contatos normalizados se existirem e a feature flag estiver ativa
    if (this.isNovaEstruturaAtiva() && contatos && contatos.length > 0) {
      await this.contatoService.upsertMany(cidadao.id, contatos);
      
      // Se temos contatos normalizados e também dados inline, migramos os dados inline
      if (cidadao.telefone || cidadao.email) {
        const contatosLegados: ContatoDto[] = [];
        
        if (cidadao.telefone) {
          contatosLegados.push({
            cidadao_id: cidadao.id,
            telefone: cidadao.telefone,
            is_whatsapp: false, // Valor padrão, já que a entidade Cidadao não tem essa propriedade
            proprietario: true
          });
        }
        
        if (cidadao.email) {
          contatosLegados.push({
            cidadao_id: cidadao.id,
            email: cidadao.email,
            proprietario: true
          });
        }
        
        if (contatosLegados.length > 0) {
          await this.contatoService.upsertMany(cidadao.id, contatosLegados);
        }
      }
    }
    
    // Processar endereços normalizados se existirem e a feature flag estiver ativa
    if (this.isNovaEstruturaAtiva() && enderecos && enderecos.length > 0) {
      await this.enderecoService.upsertMany(cidadao.id, enderecos);
      
      // Se temos endereço normalizado e também dados inline, migramos os dados inline
      if (cidadao.endereco) {
        const enderecoLegado: EnderecoDto = {
          cidadao_id: cidadao.id,
          logradouro: cidadao.endereco.logradouro,
          numero: cidadao.endereco.numero,
          complemento: cidadao.endereco.complemento,
          bairro: cidadao.endereco.bairro,
          cidade: cidadao.endereco.cidade,
          estado: cidadao.endereco.estado,
          cep: cidadao.endereco.cep,
          ponto_referencia: cidadao.endereco.ponto_referencia,
          tempo_de_residencia: cidadao.endereco.tempo_de_residencia,
          data_inicio_vigencia: new Date().toISOString(),
          data_fim_vigencia: null
        };
        
        await this.enderecoService.create(enderecoLegado);
      }
    }

    // Auditoria de criação de cidadão
    await this.auditEmitter.emitEntityCreated(
      'Cidadao',
      cidadao.id,
      {
        cpf: cpfClean,
        nis: nisClean,
        nome: cidadao.nome,
        unidade_id,
      },
      usuario_id,
    );

    return plainToInstance(CidadaoResponseDto, cidadao, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateCidadaoDto: CreateCidadaoDto,
    usuario_id: string,
  ): Promise<CidadaoResponseDto> {
    const cidadao = await this.cidadaoRepository.findById(id);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Separar campos que não pertencem à entidade Cidadao
    const { 
      papeis, 
      composicao_familiar, 
      contatos, 
      enderecos, 
      ...dadosAtualizacao 
    } = updateCidadaoDto;

    // Validar CPF se foi alterado
    if (dadosAtualizacao.cpf) {
      const cpfClean = dadosAtualizacao.cpf.replace(/\D/g, '');
      if (cpfClean !== cidadao.cpf) {
        const existingCpf = await this.cidadaoRepository.findByCpf(cpfClean);
        if (existingCpf) {
          throw new ConflictException('CPF já cadastrado');
        }
        dadosAtualizacao.cpf = cpfClean;
      }
    }

    // Validar NIS se foi alterado
    if ('nis' in dadosAtualizacao && dadosAtualizacao.nis !== cidadao.nis) {
      const nisClean = dadosAtualizacao.nis?.replace(/\D/g, '') || undefined;
      if (nisClean) {
        const existingNis = await this.cidadaoRepository.findByNis(nisClean);
        if (existingNis) {
          throw new ConflictException('NIS já cadastrado');
        }
      }
      dadosAtualizacao.nis = nisClean;
    }

    const cidadaoAtualizado = await this.cidadaoRepository.update(id, dadosAtualizacao);
    
    // Auditoria de atualização de cidadão
    await this.auditEmitter.emitEntityUpdated(
      'Cidadao',
      id,
      {
        cpf: cidadao.cpf,
        nis: cidadao.nis,
        nome: cidadao.nome,
      },
      {
        cpf: cidadaoAtualizado.cpf,
        nis: cidadaoAtualizado.nis,
        nome: cidadaoAtualizado.nome,
      },
      usuario_id,
    );
    
    // Processar contatos normalizados se existirem e a feature flag estiver ativa
    if (this.isNovaEstruturaAtiva() && contatos && contatos.length > 0) {
      await this.contatoService.upsertMany(id, contatos);
      
      // Se temos contatos normalizados e também dados inline, migramos os dados inline
      if (dadosAtualizacao.telefone || dadosAtualizacao.email) {
        const contatosLegados: ContatoDto[] = [];
        
        if (dadosAtualizacao.telefone) {
          contatosLegados.push({
            cidadao_id: id,
            telefone: dadosAtualizacao.telefone,
            is_whatsapp: dadosAtualizacao.is_whatsapp || false, // Aqui está ok porque dadosAtualizacao é do tipo CreateCidadaoDto
            proprietario: true
          });
        }
        
        if (dadosAtualizacao.email) {
          contatosLegados.push({
            cidadao_id: id,
            email: dadosAtualizacao.email,
            proprietario: true
          });
        }
        
        if (contatosLegados.length > 0) {
          await this.contatoService.upsertMany(id, contatosLegados);
        }
      }
    }
    
    // Processar endereços normalizados se existirem e a feature flag estiver ativa
    if (this.isNovaEstruturaAtiva() && enderecos && enderecos.length > 0) {
      await this.enderecoService.upsertMany(id, enderecos);
      
      // Se temos endereço normalizado e também dados inline, migramos os dados inline
      if (dadosAtualizacao.endereco) {
        const enderecoLegado: EnderecoDto = {
          cidadao_id: id,
          logradouro: dadosAtualizacao.endereco.logradouro,
          numero: dadosAtualizacao.endereco.numero,
          complemento: dadosAtualizacao.endereco.complemento,
          bairro: dadosAtualizacao.endereco.bairro,
          cidade: dadosAtualizacao.endereco.cidade,
          estado: dadosAtualizacao.endereco.estado,
          cep: dadosAtualizacao.endereco.cep,
          ponto_referencia: dadosAtualizacao.endereco.ponto_referencia,
          tempo_de_residencia: dadosAtualizacao.endereco.tempo_de_residencia,
          data_inicio_vigencia: new Date().toISOString(),
          data_fim_vigencia: null
        };
        
        // Encerra a vigência do endereço atual se existir
        const enderecoAtual = await this.enderecoService.findEnderecoAtual(id);
        if (enderecoAtual) {
          await this.enderecoService.update(enderecoAtual.id, {
            ...enderecoAtual,
            data_fim_vigencia: new Date().toISOString()
          });
        }
        
        await this.enderecoService.create(enderecoLegado);
      }
    }

    return plainToInstance(CidadaoResponseDto, cidadaoAtualizado, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<void> {
    await this.cidadaoRepository.remove(id);
  }

  /**
   * Verifica se existe relação familiar entre dois cidadãos
   * @param cidadaoId ID do cidadão principal
   * @param familiarId ID do familiar a ser verificado
   * @returns True se existe relação familiar, false caso contrário
   */
  async verificarRelacaoFamiliar(
    cidadaoId: string,
    familiarId: string,
  ): Promise<boolean> {
    if (!cidadaoId || !familiarId) {
      return false;
    }

    try {
      // Buscar cidadão com composição familiar
      const cidadao = await this.cidadaoRepository.findById(cidadaoId, true);

      if (!cidadao || !cidadao.composicao_familiar) {
        return false;
      }

      // Verificar se o familiarId está na composição familiar
      return cidadao.composicao_familiar.some(
        (membro) => membro.id === familiarId,
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Busca todos os bairros únicos registrados no sistema
   * @returns Lista de bairros únicos ordenados alfabeticamente
   */
  async findAllBairros(): Promise<string[]> {
    try {
      return await this.cidadaoRepository.findAllBairros();
    } catch (error) {
      throw new BadRequestException('Erro ao buscar bairros');
    }
  }
}