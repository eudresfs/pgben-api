# Arquitetura e Design da API do Sistema de Gestão de Benefícios Eventuais

## 1. Visão Geral da Arquitetura

Proponho uma arquitetura em camadas com separação clara de responsabilidades, seguindo os princípios da Clean Architecture com NestJS:

```
┌─────────────────────────────────────────────────────────────┐
│                   Controllers (API RESTful)                 │
│                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  │ Autenticação  │ │ Beneficiários │ │   Solicitações    │  │
│  └───────────────┘ └───────────────┘ └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                   Services (Lógica de Negócio)              │
│                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  │ Autenticação  │ │ Beneficiários │ │   Solicitações    │  │
│  └───────────────┘ └───────────────┘ └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│               Repositories (Acesso a Dados)                 │
│                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  │   Usuários    │ │ Beneficiários │ │   Solicitações    │  │
│  └───────────────┘ └───────────────┘ └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                      Entidades (Domain)                     │
│                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  │   Usuários    │ │ Beneficiários │ │   Solicitações    │  │
│  └───────────────┘ └───────────────┘ └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 2. Estrutura de Módulos

Baseado nos requisitos, dividirei a API nos seguintes módulos:

01. **Auth**: Autenticação e autorização
02. **Usuários**: Gestão de usuários do sistema
03. **Unidades**: Gestão de unidade solicitantes
04. **Beneficiários**: Gestão de cadastros de beneficiários
05. **Benefícios**: Configuração de tipos de benefícios
06. **Solicitações**: Fluxo principal do sistema
07. **Documentos**: Gerenciamento de uploads
08. **Relatórios**: Dados para dashboards e relatórios
09. **Notificações**: Sistema de notificações
10. **Auditoria**: Logs de ações no sistema

## 3. Definição de Endpoints da API

A seguir, apresento o contrato da API com os principais endpoints organizados por domínio:

### 3.1 Auth (Autenticação)

```
POST /api/v1/auth/login                  # Autenticação de usuário
POST /api/v1/auth/refresh-token          # Renovar token de acesso
POST /api/v1/auth/forgot-password        # Recuperação de senha
POST /api/v1/auth/reset-password         # Redefinição de senha
POST /api/v1/auth/first-access           # Primeiro acesso (completar cadastro)
```

### 3.2 Usuários

```
GET    /api/v1/usuario                  # Listar usuários (com filtros e paginação)
GET    /api/v1/usuario/:id              # Obter detalhes de um usuário
POST   /api/v1/usuario                  # Criar novo usuário 
PUT    /api/v1/usuario/:id              # Atualizar usuário existente
PATCH  /api/v1/usuario/:id/status       # Ativar/inativar usuário
PUT    /api/v1/usuario/:id/senha        # Alterar senha
GET    /api/v1/usuario/me               # Obter perfil do usuário atual
```

### 3.3 Unidades

```
GET    /api/v1/unidade                  # Listar unidade
GET    /api/v1/unidade/:id              # Obter detalhes de uma unidade
POST   /api/v1/unidade                  # Criar nova unidade
PUT    /api/v1/unidade/:id              # Atualizar unidade
PATCH  /api/v1/unidade/:id/status       # Ativar/inativar unidade
GET    /api/v1/unidade/:id/setor        # Listar setor de uma unidade
POST   /api/v1/setor                    # Criar novo setor
PUT    /api/v1/setor/:id                # Atualizar setor
```

### 3.4 Beneficiários

```
GET    /api/v1/beneficiarios                      # Listar beneficiários (com filtros)
GET    /api/v1/beneficiarios/:id                  # Obter detalhes de um beneficiário
POST   /api/v1/beneficiarios                      # Criar novo beneficiário
PUT    /api/v1/beneficiarios/:id                  # Atualizar beneficiário
GET    /api/v1/beneficiarios/cpf/:cpf             # Buscar beneficiário por CPF
GET    /api/v1/beneficiarios/nis/:nis             # Buscar beneficiário por NIS
GET    /api/v1/beneficiarios/:id/solicitacao      # Histórico de solicitações
POST   /api/v1/beneficiarios/:id/composicao       # Adicionar membro à composição familiar
```

### 3.5 Benefícios

```
GET    /api/v1/beneficio                      # Listar tipos de benefícios
GET    /api/v1/beneficio/:id                  # Obter detalhes de um benefício
POST   /api/v1/beneficio                      # Criar novo tipo de benefício
PUT    /api/v1/beneficio/:id                  # Atualizar tipo de benefício
GET    /api/v1/beneficio/:id/requisitos       # Listar requisitos documentais
POST   /api/v1/beneficio/:id/requisitos       # Adicionar requisito documental
PUT    /api/v1/beneficio/:id/fluxo            # Configurar fluxo de aprovação
```

### 3.6 Solicitações (Core do Sistema)

```
GET    /api/v1/solicitacao                      # Listar solicitações (com filtros)
GET    /api/v1/solicitacao/:id                  # Obter detalhes de uma solicitação
POST   /api/v1/solicitacao                      # Criar nova solicitação
PUT    /api/v1/solicitacao/:id                  # Atualizar solicitação (em rascunho)
DELETE /api/v1/solicitacao/:id                  # Cancelar solicitação

# Endpoints para o workflow
PUT    /api/v1/solicitacao/:id/enviar           # Enviar para análise
PUT    /api/v1/solicitacao/:id/analisar         # Registrar análise 
PUT    /api/v1/solicitacao/:id/aprovar          # Aprovar solicitação
PUT    /api/v1/solicitacao/:id/pendenciar       # Marcar como pendente
PUT    /api/v1/solicitacao/:id/liberar          # Liberar benefício
GET    /api/v1/solicitacao/:id/historico        # Histórico de status

# Endpoints para consultas específicas
GET    /api/v1/solicitacao/pendentes            # Listar pendentes
GET    /api/v1/solicitacao/aprovadas            # Listar aprovadas
GET    /api/v1/solicitacao/whatsapp             # Listar solicitações via WhatsApp
```

### 3.7 Documentos

```
POST   /api/v1/solicitacao/:id/documento       # Upload de documento
GET    /api/v1/documento/:id                    # Metadados do documento
GET    /api/v1/documento/:id/download           # Download do documento
DELETE /api/v1/documento/:id                    # Remover documento
```

### 3.8 Relatórios

```
GET    /api/v1/relatorios/dashboard              # Dados para dashboard
GET    /api/v1/relatorios/beneficiarios          # Relatório de beneficiários
GET    /api/v1/relatorios/solicitacao            # Relatório de solicitações
GET    /api/v1/relatorios/unidade                # Relatório por unidade
GET    /api/v1/relatorios/tempo-atendimento      # Relatório de tempo médio
GET    /api/v1/relatorios/export/csv             # Exportar como CSV
GET    /api/v1/relatorios/export/pdf             # Exportar como PDF
```

### 3.9 Notificações

```
GET    /api/v1/notificacao                      # Listar notificações do usuário
PUT    /api/v1/notificacao/:id/ler              # Marcar como lida
PUT    /api/v1/notificacao/ler-todas            # Marcar todas como lidas
```

### 3.10 Auditoria

```
GET    /api/v1/auditoria                         # Listar logs de auditoria
GET    /api/v1/auditoria/:id                     # Detalhes de um log
```

## 4. Exemplos de Modelos de Dados (DTOs)

Aqui estão exemplos de alguns DTOs principais para ilustrar a estrutura de dados:

### 4.1 LoginDto

```typescript
export class LoginDto {
  @IsEmail()
  @ApiProperty({ example: 'usuario@semtas.natal.gov.br' })
  email: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'senhaSegura123' })
  senha: string;
}
```

### 4.2 BeneficiarioDto

```typescript
export class BeneficiarioDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Maria da Silva' })
  nome: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false, example: 'Maria' })
  nome_social?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '123.456.789-00' })
  cpf: string;

  @IsDate()
  @ApiProperty({ example: '1985-10-15' })
  data_nascimento: Date;

  @IsEnum(['masculino', 'feminino'])
  @ApiProperty({ enum: ['masculino', 'feminino'], example: 'feminino' })
  sexo: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Rua das Flores, 123' })
  endereco: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Centro' })
  bairro: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false, example: 'cpf' })
  pix_tipo?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false, example: '123.456.789-00' })
  pix_chave?: string;
}
```

### 4.3 SolicitacaoDto

```typescript
export class SolicitacaoDto {
  @IsUUID()
  @ApiProperty()
  solicitante_id: string;

  @IsUUID()
  @ApiProperty()
  tipo_beneficio_id: string;

  @IsEnum(['novo', 'renovacao', 'prorrogacao'])
  @ApiProperty({ enum: ['novo', 'renovacao', 'prorrogacao'], default: 'novo' })
  tipo_solicitacao: string = 'novo';

  @IsEnum(['presencial', 'whatsapp'])
  @ApiProperty({ enum: ['presencial', 'whatsapp'], default: 'presencial' })
  origem: string = 'presencial';

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  parecer_tecnico?: string;

  @ValidateNested()
  @Type(() => DadosBeneficioDto)
  @ApiProperty({ type: DadosBeneficioDto })
  dados_beneficio: DadosBeneficioDto;
}
```

## 5. Segurança e Autorização

### 5.1 Autenticação

A API utilizará JWT (JSON Web Tokens) para autenticação:

- **Access Token**: Curta duração (15-30 minutos)
- **Refresh Token**: Longa duração (7 dias)
- **Armazenamento**: HttpOnly cookies + Bearer token

### 5.2 Autorização com RBAC

Implementaremos Role-Based Access Control com os seguintes papéis:

```typescript
enum Role {
  ADMIN = 'administrador',
  GESTOR_SEMTAS = 'gestor_semtas',
  TECNICO_SEMTAS = 'tecnico_semtas',
  TECNICO_UNIDADE = 'tecnico_unidade',
}
```

### 5.3 Exemplo de Guard de Autorização

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.role === role);
  }
}
```

### 5.4 Uso em Controllers

```typescript
@Controller('solicitacao')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SolicitacoesController {
  @Post()
  @Roles(Role.TECNICO_UNIDADE, Role.ADMIN)
  async create(@Body() dto: SolicitacaoDto, @Req() req) {
    return this.solicitacoesService.create(dto, req.user);
  }

  @Put(':id/aprovar')
  @Roles(Role.GESTOR_SEMTAS, Role.ADMIN)
  async aprovar(@Param('id') id: string, @Req() req) {
    return this.solicitacoesService.aprovar(id, req.user);
  }
}
```

## 6. Documentação da API com Swagger/OpenAPI

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.setGlobalPrefix('api/v1');
  
  const config = new DocumentBuilder()
    .setTitle('API de Gestão de Benefícios Eventuais')
    .setDescription('API para o Sistema de Gestão de Benefícios Eventuais da SEMTAS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  
  await app.listen(3000);
}
```

## 7. Padrões de Resposta da API

### 7.1 Respostas Padronizadas

Utilizaremos um formato padrão para todas as respostas:

```json
{
  "data": {},               // Dados da resposta
  "meta": {                 // Metadados (paginação, etc.)
    "total": 100,
    "page": 1,
    "limit": 10
  },
  "message": "string"       // Mensagem opcional
}
```

### 7.2 Interceptor para Padronização de Respostas

```typescript
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // Se for uma resposta paginada
        if (data && data.items && data.meta) {
          return {
            data: data.items,
            meta: data.meta
          };
        }
        
        // Resposta normal
        return { data };
      }),
    );
  }
}
```

## 8. Gestão de Erros

Para tratamento de erros, implementaremos um filtro de exceções:

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    response
      .status(status)
      .json({
        error: {
          statusCode: status,
          message: typeof exceptionResponse === 'object' 
            ? (exceptionResponse as any).message 
            : exceptionResponse,
          timestamp: new Date().toISOString(),
        }
      });
  }
}
```

## 9. Validação de Dados

Utilizaremos pipes de validação com class-validator:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors) => {
      const messages = errors.map(error => ({
        property: error.property,
        constraints: error.constraints,
      }));
      return new BadRequestException({
        message: 'Erro de validação',
        errors: messages,
      });
    },
  }),
);
```

## 10. Estrutura do Projeto

```
src/
├── main.ts
├── app.module.ts
├── common/               # Utilitários e código compartilhado
│   ├── dto/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── utils/
├── auth/                 # Módulo de autenticação
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── dto/
├── usuario/             # Módulo de usuários
│   ├── usuario.module.ts
│   ├── usuario.controller.ts
│   ├── usuario.service.ts
│   ├── usuario.repository.ts
│   ├── entities/
│   └── dto/
├── unidade/             # Módulo de unidade
│   ├── ... (estrutura semelhante)
├── beneficiarios/        # Módulo de beneficiários
│   ├── ... (estrutura semelhante)
├── beneficio/           # Módulo de tipos de benefícios
│   ├── ... (estrutura semelhante)
├── solicitacao/         # Módulo de solicitações
│   ├── solicitacao.module.ts
│   ├── solicitacao.controller.ts
│   ├── solicitacao.service.ts
│   ├── solicitacao.repository.ts
│   ├── entities/
│   ├── dto/
│   └── workflow/         # Estado/máquina de estados para workflow
└── ... (demais módulos)
```

## 11. Considerações para Implementação

1. **Arquitetura de Workflow**: Implementar uma máquina de estados para controlar as transições de status das solicitações, aplicando regras de negócio para cada transição.

2. **Upload de Documentos**: Utilizar o MinIO (compatível com S3) para armazenamento, com streaming de arquivos para evitar problemas com arquivos grandes.

3. **Rate Limiting e Proteção**: Implementar limitação de taxa para endpoints críticos e proteção contra ataques de injeção.

4. **Logging e Monitoramento**: Configurar logging estruturado para facilitar diagnóstico e monitoramento da API.

5. **Versionamento da API**: A estrutura `/api/v1/...` já prepara para futuras versões da API sem quebrar compatibilidade.

6. **Testes Automatizados**: Desenvolver testes unitários e de integração para garantir a qualidade e facilitar a evolução da API.

Esta arquitetura fornece um design robusto, modular e escalável para o Sistema de Gestão de Benefícios Eventuais, permitindo implementar todos os requisitos com boa separação de responsabilidades e aderência às boas práticas de desenvolvimento.