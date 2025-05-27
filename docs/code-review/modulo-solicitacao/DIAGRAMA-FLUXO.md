# DIAGRAMA DE FLUXO - MÓDULO DE SOLICITAÇÃO

## Diagrama de Estados e Transições

```mermaid
stateDiagram-v2
    [*] --> RASCUNHO: Criação da solicitação
    
    RASCUNHO --> PENDENTE: submeterRascunho()
    RASCUNHO --> CANCELADA: cancelarSolicitacao()
    
    PENDENTE --> EM_ANALISE: enviarParaAnalise()
    PENDENTE --> CANCELADA: cancelarSolicitacao()
    
    EM_ANALISE --> AGUARDANDO_DOCUMENTOS: solicitarDocumentos()
    EM_ANALISE --> APROVADA: aprovarSolicitacao()
    EM_ANALISE --> REPROVADA: rejeitarSolicitacao()
    EM_ANALISE --> CANCELADA: cancelarSolicitacao()
    
    AGUARDANDO_DOCUMENTOS --> EM_ANALISE: receberDocumentos()
    AGUARDANDO_DOCUMENTOS --> CANCELADA: cancelarSolicitacao()
    
    APROVADA --> LIBERADA: liberarSolicitacao()
    APROVADA --> CANCELADA: cancelarSolicitacao()
    
    LIBERADA --> EM_PROCESSAMENTO: iniciarProcessamento()
    LIBERADA --> CANCELADA: cancelarSolicitacao()
    
    EM_PROCESSAMENTO --> CONCLUIDA: concluirSolicitacao()
    EM_PROCESSAMENTO --> CANCELADA: cancelarSolicitacao()
    
    CONCLUIDA --> ARQUIVADA: arquivarSolicitacao()
    
    REPROVADA --> [*]
    CANCELADA --> [*]
    ARQUIVADA --> [*]
```

## Diagrama de Sequência - Fluxo Principal

```mermaid
sequenceDiagram
    actor Usuario
    participant Controller as WorkflowSolicitacaoController
    participant Service as WorkflowSolicitacaoService
    participant Repository as SolicitacaoRepository
    participant HistoricoRepository as HistoricoSolicitacaoRepository
    
    Usuario->>Controller: submeterRascunho(solicitacaoId)
    Controller->>Service: submeterRascunho(solicitacaoId, usuarioId)
    Service->>Repository: findOne(solicitacaoId)
    Repository-->>Service: solicitacao
    Service->>Service: validarTransicao(solicitacao, PENDENTE)
    Service->>Repository: save(solicitacao)
    Service->>HistoricoRepository: save(historicoEntry)
    Service-->>Controller: resultadoTransicao
    Controller-->>Usuario: resultadoTransicao
    
    Usuario->>Controller: enviarParaAnalise(solicitacaoId)
    Controller->>Service: enviarParaAnalise(solicitacaoId, usuarioId)
    Service->>Repository: findOne(solicitacaoId)
    Repository-->>Service: solicitacao
    Service->>Service: validarTransicao(solicitacao, EM_ANALISE)
    Service->>Repository: save(solicitacao)
    Service->>HistoricoRepository: save(historicoEntry)
    Service-->>Controller: resultadoTransicao
    Controller-->>Usuario: resultadoTransicao
    
    Usuario->>Controller: iniciarAnalise(solicitacaoId)
    Controller->>Service: iniciarAnalise(solicitacaoId, usuarioId)
    Service->>Repository: findOne(solicitacaoId)
    Repository-->>Service: solicitacao
    Service->>Service: validarTransicao(solicitacao, EM_ANALISE)
    Service->>Repository: save(solicitacao)
    Service->>HistoricoRepository: save(historicoEntry)
    Service-->>Controller: resultadoTransicao
    Controller-->>Usuario: resultadoTransicao
    
    Usuario->>Controller: aprovarSolicitacao(solicitacaoId, observacao)
    Controller->>Service: aprovarSolicitacao(solicitacaoId, usuarioId, observacao)
    Service->>Repository: findOne(solicitacaoId)
    Repository-->>Service: solicitacao
    Service->>Service: validarTransicao(solicitacao, APROVADA)
    Service->>Repository: save(solicitacao)
    Service->>HistoricoRepository: save(historicoEntry)
    Service-->>Controller: resultadoTransicao
    Controller-->>Usuario: resultadoTransicao
    
    Usuario->>Controller: liberarSolicitacao(solicitacaoId)
    Controller->>Service: liberarSolicitacao(solicitacaoId, usuarioId)
    Service->>Repository: findOne(solicitacaoId)
    Repository-->>Service: solicitacao
    Service->>Service: validarTransicao(solicitacao, LIBERADA)
    Service->>Repository: save(solicitacao)
    Service->>HistoricoRepository: save(historicoEntry)
    Service-->>Controller: resultadoTransicao
    Controller-->>Usuario: resultadoTransicao
    
    Usuario->>Controller: iniciarProcessamento(solicitacaoId)
    Controller->>Service: iniciarProcessamento(solicitacaoId, usuarioId)
    Service->>Repository: findOne(solicitacaoId)
    Repository-->>Service: solicitacao
    Service->>Service: validarTransicao(solicitacao, EM_PROCESSAMENTO)
    Service->>Repository: save(solicitacao)
    Service->>HistoricoRepository: save(historicoEntry)
    Service-->>Controller: resultadoTransicao
    Controller-->>Usuario: resultadoTransicao
    
    Usuario->>Controller: concluirSolicitacao(solicitacaoId)
    Controller->>Service: concluirSolicitacao(solicitacaoId, usuarioId)
    Service->>Repository: findOne(solicitacaoId)
    Repository-->>Service: solicitacao
    Service->>Service: validarTransicao(solicitacao, CONCLUIDA)
    Service->>Repository: save(solicitacao)
    Service->>HistoricoRepository: save(historicoEntry)
    Service-->>Controller: resultadoTransicao
    Controller-->>Usuario: resultadoTransicao
    
    Usuario->>Controller: arquivarSolicitacao(solicitacaoId)
    Controller->>Service: arquivarSolicitacao(solicitacaoId, usuarioId)
    Service->>Repository: findOne(solicitacaoId)
    Repository-->>Service: solicitacao
    Service->>Service: validarTransicao(solicitacao, ARQUIVADA)
    Service->>Repository: save(solicitacao)
    Service->>HistoricoRepository: save(historicoEntry)
    Service-->>Controller: resultadoTransicao
    Controller-->>Usuario: resultadoTransicao
```

## Diagrama de Componentes - Módulo de Solicitação

```mermaid
graph TD
    subgraph "Módulo de Solicitação"
        A[SolicitacaoController] --> B[SolicitacaoService]
        C[WorkflowSolicitacaoController] --> D[WorkflowSolicitacaoService]
        
        B --> E[SolicitacaoRepository]
        D --> E
        
        B --> F[HistoricoSolicitacaoRepository]
        D --> F
        
        B --> G[PendenciaRepository]
        
        E -.-> H[Solicitacao]
        F -.-> I[HistoricoSolicitacao]
        G -.-> J[Pendencia]
    end
    
    subgraph "Módulo Judicial"
        K[ProcessoJudicialRepository]
        L[DeterminacaoJudicialRepository]
    end
    
    subgraph "Módulo de Benefício"
        M[TipoBeneficioRepository]
    end
    
    B --> K
    B --> L
    B --> M
    
    H --> M
    H --> K
    H --> L
```

## Matriz de Transições de Estado

| Estado Atual | Estados Possíveis |
|--------------|-------------------|
| RASCUNHO | PENDENTE, CANCELADA |
| PENDENTE | EM_ANALISE, CANCELADA |
| EM_ANALISE | AGUARDANDO_DOCUMENTOS, APROVADA, REPROVADA, CANCELADA |
| AGUARDANDO_DOCUMENTOS | EM_ANALISE, CANCELADA |
| APROVADA | LIBERADA, CANCELADA |
| LIBERADA | EM_PROCESSAMENTO, CANCELADA |
| EM_PROCESSAMENTO | CONCLUIDA, CANCELADA |
| CONCLUIDA | ARQUIVADA |
| REPROVADA | - |
| CANCELADA | - |
| ARQUIVADA | - |

## Fluxo de Pendências

```mermaid
sequenceDiagram
    actor Analista
    participant Controller as WorkflowSolicitacaoController
    participant Service as WorkflowSolicitacaoService
    participant PendenciaRepo as PendenciaRepository
    participant SolicitacaoRepo as SolicitacaoRepository
    
    Analista->>Controller: solicitarDocumentos(solicitacaoId, pendencias)
    Controller->>Service: solicitarDocumentos(solicitacaoId, pendencias, usuarioId)
    Service->>SolicitacaoRepo: findOne(solicitacaoId)
    SolicitacaoRepo-->>Service: solicitacao
    Service->>Service: validarTransicao(solicitacao, AGUARDANDO_DOCUMENTOS)
    
    loop Para cada pendência
        Service->>PendenciaRepo: create(pendencia)
        PendenciaRepo-->>Service: pendenciaSalva
    end
    
    Service->>SolicitacaoRepo: save(solicitacao)
    Service-->>Controller: resultadoTransicao
    Controller-->>Analista: resultadoTransicao
    
    Analista->>Controller: receberDocumentos(solicitacaoId, respostasPendencias)
    Controller->>Service: receberDocumentos(solicitacaoId, respostasPendencias, usuarioId)
    Service->>SolicitacaoRepo: findOne(solicitacaoId)
    SolicitacaoRepo-->>Service: solicitacao
    Service->>PendenciaRepo: findBysolicitacaoId(solicitacaoId)
    PendenciaRepo-->>Service: pendencias
    
    loop Para cada resposta
        Service->>PendenciaRepo: update(pendenciaId, resposta)
        PendenciaRepo-->>Service: pendenciaAtualizada
    end
    
    Service->>Service: validarTransicao(solicitacao, EM_ANALISE)
    Service->>SolicitacaoRepo: save(solicitacao)
    Service-->>Controller: resultadoTransicao
    Controller-->>Analista: resultadoTransicao
```

## Fluxo de Processos Judiciais

```mermaid
sequenceDiagram
    actor Gestor
    participant Controller as SolicitacaoController
    participant Service as SolicitacaoService
    participant SolicitacaoRepo as SolicitacaoRepository
    participant ProcessoRepo as ProcessoJudicialRepository
    participant HistoricoRepo as HistoricoSolicitacaoRepository
    
    Gestor->>Controller: vincularProcessoJudicial(solicitacaoId, processoJudicialId)
    Controller->>Service: vincularProcessoJudicial(solicitacaoId, processoJudicialId, usuarioId)
    Service->>SolicitacaoRepo: findOne(solicitacaoId)
    SolicitacaoRepo-->>Service: solicitacao
    Service->>ProcessoRepo: findOne(processoJudicialId)
    ProcessoRepo-->>Service: processoJudicial
    
    Service->>SolicitacaoRepo: save(solicitacao)
    Service->>HistoricoRepo: save(historicoEntry)
    Service-->>Controller: solicitacaoAtualizada
    Controller-->>Gestor: solicitacaoAtualizada
    
    Gestor->>Controller: desvincularProcessoJudicial(solicitacaoId)
    Controller->>Service: desvincularProcessoJudicial(solicitacaoId, usuarioId)
    Service->>SolicitacaoRepo: findOne(solicitacaoId)
    SolicitacaoRepo-->>Service: solicitacao
    
    Service->>SolicitacaoRepo: save(solicitacao)
    Service->>HistoricoRepo: save(historicoEntry)
    Service-->>Controller: solicitacaoAtualizada
    Controller-->>Gestor: solicitacaoAtualizada
```

## Fluxo de Determinações Judiciais

```mermaid
sequenceDiagram
    actor Gestor
    participant Controller as SolicitacaoController
    participant Service as SolicitacaoService
    participant SolicitacaoRepo as SolicitacaoRepository
    participant DeterminacaoRepo as DeterminacaoJudicialRepository
    participant HistoricoRepo as HistoricoSolicitacaoRepository
    
    Gestor->>Controller: vincularDeterminacaoJudicial(solicitacaoId, determinacaoJudicialId)
    Controller->>Service: vincularDeterminacaoJudicial(solicitacaoId, determinacaoJudicialId, usuarioId)
    Service->>SolicitacaoRepo: findOne(solicitacaoId)
    SolicitacaoRepo-->>Service: solicitacao
    Service->>DeterminacaoRepo: findOne(determinacaoJudicialId)
    DeterminacaoRepo-->>Service: determinacaoJudicial
    
    Service->>SolicitacaoRepo: save(solicitacao)
    Service->>HistoricoRepo: save(historicoEntry)
    Service-->>Controller: solicitacaoAtualizada
    Controller-->>Gestor: solicitacaoAtualizada
    
    Gestor->>Controller: desvincularDeterminacaoJudicial(solicitacaoId)
    Controller->>Service: desvincularDeterminacaoJudicial(solicitacaoId, usuarioId)
    Service->>SolicitacaoRepo: findOne(solicitacaoId)
    SolicitacaoRepo-->>Service: solicitacao
    
    Service->>SolicitacaoRepo: save(solicitacao)
    Service->>HistoricoRepo: save(historicoEntry)
    Service-->>Controller: solicitacaoAtualizada
    Controller-->>Gestor: solicitacaoAtualizada
```
