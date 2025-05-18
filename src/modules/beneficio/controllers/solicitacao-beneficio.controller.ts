import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Query,
  Patch,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { DadosDinamicosService } from '../services/dados-dinamicos.service';
import { CampoDinamicoService } from '../services/campo-dinamico.service';
import { CreateSolicitacaoBeneficioDto } from '../dto/create-solicitacao-beneficio.dto';
import { UpdateStatusSolicitacaoDto } from '../dto/update-status-solicitacao.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SolicitacaoBeneficio, StatusSolicitacaoBeneficio } from '../entities/solicitacao-beneficio.entity';
import { TipoBeneficio } from '../entities/tipo-beneficio.entity';
import { HistoricoSolicitacaoBeneficio } from '../entities/historico-solicitacao.entity';

// Importando os exemplos do Swagger para as solicitações de benefício
import {
  solicitacaoBeneficioExemplo, 
  createSolicitacaoBeneficioRequest, 
  updateStatusSolicitacaoRequest,
  listaSolicitacoesResponse,
  historicoSolicitacaoResponse,
  erroValidacaoResponse,
  naoEncontradoResponse,
  conflitoResponse
} from '@/shared/configs/swagger/examples/beneficio';

/**
 * Controlador de Solicitações de Benefício
 *
 * Responsável por gerenciar as solicitações de benefícios com suporte a campos dinâmicos.
 */
@ApiTags('solicitacao-beneficio')
@Controller('v1/solicitacao')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SolicitacaoBeneficioController {
  constructor(
    private readonly dadosDinamicosService: DadosDinamicosService,
    private readonly campoDinamicoService: CampoDinamicoService,
    @InjectRepository(SolicitacaoBeneficio)
    private readonly solicitacaoRepository: Repository<SolicitacaoBeneficio>,
    @InjectRepository(TipoBeneficio)
    private readonly tipoBeneficioRepository: Repository<TipoBeneficio>,
    @InjectRepository(HistoricoSolicitacaoBeneficio)
    private readonly historicoRepository: Repository<HistoricoSolicitacaoBeneficio>,
  ) {}

  /**
   * Cria uma nova solicitação de benefício
   *
   * @param createSolicitacaoBeneficioDto Dados da solicitação
   * @returns Solicitação criada
   */
  @Post()
  @ApiOperation({ 
    summary: 'Criar solicitação de benefício',
    description: 'Cria uma nova solicitação de benefício com suporte a campos dinâmicos.'
  })
  @ApiBody({
    type: CreateSolicitacaoBeneficioDto,
    examples: {
      'Solicitação de Auxílio Emergencial': {
        value: createSolicitacaoBeneficioRequest
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Solicitação criada com sucesso',
    content: {
      'application/json': {
        example: {
          message: 'Solicitação criada com sucesso',
          solicitacao: solicitacaoBeneficioExemplo
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos',
    content: {
      'application/json': {
        example: erroValidacaoResponse
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Tipo de benefício não encontrado',
    content: {
      'application/json': {
        example: naoEncontradoResponse
      }
    }
  })
  async create(
    @Body() createSolicitacaoBeneficioDto: CreateSolicitacaoBeneficioDto,
  ) {
    // Verificar se o tipo de benefício existe
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
      where: { id: createSolicitacaoBeneficioDto.tipo_beneficio_id },
    });

    if (!tipoBeneficio) {
      throw new Error(
        `Tipo de benefício com ID ${createSolicitacaoBeneficioDto.tipo_beneficio_id} não encontrado`,
      );
    }

    // Processar e validar dados dinâmicos
    const dadosProcessados =
      await this.dadosDinamicosService.processarDadosDinamicos(
        createSolicitacaoBeneficioDto.tipo_beneficio_id,
        createSolicitacaoBeneficioDto.dados_dinamicos,
      );

    // Obter versão atual do schema
    const schemaAtivo = await this.campoDinamicoService.getSchemaAtivo(
      createSolicitacaoBeneficioDto.tipo_beneficio_id,
    );

    // Criar nova solicitação
    const novaSolicitacao = this.solicitacaoRepository.create({
      cidadao_id: createSolicitacaoBeneficioDto.cidadao_id,
      tipo_beneficio_id: createSolicitacaoBeneficioDto.tipo_beneficio_id,
      observacoes: createSolicitacaoBeneficioDto.observacoes,
      dados_dinamicos: dadosProcessados,
      versao_schema: schemaAtivo.versao,
      status: StatusSolicitacaoBeneficio.PENDENTE,
    });

    // Salvar solicitação
    const solicitacaoSalva =
      await this.solicitacaoRepository.save(novaSolicitacao);

    return {
      message: 'Solicitação criada com sucesso',
      solicitacao: solicitacaoSalva,
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Listar solicitações de benefício',
    description: 'Retorna uma lista de solicitações de benefício com filtros opcionais.'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitações retornada com sucesso',
    content: {
      'application/json': {
        example: listaSolicitacoesResponse
      }
    }
  })
  @ApiQuery({ 
    name: 'cidadao_id', 
    required: false, 
    type: String,
    description: 'ID do cidadão para filtrar as solicitações'
  })
  @ApiQuery({ 
    name: 'tipo_beneficio_id', 
    required: false, 
    type: String,
    description: 'ID do tipo de benefício para filtrar as solicitações'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: StatusSolicitacaoBeneficio,
    description: 'Status para filtrar as solicitações'
  })
  async findAll(
    @Query('cidadao_id') cidadaoId?: string,
    @Query('tipo_beneficio_id') tipoBeneficioId?: string,
    @Query('status') status?: string,
  ) {
    // Construir query com filtros opcionais
    const where: any = {};

    if (cidadaoId) {
      where.cidadao_id = cidadaoId;
    }

    if (tipoBeneficioId) {
      where.tipo_beneficio_id = tipoBeneficioId;
    }

    if (status) {
      where.status = status;
    }

    // Buscar solicitações
    const solicitacoes = await this.solicitacaoRepository.find({
      where,
      relations: ['tipo_beneficio'],
      order: { created_at: 'DESC' },
    });

    return solicitacoes;
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obter solicitação de benefício por ID',
    description: 'Retorna os detalhes completos de uma solicitação de benefício específica.'
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação retornada com sucesso',
    content: {
      'application/json': {
        example: solicitacaoBeneficioExemplo
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Solicitação não encontrada',
    content: {
      'application/json': {
        example: naoEncontradoResponse
      }
    }
  })
  async findOne(@Param('id') id: string) {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id },
      relations: ['tipo_beneficio'],
    });

    if (!solicitacao) {
      throw new NotFoundException(`Solicitação com ID ${id} não encontrada`);
    }

    return solicitacao;
  }

  @Patch(':id/status')
  @ApiOperation({ 
    summary: 'Atualizar status de uma solicitação de benefício',
    description: 'Atualiza o status de uma solicitação de benefício e registra o histórico da alteração.'
  })
  @ApiBody({
    type: UpdateStatusSolicitacaoDto,
    examples: {
      'Atualização de Status': {
        value: updateStatusSolicitacaoRequest
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Status atualizado com sucesso',
    content: {
      'application/json': {
        example: {
          message: 'Status atualizado com sucesso',
          solicitacao: solicitacaoBeneficioExemplo
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos ou transição de status inválida',
    content: {
      'application/json': {
        example: erroValidacaoResponse
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Solicitação não encontrada',
    content: {
      'application/json': {
        example: naoEncontradoResponse
      }
    }
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusSolicitacaoDto,
    // Em um cenário real, o usuário seria obtido do token JWT
    // @Request() req
  ) {
    // Buscar a solicitação
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id },
    });

    if (!solicitacao) {
      throw new NotFoundException(`Solicitação com ID ${id} não encontrada`);
    }

    // Validar transição de status
    this.validarTransicaoStatus(solicitacao.status, updateStatusDto.status);

    // Criar registro de histórico
    const historico = this.historicoRepository.create({
      solicitacao_id: id,
      status_anterior: solicitacao.status,
      status_novo: updateStatusDto.status,
      justificativa: updateStatusDto.justificativa,
      // Em um cenário real, o ID do usuário seria obtido do token JWT
      usuario_id: '123e4567-e89b-12d3-a456-426614174000', // ID de exemplo
    });

    // Atualizar status da solicitação
    solicitacao.status = updateStatusDto.status;

    // Salvar alterações em uma transação
    await this.solicitacaoRepository.save(solicitacao);
    await this.historicoRepository.save(historico);

    return {
      message: 'Status atualizado com sucesso',
      solicitacao: {
        id: solicitacao.id,
        status: solicitacao.status,
      },
      historico: {
        id: historico.id,
        status_anterior: historico.status_anterior,
        status_novo: historico.status_novo,
        created_at: historico.created_at,
      },
    };
  }

  @Get(':id/historico')
  @ApiOperation({ 
    summary: 'Obter histórico de alterações de uma solicitação',
    description: 'Retorna o histórico completo de alterações de status de uma solicitação de benefício.'
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico retornado com sucesso',
    content: {
      'application/json': {
        example: historicoSolicitacaoResponse
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Solicitação não encontrada',
    content: {
      'application/json': {
        example: naoEncontradoResponse
      }
    }
  })
  async getHistorico(@Param('id') id: string) {
    // Verificar se a solicitação existe
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id },
    });

    if (!solicitacao) {
      throw new NotFoundException(`Solicitação com ID ${id} não encontrada`);
    }

    // Buscar histórico
    const historico = await this.historicoRepository.find({
      where: { solicitacao_id: id },
      order: { created_at: 'DESC' },
    });

    return historico;
  }

  /**
   * Valida se a transição de status é permitida
   *
   * @param statusAtual Status atual da solicitação
   * @param novoStatus Novo status da solicitação
   */
  private validarTransicaoStatus(
    statusAtual: StatusSolicitacaoBeneficio,
    novoStatus: StatusSolicitacaoBeneficio,
  ): void {
    // Definir transições permitidas
    const transicoesPermitidas: Record<StatusSolicitacaoBeneficio, StatusSolicitacaoBeneficio[]> = {
      [StatusSolicitacaoBeneficio.PENDENTE]: [StatusSolicitacaoBeneficio.ANALISE, StatusSolicitacaoBeneficio.CANCELADA],
      [StatusSolicitacaoBeneficio.ANALISE]: [StatusSolicitacaoBeneficio.APROVADA, StatusSolicitacaoBeneficio.REJEITADA, StatusSolicitacaoBeneficio.CANCELADA],
      [StatusSolicitacaoBeneficio.APROVADA]: [StatusSolicitacaoBeneficio.CANCELADA],
      [StatusSolicitacaoBeneficio.REJEITADA]: [StatusSolicitacaoBeneficio.ANALISE, StatusSolicitacaoBeneficio.CANCELADA],
      [StatusSolicitacaoBeneficio.CANCELADA]: [],
      [StatusSolicitacaoBeneficio.EM_PROCESSAMENTO]: [StatusSolicitacaoBeneficio.CONCLUIDA, StatusSolicitacaoBeneficio.CANCELADA],
      [StatusSolicitacaoBeneficio.CONCLUIDA]: [],
    };

    // Verificar se a transição é permitida
    if (!transicoesPermitidas[statusAtual]?.includes(novoStatus)) {
      throw new BadRequestException(
        `Transição de status não permitida: ${statusAtual} -> ${novoStatus}`,
      );
    }
  }
}
