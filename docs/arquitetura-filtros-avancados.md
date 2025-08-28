# Arquitetura de Filtros Avançados - Sistema PGBEN

## 1. Análise Abrangente dos Endpoints

### 1.1 Padrão de Referência

O controlador `metricas-dashboard.controller.ts` implementa o padrão ideal de filtros avançados através do `MetricasFiltrosAvancadosDto`, que inclui:

- **Filtros por Array**: unidades, benefícios, bairros, status, usuários
- **Filtros Temporais**: período, data_inicio, data_fim
- **Utilitários**: transformToStringArray() para conversão automática
- **Validações**: class-validator com regras robustas
- **Documentação**: Swagger completo

### 1.2 Endpoints Identificados para Refatoração

#### 🔴 **ALTA PRIORIDADE** - Endpoints Críticos de Listagem

| Controlador | Endpoint | Filtros Atuais | Filtros Necessários | Justificativa |
|-------------|----------|----------------|--------------------|--------------|
| `solicitacao.controller.ts` | `GET /solicitacao` | status, unidade_id, beneficio_id, data_inicio/fim | **Arrays**: unidades[], status[], beneficios[], usuarios[], bairros[] | Endpoint crítico para gestão de solicitações. Necessário para análises multi-unidade e relatórios consolidados |
| `cidadao.controller.ts` | `GET /cidadao` | search, bairro, unidade_id | **Arrays**: bairros[], unidades[], status[] | Listagem principal de beneficiários. Essencial para operações em múltiplas unidades |
| `usuario.controller.ts` | `GET /usuario` | Campos dinâmicos (sem arrays) | **Arrays**: unidades[], roles[], status[] | Gestão de usuários do sistema. Crítico para administração multi-unidade |
| `pagamento.controller.ts` | `GET /pagamentos` | status, usuario_id, unidade_id, data_inicio/fim | **Arrays**: status[], unidades[], usuarios[] | Controle financeiro crítico. Necessário para relatórios consolidados |

#### 🟡 **MÉDIA PRIORIDADE** - Endpoints Importantes

| Controlador | Endpoint | Filtros Atuais | Filtros Necessários | Justificativa |
|-------------|----------|----------------|--------------------|--------------|
| `beneficio.controller.ts` | `GET /beneficio` | search, ativo | **Arrays**: tipos[], status[], unidades[] | Configuração de tipos de benefícios. Importante para gestão multi-programa |
| `unidade.controller.ts` | `GET /unidade` | search, tipo, status | **Arrays**: tipos[], status[], regioes[] | Gestão de unidades administrativas. Necessário para análises regionais |
| `auditoria.controller.ts` | `GET /auditoria` | entidade, usuario, data_inicial/final | **Arrays**: usuarios[], entidades[], acoes[] | Monitoramento e compliance. Essencial para auditoria multi-usuário |
| `documento.controller.ts` | Múltiplos endpoints | tipo, cidadaoId, solicitacaoId | **Arrays**: tipos[], status[], usuarios[] | Gestão documental. Importante para operações em lote |

#### 🟢 **BAIXA PRIORIDADE** - Endpoints Específicos

- `workflow.controller.ts` - Gestão de fluxos
- `template.controller.ts` - Templates de documentos
- `parametro.controller.ts` - Configurações do sistema
- `notification-*.controller.ts` - Sistema de notificações

### 1.3 Análise Técnica Detalhada

#### Problemas Identificados:

1. **Inconsistência de Filtros**: Cada endpoint implementa filtros de forma diferente
2. **Limitação Operacional**: Impossibilidade de filtrar por múltiplos itens simultaneamente
3. **Código Duplicado**: Lógica de filtros repetida em múltiplos controladores
4. **Manutenibilidade**: Dificuldade para adicionar novos filtros consistentemente
5. **Performance**: Queries não otimizadas para filtros complexos

#### Impacto nos Usuários:

- **Gestores**: Não conseguem gerar relatórios consolidados multi-unidade
- **Operadores**: Limitados a consultas unitárias, reduzindo produtividade
- **Auditores**: Dificuldade para análises abrangentes de compliance
- **Desenvolvedores**: Tempo excessivo para implementar novos filtros

## 2. Solução Arquitetural DRY

### 2.1 Princípios Arquiteturais

- **DRY (Don't Repeat Yourself)**: Reutilização máxima de código
- **Single Responsibility**: Cada componente com responsabilidade única
- **Open/Closed**: Extensível para novos filtros sem modificar código existente
- **Dependency Inversion**: Abstrações para facilitar testes e manutenção

### 2.2 Estrutura da Solução

```
src/common/
├── dtos/
│   ├── filtros-avancados-base.dto.ts
│   ├── filtros-paginacao.dto.ts
│   └── filtros-temporais.dto.ts
├── enums/
│   ├── periodo-predefinido.enum.ts
│   └── prioridade.enum.ts
├── interfaces/
│   ├── filtros-avancados.interface.ts
│   └── query-builder-options.interface.ts
├── services/
│   ├── filtros-avancados.service.ts
│   └── query-builder.service.ts
├── decorators/
│   └── swagger-filtros.decorator.ts
└── utils/
    ├── transform-arrays.util.ts
    └── validation.util.ts
```

### 2.3 Componentes da Arquitetura

#### 2.3.1 DTO Base Genérico

```typescript
// filtros-avancados-base.dto.ts
export abstract class FiltrosAvancadosBaseDto {
  // Filtros por múltiplos itens
  @IsOptional()
  @Transform(({ value }) => transformToStringArray(value))
  @IsUUID('4', { each: true })
  @ArrayMaxSize(50)
  unidades?: string[];

  @IsOptional()
  @Transform(({ value }) => transformToStringArray(value))
  @IsString({ each: true })
  @ArrayMaxSize(50)
  bairros?: string[];

  @IsOptional()
  @Transform(({ value }) => transformToStringArray(value))
  @IsUUID('4', { each: true })
  @ArrayMaxSize(50)
  usuarios?: string[];

  // Filtros temporais obrigatórios
  @IsOptional()
  @IsEnum(PeriodoPredefinido)
  periodo?: PeriodoPredefinido;

  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @IsOptional()
  @IsEnum(Prioridade)
  prioridade?: Prioridade;
}
```

#### 2.3.2 Service de Filtros Avançados

```typescript
// filtros-avancados.service.ts
@Injectable()
export class FiltrosAvancadosService {
  /**
   * Aplica filtros por array em uma query
   */
  applyArrayFilters<T>(
    queryBuilder: SelectQueryBuilder<T>,
    filtros: FiltrosAvancadosBaseDto,
    mapeamento: FilterMapping
  ): SelectQueryBuilder<T> {
    // Implementação genérica para filtros por array
  }

  /**
   * Aplica filtros temporais
   */
  applyTemporalFilters<T>(
    queryBuilder: SelectQueryBuilder<T>,
    filtros: FiltrosAvancadosBaseDto,
    campoData: string
  ): SelectQueryBuilder<T> {
    // Implementação para filtros de data/período
  }

  /**
   * Constrói query completa com todos os filtros
   */
  buildAdvancedQuery<T>(
    repository: Repository<T>,
    filtros: FiltrosAvancadosBaseDto,
    options: QueryBuilderOptions
  ): SelectQueryBuilder<T> {
    // Implementação completa
  }
}
```

#### 2.3.3 DTOs Específicos por Domínio

```typescript
// solicitacao-filtros.dto.ts
export class SolicitacaoFiltrosDto extends FiltrosAvancadosBaseDto {
  @IsOptional()
  @Transform(({ value }) => transformToStringArray(value))
  @IsEnum(StatusSolicitacao, { each: true })
  @ArrayMaxSize(20)
  status?: StatusSolicitacao[];

  @IsOptional()
  @Transform(({ value }) => transformToStringArray(value))
  @IsUUID('4', { each: true })
  @ArrayMaxSize(50)
  beneficios?: string[];

  @IsOptional()
  @IsString()
  protocolo?: string;
}
```

### 2.4 Padrões de Implementação

#### 2.4.1 Controller Pattern

```typescript
@Controller('solicitacao')
export class SolicitacaoController {
  constructor(
    private readonly solicitacaoService: SolicitacaoService,
    private readonly filtrosService: FiltrosAvancadosService
  ) {}

  @Get()
  @SwaggerFiltrosAvancados(SolicitacaoFiltrosDto)
  async findAll(
    @Query() filtros: SolicitacaoFiltrosDto
  ): Promise<PaginatedResult<Solicitacao>> {
    return this.solicitacaoService.findAllWithAdvancedFilters(filtros);
  }
}
```

#### 2.4.2 Service Pattern

```typescript
@Injectable()
export class SolicitacaoService {
  constructor(
    @InjectRepository(Solicitacao)
    private readonly repository: Repository<Solicitacao>,
    private readonly filtrosService: FiltrosAvancadosService
  ) {}

  async findAllWithAdvancedFilters(
    filtros: SolicitacaoFiltrosDto
  ): Promise<PaginatedResult<Solicitacao>> {
    const queryBuilder = this.filtrosService.buildAdvancedQuery(
      this.repository,
      filtros,
      {
        entity: 'solicitacao',
        relations: ['unidade', 'beneficio', 'cidadao'],
        filterMapping: {
          unidades: 'solicitacao.unidade_id',
          beneficios: 'solicitacao.beneficio_id',
          status: 'solicitacao.status',
          usuarios: 'solicitacao.usuario_id'
        }
      }
    );

    return this.filtrosService.executePaginatedQuery(queryBuilder, filtros);
  }
}
```

## 3. Especificação de Filtros

### 3.1 Filtros por Múltiplos Itens (Arrays)

| Filtro | Tipo | Validação | Limite | Descrição |
|--------|------|-----------|--------|-----------|
| `unidades` | `string[]` | UUID v4 | 50 itens | IDs das unidades administrativas |
| `bairros` | `string[]` | String não vazia | 50 itens | Nomes dos bairros |
| `usuarios` | `string[]` | UUID v4 | 50 itens | IDs dos usuários |
| `status` | `Enum[]` | Enum específico | 20 itens | Status específicos do domínio |
| `beneficios` | `string[]` | UUID v4 | 50 itens | IDs dos tipos de benefícios |
| `roles` | `string[]` | UUID v4 | 20 itens | IDs das funções/perfis |

### 3.2 Filtros Individuais Obrigatórios

| Filtro | Tipo | Validação | Obrigatório | Descrição |
|--------|------|-----------|-------------|-----------|
| `periodo` | `PeriodoPredefinido` | Enum | Não | Período predefinido (hoje, ontem, semana, mês) |
| `data_inicio` | `string` | ISO Date | Não* | Data de início do período |
| `data_fim` | `string` | ISO Date | Não* | Data de fim do período |
| `prioridade` | `Prioridade` | Enum | Não | Nível de prioridade |

*Obrigatório quando `periodo` não for informado

### 3.3 Enums Padronizados

```typescript
// periodo-predefinido.enum.ts
export enum PeriodoPredefinido {
  HOJE = 'hoje',
  ONTEM = 'ontem',
  ULTIMA_SEMANA = 'ultima_semana',
  ULTIMO_MES = 'ultimo_mes',
  ULTIMO_TRIMESTRE = 'ultimo_trimestre',
  ULTIMO_SEMESTRE = 'ultimo_semestre',
  ULTIMO_ANO = 'ultimo_ano',
  PERSONALIZADO = 'personalizado'
}

// prioridade.enum.ts
export enum Prioridade {
  BAIXA = 'baixa',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica'
}
```

## 4. Plano de Implementação

### 4.1 Cronograma de Execução

#### **Fase 1: Infraestrutura Base** (2 dias)
- [ ] Criar DTOs base e interfaces
- [ ] Implementar FiltrosAvancadosService
- [ ] Criar enums padronizados
- [ ] Implementar utilitários de transformação
- [ ] Testes unitários da infraestrutura

#### **Fase 2: Migração Alta Prioridade** (4 dias)
- [ ] `solicitacao.controller.ts` - Filtros críticos de gestão
- [ ] `cidadao.controller.ts` - Listagem principal de beneficiários
- [ ] `usuario.controller.ts` - Gestão multi-unidade de usuários
- [ ] `pagamento.controller.ts` - Controle financeiro consolidado

#### **Fase 3: Migração Média Prioridade** (3 dias)
- [ ] `beneficio.controller.ts` - Gestão de tipos de benefícios
- [ ] `unidade.controller.ts` - Análises regionais
- [ ] `auditoria.controller.ts` - Compliance multi-usuário
- [ ] `documento.controller.ts` - Operações documentais em lote

#### **Fase 4: Finalização** (2 dias)
- [ ] Migração de endpoints restantes
- [ ] Testes de integração completos
- [ ] Otimização de performance
- [ ] Documentação final

### 4.2 Critérios de Aceitação

#### Funcionais:
- ✅ Todos os filtros por array funcionando corretamente
- ✅ Filtros temporais com validação adequada
- ✅ Paginação mantida em todos os endpoints
- ✅ Backward compatibility durante transição
- ✅ Documentação Swagger atualizada

#### Não-Funcionais:
- ✅ Performance igual ou superior aos filtros atuais
- ✅ Tempo de resposta < 2s para queries complexas
- ✅ Cobertura de testes > 90%
- ✅ Redução de 80% no código duplicado
- ✅ Facilidade de extensão para novos filtros

### 4.3 Estratégia de Migração

#### Abordagem Incremental:
1. **Implementação Paralela**: Novos endpoints convivem com os antigos
2. **Feature Flag**: Controle de ativação por ambiente
3. **Testes A/B**: Validação com usuários reais
4. **Rollback Plan**: Possibilidade de reversão rápida
5. **Monitoramento**: Métricas de performance e uso

#### Comunicação:
- **Desenvolvedores**: Documentação técnica e exemplos
- **QA**: Casos de teste e cenários de validação
- **Usuários**: Guia de novos recursos e benefícios
- **Stakeholders**: Relatório de impacto e benefícios

## 5. Benefícios Esperados

### 5.1 Técnicos
- **Redução de 80%** no código duplicado de filtros
- **Consistência** total entre endpoints
- **Manutenibilidade** significativamente melhorada
- **Extensibilidade** facilitada para novos filtros
- **Performance** otimizada com queries eficientes

### 5.2 Operacionais
- **Produtividade** aumentada para gestores e operadores
- **Relatórios** consolidados multi-unidade
- **Análises** mais abrangentes e precisas
- **Compliance** facilitado para auditoria
- **Experiência** do usuário significativamente melhorada

### 5.3 Estratégicos
- **Escalabilidade** para crescimento do sistema
- **Padronização** de processos operacionais
- **Qualidade** dos dados e relatórios
- **Competitividade** da plataforma
- **ROI** positivo em médio prazo

## 6. Considerações de Performance

### 6.1 Otimizações de Banco

```sql
-- Índices recomendados para filtros por array
CREATE INDEX CONCURRENTLY idx_solicitacao_unidade_status 
  ON solicitacao (unidade_id, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_solicitacao_beneficio_data 
  ON solicitacao (beneficio_id, created_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_cidadao_unidade_bairro 
  ON cidadao (unidade_id, bairro) 
  WHERE deleted_at IS NULL;
```

### 6.2 Cache Strategy

```typescript
// Cache para queries frequentes
@Cacheable({
  key: 'filtros_avancados',
  ttl: 300, // 5 minutos
  condition: (filtros) => filtros.periodo !== PeriodoPredefinido.PERSONALIZADO
})
async findAllWithAdvancedFilters(filtros: FiltrosAvancadosBaseDto) {
  // Implementação com cache
}
```

### 6.3 Monitoramento

- **Query Performance**: Tempo de execução por tipo de filtro
- **Cache Hit Rate**: Taxa de acerto do cache
- **Resource Usage**: CPU e memória por endpoint
- **Error Rate**: Taxa de erro por filtro aplicado

---

**Documento criado por**: Arquiteto de Software Elite  
**Data**: 2024  
**Versão**: 1.0  
**Status**: Proposta Técnica