# PLANO DE REFATORAÇÃO - MÓDULO DE SOLICITAÇÃO

## VISÃO GERAL

Este documento apresenta um plano detalhado para refatoração do módulo de solicitação do sistema PGBen, com base nas não-conformidades identificadas na análise técnica. O plano está organizado em fases incrementais, priorizando as melhorias de maior impacto e menor risco.

## OBJETIVOS

1. Corrigir as não-conformidades identificadas na análise técnica
2. Melhorar a aderência aos princípios SOLID
3. Reduzir a complexidade e aumentar a manutenibilidade do código
4. Implementar as funcionalidades ausentes
5. Mitigar os riscos identificados

## FASES DE IMPLEMENTAÇÃO

### FASE 1: CORREÇÕES CRÍTICAS (SPRINT 1)

#### 1.1 Completar Matriz de Transições

**Problema:** Algumas transições importantes estão ausentes, como a transição de AGUARDANDO_DOCUMENTOS para REPROVADA.

**Solução:** Refatorar o serviço `WorkflowSolicitacaoService` para incluir as transições ausentes.

```typescript
// Antes
private readonly transicoesPossiveis: Record<StatusSolicitacao, StatusSolicitacao[]> = {
  [StatusSolicitacao.RASCUNHO]: [
    StatusSolicitacao.PENDENTE,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.AGUARDANDO_DOCUMENTOS]: [
    StatusSolicitacao.EM_ANALISE,
    StatusSolicitacao.CANCELADA,
  ],
  // ...
};

// Depois
private readonly transicoesPossiveis: Record<StatusSolicitacao, StatusSolicitacao[]> = {
  [StatusSolicitacao.RASCUNHO]: [
    StatusSolicitacao.PENDENTE,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.AGUARDANDO_DOCUMENTOS]: [
    StatusSolicitacao.EM_ANALISE,
    StatusSolicitacao.REPROVADA,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.REPROVADA]: [
    StatusSolicitacao.CANCELADA,
  ],
  // ...
};
```

#### 1.2 Implementar Validação de Resolução de Pendências

**Problema:** Não há mecanismo para garantir que todas as pendências sejam resolvidas antes de aprovar uma solicitação.

**Solução:** Adicionar validação no método `aprovarSolicitacao` do serviço `WorkflowSolicitacaoService`.

```typescript
async aprovarSolicitacao(
  solicitacaoId: string,
  usuarioId: string,
  observacao?: string,
): Promise<ResultadoTransicaoEstado> {
  const solicitacao = await this.findById(solicitacaoId);
  
  // Verificar se existem pendências não resolvidas
  const pendencias = await this.pendenciaRepository.find({
    where: {
      solicitacao_id: solicitacaoId,
      status: StatusPendencia.PENDENTE,
    },
  });
  
  if (pendencias.length > 0) {
    throw new BadRequestException(
      'Não é possível aprovar a solicitação com pendências não resolvidas',
    );
  }
  
  // Continuar com a transição
  return this.realizarTransicao(
    solicitacaoId,
    StatusSolicitacao.APROVADA,
    usuarioId,
    observacao,
  );
}
```

#### 1.3 Implementar Tratamento de Concorrência

**Problema:** Não há mecanismo explícito para lidar com atualizações concorrentes de solicitações.

**Solução:** Implementar controle de versão otimista usando o decorator `@VersionColumn` do TypeORM.

```typescript
// Em solicitacao.entity.ts
@Entity('solicitacoes')
export class Solicitacao {
  // ... outros campos
  
  @VersionColumn()
  version: number;
  
  // ... outros campos
}

// Em workflow-solicitacao.service.ts
async realizarTransicao(
  solicitacaoId: string,
  novoEstado: StatusSolicitacao,
  usuarioId: string,
  observacao?: string,
): Promise<ResultadoTransicaoEstado> {
  try {
    // ... lógica existente
    
    await this.solicitacaoRepository.save(solicitacao);
    
    // ... resto da lógica
  } catch (error) {
    if (error instanceof TypeORMError && error.message.includes('version')) {
      throw new ConflictException(
        'A solicitação foi modificada por outro usuário. Por favor, recarregue e tente novamente.',
      );
    }
    throw error;
  }
}
```

### FASE 2: REFATORAÇÃO ARQUITETURAL (SPRINT 2)

#### 2.1 Extrair Matriz de Transições para Configuração

**Problema:** A matriz de transições está hardcoded no serviço, dificultando a extensão.

**Solução:** Extrair a matriz para um arquivo de configuração e criar um serviço dedicado para gerenciamento de transições.

1. Criar arquivo de configuração:

```typescript
// src/modules/solicitacao/config/workflow-config.ts
import { StatusSolicitacao } from '../entities/solicitacao.entity';

export const TRANSICOES_POSSIVEIS: Record<StatusSolicitacao, StatusSolicitacao[]> = {
  [StatusSolicitacao.RASCUNHO]: [
    StatusSolicitacao.PENDENTE,
    StatusSolicitacao.CANCELADA,
  ],
  // ... outras transições
};

export const PERMISSOES_TRANSICAO: Record<string, string[]> = {
  'RASCUNHO_PARA_PENDENTE': ['solicitacao.submeter'],
  'PENDENTE_PARA_EM_ANALISE': ['solicitacao.enviar-para-analise'],
  // ... outras permissões
};
```

2. Criar serviço de transições:

```typescript
// src/modules/solicitacao/services/transicao-estado.service.ts
@Injectable()
export class TransicaoEstadoService {
  private readonly transicoesPossiveis = TRANSICOES_POSSIVEIS;
  private readonly permissoesTransicao = PERMISSOES_TRANSICAO;
  
  isTransicaoValida(estadoAtual: StatusSolicitacao, novoEstado: StatusSolicitacao): boolean {
    return this.transicoesPossiveis[estadoAtual]?.includes(novoEstado) || false;
  }
  
  getEstadosPossiveis(estadoAtual: StatusSolicitacao): StatusSolicitacao[] {
    return this.transicoesPossiveis[estadoAtual] || [];
  }
  
  getPermissoesNecessarias(estadoAtual: StatusSolicitacao, novoEstado: StatusSolicitacao): string[] {
    const chave = `${estadoAtual}_PARA_${novoEstado}`;
    return this.permissoesTransicao[chave] || [];
  }
}
```

3. Refatorar o serviço `WorkflowSolicitacaoService` para usar o novo serviço:

```typescript
@Injectable()
export class WorkflowSolicitacaoService {
  constructor(
    // ... outras injeções
    private readonly transicaoEstadoService: TransicaoEstadoService,
  ) {}
  
  async realizarTransicao(
    solicitacaoId: string,
    novoEstado: StatusSolicitacao,
    usuarioId: string,
    observacao?: string,
  ): Promise<ResultadoTransicaoEstado> {
    const solicitacao = await this.findById(solicitacaoId);
    
    if (!this.transicaoEstadoService.isTransicaoValida(solicitacao.status, novoEstado)) {
      throw new BadRequestException(
        `Transição de ${solicitacao.status} para ${novoEstado} não é permitida`,
      );
    }
    
    // ... resto da lógica
  }
  
  async getEstadosPossiveis(solicitacaoId: string): Promise<StatusSolicitacao[]> {
    const solicitacao = await this.findById(solicitacaoId);
    return this.transicaoEstadoService.getEstadosPossiveis(solicitacao.status);
  }
}
```

#### 2.2 Separar Validação de Regras de Negócio

**Problema:** Há mistura de responsabilidades entre o gerenciamento do fluxo e a validação de regras de negócio.

**Solução:** Criar um serviço dedicado para validação de regras de negócio.

```typescript
// src/modules/solicitacao/services/validacao-solicitacao.service.ts
@Injectable()
export class ValidacaoSolicitacaoService {
  constructor(
    @InjectRepository(Pendencia)
    private pendenciaRepository: Repository<Pendencia>,
    // ... outras injeções
  ) {}
  
  async validarAprovacao(solicitacaoId: string): Promise<void> {
    // Verificar se existem pendências não resolvidas
    const pendencias = await this.pendenciaRepository.find({
      where: {
        solicitacao_id: solicitacaoId,
        status: StatusPendencia.PENDENTE,
      },
    });
    
    if (pendencias.length > 0) {
      throw new BadRequestException(
        'Não é possível aprovar a solicitação com pendências não resolvidas',
      );
    }
    
    // Outras validações específicas para aprovação
  }
  
  async validarLiberacao(solicitacaoId: string): Promise<void> {
    // Validações específicas para liberação
  }
  
  // ... outros métodos de validação
}
```

Refatorar o serviço `WorkflowSolicitacaoService` para usar o novo serviço:

```typescript
@Injectable()
export class WorkflowSolicitacaoService {
  constructor(
    // ... outras injeções
    private readonly validacaoService: ValidacaoSolicitacaoService,
  ) {}
  
  async aprovarSolicitacao(
    solicitacaoId: string,
    usuarioId: string,
    observacao?: string,
  ): Promise<ResultadoTransicaoEstado> {
    await this.validacaoService.validarAprovacao(solicitacaoId);
    
    return this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.APROVADA,
      usuarioId,
      observacao,
    );
  }
  
  // ... outros métodos
}
```

### FASE 3: IMPLEMENTAÇÃO DE FUNCIONALIDADES AUSENTES (SPRINT 3)

#### 3.1 Implementar Controle de Prazos

**Problema:** Não há implementação clara de controle de prazos para cada etapa do fluxo.

**Solução:** Adicionar campos e lógica para controle de prazos.

1. Adicionar campos na entidade `Solicitacao`:

```typescript
// Em solicitacao.entity.ts
@Entity('solicitacoes')
export class Solicitacao {
  // ... outros campos
  
  @Column({ nullable: true })
  prazo_analise: Date;
  
  @Column({ nullable: true })
  prazo_documentos: Date;
  
  @Column({ nullable: true })
  prazo_processamento: Date;
  
  // ... outros campos
}
```

2. Criar migration para adicionar os novos campos:

```typescript
// Nova migration
export class AdicionarCamposPrazo1747961017400 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE solicitacoes
      ADD COLUMN prazo_analise TIMESTAMP,
      ADD COLUMN prazo_documentos TIMESTAMP,
      ADD COLUMN prazo_processamento TIMESTAMP
    `);
  }
  
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE solicitacoes
      DROP COLUMN prazo_analise,
      DROP COLUMN prazo_documentos,
      DROP COLUMN prazo_processamento
    `);
  }
}
```

3. Implementar lógica para definir e verificar prazos:

```typescript
// Em workflow-solicitacao.service.ts
async enviarParaAnalise(
  solicitacaoId: string,
  usuarioId: string,
): Promise<ResultadoTransicaoEstado> {
  const solicitacao = await this.findById(solicitacaoId);
  
  // Definir prazo de análise (5 dias úteis)
  solicitacao.prazo_analise = this.calcularPrazoEmDiasUteis(new Date(), 5);
  
  return this.realizarTransicao(
    solicitacaoId,
    StatusSolicitacao.EM_ANALISE,
    usuarioId,
  );
}

async solicitarDocumentos(
  solicitacaoId: string,
  usuarioId: string,
): Promise<ResultadoTransicaoEstado> {
  const solicitacao = await this.findById(solicitacaoId);
  
  // Definir prazo para envio de documentos (10 dias úteis)
  solicitacao.prazo_documentos = this.calcularPrazoEmDiasUteis(new Date(), 10);
  
  return this.realizarTransicao(
    solicitacaoId,
    StatusSolicitacao.AGUARDANDO_DOCUMENTOS,
    usuarioId,
  );
}

private calcularPrazoEmDiasUteis(dataInicial: Date, dias: number): Date {
  // Implementação do cálculo de dias úteis
  // ...
  return dataPrazo;
}
```

4. Adicionar endpoint para verificar solicitações com prazo vencido:

```typescript
// Em workflow-solicitacao.controller.ts
@Get('prazos-vencidos')
@RequiresPermission({ permissionName: 'solicitacao.visualizar' })
async getSolicitacoesComPrazoVencido(): Promise<Solicitacao[]> {
  return this.workflowService.getSolicitacoesComPrazoVencido();
}

// Em workflow-solicitacao.service.ts
async getSolicitacoesComPrazoVencido(): Promise<Solicitacao[]> {
  const hoje = new Date();
  
  return this.solicitacaoRepository.find({
    where: [
      {
        status: StatusSolicitacao.EM_ANALISE,
        prazo_analise: LessThan(hoje),
      },
      {
        status: StatusSolicitacao.AGUARDANDO_DOCUMENTOS,
        prazo_documentos: LessThan(hoje),
      },
      {
        status: StatusSolicitacao.EM_PROCESSAMENTO,
        prazo_processamento: LessThan(hoje),
      },
    ],
  });
}
```

#### 3.2 Implementar Tratamento Especial para Determinações Judiciais

**Problema:** Apesar de haver flag para determinações judiciais, não há tratamento especial para priorização no fluxo.

**Solução:** Adicionar lógica para priorização de solicitações com determinações judiciais.

1. Adicionar campo de prioridade na entidade `Solicitacao`:

```typescript
// Em solicitacao.entity.ts
export enum PrioridadeSolicitacao {
  NORMAL = 'NORMAL',
  ALTA = 'ALTA',
  URGENTE = 'URGENTE',
}

@Entity('solicitacoes')
export class Solicitacao {
  // ... outros campos
  
  @Column({
    type: 'enum',
    enum: PrioridadeSolicitacao,
    default: PrioridadeSolicitacao.NORMAL,
  })
  prioridade: PrioridadeSolicitacao;
  
  // ... outros campos
}
```

2. Criar migration para adicionar o novo campo:

```typescript
// Nova migration
export class AdicionarCampoPrioridade1747961017500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE prioridade_solicitacao AS ENUM ('NORMAL', 'ALTA', 'URGENTE');
      
      ALTER TABLE solicitacoes
      ADD COLUMN prioridade prioridade_solicitacao NOT NULL DEFAULT 'NORMAL'
    `);
  }
  
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE solicitacoes
      DROP COLUMN prioridade;
      
      DROP TYPE prioridade_solicitacao
    `);
  }
}
```

3. Modificar o serviço `SolicitacaoService` para definir prioridade ao vincular determinação judicial:

```typescript
// Em solicitacao.service.ts
async vincularDeterminacaoJudicial(
  solicitacaoId: string,
  vincularDto: VincularDeterminacaoJudicialDto,
  user: any,
): Promise<Solicitacao> {
  return this.connection.transaction(async (manager) => {
    // ... lógica existente
    
    // Definir prioridade como URGENTE para solicitações com determinação judicial
    solicitacao.prioridade = PrioridadeSolicitacao.URGENTE;
    
    // ... resto da lógica
  });
}

async desvincularDeterminacaoJudicial(
  solicitacaoId: string,
  user: any,
): Promise<Solicitacao> {
  return this.connection.transaction(async (manager) => {
    // ... lógica existente
    
    // Restaurar prioridade para NORMAL ao desvincular
    solicitacao.prioridade = PrioridadeSolicitacao.NORMAL;
    
    // ... resto da lógica
  });
}
```

4. Modificar o método `findAll` para ordenar por prioridade:

```typescript
// Em solicitacao.service.ts
async findAll(options: {
  // ... parâmetros existentes
}): Promise<{ items: Solicitacao[]; total: number }> {
  // ... lógica existente
  
  // Ordenar por prioridade (mais alta primeiro) e depois por data
  queryBuilder.orderBy('solicitacao.prioridade', 'DESC');
  queryBuilder.addOrderBy('solicitacao.data_abertura', 'ASC');
  
  // ... resto da lógica
}
```

### FASE 4: MELHORIAS DE USABILIDADE E MANUTENIBILIDADE (SPRINT 4)

#### 4.1 Implementar Arquitetura Baseada em Eventos

**Problema:** O acoplamento entre módulos dificulta a manutenção e extensão.

**Solução:** Implementar um sistema de eventos para notificar outros módulos sobre mudanças de estado.

1. Criar interface para eventos:

```typescript
// src/shared/events/solicitacao-event.interface.ts
export interface SolicitacaoEvent {
  solicitacaoId: string;
  estadoAnterior: StatusSolicitacao;
  estadoAtual: StatusSolicitacao;
  timestamp: Date;
  usuarioId: string;
}
```

2. Criar serviço de eventos:

```typescript
// src/shared/services/event-bus.service.ts
@Injectable()
export class EventBusService {
  private eventEmitter = new EventEmitter();
  
  emit(eventName: string, payload: any): void {
    this.eventEmitter.emit(eventName, payload);
  }
  
  on(eventName: string, callback: (payload: any) => void): void {
    this.eventEmitter.on(eventName, callback);
  }
}
```

3. Modificar o serviço `WorkflowSolicitacaoService` para emitir eventos:

```typescript
// Em workflow-solicitacao.service.ts
@Injectable()
export class WorkflowSolicitacaoService {
  constructor(
    // ... outras injeções
    private readonly eventBus: EventBusService,
  ) {}
  
  async realizarTransicao(
    solicitacaoId: string,
    novoEstado: StatusSolicitacao,
    usuarioId: string,
    observacao?: string,
  ): Promise<ResultadoTransicaoEstado> {
    // ... lógica existente
    
    // Emitir evento após transição bem-sucedida
    this.eventBus.emit('solicitacao.transicao', {
      solicitacaoId,
      estadoAnterior: estadoAnterior,
      estadoAtual: novoEstado,
      timestamp: new Date(),
      usuarioId,
    } as SolicitacaoEvent);
    
    // ... resto da lógica
  }
}
```

4. Criar listeners em outros módulos:

```typescript
// Em beneficio.module.ts
@Module({
  // ... configuração existente
})
export class BeneficioModule implements OnModuleInit {
  constructor(private readonly eventBus: EventBusService) {}
  
  onModuleInit() {
    this.eventBus.on('solicitacao.transicao', (event: SolicitacaoEvent) => {
      // Reagir a eventos de transição de solicitação
      if (event.estadoAtual === StatusSolicitacao.LIBERADA) {
        // Lógica para processar benefício quando solicitação é liberada
      }
    });
  }
}
```

## ESTIMATIVA DE ESFORÇO

| Fase | Descrição | Esforço (dias) | Complexidade | Prioridade |
|------|-----------|----------------|--------------|------------|
| 1.1 | Completar Matriz de Transições | 1 | Baixa | Alta |
| 1.2 | Implementar Validação de Pendências | 2 | Média | Alta |
| 1.3 | Implementar Tratamento de Concorrência | 2 | Média | Alta |
| 2.1 | Extrair Matriz de Transições | 3 | Média | Média |
| 2.2 | Separar Validação de Regras | 3 | Média | Média |
| 3.1 | Implementar Controle de Prazos | 4 | Alta | Média |
| 3.2 | Implementar Tratamento para Determinações Judiciais | 3 | Média | Média |
| 4.1 | Implementar Arquitetura Baseada em Eventos | 5 | Alta | Baixa |

## PLANO DE TESTES

Para cada fase da refatoração, devem ser implementados os seguintes tipos de testes:

1. **Testes Unitários**:
   - Testar cada método dos serviços isoladamente
   - Testar validações e regras de negócio
   - Testar transições de estado

2. **Testes de Integração**:
   - Testar fluxo completo de solicitação
   - Testar integração entre serviços
   - Testar persistência de dados

3. **Testes de Sistema**:
   - Testar API completa
   - Testar cenários de erro e recuperação
   - Testar desempenho com volume

## RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Regressão funcional | Alta | Alto | Implementar testes automatizados abrangentes |
| Impacto em outros módulos | Média | Alto | Implementar arquitetura baseada em eventos |
| Degradação de desempenho | Baixa | Médio | Monitorar métricas de desempenho durante refatoração |
| Resistência à mudança | Média | Médio | Documentar benefícios e envolver equipe |

## CONCLUSÃO

A refatoração proposta visa corrigir as não-conformidades identificadas na análise técnica e melhorar a qualidade geral do módulo de solicitação. O plano foi estruturado em fases incrementais para minimizar riscos e permitir entregas contínuas de valor.

A implementação completa deste plano resultará em um módulo mais robusto, manutenível e extensível, capaz de atender às necessidades atuais e futuras do sistema PGBen.
