# Integração com SolicitacaoModule

## Visão Geral

O módulo de Configuração disponibiliza serviços que podem ser utilizados pelo módulo de Solicitação para gerenciar workflows de benefícios e configurações de prazos. Esta documentação demonstra como implementar essa integração.

## Serviços Disponibilizados

### 1. Serviço de Workflows

O `WorkflowService` permite gerenciar os fluxos de trabalho para diferentes tipos de benefícios, incluindo etapas, ações permitidas e cálculo de prazos.

### 2. Configurações de Prazos

O `LimitesService` fornece acesso às configurações de prazos para diferentes etapas do processo de solicitação.

## Implementação da Integração

### Passo 1: Importar o Módulo de Configuração

No arquivo `solicitacao.module.ts`, importe o módulo de Configuração:

```typescript
import { Module } from '@nestjs/common';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { SolicitacaoService } from './services/solicitacao.service';
import { AnaliseSolicitacaoService } from './services/analise-solicitacao.service';
import { EntrevistaService } from './services/entrevista.service';
// Outros imports necessários...

@Module({
  imports: [
    ConfiguracaoModule,
    // Outros módulos necessários...
  ],
  controllers: [
    // Controllers do módulo de Solicitação...
  ],
  providers: [
    SolicitacaoService,
    AnaliseSolicitacaoService,
    EntrevistaService,
    // Outros providers...
  ],
  exports: [
    SolicitacaoService,
    // Outros serviços exportados...
  ]
})
export class SolicitacaoModule {}
```

### Passo 2: Injetar os Serviços Necessários

#### Exemplo: Serviço de Solicitação

```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkflowService } from '../../configuracao/services/workflow.service';
import { LimitesService } from '../../configuracao/services/limites.service';
import { WorkflowAcaoEnum } from '../../configuracao/enums/workflow-acao.enum';
import { PrazoTipoEnum } from '../../configuracao/enums/prazo-tipo.enum';
import { SolicitacaoRepository } from '../repositories/solicitacao.repository';
import { HistoricoSolicitacaoRepository } from '../repositories/historico-solicitacao.repository';
import { SolicitacaoCreateDto } from '../dtos/solicitacao-create.dto';
import { SolicitacaoAcaoDto } from '../dtos/solicitacao-acao.dto';

@Injectable()
export class SolicitacaoService {
  private readonly logger = new Logger(SolicitacaoService.name);

  constructor(
    private readonly solicitacaoRepository: SolicitacaoRepository,
    private readonly historicoRepository: HistoricoSolicitacaoRepository,
    private readonly workflowService: WorkflowService,
    private readonly limitesService: LimitesService
  ) {}

  /**
   * Cria uma nova solicitação de benefício
   * @param dto Dados da solicitação
   * @param usuarioId ID do usuário que está criando a solicitação
   */
  async criar(dto: SolicitacaoCreateDto, usuarioId: string): Promise<any> {
    try {
      // Obter o workflow para o tipo de benefício
      const workflow = await this.workflowService.buscarPorTipoBeneficio(dto.tipo_beneficio_id);
      
      if (!workflow) {
        throw new NotFoundException(`Workflow não encontrado para o tipo de benefício ${dto.tipo_beneficio_id}`);
      }
      
      if (!workflow.ativo) {
        throw new BadRequestException(`Workflow para o tipo de benefício ${dto.tipo_beneficio_id} está inativo`);
      }
      
      // Obter a etapa inicial do workflow
      const etapaInicial = await this.workflowService.obterEtapaInicial(workflow.id);
      
      if (!etapaInicial) {
        throw new BadRequestException(`Workflow não possui etapa inicial definida`);
      }
      
      // Calcular data limite baseada no SLA da etapa
      const dataLimite = await this.workflowService.calcularDataLimite(
        etapaInicial.codigo,
        workflow.id
      );
      
      // Gerar número de protocolo
      const protocolo = await this.gerarProtocolo();
      
      // Criar a solicitação
      const solicitacao = await this.solicitacaoRepository.criar({
        ...dto,
        protocolo,
        workflow_id: workflow.id,
        etapa_atual: etapaInicial.codigo,
        data_limite_etapa: dataLimite,
        created_by: usuarioId
      });
      
      // Registrar histórico da criação
      await this.historicoRepository.criar({
        solicitacao_id: solicitacao.id,
        etapa: etapaInicial.codigo,
        acao: WorkflowAcaoEnum.CRIAR,
        data: new Date(),
        usuario_id: usuarioId,
        observacao: 'Solicitação criada'
      });
      
      return solicitacao;
    } catch (error) {
      this.logger.error(`Erro ao criar solicitação: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Executa uma ação em uma solicitação
   * @param id ID da solicitação
   * @param dto Dados da ação
   * @param usuarioId ID do usuário que está executando a ação
   */
  async executarAcao(id: string, dto: SolicitacaoAcaoDto, usuarioId: string): Promise<any> {
    try {
      // Buscar solicitação
      const solicitacao = await this.solicitacaoRepository.buscarPorId(id);
      
      if (!solicitacao) {
        throw new NotFoundException(`Solicitação não encontrada`);
      }
      
      // Verificar se a ação é permitida na etapa atual
      const proximaEtapa = await this.workflowService.calcularProximaEtapa(
        solicitacao.workflow_id,
        solicitacao.etapa_atual,
        dto.acao as WorkflowAcaoEnum
      );
      
      if (!proximaEtapa) {
        throw new BadRequestException(`Ação ${dto.acao} não permitida para a etapa atual ${solicitacao.etapa_atual}`);
      }
      
      // Verificar se o usuário tem permissão para executar a ação
      const temPermissao = await this.workflowService.verificarPermissaoUsuario(
        solicitacao.workflow_id,
        solicitacao.etapa_atual,
        dto.acao as WorkflowAcaoEnum,
        usuarioId
      );
      
      if (!temPermissao) {
        throw new BadRequestException(`Usuário não tem permissão para executar a ação ${dto.acao}`);
      }
      
      // Calcular nova data limite baseada no SLA da próxima etapa
      const novaDataLimite = await this.workflowService.calcularDataLimite(
        proximaEtapa,
        solicitacao.workflow_id
      );
      
      // Atualizar solicitação
      const solicitacaoAtualizada = await this.solicitacaoRepository.atualizar(id, {
        etapa_atual: proximaEtapa,
        data_limite_etapa: novaDataLimite,
        updated_by: usuarioId,
        // Outros dados específicos da ação
        ...dto.dados
      });
      
      // Registrar histórico da transição
      await this.historicoRepository.criar({
        solicitacao_id: id,
        etapa_origem: solicitacao.etapa_atual,
        etapa_destino: proximaEtapa,
        acao: dto.acao,
        data: new Date(),
        usuario_id: usuarioId,
        observacao: dto.observacao
      });
      
      return {
        id: solicitacaoAtualizada.id,
        etapa_anterior: solicitacao.etapa_atual,
        etapa_atual: proximaEtapa,
        data_limite: novaDataLimite
      };
    } catch (error) {
      this.logger.error(`Erro ao executar ação: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verifica se uma solicitação está atrasada
   * @param id ID da solicitação
   */
  async verificarAtraso(id: string): Promise<boolean> {
    try {
      const solicitacao = await this.solicitacaoRepository.buscarPorId(id);
      
      if (!solicitacao) {
        throw new NotFoundException(`Solicitação não encontrada`);
      }
      
      const dataAtual = new Date();
      return solicitacao.data_limite_etapa < dataAtual;
    } catch (error) {
      this.logger.error(`Erro ao verificar atraso: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtém as ações permitidas para uma solicitação
   * @param id ID da solicitação
   * @param usuarioId ID do usuário
   */
  async obterAcoesPermitidas(id: string, usuarioId: string): Promise<string[]> {
    try {
      const solicitacao = await this.solicitacaoRepository.buscarPorId(id);
      
      if (!solicitacao) {
        throw new NotFoundException(`Solicitação não encontrada`);
      }
      
      // Obter perfis do usuário
      const perfisUsuario = await this.obterPerfisUsuario(usuarioId);
      
      // Obter ações permitidas para a etapa atual e perfis do usuário
      const acoesPermitidas = await this.workflowService.obterAcoesPermitidas(
        solicitacao.workflow_id,
        solicitacao.etapa_atual,
        perfisUsuario
      );
      
      return acoesPermitidas;
    } catch (error) {
      this.logger.error(`Erro ao obter ações permitidas: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Gera um número de protocolo único
   */
  private async gerarProtocolo(): Promise<string> {
    const data = new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    
    // Obter o último número de protocolo do ano/mês atual
    const ultimoProtocolo = await this.solicitacaoRepository.buscarUltimoProtocolo(ano, Number(mes));
    
    // Calcular o próximo número sequencial
    const sequencial = ultimoProtocolo ? ultimoProtocolo.sequencial + 1 : 1;
    
    // Formatar o protocolo: AAAA.MM.NNNNNN (ex: 2025.05.000001)
    return `${ano}.${mes}.${String(sequencial).padStart(6, '0')}`;
  }

  /**
   * Obtém os perfis de um usuário
   * @param usuarioId ID do usuário
   */
  private async obterPerfisUsuario(usuarioId: string): Promise<string[]> {
    // Esta é uma implementação simplificada
    // Em um sistema real, você buscaria os perfis do usuário no banco de dados
    
    // Simular busca de perfis
    return ['ASSISTENTE_SOCIAL']; // Exemplo
  }
}
```

#### Exemplo: Serviço de Análise de Solicitação

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { LimitesService } from '../../configuracao/services/limites.service';
import { PrazoTipoEnum } from '../../configuracao/enums/prazo-tipo.enum';

@Injectable()
export class AnaliseSolicitacaoService {
  private readonly logger = new Logger(AnaliseSolicitacaoService.name);

  constructor(
    private readonly limitesService: LimitesService
  ) {}

  /**
   * Calcula a data limite para análise de uma solicitação
   * @param dataReferencia Data de referência para o cálculo
   */
  async calcularDataLimiteAnalise(dataReferencia: Date = new Date()): Promise<Date> {
    try {
      // Obter prazo configurado para análise de solicitação
      const prazo = await this.limitesService.buscarPrazo(PrazoTipoEnum.ANALISE_SOLICITACAO);
      
      // Calcular data limite considerando dias úteis
      const dataLimite = this.calcularDiasUteis(dataReferencia, prazo.dias);
      
      return dataLimite;
    } catch (error) {
      this.logger.error(`Erro ao calcular data limite: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calcula a data limite para agendamento de entrevista
   * @param dataReferencia Data de referência para o cálculo
   */
  async calcularDataLimiteAgendamento(dataReferencia: Date = new Date()): Promise<Date> {
    try {
      // Obter prazo configurado para agendamento de entrevista
      const prazo = await this.limitesService.buscarPrazo(PrazoTipoEnum.AGENDAMENTO_ENTREVISTA);
      
      // Calcular data limite considerando dias úteis
      const dataLimite = this.calcularDiasUteis(dataReferencia, prazo.dias);
      
      return dataLimite;
    } catch (error) {
      this.logger.error(`Erro ao calcular data limite: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calcula a data limite para entrada de recurso
   * @param dataReferencia Data de referência para o cálculo
   */
  async calcularDataLimiteRecurso(dataReferencia: Date = new Date()): Promise<Date> {
    try {
      // Obter prazo configurado para entrada de recurso
      const prazo = await this.limitesService.buscarPrazo(PrazoTipoEnum.ENTRADA_RECURSO);
      
      // Calcular data limite considerando dias úteis
      const dataLimite = this.calcularDiasUteis(dataReferencia, prazo.dias);
      
      return dataLimite;
    } catch (error) {
      this.logger.error(`Erro ao calcular data limite: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calcula uma data futura considerando apenas dias úteis
   * @param dataInicial Data inicial
   * @param dias Número de dias úteis a adicionar
   */
  private calcularDiasUteis(dataInicial: Date, dias: number): Date {
    // Implementação simplificada - em produção, considerar feriados
    let dataAtual = new Date(dataInicial);
    let diasAdicionados = 0;
    
    while (diasAdicionados < dias) {
      dataAtual.setDate(dataAtual.getDate() + 1);
      
      // Pular finais de semana (0 = Domingo, 6 = Sábado)
      const diaSemana = dataAtual.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasAdicionados++;
      }
    }
    
    return dataAtual;
  }
}
```

### Passo 3: Utilizar os Serviços no Controller

```typescript
import { Controller, Post, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SolicitacaoService } from '../services/solicitacao.service';
import { AnaliseSolicitacaoService } from '../services/analise-solicitacao.service';
import { SolicitacaoCreateDto } from '../dtos/solicitacao-create.dto';
import { SolicitacaoAcaoDto } from '../dtos/solicitacao-acao.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Solicitações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('solicitacoes')
export class SolicitacaoController {
  constructor(
    private readonly solicitacaoService: SolicitacaoService,
    private readonly analiseService: AnaliseSolicitacaoService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova solicitação de benefício' })
  async criar(
    @Body() dto: SolicitacaoCreateDto,
    @CurrentUser() usuario
  ) {
    const solicitacao = await this.solicitacaoService.criar(dto, usuario.id);
    
    return {
      id: solicitacao.id,
      protocolo: solicitacao.protocolo,
      etapa_atual: solicitacao.etapa_atual,
      data_limite: solicitacao.data_limite_etapa
    };
  }

  @Put(':id/acoes')
  @ApiOperation({ summary: 'Executar ação em uma solicitação' })
  async executarAcao(
    @Param('id') id: string,
    @Body() dto: SolicitacaoAcaoDto,
    @CurrentUser() usuario
  ) {
    const resultado = await this.solicitacaoService.executarAcao(id, dto, usuario.id);
    
    return resultado;
  }

  @Get(':id/acoes-permitidas')
  @ApiOperation({ summary: 'Obter ações permitidas para uma solicitação' })
  async obterAcoesPermitidas(
    @Param('id') id: string,
    @CurrentUser() usuario
  ) {
    const acoes = await this.solicitacaoService.obterAcoesPermitidas(id, usuario.id);
    
    return { acoes };
  }

  @Get('prazos/analise')
  @ApiOperation({ summary: 'Calcular prazo para análise de solicitação' })
  async calcularPrazoAnalise(
    @Query('data_referencia') dataReferenciaStr?: string
  ) {
    const dataReferencia = dataReferenciaStr ? new Date(dataReferenciaStr) : new Date();
    const dataLimite = await this.analiseService.calcularDataLimiteAnalise(dataReferencia);
    
    return { data_limite: dataLimite };
  }

  @Get('prazos/agendamento')
  @ApiOperation({ summary: 'Calcular prazo para agendamento de entrevista' })
  async calcularPrazoAgendamento(
    @Query('data_referencia') dataReferenciaStr?: string
  ) {
    const dataReferencia = dataReferenciaStr ? new Date(dataReferenciaStr) : new Date();
    const dataLimite = await this.analiseService.calcularDataLimiteAgendamento(dataReferencia);
    
    return { data_limite: dataLimite };
  }

  @Get('prazos/recurso')
  @ApiOperation({ summary: 'Calcular prazo para entrada de recurso' })
  async calcularPrazoRecurso(
    @Query('data_referencia') dataReferenciaStr?: string
  ) {
    const dataReferencia = dataReferenciaStr ? new Date(dataReferenciaStr) : new Date();
    const dataLimite = await this.analiseService.calcularDataLimiteRecurso(dataReferencia);
    
    return { data_limite: dataLimite };
  }
}
```

## Exemplo de Uso

### Criação de Solicitação com Workflow

```typescript
// Em um serviço que precisa criar uma solicitação
import { Injectable } from '@nestjs/common';
import { SolicitacaoService } from '../solicitacao/services/solicitacao.service';

@Injectable()
export class AtendimentoService {
  constructor(
    private readonly solicitacaoService: SolicitacaoService
  ) {}

  async registrarSolicitacao(dados, usuarioId) {
    // Criar a solicitação com workflow
    const solicitacao = await this.solicitacaoService.criar({
      tipo_beneficio_id: dados.tipo_beneficio_id,
      cidadao_id: dados.cidadao_id,
      // Outros dados da solicitação...
    }, usuarioId);
    
    // Retornar informações da solicitação criada
    return {
      id: solicitacao.id,
      protocolo: solicitacao.protocolo,
      etapa_atual: solicitacao.etapa_atual,
      data_limite: solicitacao.data_limite_etapa
    };
  }
}
```

### Execução de Ação em Solicitação

```typescript
// Em um serviço que precisa aprovar uma solicitação
import { Injectable } from '@nestjs/common';
import { SolicitacaoService } from '../solicitacao/services/solicitacao.service';
import { WorkflowAcaoEnum } from '../configuracao/enums/workflow-acao.enum';

@Injectable()
export class AnaliseService {
  constructor(
    private readonly solicitacaoService: SolicitacaoService
  ) {}

  async aprovarSolicitacao(id, observacao, usuarioId) {
    // Executar ação de aprovação
    const resultado = await this.solicitacaoService.executarAcao(
      id,
      {
        acao: WorkflowAcaoEnum.APROVAR,
        observacao,
        dados: {
          data_aprovacao: new Date()
        }
      },
      usuarioId
    );
    
    // Retornar resultado da ação
    return resultado;
  }
}
```

## Considerações de Implementação

1. **Transações**: Utilize transações de banco de dados para garantir a integridade dos dados ao executar ações em solicitações.
2. **Notificações**: Integre com o módulo de Notificação para enviar alertas sobre mudanças de status e prazos.
3. **Auditoria**: Mantenha um histórico detalhado de todas as ações executadas em solicitações.
4. **Tratamento de Exceções**: Implemente tratamento adequado de exceções para lidar com falhas em workflows.
5. **Cálculo de Prazos**: Considere feriados nacionais e municipais no cálculo de prazos.
