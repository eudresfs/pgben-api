# Plano de Ação: Consolidação dos Módulos de Determinação Judicial

## 📋 Contexto

Após análise arquitetural, identificamos uma duplicidade funcional entre os módulos `judicial` e `solicitacao` no gerenciamento de determinações judiciais. Embora a separação seja arquiteturalmente justificada por diferentes contextos de negócio, a implementação atual pode ser otimizada para reduzir duplicação de código e melhorar a manutenibilidade.

## 🎯 Objetivo

Consolidar a lógica de negócio no módulo judicial mantendo a separação de responsabilidades por contexto, seguindo princípios de Domain-Driven Design.

## 🏗️ Estratégia de Implementação

### Fase 1: Análise e Preparação (1-2 dias)

#### 1.1 Mapeamento Detalhado
- [ ] Documentar todas as funcionalidades de cada controller
- [ ] Identificar diferenças nos DTOs e validações
- [ ] Mapear dependências entre módulos
- [ ] Verificar testes existentes

#### 1.2 Definição da Arquitetura Alvo
```
Módulo Judicial (Core)
├── entities/
│   └── determinacao-judicial.entity.ts
├── services/
│   ├── determinacao-judicial.service.ts (consolidado)
│   └── processo-judicial.service.ts
├── repositories/
│   └── determinacao-judicial.repository.ts
└── controllers/
    └── determinacao-judicial.controller.ts (gestão completa)

Módulo Solicitação (Consumer)
├── controllers/
│   └── determinacao-judicial.controller.ts (contexto específico)
├── dto/
│   ├── solicitacao-create-determinacao.dto.ts
│   └── solicitacao-update-determinacao.dto.ts
└── services/
    └── determinacao-judicial-facade.service.ts (wrapper)
```

### Fase 2: Consolidação do Serviço Principal (2-3 dias)

#### 2.1 Refatoração do DeterminacaoJudicialService
- [ ] Mover toda lógica do módulo solicitação para o módulo judicial
- [ ] Criar métodos específicos para contexto de solicitação
- [ ] Implementar validações consolidadas
- [ ] Adicionar logs de auditoria unificados

#### 2.2 Criação do Facade Service
```typescript
// solicitacao/services/determinacao-judicial-facade.service.ts
@Injectable()
export class DeterminacaoJudicialFacadeService {
  constructor(
    private readonly determinacaoService: DeterminacaoJudicialService,
    private readonly solicitacaoService: SolicitacaoService
  ) {}

  async createForSolicitacao(
    dto: SolicitacaoCreateDeterminacaoJudicialDto,
    usuarioId: string
  ): Promise<DeterminacaoJudicial> {
    // Validações específicas do contexto solicitação
    // Delegação para o serviço principal
    return this.determinacaoService.create(dto, usuarioId);
  }
}
```

### Fase 3: Atualização dos Controllers (1-2 dias)

#### 3.1 Controller do Módulo Judicial
- [ ] Manter como controller principal com todas as funcionalidades
- [ ] Rota: `v1/judicial/determinacoes`
- [ ] Permissões: `judicial.*`

#### 3.2 Controller do Módulo Solicitação
- [ ] Refatorar para usar o facade service
- [ ] Manter rota específica: `v1/solicitacao/determinacao-judicial`
- [ ] Manter permissões específicas: `solicitacao.*`
- [ ] Focar em operações relacionadas ao fluxo de solicitações

### Fase 4: Atualização de DTOs e Validações (1 dia)

#### 4.1 DTOs Específicos por Contexto
- [ ] Manter DTOs específicos para cada contexto
- [ ] Criar mapeadores entre DTOs quando necessário
- [ ] Implementar validações específicas por contexto

#### 4.2 Exemplo de Implementação
```typescript
// judicial/dto/create-determinacao-judicial.dto.ts
export class CreateDeterminacaoJudicialDto {
  @IsUUID()
  processo_judicial_id: string;
  
  @IsOptional()
  @IsUUID()
  solicitacao_id?: string;
  
  // ... outros campos
}

// solicitacao/dto/create-determinacao-judicial.dto.ts
export class SolicitacaoCreateDeterminacaoJudicialDto {
  @IsUUID()
  solicitacao_id: string; // Obrigatório no contexto de solicitação
  
  @IsOptional()
  @IsUUID()
  processo_judicial_id?: string;
  
  // ... outros campos específicos
}
```

### Fase 5: Testes e Validação (2-3 dias)

#### 5.1 Testes Unitários
- [ ] Atualizar testes do serviço consolidado
- [ ] Criar testes para o facade service
- [ ] Validar todos os cenários de uso

#### 5.2 Testes de Integração
- [ ] Testar ambos os controllers
- [ ] Validar fluxos end-to-end
- [ ] Verificar permissões e autenticação

#### 5.3 Testes de Regressão
- [ ] Executar suite completa de testes
- [ ] Validar funcionalidades existentes
- [ ] Verificar performance

## 🔧 Implementação Detalhada

### Passo 1: Consolidação do Serviço Principal

```typescript
// judicial/services/determinacao-judicial.service.ts
@Injectable()
export class DeterminacaoJudicialService {
  constructor(
    @InjectRepository(DeterminacaoJudicial)
    private readonly determinacaoRepository: Repository<DeterminacaoJudicial>,
    private readonly auditoriaService: AuditoriaService,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Cria determinação judicial - método unificado
   */
  async create(
    dto: CreateDeterminacaoJudicialDto | SolicitacaoCreateDeterminacaoJudicialDto,
    usuarioId: string,
    contexto: 'judicial' | 'solicitacao' = 'judicial'
  ): Promise<DeterminacaoJudicial> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validações específicas por contexto
      await this.validateByContext(dto, contexto);
      
      // Lógica de criação unificada
      const determinacao = this.determinacaoRepository.create({
        ...dto,
        criado_por: usuarioId,
        criado_em: new Date()
      });

      const result = await queryRunner.manager.save(determinacao);
      
      // Auditoria com contexto
      await this.auditoriaService.log({
        acao: 'CREATE_DETERMINACAO_JUDICIAL',
        contexto,
        entidade_id: result.id,
        usuario_id: usuarioId
      });

      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validações específicas por contexto
   */
  private async validateByContext(
    dto: any,
    contexto: 'judicial' | 'solicitacao'
  ): Promise<void> {
    if (contexto === 'solicitacao') {
      // Validações específicas para solicitação
      if (!dto.solicitacao_id) {
        throw new BadRequestException('solicitacao_id é obrigatório no contexto de solicitação');
      }
      // Verificar se solicitação existe e está ativa
      // ...
    }
    
    if (contexto === 'judicial') {
      // Validações específicas para judicial
      if (!dto.processo_judicial_id) {
        throw new BadRequestException('processo_judicial_id é obrigatório no contexto judicial');
      }
      // ...
    }
  }

  /**
   * Busca determinações por solicitação - método específico
   */
  async findBySolicitacao(solicitacaoId: string): Promise<DeterminacaoJudicial[]> {
    return this.determinacaoRepository.find({
      where: { solicitacao_id: solicitacaoId },
      order: { criado_em: 'DESC' }
    });
  }
}
```

### Passo 2: Facade Service para Solicitação

```typescript
// solicitacao/services/determinacao-judicial-facade.service.ts
@Injectable()
export class DeterminacaoJudicialFacadeService {
  constructor(
    private readonly determinacaoService: DeterminacaoJudicialService,
    private readonly solicitacaoService: SolicitacaoService
  ) {}

  async create(
    dto: SolicitacaoCreateDeterminacaoJudicialDto,
    usuarioId: string
  ): Promise<DeterminacaoJudicial> {
    // Validações específicas do contexto solicitação
    await this.validateSolicitacaoContext(dto);
    
    // Delegação para o serviço principal
    return this.determinacaoService.create(dto, usuarioId, 'solicitacao');
  }

  async findBySolicitacao(solicitacaoId: string): Promise<DeterminacaoJudicial[]> {
    return this.determinacaoService.findBySolicitacao(solicitacaoId);
  }

  private async validateSolicitacaoContext(
    dto: SolicitacaoCreateDeterminacaoJudicialDto
  ): Promise<void> {
    // Verificar se solicitação existe
    const solicitacao = await this.solicitacaoService.findOne(dto.solicitacao_id);
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    // Verificar se solicitação permite determinação judicial
    if (!this.canCreateDeterminacao(solicitacao)) {
      throw new ConflictException('Solicitação não permite criação de determinação judicial');
    }
  }

  private canCreateDeterminacao(solicitacao: Solicitacao): boolean {
    // Lógica específica para verificar se pode criar determinação
    return ['ANALISE', 'PENDENTE', 'EM_RECURSO'].includes(solicitacao.status);
  }
}
```

### Passo 3: Atualização dos Módulos

```typescript
// judicial/judicial.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([ProcessoJudicial, DeterminacaoJudicial]),
    AuthModule,
  ],
  controllers: [DeterminacaoJudicialController, ProcessoJudicialController],
  providers: [
    DeterminacaoJudicialRepository,
    ProcessoJudicialRepository,
    ProcessoJudicialService,
    DeterminacaoJudicialService, // Serviço principal consolidado
  ],
  exports: [
    DeterminacaoJudicialService, // Exportar para outros módulos
    ProcessoJudicialService,
    DeterminacaoJudicialRepository,
    ProcessoJudicialRepository,
  ],
})
export class JudicialModule {}

// solicitacao/solicitacao.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Solicitacao, HistoricoSolicitacao, Pendencia]),
    JudicialModule, // Importar módulo judicial
    AuthModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    SolicitacaoController,
    DeterminacaoJudicialController, // Controller específico do contexto
    WorkflowSolicitacaoController
  ],
  providers: [
    SolicitacaoService,
    DeterminacaoJudicialFacadeService, // Facade service
    WorkflowSolicitacaoService,
    // ... outros serviços
  ],
  exports: [
    SolicitacaoService,
    DeterminacaoJudicialFacadeService,
    // ... outros serviços
  ],
})
export class SolicitacaoModule {}
```

## 📊 Cronograma de Execução

| Fase | Atividade | Duração | Responsável |
|------|-----------|---------|-------------|
| 1 | Análise e Preparação | 1-2 dias | Tech Lead |
| 2 | Consolidação do Serviço | 2-3 dias | Desenvolvedor Senior |
| 3 | Atualização Controllers | 1-2 dias | Desenvolvedor |
| 4 | DTOs e Validações | 1 dia | Desenvolvedor |
| 5 | Testes e Validação | 2-3 dias | QA + Desenvolvedor |
| **Total** | **7-11 dias** | **1,5-2 semanas** | **Equipe** |

## ✅ Critérios de Aceitação

- [ ] Lógica de negócio consolidada no módulo judicial
- [ ] Separação de responsabilidades mantida
- [ ] DTOs específicos por contexto preservados
- [ ] Permissões granulares funcionando
- [ ] Todos os testes passando
- [ ] Performance mantida ou melhorada
- [ ] Documentação atualizada
- [ ] Zero breaking changes para APIs existentes

## 🚨 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|----------|
| Breaking changes | Média | Alto | Manter compatibilidade de APIs |
| Regressão funcional | Baixa | Alto | Testes abrangentes |
| Performance degradada | Baixa | Médio | Benchmarks antes/depois |
| Complexidade aumentada | Média | Médio | Documentação detalhada |

## 📝 Próximos Passos

1. **Aprovação do Plano**: Revisar e aprovar este plano com a equipe
2. **Criação de Branch**: Criar branch específica para esta refatoração
3. **Implementação Incremental**: Seguir as fases definidas
4. **Code Review**: Revisão rigorosa de cada etapa
5. **Deploy Gradual**: Deploy em ambiente de teste primeiro

## 📚 Referências

- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [NestJS Module Documentation](https://docs.nestjs.com/modules)
- [TypeORM Best Practices](https://typeorm.io/)
- [Clean Architecture Principles](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**Documento criado em**: $(date)
**Versão**: 1.0
**Status**: Aguardando Aprovação