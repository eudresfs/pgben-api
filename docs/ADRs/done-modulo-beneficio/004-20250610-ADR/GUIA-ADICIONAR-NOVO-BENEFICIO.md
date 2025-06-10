# Guia: Como Adicionar Novos Tipos de Benefício

## 📋 Visão Geral

Este guia fornece um passo-a-passo detalhado para adicionar novos tipos de benefício ao Sistema SEMTAS usando a nova arquitetura simplificada.

## 🎯 Pré-requisitos

- ✅ Conhecimento básico de NestJS e TypeScript
- ✅ Entendimento da nova arquitetura (ver [README-ARQUITETURA-REFATORADA.md](./README-ARQUITETURA-REFATORADA.md))
- ✅ Acesso ao banco de dados para criar o tipo de benefício

## 🚀 Passo a Passo

### 1. Criar a Entidade no Banco de Dados

**Primeiro**, certifique-se de que o novo tipo de benefício existe na tabela `tipo_beneficio`:

```sql
INSERT INTO tipo_beneficio (
  codigo,
  nome,
  descricao,
  ativo,
  tipo_beneficio_schema
) VALUES (
  'auxilio-educacao',
  'Auxílio Educação',
  'Benefício para auxílio com material escolar e transporte',
  true,
  '[
    {
      "nome": "valor_solicitado",
      "label": "Valor Solicitado",
      "tipo": "number",
      "obrigatorio": true,
      "descricao": "Valor do auxílio educação solicitado"
    },
    {
      "nome": "nivel_ensino",
      "label": "Nível de Ensino",
      "tipo": "string",
      "obrigatorio": true,
      "descricao": "Fundamental, Médio, Superior, etc."
    }
  ]'
);
```

### 2. Criar a Interface

**Arquivo**: `src/modules/beneficio/interfaces/dados-auxilio-educacao.interface.ts`

```typescript
import { IDadosBeneficio } from './dados-beneficio.interface';

export interface IDadosAuxilioEducacao extends IDadosBeneficio {
  valor_solicitado: number;
  nivel_ensino: string;
  nome_instituicao?: string;
  periodo_letivo?: string;
  comprovante_matricula?: string;
}
```

### 3. Criar a Entidade

**Arquivo**: `src/entities/dados-auxilio-educacao.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Solicitacao } from './solicitacao.entity';
import { IDadosAuxilioEducacao } from '../modules/beneficio/interfaces/dados-auxilio-educacao.interface';

@Entity('dados_auxilio_educacao')
export class DadosAuxilioEducacao implements IDadosAuxilioEducacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  solicitacao_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor_solicitado: number;

  @Column({ type: 'varchar', length: 50 })
  nivel_ensino: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  nome_instituicao?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  periodo_letivo?: string;

  @Column({ type: 'text', nullable: true })
  comprovante_matricula?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => Solicitacao, { eager: false })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;
}
```

### 4. Criar os DTOs

**Arquivo**: `src/modules/beneficio/dto/create-dados-auxilio-educacao.dto.ts`

```typescript
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateTipoBeneficio } from '../../../shared/validators/tipo-beneficio.validator';

export class CreateDadosAuxilioEducacaoDto {
  @ApiProperty({
    description: 'ID da solicitação',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  @IsString({ message: 'ID da solicitação deve ser uma string' })
  @ValidateTipoBeneficio('auxilio-educacao')
  solicitacao_id: string;

  @ApiProperty({
    description: 'Valor do auxílio educação solicitado',
    example: 500.00,
    minimum: 0.01
  })
  @IsNotEmpty({ message: 'Valor solicitado é obrigatório' })
  @IsNumber({}, { message: 'Valor solicitado deve ser um número' })
  @Min(0.01, { message: 'Valor solicitado deve ser maior que zero' })
  @Type(() => Number)
  valor_solicitado: number;

  @ApiProperty({
    description: 'Nível de ensino',
    example: 'Superior',
    enum: ['Fundamental', 'Médio', 'Superior', 'Técnico', 'Pós-graduação']
  })
  @IsNotEmpty({ message: 'Nível de ensino é obrigatório' })
  @IsString({ message: 'Nível de ensino deve ser uma string' })
  nivel_ensino: string;

  @ApiPropertyOptional({
    description: 'Nome da instituição de ensino',
    example: 'Universidade Federal de Exemplo'
  })
  @IsOptional()
  @IsString({ message: 'Nome da instituição deve ser uma string' })
  nome_instituicao?: string;

  @ApiPropertyOptional({
    description: 'Período letivo',
    example: '2024.1'
  })
  @IsOptional()
  @IsString({ message: 'Período letivo deve ser uma string' })
  periodo_letivo?: string;

  @ApiPropertyOptional({
    description: 'Comprovante de matrícula (base64 ou URL)',
    example: 'data:application/pdf;base64,JVBERi0xLjQK...'
  })
  @IsOptional()
  @IsString({ message: 'Comprovante de matrícula deve ser uma string' })
  comprovante_matricula?: string;
}

export class UpdateDadosAuxilioEducacaoDto {
  @ApiPropertyOptional({
    description: 'Valor do auxílio educação solicitado',
    example: 500.00,
    minimum: 0.01
  })
  @IsOptional()
  @IsNumber({}, { message: 'Valor solicitado deve ser um número' })
  @Min(0.01, { message: 'Valor solicitado deve ser maior que zero' })
  @Type(() => Number)
  valor_solicitado?: number;

  @ApiPropertyOptional({
    description: 'Nível de ensino',
    example: 'Superior',
    enum: ['Fundamental', 'Médio', 'Superior', 'Técnico', 'Pós-graduação']
  })
  @IsOptional()
  @IsString({ message: 'Nível de ensino deve ser uma string' })
  nivel_ensino?: string;

  @ApiPropertyOptional({
    description: 'Nome da instituição de ensino',
    example: 'Universidade Federal de Exemplo'
  })
  @IsOptional()
  @IsString({ message: 'Nome da instituição deve ser uma string' })
  nome_instituicao?: string;

  @ApiPropertyOptional({
    description: 'Período letivo',
    example: '2024.1'
  })
  @IsOptional()
  @IsString({ message: 'Período letivo deve ser uma string' })
  periodo_letivo?: string;

  @ApiPropertyOptional({
    description: 'Comprovante de matrícula (base64 ou URL)',
    example: 'data:application/pdf;base64,JVBERi0xLjQK...'
  })
  @IsOptional()
  @IsString({ message: 'Comprovante de matrícula deve ser uma string' })
  comprovante_matricula?: string;
}
```

### 5. Criar o Serviço Específico

**Arquivo**: `src/modules/beneficio/services/dados-auxilio-educacao.service.ts`

```typescript
import { Injectable, UseInterceptors } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractDadosBeneficioService } from './abstract-dados-beneficio.service';
import { DadosAuxilioEducacao } from '../../../entities/dados-auxilio-educacao.entity';
import { CreateDadosAuxilioEducacaoDto, UpdateDadosAuxilioEducacaoDto } from '../dto/create-dados-auxilio-educacao.dto';
import { WorkflowInterceptor } from '../../../shared/interceptors/workflow.interceptor';
import { CacheInterceptor } from '../../../shared/interceptors/cache.interceptor';
import { BeneficioValidationErrorBuilder } from '../../../shared/builders/beneficio-validation-error.builder';

@Injectable()
@UseInterceptors(WorkflowInterceptor, CacheInterceptor)
export class DadosAuxilioEducacaoService extends AbstractDadosBeneficioService<DadosAuxilioEducacao> {
  
  constructor(
    @InjectRepository(DadosAuxilioEducacao)
    protected repository: Repository<DadosAuxilioEducacao>,
  ) {
    super(repository);
  }

  /**
   * Valida os dados específicos do Auxílio Educação antes da criação
   */
  protected async validateCreateData(data: CreateDadosAuxilioEducacaoDto): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();

    // Validar valor solicitado
    this.validateValorSolicitado(data.valor_solicitado, errorBuilder);
    
    // Validar nível de ensino
    this.validateNivelEnsino(data.nivel_ensino, errorBuilder);
    
    // Validar período letivo se fornecido
    if (data.periodo_letivo) {
      this.validatePeriodoLetivo(data.periodo_letivo, errorBuilder);
    }

    errorBuilder.throwIfHasErrors();
  }

  /**
   * Valida os dados específicos do Auxílio Educação antes da atualização
   */
  protected async validateUpdateData(
    data: UpdateDadosAuxilioEducacaoDto,
    existing: DadosAuxilioEducacao
  ): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();

    // Validar valor solicitado se fornecido
    if (data.valor_solicitado !== undefined) {
      this.validateValorSolicitado(data.valor_solicitado, errorBuilder);
    }
    
    // Validar nível de ensino se fornecido
    if (data.nivel_ensino !== undefined) {
      this.validateNivelEnsino(data.nivel_ensino, errorBuilder);
    }
    
    // Validar período letivo se fornecido
    if (data.periodo_letivo !== undefined) {
      this.validatePeriodoLetivo(data.periodo_letivo, errorBuilder);
    }

    errorBuilder.throwIfHasErrors();
  }

  /**
   * Valida o valor solicitado para o auxílio educação
   */
  private validateValorSolicitado(
    valorSolicitado: number,
    errorBuilder: BeneficioValidationErrorBuilder
  ): void {
    // Valor mínimo
    if (valorSolicitado < 50) {
      errorBuilder.addError(
        'valor_solicitado',
        'O valor mínimo para auxílio educação é R$ 50,00'
      );
    }

    // Valor máximo (exemplo: R$ 2.000,00)
    if (valorSolicitado > 2000) {
      errorBuilder.addError(
        'valor_solicitado',
        'O valor máximo para auxílio educação é R$ 2.000,00'
      );
    }
  }

  /**
   * Valida o nível de ensino
   */
  private validateNivelEnsino(
    nivelEnsino: string,
    errorBuilder: BeneficioValidationErrorBuilder
  ): void {
    const niveisValidos = [
      'Fundamental',
      'Médio',
      'Superior',
      'Técnico',
      'Pós-graduação'
    ];

    if (!niveisValidos.includes(nivelEnsino)) {
      errorBuilder.addError(
        'nivel_ensino',
        `Nível de ensino deve ser um dos seguintes: ${niveisValidos.join(', ')}`
      );
    }
  }

  /**
   * Valida o formato do período letivo
   */
  private validatePeriodoLetivo(
    periodoLetivo: string,
    errorBuilder: BeneficioValidationErrorBuilder
  ): void {
    // Formato esperado: YYYY.N (ex: 2024.1, 2024.2)
    const formatoValido = /^\d{4}\.[12]$/.test(periodoLetivo);
    
    if (!formatoValido) {
      errorBuilder.addError(
        'periodo_letivo',
        'Período letivo deve estar no formato YYYY.N (ex: 2024.1)'
      );
    }
  }
}
```

### 6. Registrar na Factory

**Arquivo**: `src/modules/beneficio/services/dados-beneficio-factory.service.ts`

```typescript
// Adicionar import
import { DadosAuxilioEducacaoService } from './dados-auxilio-educacao.service';

@Injectable()
export class DadosBeneficioFactoryService {
  constructor(
    // ... outros serviços
    private readonly dadosAuxilioEducacaoService: DadosAuxilioEducacaoService, // ← Adicionar
  ) {}

  private getService(codigo: string): AbstractDadosBeneficioService {
    const serviceMap = {
      'aluguel-social': this.dadosAluguelSocialService,
      'cesta-basica': this.dadosCestaBasicaService,
      'funeral': this.dadosFuneralService,
      'natalidade': this.dadosNatalidadeService,
      'auxilio-educacao': this.dadosAuxilioEducacaoService, // ← Adicionar
    };
    
    return serviceMap[codigo] || null;
  }

  // Adicionar aos tipos de DTO
  private getDtoType(codigo: string): any {
    const dtoMap = {
      'aluguel-social': { create: CreateDadosAluguelSocialDto, update: UpdateDadosAluguelSocialDto },
      'cesta-basica': { create: CreateDadosCestaBasicaDto, update: UpdateDadosCestaBasicaDto },
      'funeral': { create: CreateDadosFuneralDto, update: UpdateDadosFuneralDto },
      'natalidade': { create: CreateDadosNatalidadeDto, update: UpdateDadosNatalidadeDto },
      'auxilio-educacao': { create: CreateDadosAuxilioEducacaoDto, update: UpdateDadosAuxilioEducacaoDto }, // ← Adicionar
    };
    
    return dtoMap[codigo] || null;
  }
}
```

### 7. Atualizar o Módulo

**Arquivo**: `src/modules/beneficio/beneficio.module.ts`

```typescript
// Adicionar imports
import { DadosAuxilioEducacao } from '../../entities/dados-auxilio-educacao.entity';
import { DadosAuxilioEducacaoService } from './services/dados-auxilio-educacao.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // ... outras entidades
      DadosAuxilioEducacao, // ← Adicionar
    ]),
  ],
  providers: [
    // ... outros providers
    DadosAuxilioEducacaoService, // ← Adicionar
  ],
  // ...
})
export class BeneficioModule {}
```

### 8. Criar Migration

**Arquivo**: `src/migrations/YYYYMMDDHHMMSS-CreateDadosAuxilioEducacao.ts`

```typescript
import { MigrationInterface, QueryRunner, Table, ForeignKey } from 'typeorm';

export class CreateDadosAuxilioEducacao1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'dados_auxilio_educacao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'solicitacao_id',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'valor_solicitado',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false
          },
          {
            name: 'nivel_ensino',
            type: 'varchar',
            length: '50',
            isNullable: false
          },
          {
            name: 'nome_instituicao',
            type: 'varchar',
            length: '200',
            isNullable: true
          },
          {
            name: 'periodo_letivo',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'comprovante_matricula',
            type: 'text',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    await queryRunner.createForeignKey(
      'dados_auxilio_educacao',
      new ForeignKey({
        columnNames: ['solicitacao_id'],
        referencedTableName: 'solicitacao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dados_auxilio_educacao');
  }
}
```

### 9. Criar Testes

**Arquivo**: `src/modules/beneficio/services/__tests__/dados-auxilio-educacao.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DadosAuxilioEducacaoService } from '../dados-auxilio-educacao.service';
import { DadosAuxilioEducacao } from '../../../../entities/dados-auxilio-educacao.entity';
import { CreateDadosAuxilioEducacaoDto } from '../../dto/create-dados-auxilio-educacao.dto';
import { BeneficioValidationException } from '../../../../shared/exceptions/beneficio-validation.exception';

describe('DadosAuxilioEducacaoService', () => {
  let service: DadosAuxilioEducacaoService;
  let repository: Repository<DadosAuxilioEducacao>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DadosAuxilioEducacaoService,
        {
          provide: getRepositoryToken(DadosAuxilioEducacao),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DadosAuxilioEducacaoService>(DadosAuxilioEducacaoService);
    repository = module.get<Repository<DadosAuxilioEducacao>>(getRepositoryToken(DadosAuxilioEducacao));
  });

  describe('validateCreateData', () => {
    it('should validate successfully with valid data', async () => {
      const validData: CreateDadosAuxilioEducacaoDto = {
        solicitacao_id: '123e4567-e89b-12d3-a456-426614174000',
        valor_solicitado: 500,
        nivel_ensino: 'Superior',
        nome_instituicao: 'Universidade Federal',
        periodo_letivo: '2024.1'
      };

      await expect(service['validateCreateData'](validData)).resolves.not.toThrow();
    });

    it('should throw error for invalid valor_solicitado', async () => {
      const invalidData: CreateDadosAuxilioEducacaoDto = {
        solicitacao_id: '123e4567-e89b-12d3-a456-426614174000',
        valor_solicitado: 25, // Menor que o mínimo
        nivel_ensino: 'Superior'
      };

      await expect(service['validateCreateData'](invalidData))
        .rejects.toThrow(BeneficioValidationException);
    });

    it('should throw error for invalid nivel_ensino', async () => {
      const invalidData: CreateDadosAuxilioEducacaoDto = {
        solicitacao_id: '123e4567-e89b-12d3-a456-426614174000',
        valor_solicitado: 500,
        nivel_ensino: 'Inválido' // Nível não permitido
      };

      await expect(service['validateCreateData'](invalidData))
        .rejects.toThrow(BeneficioValidationException);
    });

    it('should throw error for invalid periodo_letivo format', async () => {
      const invalidData: CreateDadosAuxilioEducacaoDto = {
        solicitacao_id: '123e4567-e89b-12d3-a456-426614174000',
        valor_solicitado: 500,
        nivel_ensino: 'Superior',
        periodo_letivo: '2024/1' // Formato inválido
      };

      await expect(service['validateCreateData'](invalidData))
        .rejects.toThrow(BeneficioValidationException);
    });
  });
});
```

### 10. Executar Migration e Testar

```bash
# Executar migration
npm run migration:run

# Executar testes
npm run test -- dados-auxilio-educacao.service.spec.ts

# Testar endpoint
curl -X POST http://localhost:3000/api/v1/beneficio/auxilio-educacao \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "solicitacao_id": "123e4567-e89b-12d3-a456-426614174000",
    "valor_solicitado": 500,
    "nivel_ensino": "Superior",
    "nome_instituicao": "Universidade Federal",
    "periodo_letivo": "2024.1"
  }'
```

## ✅ Checklist de Verificação

Após implementar o novo tipo de benefício, verifique:

- [ ] **Banco de Dados**
  - [ ] Tipo de benefício criado na tabela `tipo_beneficio`
  - [ ] Migration executada com sucesso
  - [ ] Tabela `dados_auxilio_educacao` criada

- [ ] **Código**
  - [ ] Interface criada e implementada
  - [ ] Entidade criada com relacionamentos corretos
  - [ ] DTOs criados com validações adequadas
  - [ ] Serviço específico implementa validações de negócio
  - [ ] Interceptors aplicados (`@UseInterceptors(WorkflowInterceptor, CacheInterceptor)`)
  - [ ] Decorator `@ValidateTipoBeneficio` aplicado no DTO
  - [ ] Serviço registrado na Factory
  - [ ] Módulo atualizado com nova entidade e serviço

- [ ] **Funcionalidades Automáticas**
  - [ ] Cache automático funcionando
  - [ ] Workflow automático funcionando
  - [ ] Validação de tipo automática funcionando
  - [ ] Endpoint de validação funcionando

- [ ] **Testes**
  - [ ] Testes unitários criados
  - [ ] Testes de validação específica
  - [ ] Testes de integração

- [ ] **Documentação**
  - [ ] Swagger atualizado automaticamente
  - [ ] Exemplos de requisição funcionando

## 🎉 Pronto!

Seu novo tipo de benefício está implementado e funcionando com:

- ✅ **Cache automático** via `CacheInterceptor`
- ✅ **Workflow automático** via `WorkflowInterceptor`
- ✅ **Validação de tipo automática** via `@ValidateTipoBeneficio`
- ✅ **Endpoint de validação** funcionando automaticamente
- ✅ **Documentação Swagger** gerada automaticamente
- ✅ **Logs e contexto de erro** via `ErrorContextInterceptor`

## 📚 Próximos Passos

1. **Configurar Frontend**: Atualizar interface para suportar o novo tipo
2. **Configurar Relatórios**: Adicionar o novo tipo aos relatórios
3. **Configurar Notificações**: Personalizar templates de email/SMS
4. **Monitoramento**: Acompanhar métricas do novo benefício

---

**Tempo Estimado**: ~2-4 horas para um desenvolvedor experiente  
**Complexidade**: Baixa (graças à nova arquitetura simplificada)  
**Manutenção**: Mínima (interceptors cuidam dos cross-cutting concerns)