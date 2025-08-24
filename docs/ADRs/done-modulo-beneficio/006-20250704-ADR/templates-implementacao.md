# 🛠️ Templates e Exemplos Práticos - Benefícios Dinâmicos

## 📋 Templates de Implementação

### **1. Template de Migration**

```sql
-- Migration: 001_add_dynamic_benefits_support.sql
-- Descrição: Adiciona suporte a benefícios dinâmicos multi-tenant
-- Data: 2025-01-XX
-- Autor: [Nome do Desenvolvedor]

-- 1. Adicionar campo is_dynamic na tabela beneficios
ALTER TABLE beneficios ADD COLUMN is_dynamic BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN beneficios.is_dynamic IS 'Indica se o benefício usa schema dinâmico';

-- 2. Criar tabela beneficio_schemas
CREATE TABLE beneficio_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficio_id UUID NOT NULL REFERENCES beneficios(id) ON DELETE CASCADE,
    municipio_id UUID NOT NULL REFERENCES municipios(id) ON DELETE CASCADE,
    schema_json JSONB NOT NULL,
    versao VARCHAR(10) NOT NULL DEFAULT '1.0',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES usuarios(id),
    
    -- Constraints
    CONSTRAINT uk_beneficio_municipio_versao UNIQUE (beneficio_id, municipio_id, versao),
    CONSTRAINT chk_versao_format CHECK (versao ~ '^\d+\.\d+$'),
    CONSTRAINT chk_schema_not_empty CHECK (jsonb_typeof(schema_json) = 'object')
);

COMMENT ON TABLE beneficio_schemas IS 'Schemas JSON para benefícios dinâmicos por município';

-- 3. Criar índices de performance
CREATE INDEX idx_beneficio_schemas_beneficio_municipio 
    ON beneficio_schemas(beneficio_id, municipio_id) 
    WHERE ativo = true;

CREATE INDEX idx_beneficio_schemas_schema_json 
    ON beneficio_schemas USING GIN(schema_json);

CREATE INDEX idx_beneficio_schemas_municipio 
    ON beneficio_schemas(municipio_id) 
    WHERE ativo = true;

-- 4. Adicionar campos municipio_id nas tabelas auxiliares
ALTER TABLE criterios_elegibilidade ADD COLUMN municipio_id UUID REFERENCES municipios(id);
ALTER TABLE configuracao_beneficio ADD COLUMN municipio_id UUID REFERENCES municipios(id);
ALTER TABLE workflow_configuracao ADD COLUMN municipio_id UUID REFERENCES municipios(id);

-- 5. Criar tabela de backup para rollback
CREATE TABLE backup_configuracao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficio_id UUID NOT NULL,
    municipio_id UUID NOT NULL,
    configuracao_anterior JSONB NOT NULL,
    tipo_backup VARCHAR(50) NOT NULL, -- 'antes_ativacao', 'antes_atualizacao'
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES usuarios(id)
);

-- 6. Implementar Row-Level Security (RLS)
ALTER TABLE beneficio_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY beneficio_schemas_municipio_policy ON beneficio_schemas
    FOR ALL TO authenticated
    USING (municipio_id = current_setting('app.current_municipio_id', true)::uuid);

-- 7. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_beneficio_schemas_updated_at 
    BEFORE UPDATE ON beneficio_schemas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Inserir dados iniciais (seeds)
INSERT INTO beneficio_schemas (beneficio_id, municipio_id, schema_json, versao) 
SELECT 
    b.id,
    m.id,
    '{
        "type": "object",
        "properties": {
            "renda_familiar": {
                "type": "number",
                "minimum": 0,
                "maximum": 2000,
                "description": "Renda familiar em reais"
            },
            "numero_dependentes": {
                "type": "integer",
                "minimum": 0,
                "description": "Número de dependentes"
            }
        },
        "required": ["renda_familiar", "numero_dependentes"]
    }'::jsonb,
    '1.0'
FROM beneficios b
CROSS JOIN municipios m
WHERE b.nome = 'Auxílio Emergencial' -- Exemplo
LIMIT 1;
```

---

### **2. Template de Entidade TypeScript**

```typescript
// src/modules/beneficio/entities/beneficio-schema.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check
} from 'typeorm';
import { Beneficio } from './beneficio.entity';
import { Municipio } from '../../municipio/entities/municipio.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Entity('beneficio_schemas')
@Index(['beneficioId', 'municipioId'], { where: 'ativo = true' })
@Check('chk_versao_format', 'versao ~ \'\\d+\\.\\d+\'')
@Check('chk_schema_not_empty', 'jsonb_typeof(schema_json) = \'object\'')
export class BeneficioSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'beneficio_id' })
  beneficioId: string;

  @Column({ name: 'municipio_id' })
  municipioId: string;

  @Column({ name: 'schema_json', type: 'jsonb' })
  schemaJson: Record<string, any>;

  @Column({ name: 'versao', length: 10, default: '1.0' })
  versao: string;

  @Column({ name: 'ativo', default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  // Relacionamentos
  @ManyToOne(() => Beneficio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'beneficio_id' })
  beneficio: Beneficio;

  @ManyToOne(() => Municipio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'municipio_id' })
  municipio: Municipio;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'created_by' })
  creator: Usuario;

  // Métodos auxiliares
  isValid(): boolean {
    return this.ativo && this.schemaJson && Object.keys(this.schemaJson).length > 0;
  }

  getSchemaVersion(): { major: number; minor: number } {
    const [major, minor] = this.versao.split('.').map(Number);
    return { major, minor };
  }

  incrementVersion(type: 'major' | 'minor' = 'minor'): string {
    const { major, minor } = this.getSchemaVersion();
    if (type === 'major') {
      return `${major + 1}.0`;
    }
    return `${major}.${minor + 1}`;
  }
}
```

---

### **3. Template de DTO**

```typescript
// src/modules/beneficio/dto/create-beneficio-schema.dto.ts
import {
  IsUUID,
  IsObject,
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBeneficioSchemaDto {
  @ApiProperty({
    description: 'ID do benefício',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID(4, { message: 'beneficioId deve ser um UUID válido' })
  beneficioId: string;

  @ApiProperty({
    description: 'ID do município',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID(4, { message: 'municipioId deve ser um UUID válido' })
  municipioId: string;

  @ApiProperty({
    description: 'Schema JSON para validação dos dados do benefício',
    example: {
      type: 'object',
      properties: {
        renda_familiar: {
          type: 'number',
          minimum: 0,
          maximum: 2000
        }
      },
      required: ['renda_familiar']
    }
  })
  @IsObject({ message: 'schemaJson deve ser um objeto válido' })
  schemaJson: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Versão do schema (formato: X.Y)',
    example: '1.0',
    default: '1.0'
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+\.\d+$/, { message: 'versao deve estar no formato X.Y' })
  versao?: string;

  @ApiPropertyOptional({
    description: 'Se o schema está ativo',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

// src/modules/beneficio/dto/update-beneficio-schema.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBeneficioSchemaDto } from './create-beneficio-schema.dto';

export class UpdateBeneficioSchemaDto extends PartialType(
  OmitType(CreateBeneficioSchemaDto, ['beneficioId', 'municipioId'] as const)
) {}

// src/modules/beneficio/dto/beneficio-schema-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class BeneficioSchemaResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  beneficioId: string;

  @ApiProperty()
  @Expose()
  municipioId: string;

  @ApiProperty()
  @Expose()
  schemaJson: Record<string, any>;

  @ApiProperty()
  @Expose()
  versao: string;

  @ApiProperty()
  @Expose()
  ativo: boolean;

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}
```

---

### **4. Template de Service**

```typescript
// src/modules/beneficio/services/dynamic-benefit.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import { BeneficioSchema } from '../entities/beneficio-schema.entity';
import { CreateBeneficioSchemaDto } from '../dto/create-beneficio-schema.dto';
import { UpdateBeneficioSchemaDto } from '../dto/update-beneficio-schema.dto';
import { UserContextService } from '../../auth/services/user-context.service';
import { AuditService } from '../../audit/services/audit.service';
import { CacheService } from '../../cache/services/cache.service';

export interface ValidationResult {
  valid: boolean;
  errors: any[];
  data?: any;
}

@Injectable()
export class DynamicBenefitService {
  private readonly logger = new Logger(DynamicBenefitService.name);
  private readonly ajv: Ajv;

  constructor(
    @InjectRepository(BeneficioSchema)
    private readonly beneficioSchemaRepository: Repository<BeneficioSchema>,
    private readonly userContextService: UserContextService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService
  ) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  /**
   * Cria um novo schema de benefício dinâmico
   */
  async createSchema(
    dto: CreateBeneficioSchemaDto,
    userId: string
  ): Promise<BeneficioSchema> {
    this.logger.log(`Criando schema para benefício ${dto.beneficioId}`);

    // Validar acesso ao município
    await this.validateMunicipioAccess(userId, dto.municipioId);

    // Validar se já existe schema ativo
    const existingSchema = await this.getActiveSchema(
      dto.beneficioId,
      dto.municipioId
    );

    if (existingSchema) {
      throw new ConflictException(
        'Já existe um schema ativo para este benefício neste município'
      );
    }

    // Validar o schema JSON
    await this.validateSchemaStructure(dto.schemaJson);

    // Criar o schema
    const schema = this.beneficioSchemaRepository.create({
      ...dto,
      createdBy: userId,
      versao: dto.versao || '1.0'
    });

    const savedSchema = await this.beneficioSchemaRepository.save(schema);

    // Limpar cache
    await this.clearSchemaCache(dto.beneficioId, dto.municipioId);

    // Auditoria
    await this.auditService.log({
      action: 'CREATE_DYNAMIC_SCHEMA',
      entityType: 'BeneficioSchema',
      entityId: savedSchema.id,
      userId,
      details: { beneficioId: dto.beneficioId, municipioId: dto.municipioId }
    });

    this.logger.log(`Schema criado com sucesso: ${savedSchema.id}`);
    return savedSchema;
  }

  /**
   * Atualiza um schema existente
   */
  async updateSchema(
    id: string,
    dto: UpdateBeneficioSchemaDto,
    userId: string
  ): Promise<BeneficioSchema> {
    this.logger.log(`Atualizando schema ${id}`);

    const schema = await this.findSchemaById(id);
    
    // Validar acesso ao município
    await this.validateMunicipioAccess(userId, schema.municipioId);

    // Backup da configuração anterior
    await this.createBackup(schema, 'antes_atualizacao', userId);

    // Validar novo schema se fornecido
    if (dto.schemaJson) {
      await this.validateSchemaStructure(dto.schemaJson);
    }

    // Incrementar versão se schema mudou
    if (dto.schemaJson && JSON.stringify(dto.schemaJson) !== JSON.stringify(schema.schemaJson)) {
      dto.versao = schema.incrementVersion('minor');
    }

    // Atualizar
    Object.assign(schema, dto);
    const updatedSchema = await this.beneficioSchemaRepository.save(schema);

    // Limpar cache
    await this.clearSchemaCache(schema.beneficioId, schema.municipioId);

    // Auditoria
    await this.auditService.log({
      action: 'UPDATE_DYNAMIC_SCHEMA',
      entityType: 'BeneficioSchema',
      entityId: id,
      userId,
      details: { changes: dto }
    });

    this.logger.log(`Schema atualizado com sucesso: ${id}`);
    return updatedSchema;
  }

  /**
   * Busca schema ativo por benefício e município
   */
  async getSchemaByBeneficio(
    beneficioId: string,
    municipioId: string
  ): Promise<BeneficioSchema | null> {
    const cacheKey = `schema:${beneficioId}:${municipioId}`;
    
    // Tentar buscar no cache
    const cached = await this.cacheService.get<BeneficioSchema>(cacheKey);
    if (cached) {
      return cached;
    }

    // Buscar no banco
    const schema = await this.beneficioSchemaRepository.findOne({
      where: {
        beneficioId,
        municipioId,
        ativo: true
      },
      order: { createdAt: 'DESC' }
    });

    // Cachear resultado
    if (schema) {
      await this.cacheService.set(cacheKey, schema, 300); // 5 minutos
    }

    return schema;
  }

  /**
   * Valida dados contra o schema dinâmico
   */
  async validateDynamicData(
    beneficioId: string,
    municipioId: string,
    data: any
  ): Promise<ValidationResult> {
    this.logger.log(`Validando dados para benefício ${beneficioId}`);

    const schema = await this.getSchemaByBeneficio(beneficioId, municipioId);
    
    if (!schema) {
      throw new NotFoundException(
        'Schema não encontrado para este benefício e município'
      );
    }

    return this.validateAgainstSchema(schema.schemaJson, data);
  }

  /**
   * Ativa um benefício como dinâmico
   */
  async activateDynamicBenefit(
    beneficioId: string,
    municipioId: string,
    userId: string
  ): Promise<void> {
    this.logger.log(`Ativando benefício dinâmico ${beneficioId}`);

    // Validar acesso
    await this.validateMunicipioAccess(userId, municipioId);

    // Verificar se existe schema
    const schema = await this.getSchemaByBeneficio(beneficioId, municipioId);
    if (!schema) {
      throw new NotFoundException('Schema não encontrado');
    }

    // Backup antes da ativação
    await this.createBackup(schema, 'antes_ativacao', userId);

    // Ativar benefício dinâmico
    await this.beneficioRepository.update(beneficioId, {
      isDynamic: true
    });

    // Auditoria
    await this.auditService.log({
      action: 'ACTIVATE_DYNAMIC_BENEFIT',
      entityType: 'Beneficio',
      entityId: beneficioId,
      userId,
      details: { municipioId }
    });

    this.logger.log(`Benefício dinâmico ativado: ${beneficioId}`);
  }

  /**
   * Rollback de emergência
   */
  async rollbackBenefit(
    beneficioId: string,
    municipioId: string,
    userId: string
  ): Promise<void> {
    this.logger.warn(`Executando rollback para benefício ${beneficioId}`);

    // Validar acesso
    await this.validateMunicipioAccess(userId, municipioId);

    // Desativar benefício dinâmico
    await this.beneficioRepository.update(beneficioId, {
      isDynamic: false
    });

    // Desativar schema
    await this.beneficioSchemaRepository.update(
      { beneficioId, municipioId },
      { ativo: false }
    );

    // Limpar cache
    await this.clearSchemaCache(beneficioId, municipioId);

    // Auditoria
    await this.auditService.log({
      action: 'ROLLBACK_DYNAMIC_BENEFIT',
      entityType: 'Beneficio',
      entityId: beneficioId,
      userId,
      details: { municipioId, reason: 'emergency_rollback' }
    });

    this.logger.warn(`Rollback executado para benefício ${beneficioId}`);
  }

  // Métodos privados auxiliares
  private async validateSchemaStructure(schema: any): Promise<void> {
    try {
      this.ajv.compile(schema);
    } catch (error) {
      throw new BadRequestException(
        `Schema JSON inválido: ${error.message}`
      );
    }
  }

  private async validateAgainstSchema(
    schema: any,
    data: any
  ): Promise<ValidationResult> {
    try {
      const validate = this.ajv.compile(schema);
      const valid = validate(data);
      
      return {
        valid,
        errors: validate.errors || [],
        data: valid ? data : undefined
      };
    } catch (error) {
      this.logger.error(`Erro na validação: ${error.message}`);
      return {
        valid: false,
        errors: [{ message: 'Erro interno na validação' }]
      };
    }
  }

  private async validateMunicipioAccess(
    userId: string,
    municipioId: string
  ): Promise<void> {
    const hasAccess = await this.userContextService.validateMunicipioAccess(
      userId,
      municipioId
    );
    
    if (!hasAccess) {
      throw new ForbiddenException(
        'Usuário não tem acesso a este município'
      );
    }
  }

  private async findSchemaById(id: string): Promise<BeneficioSchema> {
    const schema = await this.beneficioSchemaRepository.findOne({
      where: { id }
    });
    
    if (!schema) {
      throw new NotFoundException('Schema não encontrado');
    }
    
    return schema;
  }

  private async getActiveSchema(
    beneficioId: string,
    municipioId: string
  ): Promise<BeneficioSchema | null> {
    return this.beneficioSchemaRepository.findOne({
      where: {
        beneficioId,
        municipioId,
        ativo: true
      }
    });
  }

  private async createBackup(
    schema: BeneficioSchema,
    tipo: string,
    userId: string
  ): Promise<void> {
    // Implementar backup na tabela backup_configuracao
    // ...
  }

  private async clearSchemaCache(
    beneficioId: string,
    municipioId: string
  ): Promise<void> {
    const cacheKey = `schema:${beneficioId}:${municipioId}`;
    await this.cacheService.del(cacheKey);
  }
}
```

---

### **5. Template de Controller**

```typescript
// src/modules/beneficio/controllers/beneficio-schema.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth
} from '@nestjs/swagger';

import { DynamicBenefitService } from '../services/dynamic-benefit.service';
import { CreateBeneficioSchemaDto } from '../dto/create-beneficio-schema.dto';
import { UpdateBeneficioSchemaDto } from '../dto/update-beneficio-schema.dto';
import { BeneficioSchemaResponseDto } from '../dto/beneficio-schema-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/interfaces/user.interface';
import { ApiErrorResponse } from '../../common/decorators/api-error-response.decorator';

@ApiTags('Benefício Schema')
@Controller('v1/beneficio-schemas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BeneficioSchemaController {
  constructor(
    private readonly dynamicBenefitService: DynamicBenefitService
  ) {}

  @Post()
  @RequirePermissions('beneficio:create')
  @ApiOperation({
    summary: 'Criar schema de benefício dinâmico',
    description: 'Cria um novo schema JSON para validação de benefícios dinâmicos'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Schema criado com sucesso',
    type: BeneficioSchemaResponseDto
  })
  @ApiErrorResponse([400, 401, 403, 409])
  async create(
    @Body() createDto: CreateBeneficioSchemaDto,
    @CurrentUser() user: User
  ): Promise<BeneficioSchemaResponseDto> {
    const schema = await this.dynamicBenefitService.createSchema(
      createDto,
      user.id
    );
    return plainToClass(BeneficioSchemaResponseDto, schema);
  }

  @Put(':id')
  @RequirePermissions('beneficio:update')
  @ApiOperation({
    summary: 'Atualizar schema de benefício',
    description: 'Atualiza um schema existente e incrementa a versão'
  })
  @ApiParam({ name: 'id', description: 'ID do schema' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Schema atualizado com sucesso',
    type: BeneficioSchemaResponseDto
  })
  @ApiErrorResponse([400, 401, 403, 404])
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateBeneficioSchemaDto,
    @CurrentUser() user: User
  ): Promise<BeneficioSchemaResponseDto> {
    const schema = await this.dynamicBenefitService.updateSchema(
      id,
      updateDto,
      user.id
    );
    return plainToClass(BeneficioSchemaResponseDto, schema);
  }

  @Get('beneficio/:beneficioId')
  @RequirePermissions('beneficio:read')
  @ApiOperation({
    summary: 'Buscar schema por benefício',
    description: 'Retorna o schema ativo para um benefício específico'
  })
  @ApiParam({ name: 'beneficioId', description: 'ID do benefício' })
  @ApiQuery({ name: 'municipioId', description: 'ID do município', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Schema encontrado',
    type: BeneficioSchemaResponseDto
  })
  @ApiErrorResponse([401, 403, 404])
  async getByBeneficio(
    @Param('beneficioId', ParseUUIDPipe) beneficioId: string,
    @Query('municipioId', ParseUUIDPipe) municipioId: string,
    @CurrentUser() user: User
  ): Promise<BeneficioSchemaResponseDto | null> {
    // Se municipioId não fornecido, usar do contexto do usuário
    const finalMunicipioId = municipioId || user.municipioId;
    
    const schema = await this.dynamicBenefitService.getSchemaByBeneficio(
      beneficioId,
      finalMunicipioId
    );
    
    return schema ? plainToClass(BeneficioSchemaResponseDto, schema) : null;
  }

  @Post(':id/activate')
  @RequirePermissions('beneficio:activate')
  @ApiOperation({
    summary: 'Ativar benefício dinâmico',
    description: 'Ativa um benefício para usar schema dinâmico'
  })
  @ApiParam({ name: 'id', description: 'ID do schema' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Benefício ativado como dinâmico'
  })
  @ApiErrorResponse([401, 403, 404])
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<{ message: string }> {
    // Buscar schema para obter beneficioId e municipioId
    const schema = await this.dynamicBenefitService.findById(id);
    
    await this.dynamicBenefitService.activateDynamicBenefit(
      schema.beneficioId,
      schema.municipioId,
      user.id
    );
    
    return { message: 'Benefício ativado como dinâmico com sucesso' };
  }

  @Post(':id/rollback')
  @RequirePermissions('beneficio:rollback')
  @ApiOperation({
    summary: 'Rollback de benefício dinâmico',
    description: 'Reverte benefício para modo estático (emergência)'
  })
  @ApiParam({ name: 'id', description: 'ID do schema' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rollback executado com sucesso'
  })
  @ApiErrorResponse([401, 403, 404])
  async rollback(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<{ message: string }> {
    // Buscar schema para obter beneficioId e municipioId
    const schema = await this.dynamicBenefitService.findById(id);
    
    await this.dynamicBenefitService.rollbackBenefit(
      schema.beneficioId,
      schema.municipioId,
      user.id
    );
    
    return { message: 'Rollback executado com sucesso' };
  }

  @Post('validate')
  @RequirePermissions('beneficio:validate')
  @ApiOperation({
    summary: 'Validar dados contra schema',
    description: 'Valida dados de entrada contra o schema dinâmico'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultado da validação',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        errors: { type: 'array' },
        data: { type: 'object' }
      }
    }
  })
  @ApiErrorResponse([400, 401, 403, 404])
  async validate(
    @Body() body: {
      beneficioId: string;
      municipioId?: string;
      data: any;
    },
    @CurrentUser() user: User
  ) {
    const municipioId = body.municipioId || user.municipioId;
    
    return this.dynamicBenefitService.validateDynamicData(
      body.beneficioId,
      municipioId,
      body.data
    );
  }
}
```

---

### **6. Template de Teste**

```typescript
// src/modules/beneficio/services/dynamic-benefit.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { DynamicBenefitService } from './dynamic-benefit.service';
import { BeneficioSchema } from '../entities/beneficio-schema.entity';
import { UserContextService } from '../../auth/services/user-context.service';
import { AuditService } from '../../audit/services/audit.service';
import { CacheService } from '../../cache/services/cache.service';

describe('DynamicBenefitService', () => {
  let service: DynamicBenefitService;
  let repository: Repository<BeneficioSchema>;
  let userContextService: UserContextService;
  let auditService: AuditService;
  let cacheService: CacheService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    find: jest.fn()
  };

  const mockUserContextService = {
    validateMunicipioAccess: jest.fn()
  };

  const mockAuditService = {
    log: jest.fn()
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamicBenefitService,
        {
          provide: getRepositoryToken(BeneficioSchema),
          useValue: mockRepository
        },
        {
          provide: UserContextService,
          useValue: mockUserContextService
        },
        {
          provide: AuditService,
          useValue: mockAuditService
        },
        {
          provide: CacheService,
          useValue: mockCacheService
        }
      ]
    }).compile();

    service = module.get<DynamicBenefitService>(DynamicBenefitService);
    repository = module.get<Repository<BeneficioSchema>>(
      getRepositoryToken(BeneficioSchema)
    );
    userContextService = module.get<UserContextService>(UserContextService);
    auditService = module.get<AuditService>(AuditService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSchema', () => {
    const createDto = {
      beneficioId: '123e4567-e89b-12d3-a456-426614174000',
      municipioId: '123e4567-e89b-12d3-a456-426614174001',
      schemaJson: {
        type: 'object',
        properties: {
          renda: { type: 'number', minimum: 0 }
        },
        required: ['renda']
      }
    };
    const userId = 'user-123';

    it('deve criar schema com sucesso', async () => {
      // Arrange
      mockUserContextService.validateMunicipioAccess.mockResolvedValue(true);
      mockRepository.findOne.mockResolvedValue(null); // Não existe schema ativo
      mockRepository.create.mockReturnValue(createDto);
      mockRepository.save.mockResolvedValue({ id: 'schema-123', ...createDto });
      mockCacheService.del.mockResolvedValue(true);
      mockAuditService.log.mockResolvedValue(true);

      // Act
      const result = await service.createSchema(createDto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('schema-123');
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          createdBy: userId,
          versao: '1.0'
        })
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_DYNAMIC_SCHEMA',
          userId
        })
      );
    });

    it('deve lançar ConflictException se schema já existe', async () => {
      // Arrange
      mockUserContextService.validateMunicipioAccess.mockResolvedValue(true);
      mockRepository.findOne.mockResolvedValue({ id: 'existing-schema' });

      // Act & Assert
      await expect(
        service.createSchema(createDto, userId)
      ).rejects.toThrow(ConflictException);
    });

    it('deve validar acesso ao município', async () => {
      // Arrange
      mockUserContextService.validateMunicipioAccess.mockRejectedValue(
        new Error('Acesso negado')
      );

      // Act & Assert
      await expect(
        service.createSchema(createDto, userId)
      ).rejects.toThrow('Acesso negado');
    });
  });

  describe('validateDynamicData', () => {
    const beneficioId = '123e4567-e89b-12d3-a456-426614174000';
    const municipioId = '123e4567-e89b-12d3-a456-426614174001';
    
    const mockSchema = {
      id: 'schema-123',
      schemaJson: {
        type: 'object',
        properties: {
          renda: { type: 'number', minimum: 0, maximum: 2000 }
        },
        required: ['renda']
      }
    };

    it('deve validar dados válidos', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(mockSchema);
      mockCacheService.set.mockResolvedValue(true);
      
      const validData = { renda: 1500 };

      // Act
      const result = await service.validateDynamicData(
        beneficioId,
        municipioId,
        validData
      );

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toEqual(validData);
    });

    it('deve rejeitar dados inválidos', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(mockSchema);
      
      const invalidData = { renda: -100 }; // Renda negativa

      // Act
      const result = await service.validateDynamicData(
        beneficioId,
        municipioId,
        invalidData
      );

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.data).toBeUndefined();
    });

    it('deve lançar NotFoundException se schema não existe', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.validateDynamicData(beneficioId, municipioId, {})
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rollbackBenefit', () => {
    const beneficioId = '123e4567-e89b-12d3-a456-426614174000';
    const municipioId = '123e4567-e89b-12d3-a456-426614174001';
    const userId = 'user-123';

    it('deve executar rollback com sucesso', async () => {
      // Arrange
      mockUserContextService.validateMunicipioAccess.mockResolvedValue(true);
      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockCacheService.del.mockResolvedValue(true);
      mockAuditService.log.mockResolvedValue(true);

      // Act
      await service.rollbackBenefit(beneficioId, municipioId, userId);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(
        { beneficioId, municipioId },
        { ativo: false }
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ROLLBACK_DYNAMIC_BENEFIT',
          userId
        })
      );
    });
  });
});
```

---

## 📝 Exemplos de Schemas JSON

### **Exemplo 1: Auxílio Emergencial**
```json
{
  "type": "object",
  "title": "Auxílio Emergencial - Natal/RN",
  "description": "Critérios para auxílio emergencial municipal",
  "properties": {
    "renda_familiar": {
      "type": "number",
      "minimum": 0,
      "maximum": 1500,
      "description": "Renda familiar mensal em reais",
      "title": "Renda Familiar (R$)"
    },
    "numero_dependentes": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10,
      "description": "Número de dependentes na família",
      "title": "Número de Dependentes"
    },
    "situacao_moradia": {
      "type": "string",
      "enum": ["propria", "alugada", "cedida", "ocupacao"],
      "description": "Situação da moradia familiar",
      "title": "Situação da Moradia"
    },
    "possui_deficiente": {
      "type": "boolean",
      "description": "Família possui pessoa com deficiência",
      "title": "Possui Pessoa com Deficiência"
    },
    "documentos_obrigatorios": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["cpf", "rg", "comprovante_renda", "comprovante_residencia"]
      },
      "minItems": 4,
      "uniqueItems": true,
      "description": "Documentos obrigatórios para solicitação"
    }
  },
  "required": [
    "renda_familiar",
    "numero_dependentes",
    "situacao_moradia",
    "documentos_obrigatorios"
  ],
  "additionalProperties": false
}
```

### **Exemplo 2: Aluguel Social - Diferentes Municípios**

**Natal/RN:**
```json
{
  "type": "object",
  "title": "Aluguel Social - Natal/RN",
  "properties": {
    "renda_per_capita": {
      "type": "number",
      "maximum": 300,
      "description": "Renda per capita máxima: R$ 300"
    },
    "tempo_residencia_natal": {
      "type": "integer",
      "minimum": 24,
      "description": "Mínimo 2 anos residindo em Natal"
    },
    "situacao_vulnerabilidade": {
      "type": "string",
      "enum": ["despejo", "area_risco", "violencia_domestica", "calamidade"]
    }
  },
  "required": ["renda_per_capita", "tempo_residencia_natal", "situacao_vulnerabilidade"]
}
```

**Parnamirim/RN:**
```json
{
  "type": "object",
  "title": "Aluguel Social - Parnamirim/RN",
  "properties": {
    "renda_familiar": {
      "type": "number",
      "maximum": 1200,
      "description": "Renda familiar máxima: R$ 1.200"
    },
    "tempo_residencia_parnamirim": {
      "type": "integer",
      "minimum": 12,
      "description": "Mínimo 1 ano residindo em Parnamirim"
    },
    "possui_imovel": {
      "type": "boolean",
      "const": false,
      "description": "Não pode possuir imóvel próprio"
    },
    "motivo_solicitacao": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["despejo", "area_risco", "separacao", "desemprego"]
      },
      "minItems": 1
    }
  },
  "required": ["renda_familiar", "tempo_residencia_parnamirim", "possui_imovel"]
}
```

---

## 🚀 Scripts de Automação

### **Script de Deploy**
```bash
#!/bin/bash
# deploy-dynamic-benefits.sh

set -e

echo "🚀 Iniciando deploy de Benefícios Dinâmicos"

# 1. Backup do banco
echo "📦 Criando backup do banco..."
npm run db:backup

# 2. Executar migrations
echo "🔄 Executando migrations..."
npm run migration:run

# 3. Executar seeds
echo "🌱 Executando seeds..."
npm run seed:run

# 4. Executar testes
echo "🧪 Executando testes..."
npm run test:e2e

# 5. Build da aplicação
echo "🔨 Fazendo build..."
npm run build

# 6. Restart do serviço
echo "🔄 Reiniciando serviço..."
pm2 restart pgben-server

# 7. Health check
echo "🏥 Verificando saúde da aplicação..."
sleep 10
curl -f http://localhost:3000/health || exit 1

echo "✅ Deploy concluído com sucesso!"
```

### **Script de Migração por Município**
```bash
#!/bin/bash
# migrate-municipio.sh

MUNICIPIO_ID=$1
MUNICIPIO_NOME=$2

if [ -z "$MUNICIPIO_ID" ] || [ -z "$MUNICIPIO_NOME" ]; then
    echo "Uso: $0 <municipio_id> <municipio_nome>"
    exit 1
fi

echo "🏢 Iniciando migração para $MUNICIPIO_NOME ($MUNICIPIO_ID)"

# 1. Backup específico do município
echo "📦 Backup dos dados do município..."
psql $DATABASE_URL -c "COPY (SELECT * FROM beneficios WHERE municipio_id = '$MUNICIPIO_ID') TO '/tmp/backup_${MUNICIPIO_NOME}_$(date +%Y%m%d).csv' CSV HEADER;"

# 2. Criar schemas para benefícios existentes
echo "📋 Criando schemas para benefícios existentes..."
node scripts/create-schemas-from-existing.js --municipio=$MUNICIPIO_ID

# 3. Validar migração
echo "✅ Validando migração..."
node scripts/validate-migration.js --municipio=$MUNICIPIO_ID

# 4. Ativar benefícios dinâmicos
echo "🔄 Ativando benefícios dinâmicos..."
psql $DATABASE_URL -c "UPDATE beneficios SET is_dynamic = true WHERE municipio_id = '$MUNICIPIO_ID' AND id IN (SELECT beneficio_id FROM beneficio_schemas WHERE municipio_id = '$MUNICIPIO_ID');"

echo "✅ Migração concluída para $MUNICIPIO_NOME!"
```

---

**🎯 Estes templates fornecem uma base sólida para implementar a solução de benefícios dinâmicos de forma consistente e eficiente!**