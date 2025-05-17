# ADR: Implementação de Campos Dinâmicos no Módulo de Benefício

## Status

Proposto

## Contexto

O módulo de Benefício do sistema PGBen precisa suportar diferentes tipos de benefícios (Auxílio Natalidade, Aluguel Social, etc.), cada um com requisitos específicos de dados. A implementação atual utiliza campos JSONB para armazenar critérios de elegibilidade, mas não possui uma estrutura flexível para definir e validar campos específicos por tipo de benefício.

A Lei Municipal 7.205/2021 e o Decreto Municipal 12.346/2021 estabelecem regras para os benefícios eventuais em Natal/RN, exigindo flexibilidade na modelagem de dados para acomodar diferentes requisitos e critérios de elegibilidade.

## Decisão

Implementaremos uma solução completa para campos dinâmicos no módulo de Benefício, composta por:

1. **Nova entidade `CampoDinamicoBeneficio`** para definir esquemas de campos por tipo de benefício
2. **Serviço de validação dinâmica** para validar dados conforme esquema definido
3. **Indexação de campos JSON** para melhorar performance de consultas
4. **Versionamento de schema** para evolução sem quebrar dados existentes
5. **Repositories customizados** para consultas eficientes em campos JSON

### 1. Entidade CampoDinamicoBeneficio

Criaremos uma entidade específica para definir os campos dinâmicos de cada tipo de benefício, seguindo a estrutura:

```typescript
@Entity('campos_dinamicos_beneficio')
export class CampoDinamicoBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio, tipoBeneficio => tipoBeneficio.campos_dinamicos)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column()
  label: string;

  @Column()
  nome: string;

  @Column({
    type: 'enum',
    enum: ['string', 'number', 'boolean', 'date', 'array', 'object']
  })
  tipo: string;

  @Column({ default: false })
  obrigatorio: boolean;

  @Column('text', { nullable: true })
  descricao: string;

  @Column('jsonb', { nullable: true })
  validacoes: any;

  @Column({ default: 1 })
  ordem: number;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
```

### 2. Serviço de Validação Dinâmica

Implementaremos um serviço específico para validar dados conforme o esquema definido:

```typescript
@Injectable()
export class ValidacaoDinamicaService {
  constructor(
    @InjectRepository(CampoDinamicoBeneficio)
    private campoDinamicoRepository: Repository<CampoDinamicoBeneficio>,
  ) {}

  async validarCamposDinamicos(tipoBeneficioId: string, dados: any): Promise<ValidationResult> {
    // Buscar esquema de campos para o tipo de benefício
    const campos = await this.campoDinamicoRepository.find({
      where: { tipo_beneficio_id: tipoBeneficioId, ativo: true },
      order: { ordem: 'ASC' }
    });

    const erros = [];

    // Validar campos obrigatórios e tipos
    for (const campo of campos) {
      // Lógica de validação conforme tipo e regras
    }

    return {
      valido: erros.length === 0,
      erros
    };
  }
}
```

### 3. Indexação de Campos JSON

Criaremos índices GIN para melhorar a performance de consultas em campos JSONB:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGinIndexesToBeneficio1621234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índice GIN para critérios de elegibilidade
    await queryRunner.query(
      `CREATE INDEX IDX_tipo_beneficio_criterios ON tipos_beneficio USING GIN (criterios_elegibilidade jsonb_path_ops)`
    );

    // Índice GIN para validações de requisitos
    await queryRunner.query(
      `CREATE INDEX IDX_requisito_documento_validacoes ON requisitos_documento USING GIN (validacoes jsonb_path_ops)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_tipo_beneficio_criterios`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_requisito_documento_validacoes`);
  }
}
```

### 4. Versionamento de Schema

Implementaremos uma entidade para controlar versões de schema:

```typescript
@Entity('versoes_schema_beneficio')
export class VersaoSchemaBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column()
  versao: number;

  @Column('jsonb')
  schema: any;

  @Column('text', { nullable: true })
  descricao_mudancas: string;

  @Column({ default: false })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### 5. Repositories Customizados

Criaremos repositories customizados para consultas eficientes em campos JSON:

```typescript
@EntityRepository(TipoBeneficio)
export class TipoBeneficioRepository extends Repository<TipoBeneficio> {
  async findByJsonCriteria(criteria: { [key: string]: any }): Promise<TipoBeneficio[]> {
    const queryBuilder = this.createQueryBuilder('tipo_beneficio');
    
    Object.keys(criteria).forEach(key => {
      const value = criteria[key];
      
      // Construir condição para busca em campo JSON
      queryBuilder.andWhere(`tipo_beneficio.criterios_elegibilidade->>'${key}' = :${key}`, { [key]: value });
    });
    
    return queryBuilder.getMany();
  }
}
```

## Consequências

### Positivas

1. **Flexibilidade**: A solução permite definir campos específicos para cada tipo de benefício, adaptando-se a diferentes requisitos.

2. **Validação Robusta**: O serviço de validação dinâmica garante que os dados informados estejam de acordo com o esquema definido.

3. **Performance**: A indexação de campos JSON melhora significativamente a performance de consultas em campos JSONB.

4. **Evolução Segura**: O versionamento de schema permite evoluir a estrutura sem quebrar dados existentes.

5. **Consultas Eficientes**: Os repositories customizados facilitam a implementação de consultas complexas em campos JSON.

6. **Conformidade Legal**: A solução atende aos requisitos da Lei Municipal 7.205/2021 e do Decreto Municipal 12.346/2021, permitindo a implementação de regras específicas para cada tipo de benefício.

7. **Experiência do Usuário**: A definição de esquemas permite gerar formulários dinâmicos na interface, melhorando a experiência do usuário.

### Negativas

1. **Complexidade**: A solução introduz complexidade adicional ao sistema, exigindo mais conhecimento para manutenção.

2. **Overhead de Processamento**: A validação dinâmica pode introduzir overhead de processamento em comparação com validações estáticas.

3. **Dependência do PostgreSQL**: A solução depende de recursos específicos do PostgreSQL (JSONB, índices GIN), limitando a portabilidade.

## Mitigações

1. **Documentação Detalhada**: Criaremos documentação detalhada sobre a implementação e uso dos campos dinâmicos.

2. **Testes Automatizados**: Implementaremos testes unitários e de integração para garantir o funcionamento correto da solução.

3. **Caching**: Utilizaremos estratégias de caching para mitigar o overhead de processamento da validação dinâmica.

4. **Abstração de Banco de Dados**: Implementaremos uma camada de abstração para facilitar a migração para outros bancos de dados no futuro.

## Impacto e Benefícios

### Impacto Técnico

1. **Banco de Dados**: 
   - Adição de novas tabelas: `campos_dinamicos_beneficio` e `versoes_schema_beneficio`
   - Criação de índices GIN para campos JSONB
   - Aumento do tamanho do banco de dados devido ao armazenamento de esquemas

2. **Código**:
   - Novas entidades, DTOs, serviços e repositories
   - Implementação de validação dinâmica
   - Endpoints adicionais para gerenciar campos dinâmicos

3. **Performance**:
   - Melhoria na performance de consultas em campos JSON devido aos índices GIN
   - Possível overhead na validação dinâmica, mitigado por estratégias de caching

### Benefícios para o Negócio

1. **Adaptabilidade**: O sistema poderá se adaptar rapidamente a novos tipos de benefícios ou mudanças nos existentes, sem necessidade de alterações no código.

2. **Conformidade Legal**: Facilita a implementação de regras específicas para cada tipo de benefício, conforme exigido pela legislação.

3. **Redução de Custos**: Menor custo de manutenção a longo prazo, pois novas regras podem ser implementadas via configuração, sem alterações no código.

4. **Melhoria na Experiência do Usuário**: Formulários dinâmicos adaptados a cada tipo de benefício, com validações específicas.

5. **Qualidade dos Dados**: Validação robusta garante a qualidade e consistência dos dados coletados.

6. **Rastreabilidade**: O versionamento de schema permite rastrear a evolução das regras de negócio ao longo do tempo.

## Alternativas Consideradas

1. **Campos Fixos com Flags**: Definir todos os campos possíveis na entidade principal e usar flags para indicar quais são aplicáveis a cada tipo de benefício. Rejeitada por falta de flexibilidade e escalabilidade.

2. **Microserviços por Tipo de Benefício**: Implementar um microserviço separado para cada tipo de benefício. Rejeitada por complexidade excessiva e duplicação de código.

3. **Solução NoSQL Completa**: Migrar todo o módulo para uma solução NoSQL. Rejeitada por incompatibilidade com a arquitetura atual e custo de migração.

## Referências

- [Documentação do PostgreSQL sobre JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [Documentação do TypeORM sobre JSON](https://typeorm.io/#/entities/column-types/postgres-column-types)
- [Lei Municipal 7.205/2021](http://portal.natal.rn.gov.br/)
- [Decreto Municipal 12.346/2021](http://portal.natal.rn.gov.br/)
