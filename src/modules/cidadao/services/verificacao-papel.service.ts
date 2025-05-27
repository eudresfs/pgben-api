import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cidadao } from '../entities/cidadao.entity';
import { PapelCidadao, TipoPapel } from '../entities/papel-cidadao.entity';
import { ComposicaoFamiliar } from '../entities/composicao-familiar.entity';
import { HistoricoConversaoPapelService } from './historico-conversao-papel.service';
import { PapelCidadaoService } from './papel-cidadao.service';
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';

/**
 * Interface para o resultado da verificação de conflito de papéis
 */
export interface ResultadoVerificacaoConflito {
  temConflito: boolean;
  tipoPapelAtual?: TipoPapel;
  composicaoFamiliarId?: string;
  cidadaoId?: string;
  detalhes?: string;
}

/**
 * Interface para o resultado da conversão de papel
 */
export interface ResultadoConversaoPapel {
  sucesso: boolean;
  mensagem: string;
  historicoId?: string;
}

/**
 * Interface para papel conflitante
 */
export interface PapelConflitante {
  papel_id: string;
  nome_papel: string;
  regra_conflito: string;
}

/**
 * Interface para resultado de verificação de conflitos
 */
export interface ResultadoVerificacaoConflitos {
  possui_conflito: boolean;
  papeis_conflitantes: PapelConflitante[];
}

/**
 * Interface para regra de conflito
 */
export interface RegraConflito {
  id: string;
  papel_origem_id: string;
  papel_origem_nome: string;
  papel_destino_id: string;
  papel_destino_nome: string;
  descricao: string;
  ativo: boolean;
}

/**
 * Serviço de Verificação de Papel
 *
 * Responsável por verificar conflitos de papéis e realizar conversões
 * de papéis de cidadãos no sistema.
 */
@Injectable()
export class VerificacaoPapelService {
  private readonly logger = new Logger(VerificacaoPapelService.name);

  constructor(
    @InjectRepository(Cidadao)
    private readonly cidadaoRepository: Repository<Cidadao>,
    @InjectRepository(PapelCidadao)
    private readonly papelCidadaoRepository: Repository<PapelCidadao>,
    @InjectRepository(ComposicaoFamiliar)
    private readonly composicaoFamiliarRepository: Repository<ComposicaoFamiliar>,
    private readonly historicoService: HistoricoConversaoPapelService,
    private readonly papelCidadaoService: PapelCidadaoService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Verifica se um cidadão possui conflito de papéis
   * @param cpf CPF do cidadão
   * @returns Resultado da verificação
   */
  async verificarConflitoPapeis(cpf: string): Promise<ResultadoVerificacaoConflito> {
    try {
      // Remover formatação do CPF
      const cpfLimpo = cpf.replace(/\D/g, '');

      // Verificar se o cidadão existe
      const cidadao = await this.cidadaoRepository.findOne({
        where: { cpf: cpfLimpo },
      });

      if (!cidadao) {
        return {
          temConflito: false,
          detalhes: 'Cidadão não encontrado',
        };
      }

      // Verificar se o cidadão é beneficiário
      const papelBeneficiario = await this.papelCidadaoRepository.findOne({
        where: {
          cidadao_id: cidadao.id,
          tipo_papel: TipoPapel.BENEFICIARIO,
          ativo: true,
        },
      });

      // Verificar se o cidadão está em alguma composição familiar
      const composicaoFamiliar = await this.composicaoFamiliarRepository.findOne({
        where: { cpf: cpfLimpo },
        relations: ['cidadao'],
      });

      // Se for beneficiário e estiver em composição familiar, há conflito
      if (papelBeneficiario && composicaoFamiliar) {
        return {
          temConflito: true,
          tipoPapelAtual: TipoPapel.BENEFICIARIO,
          composicaoFamiliarId: composicaoFamiliar.id,
          cidadaoId: cidadao.id,
          detalhes: `Cidadão é beneficiário e também está na composição familiar do cidadão ${composicaoFamiliar.cidadao.nome}`,
        };
      }

      // Se não for beneficiário, mas estiver em composição familiar
      if (!papelBeneficiario && composicaoFamiliar) {
        return {
          temConflito: false,
          composicaoFamiliarId: composicaoFamiliar.id,
          cidadaoId: cidadao.id,
          detalhes: `Cidadão está na composição familiar do cidadão ${composicaoFamiliar.cidadao.nome}`,
        };
      }

      // Se for beneficiário, mas não estiver em composição familiar
      if (papelBeneficiario && !composicaoFamiliar) {
        return {
          temConflito: false,
          tipoPapelAtual: TipoPapel.BENEFICIARIO,
          cidadaoId: cidadao.id,
          detalhes: 'Cidadão é beneficiário',
        };
      }

      // Se não for beneficiário e não estiver em composição familiar
      return {
        temConflito: false,
        cidadaoId: cidadao.id,
        detalhes: 'Cidadão não possui papéis conflitantes',
      };
    } catch (error) {
      this.logger.error(
        `Erro ao verificar conflito de papéis: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao verificar conflito de papéis',
      );
    }
  }

  /**
   * Converte um membro de composição familiar para cidadão beneficiário
   * @param cpf CPF do membro de composição familiar
   * @param dadosCidadao Dados para criação do novo cidadão
   * @param justificativa Justificativa para a conversão
   * @param usuarioId ID do usuário que está realizando a conversão
   * @returns Resultado da conversão
   */
  /**
   * Converte um membro de composição familiar para cidadão beneficiário
   * @param cpf CPF do membro de composição familiar
   * @param dadosCidadao Dados para criação do novo cidadão
   * @param justificativa Justificativa para a conversão
   * @param usuarioId ID do usuário que está realizando a conversão
   * @returns Resultado da conversão
   * @throws BadRequestException se os dados do cidadão forem inválidos
   * @throws ConflictException se o cidadão já for beneficiário
   * @throws NotFoundException se o membro não for encontrado
   * @throws InternalServerErrorException se ocorrer um erro durante a conversão
   */
  async converterParaBeneficiario(
    cpf: string,
    dadosCidadao: CreateCidadaoDto,
    justificativa: string,
    usuarioId: string,
  ): Promise<ResultadoConversaoPapel> {
    this.logger.log(`Iniciando conversão para beneficiário: CPF ${cpf}`);
    
    // Validar dados do cidadão
    if (!dadosCidadao.nome) {
      this.logger.warn(`Tentativa de conversão com dados inválidos: CPF ${cpf}`);
      throw new BadRequestException('Nome do cidadão é obrigatório');
    }
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    this.logger.debug(`Transação iniciada para conversão: CPF ${cpf}`);

    try {
      // Remover formatação do CPF
      const cpfLimpo = cpf.replace(/\D/g, '');

      // Verificar se já existe um cidadão com este CPF
      const cidadaoExistente = await this.cidadaoRepository.findOne({
        where: { cpf: cpfLimpo },
      });

      // Se já existir um cidadão com este CPF, verificar se já é beneficiário
      if (cidadaoExistente) {
        this.logger.debug(`Cidadão existente encontrado: ID ${cidadaoExistente.id}`);
        const papelBeneficiario = await this.papelCidadaoRepository.findOne({
          where: {
            cidadao_id: cidadaoExistente.id,
            tipo_papel: TipoPapel.BENEFICIARIO,
            ativo: true,
          },
        });

        if (papelBeneficiario) {
          this.logger.warn(`Cidadão já é beneficiário: ID ${cidadaoExistente.id}`);
          throw new ConflictException('Cidadão já é beneficiário');
        }
      }

      // Verificar se o membro está em alguma composição familiar
      const composicaoFamiliar = await this.composicaoFamiliarRepository.findOne({
        where: { cpf: cpfLimpo },
        relations: ['cidadao'],
      });

      if (!composicaoFamiliar) {
        this.logger.warn(`Membro não encontrado em composição familiar: CPF ${cpfLimpo}`);
        throw new BadRequestException(
          'Membro não encontrado em nenhuma composição familiar',
        );
      }
      
      this.logger.debug(`Composição familiar encontrada: ID ${composicaoFamiliar.id}`);

      let cidadao;
      let novoPapel;

      // Se o cidadão já existe, apenas adicionar o papel de beneficiário
      if (cidadaoExistente) {
        this.logger.debug(`Usando cidadão existente: ID ${cidadaoExistente.id}`);
        cidadao = cidadaoExistente;
        
        // Adicionar papel de beneficiário
        novoPapel = await this.papelCidadaoService.criarPapel(
          cidadao.id,
          TipoPapel.BENEFICIARIO,
          {}
        );
      } else {
        // Criar um novo cidadão com os dados fornecidos
        this.logger.debug(`Criando novo cidadão para CPF: ${cpfLimpo}`);
        const dadosCidadaoCompletos = {
          ...dadosCidadao,
          cpf: cpfLimpo,
          nome: dadosCidadao.nome || composicaoFamiliar.nome, // Usar o nome da composição se não for fornecido
          papeis: [
            {
              tipo_papel: TipoPapel.BENEFICIARIO,
              metadados: {},
            },
          ],
        };

        // Criar o cidadão usando o serviço de cidadão
        const cidadaoCriado = await queryRunner.manager.save(
          this.cidadaoRepository.create(dadosCidadaoCompletos)
        );

        cidadao = cidadaoCriado;
        
        // Criar papel de beneficiário para o novo cidadão
        novoPapel = await queryRunner.manager.save(
          this.papelCidadaoRepository.create({
            cidadao_id: cidadao.id,
            tipo_papel: TipoPapel.BENEFICIARIO,
            ativo: true,
          })
        );
      }

      // Soft delete da composição familiar (marcar como removido)
      this.logger.debug(`Realizando soft delete da composição familiar: ID ${composicaoFamiliar.id}`);
      await queryRunner.manager.softRemove(composicaoFamiliar);

      // Registrar histórico de conversão
      const historico = await this.historicoService.criarHistorico(
        {
          cidadao_id: cidadao.id,
          papel_anterior: TipoPapel.MEMBRO_COMPOSICAO,
          papel_novo: TipoPapel.BENEFICIARIO,
          justificativa
        },
        usuarioId
      );

      await queryRunner.commitTransaction();

      return {
        sucesso: true,
        mensagem: 'Membro convertido para cidadão beneficiário com sucesso',
        historicoId: historico.id,
      };
    } catch (error) {
      this.logger.warn(`Erro durante a conversão para beneficiário: ${error.message}`);
      await queryRunner.rollbackTransaction();
      this.logger.debug('Transação revertida após erro');

      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Registrar detalhes do erro para facilitar a depuração
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        cpf,
        nome: dadosCidadao?.nome,
        timestamp: new Date().toISOString(),
      };
      
      this.logger.error(
        `Erro ao converter para beneficiário: ${JSON.stringify(errorDetails)}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao converter membro para cidadão beneficiário',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Converte um cidadão beneficiário para membro de composição familiar
   * @param cpf CPF do cidadão beneficiário
   * @param cidadaoAlvoId ID do cidadão que terá o membro adicionado à sua composição familiar
   * @param dadosComposicao Dados da composição familiar
   * @param justificativa Justificativa para a conversão
   * @param usuarioId ID do usuário que está realizando a conversão
   * @returns Resultado da conversão
   * @throws BadRequestException se o cidadão não for beneficiário
   * @throws ConflictException se o cidadão já estiver em uma composição familiar
   * @throws NotFoundException se o cidadão ou o cidadão alvo não forem encontrados
   * @throws InternalServerErrorException se ocorrer um erro durante a conversão
   */
  async converterParaComposicaoFamiliar(
    cpf: string,
    cidadaoAlvoId: string,
    dadosComposicao: Partial<ComposicaoFamiliar>,
    justificativa: string,
    usuarioId: string,
  ): Promise<ResultadoConversaoPapel> {
    this.logger.log(`Iniciando conversão para composição familiar: CPF ${cpf}`);
    
    // Validar dados da composição familiar
    if (!dadosComposicao || !cidadaoAlvoId) {
      this.logger.warn(`Tentativa de conversão com dados inválidos: CPF ${cpf}`);
      throw new BadRequestException('Dados da composição familiar e ID do cidadão alvo são obrigatórios');
    }
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    this.logger.debug(`Transação iniciada para conversão: CPF ${cpf}`);

    try {
      // Remover formatação do CPF
      const cpfLimpo = cpf.replace(/\D/g, '');

      // Verificar se o cidadão existe
      const cidadao = await this.cidadaoRepository.findOne({
        where: { cpf: cpfLimpo },
      });

      if (!cidadao) {
        this.logger.warn(`Cidadão não encontrado: CPF ${cpfLimpo}`);
        throw new NotFoundException('Cidadão não encontrado');
      }
      
      this.logger.debug(`Cidadão encontrado: ID ${cidadao.id}`);

      // Verificar se o cidadão alvo existe
      const cidadaoAlvo = await this.cidadaoRepository.findOne({
        where: { id: cidadaoAlvoId },
      });

      if (!cidadaoAlvo) {
        this.logger.warn(`Cidadão alvo não encontrado: ID ${cidadaoAlvoId}`);
        throw new NotFoundException('Cidadão alvo não encontrado');
      }
      
      this.logger.debug(`Cidadão alvo encontrado: ID ${cidadaoAlvo.id}`);

      // Verificar se o cidadão é beneficiário
      const papelBeneficiario = await this.papelCidadaoRepository.findOne({
        where: {
          cidadao_id: cidadao.id,
          tipo_papel: TipoPapel.BENEFICIARIO,
          ativo: true,
        },
      });

      if (!papelBeneficiario) {
        this.logger.warn(`Cidadão não é beneficiário: ID ${cidadao.id}`);
        throw new BadRequestException('Cidadão não é beneficiário');
      }
      
      this.logger.debug(`Papel beneficiário encontrado: ID ${papelBeneficiario.id}`);

      // Verificar se o cidadão já está em alguma composição familiar
      const composicaoExistente = await this.composicaoFamiliarRepository.findOne({
        where: { cpf: cpfLimpo },
      });

      if (composicaoExistente) {
        this.logger.warn(`Cidadão já está em uma composição familiar: ID ${composicaoExistente.id}`);
        throw new ConflictException(
          'Cidadão já está em uma composição familiar',
        );
      }
      
      this.logger.debug('Cidadão não está em nenhuma composição familiar');

      // Criar composição familiar
      this.logger.debug(`Criando nova composição familiar para o cidadão: ID ${cidadao.id}`);
      const novaComposicao = this.composicaoFamiliarRepository.create({
        ...dadosComposicao,
        cpf: cpfLimpo,
        cidadao_id: cidadaoAlvoId,
        nome: cidadao.nome, // Usar o nome do cidadão
      });

      await queryRunner.manager.save(novaComposicao);
      this.logger.debug(`Nova composição familiar criada: ID ${novaComposicao.id}`);

      // Soft delete do cidadão (marcar como removido)
      this.logger.debug(`Realizando soft delete do cidadão: ID ${cidadao.id}`);
      await queryRunner.manager.softRemove(cidadao);

      // Registrar histórico de conversão
      const historico = await this.historicoService.criarHistorico(
        {
          cidadao_id: cidadao.id,
          papel_anterior: TipoPapel.BENEFICIARIO,
          papel_novo: TipoPapel.MEMBRO_COMPOSICAO,
          justificativa,
          composicao_familiar_id: novaComposicao.id,
        },
        usuarioId
      );

      await queryRunner.commitTransaction();

      return {
        sucesso: true,
        mensagem: 'Cidadão convertido para membro de composição familiar com sucesso',
        historicoId: historico.id,
      };
    } catch (error) {
      this.logger.warn(`Erro durante a conversão para composição familiar: ${error.message}`);
      await queryRunner.rollbackTransaction();
      this.logger.debug('Transação revertida após erro');

      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Registrar detalhes do erro para facilitar a depuração
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        cpf,
        cidadaoAlvoId,
        timestamp: new Date().toISOString(),
      };
      
      this.logger.error(
        `Erro ao converter para composição familiar: ${JSON.stringify(errorDetails)}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao converter cidadão para membro de composição familiar',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Verifica se existem conflitos entre papéis para um cidadão
   * @param cidadaoId ID do cidadão
   * @param papelIds Lista de IDs de papéis a serem verificados
   * @returns Resultado da verificação
   */
  async verificarPapeisConflitantes(
    cidadaoId: string,
    papelIds: string[],
  ): Promise<ResultadoVerificacaoConflitos> {
    try {
      // Verificar se o cidadão existe
      const cidadao = await this.cidadaoRepository.findOne({
        where: { id: cidadaoId },
      });

      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      // Buscar papéis atuais do cidadão
      const papeisCidadao = await this.papelCidadaoRepository.find({
        where: { cidadao_id: cidadaoId, ativo: true },
      });

      // Simular a lista de papéis que o cidadão teria
      const todosPapeis = [...papeisCidadao.map(p => p.id), ...papelIds];

      // Verificar conflitos com base nas regras de negócio
      const regrasConflito = await this.listarRegrasConflito();
      const conflitos: PapelConflitante[] = [];

      // Verificar cada regra de conflito
      for (const regra of regrasConflito) {
        if (!regra.ativo) continue;

        // Verificar se a regra se aplica aos papéis do cidadão
        const temPapelOrigem = todosPapeis.includes(regra.papel_origem_id);
        const temPapelDestino = todosPapeis.includes(regra.papel_destino_id);

        if (temPapelOrigem && temPapelDestino) {
          conflitos.push({
            papel_id: papelIds.includes(regra.papel_origem_id) ? regra.papel_origem_id : regra.papel_destino_id,
            nome_papel: papelIds.includes(regra.papel_origem_id) ? regra.papel_origem_nome : regra.papel_destino_nome,
            regra_conflito: regra.descricao,
          });
        }
      }

      return {
        possui_conflito: conflitos.length > 0,
        papeis_conflitantes: conflitos,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao verificar papéis conflitantes: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao verificar papéis conflitantes',
      );
    }
  }

  /**
   * Verifica papéis conflitantes para um cidadão específico
   * @param cidadaoId ID do cidadão
   * @returns Resultado da verificação
   */
  async verificarPapeisConflitantesCidadao(
    cidadaoId: string,
  ): Promise<ResultadoVerificacaoConflitos> {
    try {
      // Verificar se o cidadão existe
      const cidadao = await this.cidadaoRepository.findOne({
        where: { id: cidadaoId },
      });

      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      // Buscar papéis atuais do cidadão
      const papeisCidadao = await this.papelCidadaoRepository.find({
        where: { cidadao_id: cidadaoId, ativo: true },
      });

      // Verificar conflitos com base nas regras de negócio
      const regrasConflito = await this.listarRegrasConflito();
      const conflitos: PapelConflitante[] = [];

      // Verificar cada regra de conflito
      for (const regra of regrasConflito) {
        if (!regra.ativo) continue;

        // Verificar se a regra se aplica aos papéis do cidadão
        const temPapelOrigem = papeisCidadao.some(p => p.id === regra.papel_origem_id);
        const temPapelDestino = papeisCidadao.some(p => p.id === regra.papel_destino_id);

        if (temPapelOrigem && temPapelDestino) {
          conflitos.push({
            papel_id: regra.papel_destino_id,
            nome_papel: regra.papel_destino_nome,
            regra_conflito: regra.descricao,
          });
        }
      }

      return {
        possui_conflito: conflitos.length > 0,
        papeis_conflitantes: conflitos,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao verificar papéis conflitantes do cidadão: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao verificar papéis conflitantes do cidadão',
      );
    }
  }

  /**
   * Lista as regras de conflito entre papéis
   * @returns Lista de regras de conflito
   */
  async listarRegrasConflito(): Promise<RegraConflito[]> {
    try {
      // Simulação de regras de conflito - em um ambiente real, estas viriam do banco de dados
      return [
        {
          id: '1',
          papel_origem_id: '1',
          papel_origem_nome: 'Beneficiário',
          papel_destino_id: '2',
          papel_destino_nome: 'Membro de Composição Familiar',
          descricao: 'Um cidadão não pode ser beneficiário e membro de composição familiar ao mesmo tempo',
          ativo: true,
        },
        {
          id: '2',
          papel_origem_id: '3',
          papel_origem_nome: 'Responsável Familiar',
          papel_destino_id: '4',
          papel_destino_nome: 'Dependente',
          descricao: 'Um cidadão não pode ser responsável familiar e dependente ao mesmo tempo',
          ativo: true,
        },
        {
          id: '3',
          papel_origem_id: '5',
          papel_origem_nome: 'Servidor Público',
          papel_destino_id: '1',
          papel_destino_nome: 'Beneficiário',
          descricao: 'Um servidor público não pode ser beneficiário de programas sociais',
          ativo: true,
        },
      ];
    } catch (error) {
      this.logger.error(
        `Erro ao listar regras de conflito: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao listar regras de conflito',
      );
    }
  }
}
