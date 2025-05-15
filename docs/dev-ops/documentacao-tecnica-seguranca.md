# Documentação Técnica: Segurança e Compliance - PGBen

## Sumário
1. [Introdução](#introdução)
2. [Middleware de Auditoria](#middleware-de-auditoria)
3. [Gestão de Secrets](#gestão-de-secrets)
4. [Segurança do MinIO](#segurança-do-minio)
5. [Análise Estática e Dinâmica de Segurança](#análise-estática-e-dinâmica-de-segurança)
6. [Referências](#referências)

## Introdução

Este documento descreve as implementações de segurança e compliance com a LGPD (Lei Geral de Proteção de Dados) no sistema PGBen. As implementações incluem middleware de auditoria, gestão de secrets, segurança do MinIO e análise de segurança estática e dinâmica.

## Middleware de Auditoria

### Visão Geral

O middleware de auditoria foi implementado para registrar todas as operações relevantes no sistema, especialmente aquelas que envolvem dados sensíveis protegidos pela LGPD. O middleware captura informações sobre o usuário, a ação realizada, os dados acessados e o timestamp da operação.

### Componentes

#### AuditoriaMiddleware

```typescript
// src/shared/middleware/auditoria.middleware.ts
@Injectable()
export class AuditoriaMiddleware implements NestMiddleware {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const usuario = req.user;
    const endpoint = req.originalUrl;
    const metodo = req.method;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    // Capturar dados da requisição para auditoria
    const dadosRequisicao = {
      params: req.params,
      query: req.query,
      body: this.sanitizarDadosSensiveis(req.body)
    };

    // Registrar evento de auditoria
    this.auditoriaService.registrarEvento({
      usuario: usuario ? usuario.id : 'anônimo',
      acao: `${metodo} ${endpoint}`,
      detalhes: JSON.stringify(dadosRequisicao),
      ip,
      userAgent,
      timestamp: new Date()
    });

    next();
  }

  private sanitizarDadosSensiveis(dados: any): any {
    if (!dados) return dados;
    
    const dadosSanitizados = { ...dados };
    
    // Remover dados sensíveis como senhas, tokens, etc.
    if (dadosSanitizados.senha) dadosSanitizados.senha = '***';
    if (dadosSanitizados.password) dadosSanitizados.password = '***';
    if (dadosSanitizados.token) dadosSanitizados.token = '***';
    
    return dadosSanitizados;
  }
}
```

#### AuditoriaService

```typescript
// src/shared/services/auditoria.service.ts
@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(AuditoriaEntity)
    private readonly auditoriaRepository: Repository<AuditoriaEntity>,
    private readonly metricsService: MetricsService
  ) {}

  async registrarEvento(eventoAuditoria: EventoAuditoriaDto): Promise<AuditoriaEntity> {
    // Criar entidade de auditoria
    const auditoria = this.auditoriaRepository.create({
      usuario: eventoAuditoria.usuario,
      acao: eventoAuditoria.acao,
      detalhes: eventoAuditoria.detalhes,
      ip: eventoAuditoria.ip,
      userAgent: eventoAuditoria.userAgent,
      timestamp: eventoAuditoria.timestamp
    });

    // Registrar métrica de evento de auditoria
    this.metricsService.incrementAuditoriaEventos(
      eventoAuditoria.acao,
      this.classificarAcao(eventoAuditoria.acao)
    );

    // Verificar se é acesso a dados LGPD
    if (this.isAcessoDadosLGPD(eventoAuditoria.acao, eventoAuditoria.detalhes)) {
      this.metricsService.incrementLGPDDataAccess(
        this.getTipoDadoLGPD(eventoAuditoria.acao),
        this.getOperacaoLGPD(eventoAuditoria.acao)
      );
    }

    // Persistir registro de auditoria
    return this.auditoriaRepository.save(auditoria);
  }

  private classificarAcao(acao: string): string {
    if (acao.includes('GET')) return 'leitura';
    if (acao.includes('POST')) return 'criacao';
    if (acao.includes('PUT') || acao.includes('PATCH')) return 'atualizacao';
    if (acao.includes('DELETE')) return 'exclusao';
    return 'outro';
  }

  private isAcessoDadosLGPD(acao: string, detalhes: string): boolean {
    // Verificar se a ação envolve dados protegidos pela LGPD
    const padroesDadosLGPD = [
      '/usuarios', '/documentos/pessoais', '/beneficiarios',
      '/dados-pessoais', '/enderecos', '/contatos'
    ];
    
    return padroesDadosLGPD.some(padrao => acao.includes(padrao));
  }

  private getTipoDadoLGPD(acao: string): string {
    if (acao.includes('/usuarios')) return 'usuario';
    if (acao.includes('/documentos/pessoais')) return 'documento_pessoal';
    if (acao.includes('/beneficiarios')) return 'beneficiario';
    if (acao.includes('/dados-pessoais')) return 'dado_pessoal';
    if (acao.includes('/enderecos')) return 'endereco';
    if (acao.includes('/contatos')) return 'contato';
    return 'outro';
  }

  private getOperacaoLGPD(acao: string): string {
    return this.classificarAcao(acao);
  }

  async buscarEventos(filtros: FiltroAuditoriaDto): Promise<[AuditoriaEntity[], number]> {
    const query = this.auditoriaRepository.createQueryBuilder('auditoria');
    
    // Aplicar filtros
    if (filtros.usuario) {
      query.andWhere('auditoria.usuario = :usuario', { usuario: filtros.usuario });
    }
    
    if (filtros.acao) {
      query.andWhere('auditoria.acao LIKE :acao', { acao: `%${filtros.acao}%` });
    }
    
    if (filtros.dataInicio) {
      query.andWhere('auditoria.timestamp >= :dataInicio', { dataInicio: filtros.dataInicio });
    }
    
    if (filtros.dataFim) {
      query.andWhere('auditoria.timestamp <= :dataFim', { dataFim: filtros.dataFim });
    }
    
    // Ordenação e paginação
    query.orderBy('auditoria.timestamp', 'DESC');
    
    if (filtros.skip) {
      query.skip(filtros.skip);
    }
    
    if (filtros.take) {
      query.take(filtros.take);
    }
    
    return query.getManyAndCount();
  }
}
```

### Configuração

O middleware de auditoria é aplicado globalmente na aplicação através do módulo principal:

```typescript
// src/app.module.ts
@Module({
  imports: [
    // ... outros imports
    AuditoriaModule,
  ],
  // ... outras configurações
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuditoriaMiddleware)
      .forRoutes('*');
  }
}
```

### Endpoints de Auditoria

```typescript
// src/modules/auditoria/auditoria.controller.ts
@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Buscar eventos de auditoria' })
  @ApiQuery({ name: 'usuario', required: false })
  @ApiQuery({ name: 'acao', required: false })
  @ApiQuery({ name: 'dataInicio', required: false })
  @ApiQuery({ name: 'dataFim', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  async buscarEventos(
    @Query() filtros: FiltroAuditoriaDto
  ): Promise<PaginatedResponseDto<AuditoriaEntity>> {
    const [eventos, total] = await this.auditoriaService.buscarEventos(filtros);
    
    return {
      data: eventos,
      total,
      page: filtros.skip ? Math.floor(filtros.skip / (filtros.take || 10)) + 1 : 1,
      pageSize: filtros.take || 10
    };
  }

  @Get('export')
  @Roles('admin')
  @ApiOperation({ summary: 'Exportar eventos de auditoria' })
  @ApiQuery({ name: 'formato', enum: ['csv', 'pdf'], required: true })
  @ApiQuery({ name: 'dataInicio', required: false })
  @ApiQuery({ name: 'dataFim', required: false })
  async exportarEventos(
    @Query('formato') formato: string,
    @Query() filtros: FiltroAuditoriaDto,
    @Res() res: Response
  ): Promise<void> {
    const [eventos] = await this.auditoriaService.buscarEventos(filtros);
    
    if (formato === 'csv') {
      // Gerar CSV
      const csv = this.gerarCSV(eventos);
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename=auditoria.csv');
      return res.send(csv);
    } else if (formato === 'pdf') {
      // Gerar PDF
      const pdf = await this.gerarPDF(eventos);
      res.header('Content-Type', 'application/pdf');
      res.header('Content-Disposition', 'attachment; filename=auditoria.pdf');
      return res.send(pdf);
    }
    
    throw new BadRequestException('Formato inválido');
  }

  private gerarCSV(eventos: AuditoriaEntity[]): string {
    // Implementação da geração de CSV
    // ...
  }

  private async gerarPDF(eventos: AuditoriaEntity[]): Promise<Buffer> {
    // Implementação da geração de PDF
    // ...
  }
}
```

## Gestão de Secrets

### Visão Geral

A gestão de secrets no PGBen é implementada utilizando Kubernetes Secrets e ConfigMaps para armazenar e gerenciar credenciais e configurações de forma segura. Isso inclui credenciais de banco de dados, chaves JWT, credenciais do MinIO e chaves de criptografia.

### Kubernetes Secrets

#### Definição de Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: pgben-secrets
  namespace: pgben
type: Opaque
data:
  # Credenciais do banco de dados
  DB_PASS: ${BASE64_DB_PASS}
  
  # Chave JWT
  JWT_SECRET: ${BASE64_JWT_SECRET}
  
  # Credenciais do MinIO
  MINIO_ACCESS_KEY: ${BASE64_MINIO_ACCESS_KEY}
  MINIO_SECRET_KEY: ${BASE64_MINIO_SECRET_KEY}
  
  # Chaves de criptografia
  ENCRYPTION_KEY: ${BASE64_ENCRYPTION_KEY}
  ENCRYPTION_IV: ${BASE64_ENCRYPTION_IV}
```

#### Acesso aos Secrets no Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgben-server
  namespace: pgben
spec:
  # ... outras configurações
  template:
    # ... outras configurações
    spec:
      containers:
      - name: pgben-server
        image: pgben-server:latest
        # ... outras configurações
        env:
        # Variáveis de ambiente a partir de ConfigMaps
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: pgben-config
              key: DB_HOST
        # ... outras variáveis de ConfigMap
        
        # Variáveis de ambiente a partir de Secrets
        - name: DB_PASS
          valueFrom:
            secretKeyRef:
              name: pgben-secrets
              key: DB_PASS
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: pgben-secrets
              key: JWT_SECRET
        - name: MINIO_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: pgben-secrets
              key: MINIO_ACCESS_KEY
        - name: MINIO_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: pgben-secrets
              key: MINIO_SECRET_KEY
        - name: ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: pgben-secrets
              key: ENCRYPTION_KEY
        - name: ENCRYPTION_IV
          valueFrom:
            secretKeyRef:
              name: pgben-secrets
              key: ENCRYPTION_IV
```

### ConfigMaps

#### Definição de ConfigMaps

```yaml
# k8s/configmaps.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pgben-config
  namespace: pgben
data:
  # Configurações do banco de dados
  DB_HOST: "postgres"
  DB_PORT: "5432"
  DB_NAME: "pgben"
  DB_USER: "postgres"
  
  # Configurações da aplicação
  NODE_ENV: "production"
  PORT: "3000"
  API_PREFIX: "/api"
  
  # Configurações do MinIO
  MINIO_HOST: "minio"
  MINIO_PORT: "9000"
  MINIO_USE_SSL: "false"
  
  # Configurações de logging
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
```

### Script de Rotação de Credenciais

```bash
#!/bin/bash
# scripts/rotate-secrets.sh

# Configurações
NAMESPACE="pgben"
SECRET_NAME="pgben-secrets"
BACKUP_DIR="/backup/secrets"
DATE_FORMAT=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/secrets-backup-${DATE_FORMAT}.yaml"

# Função para gerar senha aleatória
generate_random_password() {
  openssl rand -base64 32 | tr -d '\n'
}

# Função para codificar em base64
encode_base64() {
  echo -n "$1" | base64
}

# Backup dos secrets atuais
echo "Realizando backup dos secrets atuais..."
mkdir -p "$BACKUP_DIR"
kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o yaml > "$BACKUP_FILE"

# Gerar novas credenciais
echo "Gerando novas credenciais..."
NEW_DB_PASS=$(generate_random_password)
NEW_JWT_SECRET=$(generate_random_password)
NEW_ENCRYPTION_KEY=$(openssl rand -hex 32)
NEW_ENCRYPTION_IV=$(openssl rand -hex 16)

# Manter credenciais do MinIO (rotação separada)
MINIO_ACCESS_KEY=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath="{.data.MINIO_ACCESS_KEY}" | base64 --decode)
MINIO_SECRET_KEY=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath="{.data.MINIO_SECRET_KEY}" | base64 --decode)

# Atualizar secrets
echo "Atualizando secrets..."
kubectl create secret generic "$SECRET_NAME" -n "$NAMESPACE" \
  --from-literal=DB_PASS="$NEW_DB_PASS" \
  --from-literal=JWT_SECRET="$NEW_JWT_SECRET" \
  --from-literal=MINIO_ACCESS_KEY="$MINIO_ACCESS_KEY" \
  --from-literal=MINIO_SECRET_KEY="$MINIO_SECRET_KEY" \
  --from-literal=ENCRYPTION_KEY="$NEW_ENCRYPTION_KEY" \
  --from-literal=ENCRYPTION_IV="$NEW_ENCRYPTION_IV" \
  --dry-run=client -o yaml | kubectl apply -f -

# Atualizar banco de dados com nova senha
echo "Atualizando senha do banco de dados..."
kubectl exec -it "$(kubectl get pod -l app=postgres -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')" -n "$NAMESPACE" -- \
  psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$NEW_DB_PASS';"

# Reiniciar pods para aplicar novas credenciais
echo "Reiniciando pods para aplicar novas credenciais..."
kubectl rollout restart deployment pgben-server -n "$NAMESPACE"

echo "Rotação de credenciais concluída com sucesso!"
```

## Segurança do MinIO

### Visão Geral

A segurança do MinIO foi implementada para garantir o armazenamento seguro de documentos, especialmente aqueles que contêm dados sensíveis protegidos pela LGPD. A implementação inclui políticas de acesso granulares, políticas de ciclo de vida e retenção, configuração de auditoria e criptografia em repouso.

### Políticas de Acesso

#### Definição de Políticas

```json
// k8s/minio-policies.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::pgben-documents/*"
      ],
      "Condition": {
        "StringEquals": {
          "s3:ExistingObjectTag/classificacao": "publico"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::pgben-documents/*"
      ],
      "Condition": {
        "StringEquals": {
          "s3:ExistingObjectTag/classificacao": "restrito"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::pgben-documents/*"
      ],
      "Condition": {
        "StringEquals": {
          "s3:ExistingObjectTag/classificacao": "sensivel"
        }
      }
    }
  ]
}
```

### Políticas de Ciclo de Vida e Retenção

```json
// k8s/minio-lifecycle.json
{
  "Rules": [
    {
      "ID": "expire-temp-files",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "temp/"
      },
      "Expiration": {
        "Days": 1
      }
    },
    {
      "ID": "archive-old-documents",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "documentos/"
      },
      "Transition": {
        "Days": 90,
        "StorageClass": "ARCHIVE"
      }
    },
    {
      "ID": "expire-audit-logs",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "audit-logs/"
      },
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

### Configuração de Auditoria

```yaml
# k8s/minio-audit-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: minio-audit-config
  namespace: pgben
data:
  audit.yaml: |
    logger:
      enable: on
    audit:
      enable: on
      format: json
      address: http://elasticsearch:9200
      index: minio-audit
      filter:
        - bucket=pgben-documents&object=*.pdf
        - bucket=pgben-documents&object=*.docx
        - bucket=pgben-documents&object=*.xlsx
```

### Configuração de Criptografia em Repouso

```yaml
# k8s/minio-encryption-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: minio-encryption-config
  namespace: pgben
data:
  encryption.yaml: |
    kms:
      vault:
        endpoint: "http://vault:8200"
        engine: "transit"
        key-id: "pgben-minio-key"
        token: "${VAULT_TOKEN}"
    crypto:
      auto-encryption: on
      enable-multiple-encryptions: off
```

### Proteção WORM (Write Once Read Many)

```yaml
# k8s/minio-worm-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: minio-worm-config
  namespace: pgben
data:
  worm.yaml: |
    worm:
      enable: on
      retention:
        mode: governance
        default: 90d
        allow-override: true
```

## Análise Estática e Dinâmica de Segurança

### Análise Estática de Segurança (SAST)

#### Configuração do SonarQube

```yaml
# .github/workflows/sonarqube.yml
name: SonarQube Analysis

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  sonarqube:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
      with:
        fetch-depth: 0
        
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests with coverage
      run: npm run test:cov
      
    - name: SonarQube Scan
      uses: SonarSource/sonarqube-scan-action@master
      env:
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
      with:
        args: >
          -Dsonar.projectKey=pgben
          -Dsonar.projectName=PGBen
          -Dsonar.sources=src
          -Dsonar.tests=test
          -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
          -Dsonar.exclusions=node_modules/**,dist/**,coverage/**
```

#### Configuração do ESLint

```json
// .eslintrc.json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "tsconfig.json",
    "sourceType": "module"
  },
  "plugins": [
    "@typescript-eslint/eslint-plugin",
    "security"
  ],
  "extends": [
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:security/recommended"
  ],
  "root": true,
  "env": {
    "node": true,
    "jest": true
  },
  "ignorePatterns": [
    ".eslintrc.js",
    "dist"
  ],
  "rules": {
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "error",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
    "security/detect-child-process": "warn",
    "security/detect-disable-mustache-escape": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-non-literal-fs-filename": "warn",
    "security/detect-pseudoRandomBytes": "error",
    "security/detect-possible-timing-attacks": "error"
  }
}
```

### Análise Dinâmica de Segurança (DAST)

#### Configuração do OWASP ZAP

```yaml
# .github/workflows/zap-scan.yml
name: OWASP ZAP Scan

on:
  schedule:
    - cron: '0 0 * * 0'  # Executar semanalmente
  workflow_dispatch:

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
      
    - name: ZAP Scan
      uses: zaproxy/action-baseline@v0.7.0
      with:
        target: 'https://homologacao.pgben.semtas.natal.rn.gov.br'
        rules_file_name: '.zap/rules.tsv'
        cmd_options: '-a'
        
    - name: Upload ZAP Report
      uses: actions/upload-artifact@v2
      with:
        name: ZAP Report
        path: report.html
```

#### Regras Personalizadas do ZAP

```
# .zap/rules.tsv
10016	IGNORE	Format string error
10049	IGNORE	Non-storable content
```

## Referências

- [Documentação do NestJS](https://docs.nestjs.com/)
- [Documentação do Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Documentação do MinIO](https://docs.min.io/)
- [Documentação do SonarQube](https://docs.sonarqube.org/)
- [Documentação do OWASP ZAP](https://www.zaproxy.org/docs/)
- [Lei Geral de Proteção de Dados (LGPD)](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709.htm)
