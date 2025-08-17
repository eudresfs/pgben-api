import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { DelegacaoAprovacao } from '../../../entities';
import { CreateDelegacaoAprovacaoDto } from '../dto/create-delegacao-aprovacao.dto';
import { UpdateDelegacaoAprovacaoDto } from '../dto/update-delegacao-aprovacao.dto';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

/**
 * Serviço para gerenciamento de delegações de aprovação
 * 
 * Responsável por criar, atualizar e gerenciar delegações
 * de aprovação entre usuários do sistema.
 */
@Injectable()
export class DelegacaoAprovacaoService {
  constructor(
    @InjectRepository(DelegacaoAprovacao)
    private readonly delegacaoRepository: Repository<DelegacaoAprovacao>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Cria uma nova delegação de aprovação
   * @param createDto Dados da delegação
   * @param usuarioId ID do usuário que está delegando
   * @returns Delegação criada
   */
  async create(
    createDto: CreateDelegacaoAprovacaoDto,
    usuarioId: string,
  ): Promise<DelegacaoAprovacao> {
    // Verificar se já existe uma delegação ativa para o mesmo período
    const delegacaoExistente = await this.delegacaoRepository.findOne({
      where: {
        aprovador_origem_id: createDto.aprovador_id,
        ativo: true,
      },
    });

    if (delegacaoExistente) {
      throw new BadRequestException('Já existe uma delegação ativa para este aprovador');
    }

    const delegacao = this.delegacaoRepository.create({
      ...createDto,
      ativo: true,
    });

    const delegacaoSalva = await this.delegacaoRepository.save(delegacao);

    // Registrar auditoria
    await this.auditoriaService.registrar({
      tipo_operacao: TipoOperacao.CREATE,
      entidade_afetada: 'DelegacaoAprovacao',
      entidade_id: delegacaoSalva.id,
      usuario_id: usuarioId,
      dados_novos: delegacaoSalva,
      descricao: 'Delegação de aprovação criada',
    });

    return delegacaoSalva;
  }

  /**
   * Busca todas as delegações com filtros opcionais
   * @param options Opções de busca
   * @returns Lista de delegações
   */
  async findAll(options?: FindManyOptions<DelegacaoAprovacao>): Promise<DelegacaoAprovacao[]> {
    return this.delegacaoRepository.find({
      order: { created_at: 'DESC' },
      ...options,
    });
  }

  /**
   * Busca uma delegação pelo ID
   * @param id ID da delegação
   * @returns Delegação encontrada
   */
  async findOne(id: string): Promise<DelegacaoAprovacao> {
    const delegacao = await this.delegacaoRepository.findOne({
      where: { id },
    });

    if (!delegacao) {
      throw new NotFoundException(`Delegação de aprovação com ID ${id} não encontrada`);
    }

    return delegacao;
  }

  /**
   * Atualiza uma delegação de aprovação
   * @param id ID da delegação
   * @param updateDto Dados para atualização
   * @param usuarioId ID do usuário que está atualizando
   * @returns Delegação atualizada
   */
  async update(
    id: string,
    updateDto: UpdateDelegacaoAprovacaoDto,
    usuarioId: string,
  ): Promise<DelegacaoAprovacao> {
    const delegacao = await this.findOne(id);
    const dadosAntigos = { ...delegacao };

    Object.assign(delegacao, updateDto);
    const delegacaoAtualizada = await this.delegacaoRepository.save(delegacao);

    // Registrar auditoria
    await this.auditoriaService.registrar({
      tipo_operacao: TipoOperacao.UPDATE,
      entidade_afetada: 'DelegacaoAprovacao',
      entidade_id: id,
      usuario_id: usuarioId,
      dados_anteriores: dadosAntigos,
      dados_novos: delegacaoAtualizada,
      descricao: 'Delegação de aprovação atualizada',
    });

    return delegacaoAtualizada;
  }

  /**
   * Remove uma delegação de aprovação
   * @param id ID da delegação
   * @param usuarioId ID do usuário que está removendo
   */
  async remove(id: string, usuarioId: string): Promise<void> {
    const delegacao = await this.findOne(id);

    // Registrar auditoria antes de remover
    await this.auditoriaService.registrar({
      tipo_operacao: TipoOperacao.DELETE,
      entidade_afetada: 'DelegacaoAprovacao',
      entidade_id: id,
      usuario_id: usuarioId,
      dados_anteriores: delegacao,
      descricao: 'Delegação de aprovação removida',
    });

    await this.delegacaoRepository.remove(delegacao);
  }

  /**
   * Desativa uma delegação de aprovação
   * @param id ID da delegação
   * @param usuarioId ID do usuário que está desativando
   * @param motivo Motivo da desativação
   * @returns Delegação desativada
   */
  async desativar(
    id: string,
    usuarioId: string,
    motivo?: string,
  ): Promise<DelegacaoAprovacao> {
    const delegacao = await this.findOne(id);
    const dadosAntigos = { ...delegacao };

    delegacao.ativo = false;
    delegacao.data_revogacao = new Date();
    delegacao.motivo_revogacao = motivo;
    delegacao.revogado_por = usuarioId;

    const delegacaoDesativada = await this.delegacaoRepository.save(delegacao);

    // Registrar auditoria
    await this.auditoriaService.registrar({
      tipo_operacao: TipoOperacao.UPDATE,
      entidade_afetada: 'DelegacaoAprovacao',
      entidade_id: id,
      usuario_id: usuarioId,
      dados_anteriores: dadosAntigos,
      dados_novos: delegacaoDesativada,
      descricao: `Delegação desativada. Motivo: ${motivo || 'Não informado'}`,
    });

    return delegacaoDesativada;
  }

  /**
   * Busca delegações por aprovador
   * @param aprovadorId ID do aprovador
   * @param apenasAtivas Se deve buscar apenas delegações ativas
   * @returns Lista de delegações do aprovador
   */
  async findByAprovador(
    aprovadorId: string,
    apenasAtivas: boolean = true,
  ): Promise<DelegacaoAprovacao[]> {
    const where: any = { aprovador_origem_id: aprovadorId };
    if (apenasAtivas) {
      where.ativo = true;
    }

    return this.delegacaoRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca delegações por delegado
   * @param delegadoId ID do delegado
   * @param apenasAtivas Se deve buscar apenas delegações ativas
   * @returns Lista de delegações do delegado
   */
  async findByDelegado(
    delegadoId: string,
    apenasAtivas: boolean = true,
  ): Promise<DelegacaoAprovacao[]> {
    const where: any = { aprovador_delegado_id: delegadoId };
    if (apenasAtivas) {
      where.ativo = true;
    }

    return this.delegacaoRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Verifica se um usuário tem delegação ativa para outro
   * @param aprovadorId ID do aprovador original
   * @param delegadoId ID do delegado
   * @returns True se existe delegação ativa
   */
  async temDelegacaoAtiva(
    aprovadorId: string,
    delegadoId: string,
  ): Promise<boolean> {
    const delegacao = await this.delegacaoRepository.findOne({
      where: {
        aprovador_origem_id: aprovadorId,
        aprovador_delegado_id: delegadoId,
        ativo: true,
      },
    });

    return !!delegacao;
  }

  /**
   * Busca delegações que estão expirando
   * @param diasAntecedencia Número de dias de antecedência para considerar
   * @returns Lista de delegações que estão expirando
   */
  async findExpirandoEm(diasAntecedencia: number = 7): Promise<DelegacaoAprovacao[]> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + diasAntecedencia);

    return this.delegacaoRepository.find({
      where: {
        ativo: true,
        data_fim: dataLimite,
      },
      order: { data_fim: 'ASC' },
    });
  }
}