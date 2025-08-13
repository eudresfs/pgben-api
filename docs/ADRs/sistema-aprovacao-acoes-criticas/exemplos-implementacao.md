# Exemplos de Implementação - Sistema de Aprovação de Ações Críticas

## Casos de Uso Práticos

### Caso 1: Cancelamento de Solicitação

#### Cenário
- **Ação**: Cancelamento de solicitação de benefício
- **Solicitante**: João (usuário comum)
- **Aprovador**: Maria (gestora da unidade)
- **Regra**: Usuários comuns precisam de aprovação, gestores podem aprovar

#### Implementação no SolicitacaoService

```typescript
@Injectable()
export class SolicitacaoService {
  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  @RequerAprovacao({
    acao: TipoAcaoCritica.CANCELAR_SOLICITACAO,
    entidadeAlvo: 'Solicitacao',
    permitirAutoAprovacao: true,
    condicoesAutoAprovacao: (context) => {
      // Gestores e administradores podem cancelar diretamente
      return ['GESTOR', 'ADMIN'].includes(context.usuario.role);
    }
  })
  async cancelarSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dados: CancelarSolicitacaoDto,
    @GetUser() usuario: Usuario,
    @GetClientInfo() clientInfo: ClientInfo,
  ): Promise<Solicitacao | SolicitacaoAprovacaoPendente> {
    // Validar se solicitação existe e pode ser cancelada
    const solicitacao = await this.validarSolicitacaoParaCancelamento(id);

    // Se chegou até aqui, significa que:
    // 1. Não requer aprovação OU
    // 2. Usuário tem permissão para auto-aprovação OU
    // 3. Aprovação já foi concedida

    // Executar cancelamento
    solicitacao.status = StatusSolicitacao.CANCELADA;
    solicitacao.motivo_cancelamento = dados.justificativa;
    solicitacao.cancelado_por = usuario.id;
    solicitacao.data_cancelamento = new Date();

    const solicitacaoAtualizada = await this.solicitacaoRepository.save(solicitacao);

    // Registrar na auditoria
    await this.auditoriaService.registrarOperacao({
      tipo_operacao: TipoOperacao.UPDATE,
      entidade_afetada: 'Solicitacao',
      entidade_id: id,
      usuario_id: usuario.id,
      descricao: `Solicitação cancelada: ${dados.justificativa}`,
      dados_anteriores: { status: StatusSolicitacao.EM_ANALISE },
      dados_novos: { status: StatusSolicitacao.CANCELADA },
      ip_origem: clientInfo.ip,
      user_agent: clientInfo.userAgent,
    });

    return solicitacaoAtualizada;
  }

  private async validarSolicitacaoParaCancelamento(id: string): Promise<Solicitacao> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id },
      relations: ['cidadao', 'beneficio'],
    });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    if (solicitacao.status === StatusSolicitacao.CANCELADA) {
      throw new BadRequestException('Solicitação já está cancelada');
    }

    if (solicitacao.status === StatusSolicitacao.APROVADA) {
      throw new BadRequestException('Não é possível cancelar solicitação já aprovada');
    }

    return solicitacao;
  }
}
```

#### Controller Implementation

```typescript
@Controller('solicitacoes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiTags('Solicitações')
export class SolicitacaoController {
  constructor(
    private readonly solicitacaoService: SolicitacaoService,
  ) {}

  @Post(':id/cancelar')
  @RequiresPermission('CANCELAR_SOLICITACAO')
  @ApiOperation({ 
    summary: 'Cancelar solicitação',
    description: 'Cancela uma solicitação. Pode requerer aprovação dependendo do perfil do usuário.'
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação cancelada com sucesso',
    type: Solicitacao,
  })
  @ApiResponse({
    status: 202,
    description: 'Solicitação de aprovação criada',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        solicitacao_id: { type: 'string' },
        status: { type: 'string' },
        prazo_limite: { type: 'string', format: 'date-time' },
      },
    },
  })
  async cancelarSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dados: CancelarSolicitacaoDto,
    @GetUser() usuario: Usuario,
    @GetClientInfo() clientInfo: ClientInfo,
  ) {
    return this.solicitacaoService.cancelarSolicitacao(id, dados, usuario, clientInfo);
  }
}
```

### Caso 2: Suspensão de Benefício

#### Cenário
- **Ação**: Suspensão de benefício por irregularidade
- **Solicitante**: Ana (analista)
- **Aprovadores**: Carlos (coordenador) + Lucia (diretora)
- **Regra**: Requer aprovação de 2 pessoas (maioria)

#### Implementação no BeneficioService

```typescript
@Injectable()
export class BeneficioService {
  @RequerAprovacao({
    acao: TipoAcaoCritica.SUSPENDER_BENEFICIO,
    entidadeAlvo: 'Beneficio',
    permitirAutoAprovacao: false, // Sempre requer aprovação
  })
  async suspenderBeneficio(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dados: SuspenderBeneficioDto,
    @GetUser() usuario: Usuario,
  ): Promise<Beneficio> {
    // Validar benefício
    const beneficio = await this.validarBeneficioParaSuspensao(id);

    // Executar suspensão
    beneficio.status = StatusBeneficio.SUSPENSO;
    beneficio.motivo_suspensao = dados.motivo;
    beneficio.data_suspensao = new Date();
    beneficio.suspenso_por = usuario.id;

    const beneficioAtualizado = await this.beneficioRepository.save(beneficio);

    // Notificar cidadão sobre suspensão
    await this.notificarSuspensaoBeneficio(beneficioAtualizado);

    return beneficioAtualizado;
  }

  private async notificarSuspensaoBeneficio(beneficio: Beneficio): Promise<void> {
    await this.notificacaoService.enviarNotificacao({
      destinatario_id: beneficio.cidadao_id,
      template_codigo: 'BENEFICIO_SUSPENSO',
      canal: CanalNotificacao.EMAIL,
      variaveis: {
        nome_beneficio: beneficio.tipo_beneficio,
        motivo_suspensao: beneficio.motivo_suspensao,
        data_suspensao: beneficio.data_suspensao,
      },
    });
  }
}
```

### Caso 3: Configuração Dinâmica de Aprovação

#### Cenário
- Configurar diferentes regras de aprovação por unidade
- Permitir escalação automática após prazo

#### Implementação da Configuração

```typescript
@Injectable()
export class ConfiguracaoAprovacaoService {
  async configurarAprovacaoPersonalizada(
    dados: ConfiguracaoPersonalizadaDto,
  ): Promise<ConfiguracaoAprovacao> {
    // Validar ação crítica
    const acaoCritica = await this.acaoCriticaRepository.findOne({
      where: { codigo: dados.codigoAcao },
    });

    if (!acaoCritica) {
      throw new NotFoundException('Ação crítica não encontrada');
    }

    // Criar configuração
    const configuracao = this.configuracaoRepository.create({
      acao_critica_id: acaoCritica.id,
      estrategia_aprovacao: dados.estrategia,
      numero_aprovadores_necessarios: dados.numeroAprovadores,
      prazo_horas: dados.prazoHoras,
      permite_auto_aprovacao: dados.permiteAutoAprovacao,
      condicoes_auto_aprovacao: dados.condicoesAutoAprovacao,
      escalacao_ativa: dados.escalacaoAtiva,
      prazo_escalacao_horas: dados.prazoEscalacao,
      configuracao_escalacao: dados.configuracaoEscalacao,
    });

    const configuracaoSalva = await this.configuracaoRepository.save(configuracao);

    // Configurar aprovadores
    if (dados.aprovadores?.length > 0) {
      await this.definirAprovadores(configuracaoSalva.id, dados.aprovadores);
    }

    return configuracaoSalva;
  }

  async definirAprovadores(
    configuracaoId: string,
    aprovadores: DefinirAprovadorDto[],
  ): Promise<Aprovador[]> {
    // Remover aprovadores existentes
    await this.aprovadorRepository.delete({ configuracao_aprovacao_id: configuracaoId });

    // Criar novos aprovadores
    const novosAprovadores = aprovadores.map((aprovador, index) => 
      this.aprovadorRepository.create({
        configuracao_aprovacao_id: configuracaoId,
        usuario_id: aprovador.usuarioId,
        role_aprovador: aprovador.role,
        permissao_aprovador: aprovador.permissao,
        escopo_aprovacao: aprovador.escopo,
        escopo_id: aprovador.escopoId,
        ordem_hierarquica: aprovador.ordemHierarquica || index + 1,
      })
    );

    return this.aprovadorRepository.save(novosAprovadores);
  }
}
```

## Fluxos de Trabalho Complexos

### Aprovação Hierárquica

```typescript
@Injectable()
export class AprovacaoHierarquicaStrategy implements EstrategiaAprovacaoInterface {
  async processarDecisao(
    solicitacao: SolicitacaoAprovacao,
    decisao: TipoAcaoAprovacao,
    aprovadorId: string,
  ): Promise<ResultadoProcessamento> {
    if (decisao === TipoAcaoAprovacao.NEGADO) {
      return {
        novoStatus: StatusSolicitacaoAprovacao.NEGADO,
        finalizada: true,
        motivo: 'Solicitação negada na hierarquia'
      };
    }

    const configuracao = await this.obterConfiguracao(solicitacao.acao_critica_id);
    const aprovadores = await this.obterAprovadoresOrdenados(configuracao.id);
    const historicoAprovacao = await this.obterHistoricoAprovacao(solicitacao.id);

    // Encontrar posição do aprovador atual
    const aprovadorAtual = aprovadores.find(a => a.usuario_id === aprovadorId);
    if (!aprovadorAtual) {
      throw new ForbiddenException('Aprovador não autorizado');
    }

    // Verificar se é a vez deste aprovador
    const proximaOrdem = this.calcularProximaOrdem(historicoAprovacao, aprovadores);
    if (aprovadorAtual.ordem_hierarquica !== proximaOrdem) {
      throw new BadRequestException('Não é a vez deste aprovador na hierarquia');
    }

    // Verificar se há mais aprovadores na sequência
    const proximoAprovador = aprovadores.find(
      a => a.ordem_hierarquica > aprovadorAtual.ordem_hierarquica
    );

    if (!proximoAprovador) {
      // Último aprovador da hierarquia
      return {
        novoStatus: StatusSolicitacaoAprovacao.APROVADO,
        finalizada: true,
        motivo: 'Aprovação hierárquica completa'
      };
    }

    // Notificar próximo aprovador
    await this.notificarProximoAprovador(solicitacao, proximoAprovador);

    return {
      novoStatus: StatusSolicitacaoAprovacao.EM_ANALISE,
      finalizada: false,
      motivo: `Aguardando aprovação de ${proximoAprovador.usuario?.nome || proximoAprovador.role_aprovador}`
    };
  }

  private calcularProximaOrdem(
    historico: HistoricoAprovacao[],
    aprovadores: Aprovador[],
  ): number {
    const aprovacoesRealizadas = historico
      .filter(h => h.acao === TipoAcaoAprovacao.APROVADO)
      .map(h => {
        const aprovador = aprovadores.find(a => a.usuario_id === h.aprovador_id);
        return aprovador?.ordem_hierarquica || 0;
      })
      .sort((a, b) => a - b);

    if (aprovacoesRealizadas.length === 0) {
      return 1; // Primeira aprovação
    }

    const ultimaOrdem = aprovacoesRealizadas[aprovacoesRealizadas.length - 1];
    return ultimaOrdem + 1;
  }
}
```

### Escalação Automática

```typescript
@Injectable()
export class EscalacaoService {
  constructor(
    @InjectQueue(APROVACAO_QUEUE) private readonly aprovacaoQueue: Queue,
    private readonly notificacaoService: NotificationManagerService,
  ) {}

  async verificarPrazoExpirado(solicitacaoId: string): Promise<void> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { 
        id: solicitacaoId,
        status: StatusSolicitacaoAprovacao.PENDENTE,
      },
      relations: ['acao_critica'],
    });

    if (!solicitacao) {
      return; // Solicitação não existe ou já foi processada
    }

    const agora = new Date();
    if (agora <= solicitacao.prazo_limite) {
      return; // Prazo ainda não expirou
    }

    const configuracao = await this.obterConfiguracaoAprovacao(
      solicitacao.acao_critica_id
    );

    if (configuracao.escalacao_ativa) {
      await this.escalarAprovacao(solicitacaoId, 'Prazo de aprovação expirado');
    } else {
      await this.marcarComoExpirado(solicitacaoId);
    }
  }

  async escalarAprovacao(solicitacaoId: string, motivo: string): Promise<void> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
      relations: ['acao_critica'],
    });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    const configuracao = await this.obterConfiguracaoAprovacao(
      solicitacao.acao_critica_id
    );

    // Criar registro de escalação
    const escalacao = this.escalacaoRepository.create({
      solicitacao_aprovacao_id: solicitacaoId,
      motivo_escalacao: motivo,
      configuracao_original: configuracao,
      data_escalacao: new Date(),
    });

    await this.escalacaoRepository.save(escalacao);

    // Aplicar nova configuração de escalação
    const novaConfiguracao = configuracao.configuracao_escalacao;
    if (novaConfiguracao) {
      await this.aplicarConfiguracaoEscalacao(solicitacao, novaConfiguracao);
    }

    // Atualizar status da solicitação
    solicitacao.status = StatusSolicitacaoAprovacao.ESCALADO;
    await this.solicitacaoRepository.save(solicitacao);

    // Notificar novos aprovadores
    await this.notificarAprovadoresEscalacao(solicitacao, escalacao);
  }

  private async aplicarConfiguracaoEscalacao(
    solicitacao: SolicitacaoAprovacao,
    configuracaoEscalacao: any,
  ): Promise<void> {
    // Estender prazo
    if (configuracaoEscalacao.estenderPrazo) {
      const novoPrazo = new Date();
      novoPrazo.setHours(novoPrazo.getHours() + configuracaoEscalacao.horasAdicionais);
      solicitacao.prazo_limite = novoPrazo;
    }

    // Alterar estratégia de aprovação
    if (configuracaoEscalacao.novaEstrategia) {
      // Implementar lógica para alterar estratégia
    }

    // Adicionar aprovadores de escalação
    if (configuracaoEscalacao.aprovadoresEscalacao) {
      await this.adicionarAprovadoresEscalacao(
        solicitacao.acao_critica_id,
        configuracaoEscalacao.aprovadoresEscalacao
      );
    }
  }
}
```

## Integração com Frontend

### Componente de Aprovação Pendente

```typescript
// aprovacao-pendente.component.ts
@Component({
  selector: 'app-aprovacao-pendente',
  templateUrl: './aprovacao-pendente.component.html',
  styleUrls: ['./aprovacao-pendente.component.scss']
})
export class AprovacaoPendenteComponent implements OnInit {
  aprovacoesPendentes: SolicitacaoAprovacao[] = [];
  loading = false;
  filtros = {
    status: '',
    acao: '',
    dataInicio: '',
    dataFim: ''
  };

  constructor(
    private aprovacaoService: AprovacaoService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.carregarAprovacoesPendentes();
  }

  async carregarAprovacoesPendentes(): Promise<void> {
    this.loading = true;
    try {
      this.aprovacoesPendentes = await this.aprovacaoService.listarAprovacoesPendentes(this.filtros);
    } catch (error) {
      this.notificationService.showError('Erro ao carregar aprovações pendentes');
    } finally {
      this.loading = false;
    }
  }

  async processarAprovacao(solicitacao: SolicitacaoAprovacao): Promise<void> {
    const dialogRef = this.dialog.open(ProcessarAprovacaoDialogComponent, {
      width: '600px',
      data: { solicitacao }
    });

    const resultado = await dialogRef.afterClosed().toPromise();
    if (resultado) {
      await this.carregarAprovacoesPendentes();
      this.notificationService.showSuccess('Aprovação processada com sucesso');
    }
  }

  obterCorStatus(status: string): string {
    const cores = {
      'pendente': 'orange',
      'em_analise': 'blue',
      'aprovado': 'green',
      'negado': 'red',
      'expirado': 'gray',
      'escalado': 'purple'
    };
    return cores[status] || 'black';
  }

  calcularTempoRestante(prazoLimite: Date): string {
    const agora = new Date();
    const prazo = new Date(prazoLimite);
    const diferenca = prazo.getTime() - agora.getTime();

    if (diferenca <= 0) {
      return 'Expirado';
    }

    const horas = Math.floor(diferenca / (1000 * 60 * 60));
    const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));

    return `${horas}h ${minutos}m`;
  }
}
```

### Template HTML

```html
<!-- aprovacao-pendente.component.html -->
<div class="aprovacao-container">
  <mat-card>
    <mat-card-header>
      <mat-card-title>Aprovações Pendentes</mat-card-title>
    </mat-card-header>
    
    <mat-card-content>
      <!-- Filtros -->
      <div class="filtros-container">
        <mat-form-field>
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="filtros.status" (selectionChange)="carregarAprovacoesPendentes()">
            <mat-option value="">Todos</mat-option>
            <mat-option value="pendente">Pendente</mat-option>
            <mat-option value="em_analise">Em Análise</mat-option>
            <mat-option value="escalado">Escalado</mat-option>
          </mat-select>
        </mat-form-field>
        
        <mat-form-field>
          <mat-label>Ação</mat-label>
          <mat-select [(ngModel)]="filtros.acao" (selectionChange)="carregarAprovacoesPendentes()">
            <mat-option value="">Todas</mat-option>
            <mat-option value="CANCELAR_SOLICITACAO">Cancelar Solicitação</mat-option>
            <mat-option value="SUSPENDER_BENEFICIO">Suspender Benefício</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Lista de Aprovações -->
      <div class="aprovacoes-lista" *ngIf="!loading">
        <mat-card *ngFor="let aprovacao of aprovacoesPendentes" class="aprovacao-item">
          <mat-card-header>
            <mat-card-title>
              {{ aprovacao.acao_critica.nome }}
              <mat-chip [style.background-color]="obterCorStatus(aprovacao.status)">
                {{ aprovacao.status | titlecase }}
              </mat-chip>
            </mat-card-title>
            <mat-card-subtitle>
              Solicitado por: {{ aprovacao.solicitante.nome }} em {{ aprovacao.created_at | date:'short' }}
            </mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <p><strong>Justificativa:</strong> {{ aprovacao.justificativa }}</p>
            <p><strong>Prazo:</strong> 
              <span [class.text-danger]="calcularTempoRestante(aprovacao.prazo_limite) === 'Expirado'">
                {{ calcularTempoRestante(aprovacao.prazo_limite) }}
              </span>
            </p>
          </mat-card-content>
          
          <mat-card-actions>
            <button mat-raised-button color="primary" 
                    (click)="processarAprovacao(aprovacao)">
              Processar
            </button>
            <button mat-button (click)="verDetalhes(aprovacao)">
              Ver Detalhes
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Carregando aprovações...</p>
      </div>

      <!-- Vazio -->
      <div *ngIf="!loading && aprovacoesPendentes.length === 0" class="empty-state">
        <mat-icon>check_circle</mat-icon>
        <p>Nenhuma aprovação pendente</p>
      </div>
    </mat-card-content>
  </mat-card>
</div>
```

## Monitoramento e Alertas

### Dashboard de Métricas

```typescript
@Injectable()
export class AprovacaoDashboardService {
  async obterDadosDashboard(): Promise<DadosDashboard> {
    const [metricas, topAcoes, aprovadoresMaisAtivos, tempoMedioAprovacao] = 
      await Promise.all([
        this.obterMetricasGerais(),
        this.obterTopAcoesComAprovacao(),
        this.obterAprovadoresMaisAtivos(),
        this.calcularTempoMedioAprovacaoPorAcao(),
      ]);

    return {
      metricas,
      topAcoes,
      aprovadoresMaisAtivos,
      tempoMedioAprovacao,
      alertas: await this.obterAlertas(),
    };
  }

  private async obterAlertas(): Promise<Alerta[]> {
    const alertas: Alerta[] = [];

    // Alertas de prazo próximo ao vencimento
    const solicitacoesProximasVencimento = await this.solicitacaoRepository
      .createQueryBuilder('s')
      .where('s.status = :status', { status: StatusSolicitacaoAprovacao.PENDENTE })
      .andWhere('s.prazo_limite <= :prazo', { 
        prazo: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 horas
      })
      .getCount();

    if (solicitacoesProximasVencimento > 0) {
      alertas.push({
        tipo: 'warning',
        titulo: 'Prazos próximos ao vencimento',
        descricao: `${solicitacoesProximasVencimento} solicitações vencem em menos de 4 horas`,
        acao: 'Ver solicitações',
        link: '/aprovacoes?filtro=prazo_proximo'
      });
    }

    // Alertas de solicitações expiradas
    const solicitacoesExpiradas = await this.solicitacaoRepository
      .createQueryBuilder('s')
      .where('s.status = :status', { status: StatusSolicitacaoAprovacao.EXPIRADO })
      .andWhere('s.created_at >= :data', { 
        data: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24h
      })
      .getCount();

    if (solicitacoesExpiradas > 0) {
      alertas.push({
        tipo: 'error',
        titulo: 'Solicitações expiradas',
        descricao: `${solicitacoesExpiradas} solicitações expiraram nas últimas 24 horas`,
        acao: 'Ver expiradas',
        link: '/aprovacoes?filtro=expiradas'
      });
    }

    return alertas;
  }
}
```

Este documento complementa o planejamento principal com exemplos práticos de implementação, demonstrando como o sistema de aprovação se integra com os módulos existentes do PGBen, mantendo consistência com os padrões arquiteturais e de código estabelecidos.