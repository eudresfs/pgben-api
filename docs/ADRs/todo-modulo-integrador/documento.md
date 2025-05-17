# Sistema de Gestão de Integradores API

Este documento descreve a implementação de um sistema de gestão de integradores para APIs, com suporte a tokens de longa duração, permissões granulares e controle de acesso refinado.

## Visão Geral

O sistema permite gerenciar acesso de sistemas externos (integradores) à sua API de forma segura e organizada, com as seguintes funcionalidades:

- Cadastro e gestão de integradores externos
- Emissão de tokens API com duração configurável (incluindo tokens sem expiração)
- Controle granular de permissões por integrador e por token
- Revogação e monitoramento de tokens
- Rastreamento de uso e auditoria

## Modelos de Dados

### Entidade `Integrador`

Representa um sistema externo ou parceiro que consome sua API.

```typescript
// src/modules/integrador/entities/integrador.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IntegradorToken } from './integrador-token.entity';

@Entity('integradores')
export class Integrador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nome: string;

  @Column({ length: 500, nullable: true })
  descricao: string;

  @Column({ nullable: true })
  responsavel: string;

  @Column({ nullable: true })
  emailContato: string;

  @Column({ nullable: true })
  telefoneContato: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ type: 'simple-array', nullable: true })
  permissoesEscopo: string[];
  
  @Column({ type: 'simple-array', nullable: true })
  ipPermitidos: string[];

  @Column({ type: 'timestamptz', nullable: true })
  ultimoAcesso: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  dataCriacao: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  dataAtualizacao: Date;

  @OneToMany(() => IntegradorToken, token => token.integrador)
  tokens: IntegradorToken[];
}
```

### Entidade `IntegradorToken`

Representa um token de acesso para um integrador específico.

```typescript
// src/modules/integrador/entities/integrador-token.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Integrador } from './integrador.entity';

@Entity('integrador_tokens')
export class IntegradorToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Integrador, integrador => integrador.tokens, { nullable: false })
  @JoinColumn({ name: 'integrador_id' })
  integrador: Integrador;

  @Column({ name: 'integrador_id' })
  integradorId: string;

  @Column({ length: 64 })
  nome: string;

  @Column({ length: 500, nullable: true })
  descricao: string;

  // Armazenar um hash do token, nunca o token em si
  @Column({ length: 64 })
  tokenHash: string;

  @Column({ type: 'simple-array', nullable: true })
  escopos: string[];

  // A coluna pode ser null para tokens sem expiração
  @Column({ type: 'timestamptz', nullable: true })
  dataExpiracao: Date;

  @Column({ default: false })
  revogado: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  dataRevogacao: Date;

  @Column({ nullable: true })
  motivoRevogacao: string;

  @Column({ type: 'timestamptz', nullable: true })
  ultimoUso: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  dataCriacao: Date;
}
```

## DTOs (Data Transfer Objects)

### DTOs para Integradores

```typescript
// src/modules/integrador/dto/create-integrador.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsEmail, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIntegradorDto {
  @ApiProperty({ description: 'Nome do integrador' })
  @IsNotEmpty()
  @IsString()
  nome: string;

  @ApiPropertyOptional({ description: 'Descrição do integrador' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ description: 'Nome do responsável pelo integrador' })
  @IsOptional()
  @IsString()
  responsavel?: string;

  @ApiPropertyOptional({ description: 'E-mail de contato' })
  @IsOptional()
  @IsEmail()
  emailContato?: string;

  @ApiPropertyOptional({ description: 'Telefone de contato' })
  @IsOptional()
  @IsString()
  telefoneContato?: string;

  @ApiPropertyOptional({ description: 'Lista de permissões de escopo' })
  @IsOptional()
  @IsArray()
  permissoesEscopo?: string[];

  @ApiPropertyOptional({ description: 'Lista de IPs permitidos' })
  @IsOptional()
  @IsArray()
  ipPermitidos?: string[];
}
```

```typescript
// src/modules/integrador/dto/update-integrador.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateIntegradorDto } from './create-integrador.dto';

export class UpdateIntegradorDto extends PartialType(CreateIntegradorDto) {}
```

### DTOs para Tokens

```typescript
// src/modules/integrador/dto/create-token.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsArray, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTokenDto {
  @ApiProperty({ description: 'Nome do token' })
  @IsNotEmpty()
  @IsString()
  nome: string;

  @ApiPropertyOptional({ description: 'Descrição do token' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ description: 'Lista de escopos do token' })
  @IsOptional()
  @IsArray()
  escopos?: string[];

  @ApiPropertyOptional({ 
    description: 'Dias de validade do token (null ou 0 para token sem expiração)',
    type: Number,
    nullable: true
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  diasValidade?: number | null;
  
  @ApiPropertyOptional({ 
    description: 'Indica se o token não deve expirar',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  semExpiracao?: boolean;
}
```

```typescript
// src/modules/integrador/dto/revoke-token.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RevokeTokenDto {
  @ApiPropertyOptional({ description: 'Motivo da revogação do token' })
  @IsOptional()
  @IsString()
  motivo?: string;
}
```

## Serviços

### IntegradorService

```typescript
// src/modules/integrador/services/integrador.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integrador } from '../entities/integrador.entity';
import { CreateIntegradorDto } from '../dto/create-integrador.dto';
import { UpdateIntegradorDto } from '../dto/update-integrador.dto';
import { AppLogger } from '../../../shared/logger/logger.service';

@Injectable()
export class IntegradorService {
  constructor(
    @InjectRepository(Integrador)
    private integradorRepository: Repository<Integrador>,
    private logger: AppLogger
  ) {
    this.logger.setContext(IntegradorService.name);
  }

  async findAll(options?: { ativo?: boolean }): Promise<Integrador[]> {
    const where = options?.ativo !== undefined ? { ativo: options.ativo } : {};
    return this.integradorRepository.find({ where });
  }

  async findById(id: string): Promise<Integrador> {
    const integrador = await this.integradorRepository.findOne({ where: { id } });
    if (!integrador) {
      throw new NotFoundException(`Integrador com ID ${id} não encontrado`);
    }
    return integrador;
  }

  async create(createIntegradorDto: CreateIntegradorDto): Promise<Integrador> {
    const integrador = this.integradorRepository.create(createIntegradorDto);
    return this.integradorRepository.save(integrador);
  }

  async update(id: string, updateIntegradorDto: UpdateIntegradorDto): Promise<Integrador> {
    const integrador = await this.findById(id);
    
    // Atualizar campos
    Object.assign(integrador, updateIntegradorDto);
    
    return this.integradorRepository.save(integrador);
  }

  async toggleAtivo(id: string, ativo: boolean): Promise<Integrador> {
    const integrador = await this.findById(id);
    integrador.ativo = ativo;
    return this.integradorRepository.save(integrador);
  }

  async registrarAcesso(id: string): Promise<void> {
    await this.integradorRepository.update(
      { id },
      { ultimoAcesso: new Date() }
    );
  }
}
```

### IntegradorTokenService

```typescript
// src/modules/integrador/services/integrador-token.service.ts
import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IntegradorToken } from '../entities/integrador-token.entity';
import { Integrador } from '../entities/integrador.entity';
import { IntegradorService } from './integrador.service';
import { CreateTokenDto } from '../dto/create-token.dto';
import { AppLogger } from '../../../shared/logger/logger.service';

@Injectable()
export class IntegradorTokenService {
  constructor(
    @InjectRepository(IntegradorToken)
    private tokenRepository: Repository<IntegradorToken>,
    private integradorService: IntegradorService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private logger: AppLogger
  ) {
    this.logger.setContext(IntegradorTokenService.name);
  }

  async findAllByIntegrador(integradorId: string): Promise<IntegradorToken[]> {
    return this.tokenRepository.find({
      where: { integradorId },
      order: { dataCriacao: 'DESC' }
    });
  }

  async findById(id: string): Promise<IntegradorToken> {
    const token = await this.tokenRepository.findOne({
      where: { id },
      relations: ['integrador']
    });
    
    if (!token) {
      throw new NotFoundException(`Token com ID ${id} não encontrado`);
    }
    
    return token;
  }

  async createToken(integradorId: string, createTokenDto: CreateTokenDto): Promise<{ token: string, tokenInfo: IntegradorToken }> {
    // Verificar se o integrador existe e está ativo
    const integrador = await this.integradorService.findById(integradorId);
    if (!integrador.ativo) {
      throw new BadRequestException('Não é possível criar token para um integrador inativo');
    }
    
    // Verificar escopos solicitados contra permissões do integrador
    if (createTokenDto.escopos && integrador.permissoesEscopo) {
      for (const escopo of createTokenDto.escopos) {
        if (!integrador.permissoesEscopo.includes(escopo)) {
          throw new BadRequestException(`Escopo ${escopo} não permitido para este integrador`);
        }
      }
    }
    
    // Gerar token JWT
    const privateKey = Buffer.from(
      this.configService.get<string>('JWT_PRIVATE_KEY_BASE64', ''),
      'base64'
    ).toString('utf8');
    
    // Calcular data de expiração (se aplicável)
    let dataExpiracao: Date | null = null;
    let expiresIn: string | undefined = undefined;
    
    // Verificar se o token deve expirar
    if (!createTokenDto.semExpiracao && createTokenDto.diasValidade && createTokenDto.diasValidade > 0) {
      dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + createTokenDto.diasValidade);
      expiresIn = `${createTokenDto.diasValidade}d`;
    }
    
    // Criar payload do JWT
    const payload = {
      sub: `integrador:${integradorId}`,
      name: integrador.nome,
      type: 'api_token',
      scopes: createTokenDto.escopos || [],
    };
    
    // Assinar o token (com ou sem expiração)
    const tokenOptions = {
      secret: privateKey,
      algorithm: 'RS256' as const
    };
    
    // Adicionar expiração apenas se aplicável
    if (expiresIn) {
      Object.assign(tokenOptions, { expiresIn });
    }
    
    // Gerar o token JWT
    const token = this.jwtService.sign(payload, tokenOptions);
    
    // Salvar registro do token (com hash, não o token em si)
    const tokenHash = this.hashToken(token);
    
    const tokenEntity = this.tokenRepository.create({
      integrador,
      integradorId,
      nome: createTokenDto.nome,
      descricao: createTokenDto.descricao,
      tokenHash,
      escopos: createTokenDto.escopos,
      dataExpiracao
    });
    
    const savedToken = await this.tokenRepository.save(tokenEntity);
    
    return {
      token, // O token JWT completo - só será exposto uma vez
      tokenInfo: savedToken
    };
  }

  async revogarToken(id: string, motivo?: string): Promise<IntegradorToken> {
    const token = await this.findById(id);
    
    if (token.revogado) {
      throw new BadRequestException('Este token já foi revogado');
    }
    
    token.revogado = true;
    token.dataRevogacao = new Date();
    token.motivoRevogacao = motivo;
    
    return this.tokenRepository.save(token);
  }

  async verificarToken(token: string, escoposRequeridos?: string[]): Promise<{
    valido: boolean;
    integrador?: Integrador;
    escopos?: string[];
    mensagemErro?: string;
  }> {
    try {
      // Verificar assinatura do token
      const publicKey = Buffer.from(
        this.configService.get<string>('JWT_PUBLIC_KEY_BASE64', ''),
        'base64'
      ).toString('utf8');
      
      const payload = this.jwtService.verify(token, {
        secret: publicKey,
        algorithms: ['RS256'],
        ignoreExpiration: true // Não verificamos expiração aqui, pois alguns tokens não expiram
      });
      
      // Verificar tipo do token
      if (payload.type !== 'api_token') {
        return { valido: false, mensagemErro: 'Tipo de token inválido' };
      }
      
      // Extrair ID do integrador
      const integradorId = payload.sub.replace('integrador:', '');
      
      // Verificar se o integrador existe
      const integrador = await this.integradorService.findById(integradorId);
      
      // Verificar se o integrador está ativo
      if (!integrador.ativo) {
        return { valido: false, mensagemErro: 'Integrador está inativo' };
      }
      
      // Verificar se o token foi revogado
      const tokenHash = this.hashToken(token);
      const tokenEntity = await this.tokenRepository.findOne({
        where: { tokenHash }
      });
      
      if (!tokenEntity || tokenEntity.revogado) {
        return { valido: false, mensagemErro: 'Token revogado ou inválido' };
      }
      
      // Verificar expiração (apenas se o token tiver data de expiração)
      if (tokenEntity.dataExpiracao && new Date() > tokenEntity.dataExpiracao) {
        return { valido: false, mensagemErro: 'Token expirado' };
      }
      
      // Verificar IP (se configurado)
      if (integrador.ipPermitidos && integrador.ipPermitidos.length > 0) {
        const clientIp = this.getClientIp();
        if (!integrador.ipPermitidos.includes(clientIp)) {
          return { valido: false, mensagemErro: 'Acesso não permitido a partir deste IP' };
        }
      }
      
      // Verificar escopos
      if (escoposRequeridos && escoposRequeridos.length > 0) {
        const temTodosEscopos = escoposRequeridos.every(
          escopo => tokenEntity.escopos.includes(escopo)
        );
        
        if (!temTodosEscopos) {
          return { valido: false, mensagemErro: 'Token não possui todos os escopos necessários' };
        }
      }
      
      // Registrar uso do token
      await this.tokenRepository.update(
        { id: tokenEntity.id },
        { ultimoUso: new Date() }
      );
      
      // Registrar acesso do integrador
      await this.integradorService.registrarAcesso(integradorId);
      
      return {
        valido: true,
        integrador,
        escopos: tokenEntity.escopos
      };
    } catch (error) {
      this.logger.error(`Erro ao verificar token: ${error.message}`);
      return { valido: false, mensagemErro: 'Token inválido ou com problemas de assinatura' };
    }
  }

  private getClientIp(): string {
    // Implementação para obter o IP do cliente 
    // (esta é uma simplificação, adaptar ao seu contexto)
    return 'placeholder-ip';
  }

  async limparTokensExpirados(): Promise<number> {
    const result = await this.tokenRepository.update(
      {
        dataExpiracao: LessThan(new Date()),
        revogado: false
      },
      {
        revogado: true,
        dataRevogacao: new Date(),
        motivoRevogacao: 'Expirado automaticamente'
      }
    );
    
    return result.affected || 0;
  }
  
  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }
}
```

## Decoradores e Guards

### Decorador de Escopos

```typescript
// src/modules/integrador/decorators/escopos.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const Escopos = (...escopos: string[]) => SetMetadata('escopos', escopos);
```

### Decorador para Obter o Integrador Atual

```typescript
// src/modules/integrador/decorators/get-integrador.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetIntegrador = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.integrador;
  },
);
```

### Guard de Autenticação para Integradores

```typescript
// src/modules/integrador/guards/integrador-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IntegradorTokenService } from '../services/integrador-token.service';
import { AppLogger } from '../../../shared/logger/logger.service';
import { Request } from 'express';

@Injectable()
export class IntegradorAuthGuard implements CanActivate {
  constructor(
    private integradorTokenService: IntegradorTokenService,
    private reflector: Reflector,
    private logger: AppLogger
  ) {
    this.logger.setContext(IntegradorAuthGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('Token de API ausente ou inválido');
    }
    
    // Obter escopos necessários para este endpoint
    const escoposRequeridos = this.reflector.getAllAndOverride<string[]>('escopos', [
      context.getHandler(),
      context.getClass(),
    ]) || [];
    
    // Verificar token
    const resultado = await this.integradorTokenService.verificarToken(token, escoposRequeridos);
    
    if (!resultado.valido) {
      this.logger.warn(`Acesso negado: ${resultado.mensagemErro}`);
      throw new UnauthorizedException(resultado.mensagemErro || 'Token inválido');
    }
    
    // Adicionar informações do integrador ao request
    request['integrador'] = resultado.integrador;
    request['escopos'] = resultado.escopos;
    
    return true;
  }
  
  private extractTokenFromHeader(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) return undefined;
    
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
```

## Controllers

### Controller de Integradores

```typescript
// src/modules/integrador/controllers/integrador.controller.ts
import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { Role } from '../../../shared/enums/role.enum';
import { IntegradorService } from '../services/integrador.service';
import { IntegradorTokenService } from '../services/integrador-token.service';
import { CreateIntegradorDto } from '../dto/create-integrador.dto';
import { UpdateIntegradorDto } from '../dto/update-integrador.dto';
import { CreateTokenDto } from '../dto/create-token.dto';
import { RevokeTokenDto } from '../dto/revoke-token.dto';

@ApiTags('integradores')
@Controller('integradores')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IntegradorController {
  constructor(
    private integradorService: IntegradorService,
    private tokenService: IntegradorTokenService
  ) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todos os integradores' })
  @ApiResponse({ status: 200, description: 'Lista de integradores retornada com sucesso' })
  async findAll(@Query('ativo') ativo?: boolean) {
    return this.integradorService.findAll({ ativo });
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obter detalhes de um integrador' })
  @ApiResponse({ status: 200, description: 'Integrador encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Integrador não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.integradorService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar novo integrador' })
  @ApiResponse({ status: 201, description: 'Integrador criado com sucesso' })
  async create(@Body() createIntegradorDto: CreateIntegradorDto) {
    return this.integradorService.create(createIntegradorDto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar integrador existente' })
  @ApiResponse({ status: 200, description: 'Integrador atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Integrador não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateIntegradorDto: UpdateIntegradorDto
  ) {
    return this.integradorService.update(id, updateIntegradorDto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ativar/desativar integrador' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Integrador não encontrado' })
  async toggleStatus(
    @Param('id') id: string,
    @Body('ativo') ativo: boolean
  ) {
    return this.integradorService.toggleAtivo(id, ativo);
  }

  @Get(':id/tokens')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar tokens de um integrador' })
  @ApiResponse({ status: 200, description: 'Lista de tokens retornada com sucesso' })
  @ApiResponse({ status: 404, description: 'Integrador não encontrado' })
  async findTokens(@Param('id') id: string) {
    return this.tokenService.findAllByIntegrador(id);
  }

  @Post(':id/tokens')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar novo token para um integrador' })
  @ApiResponse({ status: 201, description: 'Token criado com sucesso' })
  @ApiResponse({ status: 404, description: 'Integrador não encontrado' })
  async createToken(
    @Param('id') id: string,
    @Body() createTokenDto: CreateTokenDto
  ) {
    const result = await this.tokenService.createToken(id, createTokenDto);
    
    // Retornar apenas uma vez o token completo
    return {
      message: 'Token criado com sucesso. Guarde este token, ele não será mostrado novamente.',
      token: result.token,
      tokenInfo: result.tokenInfo
    };
  }

  @Patch(':integradorId/tokens/:tokenId/revogar')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Revogar um token' })
  @ApiResponse({ status: 200, description: 'Token revogado com sucesso' })
  @ApiResponse({ status: 404, description: 'Token não encontrado' })
  async revogarToken(
    @Param('tokenId') tokenId: string,
    @Body() revokeTokenDto: RevokeTokenDto
  ) {
    return this.tokenService.revogarToken(tokenId, revokeTokenDto.motivo);
  }
}
```

### Exemplo de Controller Protegido

```typescript
// src/modules/api/controllers/api-publica.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IntegradorAuthGuard } from '../../integrador/guards/integrador-auth.guard';
import { Escopos } from '../../integrador/decorators/escopos.decorator';
import { Integrador } from '../../integrador/entities/integrador.entity';
import { GetIntegrador } from '../../integrador/decorators/get-integrador.decorator';

@ApiTags('api-publica')
@Controller('api/v1')
@UseGuards(IntegradorAuthGuard)
@ApiBearerAuth()
export class ApiPublicaController {
  
  @Get('dados-basicos')
  @Escopos('read:dados_basicos')
  @ApiOperation({ summary: 'Obter dados básicos' })
  @ApiResponse({ status: 200, description: 'Dados básicos retornados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  getDadosBasicos(@GetIntegrador() integrador: Integrador) {
    return {
      message: `Dados básicos disponíveis para ${integrador.nome}`,
      timestamp: new Date().toISOString(),
      data: {
        // Dados da API...
      }
    };
  }
  
  @Get('estatisticas')
  @Escopos('read:estatisticas')
  @ApiOperation({ summary: 'Obter estatísticas' })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  getEstatisticas() {
    return {
      message: 'Estatísticas disponíveis',
      timestamp: new Date().toISOString(),
      data: {
        // Estatísticas...
      }
    };
  }
}
```

## Módulo Completo

```typescript
// src/modules/integrador/integrador.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Integrador } from './entities/integrador.entity';
import { IntegradorToken } from './entities/integrador-token.entity';
import { IntegradorService } from './services/integrador.service';
import { IntegradorTokenService } from './services/integrador-token.service';
import { IntegradorController } from './controllers/integrador.controller';
import { IntegradorAuthGuard } from './guards/integrador-auth.guard';
import { AppLoggerModule } from '../../shared/logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Integrador, IntegradorToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const privateKeyBase64 = configService.get<string>('JWT_PRIVATE_KEY_BASE64');
        const privateKey = Buffer.from(privateKeyBase64 || '', 'base64').toString('utf8');
        
        return {
          privateKey,
          publicKey: Buffer.from(
            configService.get<string>('JWT_PUBLIC_KEY_BASE64', ''),
            'base64'
          ).toString('utf8'),
          signOptions: {
            algorithm: 'RS256'
          },
        };
      },
    }),
    AppLoggerModule,
  ],
  controllers: [IntegradorController],
  providers: [
    IntegradorService,
    IntegradorTokenService,
    IntegradorAuthGuard
  ],
  exports: [
    IntegradorService,
    IntegradorTokenService,
    IntegradorAuthGuard
  ],
})
export class IntegradorModule {}