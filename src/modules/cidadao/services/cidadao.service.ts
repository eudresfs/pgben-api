import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CidadaoRepository } from '../repositories/cidadao.repository';
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';
import {
  CidadaoResponseDto,
  CidadaoPaginatedResponseDto,
} from '../dto/cidadao-response.dto';
import { plainToInstance } from 'class-transformer';
import { ContatoService } from './contato.service';
import { EnderecoService } from './endereco.service';
import { DadosSociaisService } from './dados-sociais.service';
import { SituacaoMoradiaService } from './situacao-moradia.service';
import { InfoBancariaService } from './info-bancaria.service';
import { ComposicaoFamiliarService } from './composicao-familiar.service';
import { ConfigService } from '@nestjs/config';
import { AuditEventEmitter, AuditEventType } from '../../auditoria';
import { Cidadao } from '../../../entities/cidadao.entity';
import { TransferirUnidadeDto } from '../dto/transferir-unidade.dto';

@Injectable()
export class CidadaoService {
  constructor(
    private readonly cidadaoRepository: CidadaoRepository,
    private readonly contatoService: ContatoService,
    private readonly enderecoService: EnderecoService,
    private readonly dadosSociaisService: DadosSociaisService,
    private readonly situacaoMoradiaService: SituacaoMoradiaService,
    private readonly infoBancariaService: InfoBancariaService,
    private readonly composicaoFamiliarService: ComposicaoFamiliarService,
    private readonly configService: ConfigService,
    private readonly auditEmitter: AuditEventEmitter,
  ) {}

  async findAll(
    options: {
      page?: number;
      limit?: number;
      search?: string;
      bairro?: string;
      unidade_id?: string;
      includeRelations?: boolean;
    } = {},
  ): Promise<CidadaoPaginatedResponseDto> {
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

    const [cidadaos, total] = await this.cidadaoRepository.findAllWithFilters({
      skip,
      take,
      search,
      bairro,
      unidade_id,
      includeRelations,
    });

    const items = cidadaos.map((cidadao) =>
      plainToInstance(CidadaoResponseDto, cidadao, {
        excludeExtraneousValues: true,
      }),
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

  async findById(
    id: string,
    includeRelations = false,
    userId?: string,
  ): Promise<CidadaoResponseDto> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('ID inválido');
    }

    const cidadao = await this.cidadaoRepository.findById(id, includeRelations);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Auditoria de acesso a dados sensíveis
    await this.auditEmitter.emitEntityAccessed('Cidadao', id, userId);

    return plainToInstance(CidadaoResponseDto, cidadao, {
      excludeExtraneousValues: true,
    });
  }

  async findByCpf(
    cpf: string,
    includeRelations = false,
    userId?: string,
  ): Promise<CidadaoResponseDto> {
    if (!cpf || cpf.trim() === '') {
      throw new BadRequestException('CPF é obrigatório');
    }

    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      throw new BadRequestException('CPF deve ter 11 dígitos');
    }

    const cidadao = await this.cidadaoRepository.findByCpf(
      cpfClean,
      includeRelations,
    );
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

  async findByNis(
    nis: string,
    includeRelations = false,
    userId?: string,
  ): Promise<CidadaoResponseDto> {
    if (!nis || nis.trim() === '') {
      throw new BadRequestException('NIS é obrigatório');
    }

    const nisClean = nis.replace(/\D/g, '');
    if (nisClean.length !== 11) {
      throw new BadRequestException('NIS deve ter 11 dígitos');
    }

    const cidadao = await this.cidadaoRepository.findByNis(
      nisClean,
      includeRelations,
    );
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
      composicao_familiar, 
      contatos, 
      enderecos, 
      dados_sociais, 
      situacao_moradia, 
      info_bancaria, 
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

    const cidadaoSalvo = await this.cidadaoRepository.createCidadao(dadosParaCriacao);

    // Processar contatos normalizados se existirem
    if (contatos && contatos.length > 0) {
      const contatosComCidadaoId = contatos.map(contato => ({
        ...contato,
        cidadao_id: cidadaoSalvo.id
      }));
      await this.contatoService.upsertMany(cidadaoSalvo.id, contatosComCidadaoId);
    }

    // Processar endereços normalizados se existirem
    if (enderecos && enderecos.length > 0) {
      const enderecosComCidadaoId = enderecos.map(endereco => ({
        ...endereco,
        cidadao_id: cidadaoSalvo.id
      }));
      await this.enderecoService.upsertMany(cidadaoSalvo.id, enderecosComCidadaoId);
    }

    // Processar composição familiar se fornecida
    if (composicao_familiar && composicao_familiar.length > 0) {
      const composicaoComCidadaoId = composicao_familiar.map(composicao => ({
        ...composicao,
        cidadao_id: cidadaoSalvo.id
      }));
      await this.composicaoFamiliarService.upsertMany(
        cidadaoSalvo.id,
        composicaoComCidadaoId,
        usuario_id,
      );
    }

    // Processar dados sociais se fornecidos
    if (dados_sociais) {
      await this.dadosSociaisService.upsert(
        cidadaoSalvo.id,
        dados_sociais,
      );
    }

    // Processar situação de moradia se fornecida
    if (situacao_moradia) {
      await this.situacaoMoradiaService.upsert({
        ...situacao_moradia,
        cidadao_id: cidadaoSalvo.id,
      });
    }

    // Processar informações bancárias se fornecidas
    if (info_bancaria) {
      await this.infoBancariaService.upsert({
        ...info_bancaria,
        cidadao_id: cidadaoSalvo.id,
      });
    }

    // Auditoria de criação de cidadão
    await this.auditEmitter.emitEntityCreated(
      'Cidadao',
      cidadaoSalvo.id,
      {
        cpf: cpfClean,
        nis: nisClean,
        nome: cidadaoSalvo.nome,
        unidade_id,
      },
      usuario_id,
    );

    return plainToInstance(CidadaoResponseDto, cidadaoSalvo, {
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
    const { composicao_familiar, contatos, enderecos, dados_sociais, situacao_moradia, info_bancaria, ...dadosAtualizacao } =
      updateCidadaoDto;

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

    const cidadaoAtualizado = await this.cidadaoRepository.updateCidadao(
      id,
      dadosAtualizacao,
    );

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

    // Processar contatos normalizados se existirem
    if (contatos && contatos.length > 0) {
      const contatosComCidadaoId = contatos.map(contato => ({
        ...contato,
        cidadao_id: id
      }));
      await this.contatoService.upsertMany(id, contatosComCidadaoId);
    }

    // Processar endereços normalizados se existirem
    if (enderecos && enderecos.length > 0) {
      const enderecosComCidadaoId = enderecos.map(endereco => ({
        ...endereco,
        cidadao_id: id
      }));
      await this.enderecoService.upsertMany(id, enderecosComCidadaoId);
    }

    // Processar composição familiar se fornecida
    if (composicao_familiar && composicao_familiar.length > 0) {
      const composicaoComCidadaoId = composicao_familiar.map(composicao => ({
        ...composicao,
        cidadao_id: id
      }));
      await this.composicaoFamiliarService.upsertMany(
        id,
        composicaoComCidadaoId,
        usuario_id,
      );
    }

    // Processar dados sociais se fornecidos
    if (dados_sociais) {
      await this.dadosSociaisService.upsert(
        id,
        dados_sociais,
      );
    }

    // Processar situação de moradia se fornecida
    if (situacao_moradia) {
      await this.situacaoMoradiaService.upsert({
        ...situacao_moradia,
        cidadao_id: id,
      });
    }

    // Processar informações bancárias se fornecidas
    if (info_bancaria) {
      await this.infoBancariaService.upsert({
        ...info_bancaria,
        cidadao_id: id,
      });
    }

    return plainToInstance(CidadaoResponseDto, cidadaoAtualizado, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<void> {
    await this.cidadaoRepository.removeCidadao(id);
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

  /**
   * Transfere um cidadão para outra unidade
   * @param cidadaoId ID do cidadão a ser transferido
   * @param transferirUnidadeDto Dados da transferência
   * @param usuarioId ID do usuário que está realizando a transferência
   * @returns Dados atualizados do cidadão
   */
  async transferirUnidade(
    cidadaoId: string,
    transferirUnidadeDto: TransferirUnidadeDto,
    usuarioId: string,
  ): Promise<CidadaoResponseDto> {
    const { unidade_id, endereco, motivo } = transferirUnidadeDto;

    // Verificar se o cidadão existe
    const cidadao = await this.cidadaoRepository.findById(cidadaoId);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Verificar se a nova unidade é diferente da atual
    if (cidadao.unidade_id === unidade_id) {
      throw new BadRequestException(
        'O cidadão já está vinculado a esta unidade',
      );
    }

    // Armazenar dados anteriores para auditoria
    const dadosAnteriores = {
      unidade_id: cidadao.unidade_id,
      nome: cidadao.nome,
      cpf: cidadao.cpf,
    };

    // Atualizar a unidade do cidadão
    const cidadaoAtualizado = await this.cidadaoRepository.updateCidadao(
      cidadaoId,
      { unidade_id },
    );

    // Processar novo endereço se fornecido
    if (endereco) {
      // Finalizar endereços atuais (definir data_fim_vigencia)
      const enderecosAtuais = await this.enderecoService.findByCidadaoId(
        cidadaoId,
      );
      
      const dataAtual = new Date().toISOString().split('T')[0];
      
      // Finalizar endereços vigentes
      for (const enderecoAtual of enderecosAtuais) {
        if (!enderecoAtual.data_fim_vigencia) {
          await this.enderecoService.update(enderecoAtual.id, {
            ...enderecoAtual,
            data_fim_vigencia: dataAtual,
          });
        }
      }

      // Criar novo endereço
      await this.enderecoService.create({
        ...endereco,
        cidadao_id: cidadaoId,
        data_inicio_vigencia: endereco.data_inicio_vigencia || dataAtual,
      });
    }

    // Auditoria da transferência
    await this.auditEmitter.emitEntityUpdated(
      'Cidadao',
      cidadaoId,
      dadosAnteriores,
      {
        unidade_id: cidadaoAtualizado.unidade_id,
        nome: cidadaoAtualizado.nome,
        cpf: cidadaoAtualizado.cpf,
        motivo_transferencia: motivo || 'Transferência de unidade',
      },
      usuarioId,
    );

    // Retornar dados atualizados com relacionamentos
    const cidadaoCompleto = await this.cidadaoRepository.findById(
      cidadaoId,
      true,
    );

    return plainToInstance(CidadaoResponseDto, cidadaoCompleto, {
      excludeExtraneousValues: true,
    });
  }
}
