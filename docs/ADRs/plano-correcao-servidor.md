# Guia Detalhado - Migração Express de Servidor NestJS com Preservação de Código

## Contexto e Fundamentação da Abordagem

O problema atual manifesta-se através de requisições que chegam ao servidor (evidenciado pelos logs HTTP DEBUG) mas nunca alcançam os controllers, resultando em timeouts de 5 segundos. Esta situação específica indica interferência no pipeline de processamento de requisições do NestJS, provavelmente causada por configurações globais acumuladas ou incompatibilidades com a versão 11 do framework.

A estratégia de migração express fundamenta-se no princípio de manter intacta toda a lógica de negócio existente enquanto reconstrói apenas a camada de configuração e inicialização da aplicação. Este approach minimiza riscos operacionais e preserva meses de desenvolvimento já consolidado.

## Fase 1: Preparação e Análise do Ambiente Atual

### 1.1 Mapeamento da Estrutura Existente

Antes de iniciar qualquer processo de migração, é fundamental compreender completamente a arquitetura atual do sistema. Execute uma análise detalhada da estrutura de pastas e dependências:

```bash
# Navegar para o diretório raiz do projeto atual
cd /caminho/para/pgben-server

# Mapear estrutura de pastas críticas
find src -type d -name "modules" -exec ls -la {} \;
find src -type d -name "shared" -exec ls -la {} \;
find src -type d -name "config" -exec ls -la {} \;

# Identificar controllers principais
find src -name "*.controller.ts" | head -10

# Mapear entidades do banco de dados
find src -name "*.entity.ts" | wc -l

# Verificar dependências críticas no package.json
grep -E "(nestjs|typeorm|passport|jwt)" package.json
```

Esta análise revela não apenas a extensão do código existente, mas também identifica dependências críticas que precisarão ser preservadas no novo ambiente. O objetivo é garantir que nenhum componente funcional seja perdido durante a migração.

### 1.2 Backup Estratégico e Versionamento

O backup não deve ser apenas uma cópia simples, mas um processo estruturado que permita reversão rápida se necessário:

```bash
# Criar timestamp para identificação única
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Backup completo com identificação temporal
cp -r pgben-server "pgben-server-backup-${TIMESTAMP}"

# Backup específico de arquivos de configuração críticos
mkdir -p backups/config-files
cp pgben-server/src/main.ts "backups/config-files/main-${TIMESTAMP}.ts"
cp pgben-server/src/app.module.ts "backups/config-files/app.module-${TIMESTAMP}.ts"
cp pgben-server/package.json "backups/config-files/package-${TIMESTAMP}.json"

# Documentar estado atual para referência
echo "Backup realizado em: $(date)" > "backups/backup-${TIMESTAMP}.log"
echo "Problema: Rotas retornando 404 exceto /api-docs" >> "backups/backup-${TIMESTAMP}.log"
echo "Versão NestJS: $(grep -o '@nestjs/core.*' pgben-server/package.json)" >> "backups/backup-${TIMESTAMP}.log"
```

### 1.3 Análise de Dependências e Compatibilidade

O NestJS versão 11 introduziu mudanças significativas na forma como módulos globais e interceptors são processados. É crucial identificar quais dependências podem estar causando incompatibilidades:

```bash
# Analisar versões de pacotes NestJS no projeto atual
cd pgben-server
npm ls @nestjs/core @nestjs/common @nestjs/platform-express

# Identificar módulos marcados como @Global
grep -r "@Global()" src/ --include="*.ts"

# Localizar interceptors globais registrados
grep -r "APP_INTERCEPTOR" src/ --include="*.ts"
grep -r "useGlobalInterceptors" src/ --include="*.ts"

# Identificar guards globais
grep -r "APP_GUARD" src/ --include="*.ts"
grep -r "useGlobalGuards" src/ --include="*.ts"
```

Esta análise fornece insights cruciais sobre componentes que historicamente causam problemas em migrações do NestJS, especialmente decoradores @Global() e configurações de interceptors globais.

## Fase 2: Criação do Ambiente Base Limpo

### 2.1 Inicialização do Projeto Base

A criação do projeto base deve seguir as melhores práticas do NestJS 11, garantindo compatibilidade total com a versão mais recente:

```bash
# Verificar versão global do NestJS CLI
nest --version

# Se necessário, atualizar para versão compatível com NestJS 11
npm install -g @nestjs/cli@latest

# Criar projeto base em diretório adjacente para comparação
nest new pgben-server-clean --package-manager npm

# Navegar para o novo projeto
cd pgben-server-clean

# Verificar se a instalação foi bem-sucedida
npm run start:dev &
NEST_PID=$!

# Aguardar inicialização e testar
sleep 10
curl -s http://localhost:3000 | head -5

# Parar o servidor de teste
kill $NEST_PID
```

### 2.2 Configuração do TypeScript e Estrutura Base

O NestJS 11 pode ter configurações específicas de TypeScript que diferem de versões anteriores. É importante alinhar estas configurações com as necessidades do projeto existente:

```bash
# Comparar configurações TypeScript
diff ../pgben-server/tsconfig.json ./tsconfig.json

# Se houver configurações específicas necessárias, aplicá-las
# Exemplo: paths personalizados, decorators experimentais, etc.

# Verificar configuração do nest-cli.json para build otimizado
cat nest-cli.json
```

### 2.3 Instalação de Dependências Core

A instalação de dependências deve ser feita de forma incremental para identificar rapidamente qualquer incompatibilidade:

```bash
# Instalar dependências core do NestJS 11
npm install @nestjs/common@^11.0.0 @nestjs/core@^11.0.0 @nestjs/platform-express@^11.0.0

# Configuração global essencial
npm install @nestjs/config

# Validação de dados (essencial para DTOs)
npm install class-validator class-transformer

# Testar se a base funciona corretamente
npm run start:dev &
NEST_PID=$!
sleep 5

# Verificar se o servidor responde
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$RESPONSE" = "200" ]; then
    echo "Base funcionando corretamente - Status: $RESPONSE"
else
    echo "Problema na base - Status: $RESPONSE"
fi

kill $NEST_PID
```

## Fase 3: Migração Estrutural de Código

### 3.1 Transferência de Módulos de Negócio

A transferência de módulos deve preservar completamente a estrutura e funcionalidade existente. Este processo envolve não apenas cópia de arquivos, mas também verificação de integridade:

```bash
# Criar estrutura de diretórios espelhando o projeto original
mkdir -p src/modules
mkdir -p src/shared
mkdir -p src/config
mkdir -p src/common

# Transferir todos os módulos de negócio
cp -r ../pgben-server/src/modules/* ./src/modules/

# Verificar integridade da transferência
ORIGINAL_MODULES=$(find ../pgben-server/src/modules -name "*.ts" | wc -l)
COPIED_MODULES=$(find ./src/modules -name "*.ts" | wc -l)

echo "Módulos originais: $ORIGINAL_MODULES"
echo "Módulos copiados: $COPIED_MODULES"

if [ "$ORIGINAL_MODULES" -eq "$COPIED_MODULES" ]; then
    echo "Transferência de módulos bem-sucedida"
else
    echo "ATENÇÃO: Discrepância na transferência de módulos"
fi
```

### 3.2 Migração de Entidades e Modelos de Dados

As entidades do TypeORM são fundamentais para o funcionamento da aplicação e devem ser migradas com especial atenção às relações e configurações:

```bash
# Transferir entidades do banco de dados
cp -r ../pgben-server/src/entities ./src/ 2>/dev/null || cp -r ../pgben-server/src/shared/entities ./src/shared/

# Verificar se todas as entidades foram transferidas
find ../pgben-server -name "*.entity.ts" > /tmp/original_entities.txt
find ./src -name "*.entity.ts" > /tmp/copied_entities.txt

echo "Comparação de entidades:"
echo "Originais: $(wc -l < /tmp/original_entities.txt)"
echo "Copiadas: $(wc -l < /tmp/copied_entities.txt)"

# Verificar se há dependências de entidades em outros arquivos
grep -r "\.entity" src/modules/ --include="*.ts" | head -5
```

### 3.3 Transferência de Serviços Compartilhados

Os serviços compartilhados frequentemente contêm lógica crítica de negócio e utilitários essenciais:

```bash
# Transferir todos os serviços compartilhados
cp -r ../pgben-server/src/shared/* ./src/shared/ 2>/dev/null || mkdir -p ./src/shared

# Identificar serviços críticos que podem ter dependências globais
find ./src/shared -name "*.service.ts" -exec basename {} \; > /tmp/shared_services.txt

echo "Serviços compartilhados identificados:"
cat /tmp/shared_services.txt

# Procurar por configurações globais que podem precisar de ajuste
grep -r "@Global" ./src/shared/ --include="*.ts" || echo "Nenhum módulo global encontrado em shared"
```

### 3.4 Configurações e Constantes

As configurações são fundamentais para o funcionamento correto da aplicação e podem conter ajustes específicos do ambiente:

```bash
# Transferir arquivos de configuração
cp -r ../pgben-server/src/config/* ./src/config/ 2>/dev/null || mkdir -p ./src/config

# Transferir constantes e enums
cp -r ../pgben-server/src/common/* ./src/common/ 2>/dev/null || mkdir -p ./src/common

# Transferir arquivo de variáveis de ambiente
cp ../pgben-server/.env ./  2>/dev/null || cp ../pgben-server/.env.example ./.env

# Verificar se há configurações específicas no package.json
diff ../pgben-server/package.json ./package.json | grep -E "(scripts|dependencies)" -A 5
```

## Fase 4: Instalação de Dependências Específicas

### 4.1 Análise e Instalação de Dependências Críticas

O projeto original pode ter dependências específicas que são essenciais para o funcionamento correto. Esta fase identifica e instala estas dependências:

```bash
# Extrair dependências específicas do projeto original
ORIGINAL_DEPS=$(node -pe "Object.keys(require('../pgben-server/package.json').dependencies).join(' ')")
ORIGINAL_DEV_DEPS=$(node -pe "Object.keys(require('../pgben-server/package.json').devDependencies || {}).join(' ')")

echo "Dependências de produção a instalar:"
echo "$ORIGINAL_DEPS"

# Instalar dependências críticas primeiro (banco de dados)
npm install @nestjs/typeorm typeorm pg

# Instalar dependências de autenticação se existirem
if echo "$ORIGINAL_DEPS" | grep -q "passport"; then
    npm install @nestjs/passport passport passport-jwt @nestjs/jwt
    npm install -D @types/passport-jwt
fi

# Instalar outras dependências do NestJS
npm install @nestjs/swagger swagger-ui-express
npm install @nestjs/terminus  # Para health checks

# Instalar dependências de produção restantes
for dep in $ORIGINAL_DEPS; do
    if ! npm list "$dep" > /dev/null 2>&1; then
        echo "Instalando dependência: $dep"
        npm install "$dep" || echo "Falha ao instalar: $dep"
    fi
done
```

### 4.2 Configuração de Dependências de Desenvolvimento

Dependências de desenvolvimento são cruciais para manter o workflow de desenvolvimento:

```bash
# Instalar dependências de desenvolvimento essenciais
npm install -D @types/node typescript ts-node

# Instalar dependências específicas de desenvolvimento do projeto original
for dev_dep in $ORIGINAL_DEV_DEPS; do
    if ! npm list "$dev_dep" > /dev/null 2>&1; then
        echo "Instalando dependência de desenvolvimento: $dev_dep"
        npm install -D "$dev_dep" || echo "Falha ao instalar: $dev_dep"
    fi
done

# Verificar se todas as dependências foram instaladas corretamente
npm audit --audit-level moderate || echo "Algumas dependências podem ter vulnerabilidades conhecidas"
```

## Fase 5: Configuração Limpa do Módulo Principal

### 5.1 Construção do AppModule Limpo

O AppModule é o coração da aplicação NestJS e deve ser construído de forma limpa, importando apenas os módulos necessários sem configurações globais problemáticas:

```typescript
// src/app.module.ts - Versão inicial limpa
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuração global básica
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Configuração básica do banco de dados
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'pgben',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 5.2 Identificação e Registro de Módulos de Negócio

Com base na estrutura migrada, identifique e registre sistematicamente todos os módulos de negócio:

```bash
# Identificar todos os módulos disponíveis
find ./src/modules -name "*.module.ts" -exec basename {} .module.ts \;

# Criar lista de imports necessários
echo "Módulos identificados para registro:"
for module_file in $(find ./src/modules -name "*.module.ts"); do
    module_name=$(basename "$(dirname "$module_file")")
    echo "- ${module_name^}Module"
done
```

Com base nesta identificação, construa o AppModule completo:

```typescript
// src/app.module.ts - Versão completa
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Importar módulos de negócio identificados
import { AuthModule } from './modules/auth/auth.module';
import { UsuarioModule } from './modules/usuarios/usuario.module';
import { BeneficioModule } from './modules/beneficios/beneficio.module';
import { DocumentoModule } from './modules/documentos/documento.module';
// Adicione outros módulos conforme necessário

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'pgben',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    }),
    
    // Registrar módulos de negócio
    AuthModule,
    UsuarioModule,
    BeneficioModule,
    DocumentoModule,
    // Adicione outros módulos aqui
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## Fase 6: Configuração do main.ts Otimizado

### 6.1 Estrutura Básica de Inicialização

O arquivo main.ts deve ser construído de forma modular e progressiva, permitindo identificar rapidamente qualquer problema:

```typescript
// src/main.ts - Versão inicial básica
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  console.log('Iniciando aplicação PGBen...');
  
  const app = await NestFactory.create(AppModule);
  
  // Configurações básicas essenciais
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // CORS básico
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`Aplicação rodando na porta ${port}`);
  console.log(`Swagger disponível em: http://localhost:${port}/api-docs`);
}

bootstrap().catch(error => {
  console.error('Erro fatal durante inicialização:', error);
  process.exit(1);
});
```

### 6.2 Configuração Incremental de Funcionalidades

Adicione funcionalidades de forma incremental, testando cada adição:

```typescript
// src/main.ts - Versão com Swagger
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function setupSwagger(app: any) {
  const config = new DocumentBuilder()
    .setTitle('PGBen API')
    .setDescription('Sistema de Gestão de Benefícios Públicos')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  
  console.log('Swagger configurado com sucesso');
}

async function bootstrap() {
  console.log('Iniciando aplicação PGBen...');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  // Pipes globais
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });
  
  // Configurar documentação
  await setupSwagger(app);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`Aplicação rodando na porta ${port}`);
  console.log(`Health check disponível em: http://localhost:${port}/health`);
  console.log(`Swagger disponível em: http://localhost:${port}/api-docs`);
}

bootstrap().catch(error => {
  console.error('Erro fatal durante inicialização:', error);
  process.exit(1);
});
```

## Fase 7: Testes e Validação Sistemática

### 7.1 Teste de Inicialização

Antes de testar funcionalidades específicas, é crucial verificar se a aplicação inicializa corretamente:

```bash
# Testar inicialização básica
npm run start:dev &
NEST_PID=$!

# Aguardar inicialização completa
sleep 15

# Verificar se o processo está rodando
if ps -p $NEST_PID > /dev/null; then
    echo "Aplicação iniciada com sucesso (PID: $NEST_PID)"
else
    echo "ERRO: Aplicação falhou ao inicializar"
    exit 1
fi

# Verificar conectividade básica
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
ROOT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)

echo "Status da rota /health: $HEALTH_STATUS"
echo "Status da rota raiz: $ROOT_STATUS"

# Parar o servidor de teste
kill $NEST_PID
```

### 7.2 Teste de Funcionalidades Críticas

Teste sistematicamente as funcionalidades mais importantes:

```bash
# Iniciar servidor para testes
npm run start:dev &
NEST_PID=$!
sleep 10

# Testar Swagger
SWAGGER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api-docs)
echo "Swagger status: $SWAGGER_STATUS"

# Testar rotas de autenticação (se existirem)
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/status 2>/dev/null || echo "N/A")
echo "Auth status: $AUTH_STATUS"

# Testar conectividade com banco de dados
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "Health check funcionando - banco provavelmente conectado"
else
    echo "Health check falhando - verificar configuração do banco"
fi

# Parar servidor
kill $NEST_PID
```

### 7.3 Identificação e Correção de Problemas de Import

Durante a migração, é comum encontrar problemas de import que precisam ser corrigidos:

```bash
# Identificar imports quebrados
npm run build 2>&1 | grep -E "(Cannot find module|Module not found)" > /tmp/import_errors.txt

if [ -s /tmp/import_errors.txt ]; then
    echo "Problemas de import identificados:"
    cat /tmp/import_errors.txt
    
    # Script para ajustar imports comuns
    find ./src -name "*.ts" -exec sed -i 's|from '\''../../shared|from '\''../../../shared|g' {} \;
    find ./src -name "*.ts" -exec sed -i 's|from '\''../entities|from '\''../../entities|g' {} \;
    
    echo "Tentando correção automática de imports..."
    npm run build
else
    echo "Nenhum problema de import identificado"
fi
```

## Fase 8: Otimização e Configurações Avançadas

### 8.1 Configuração de Prefixo Global (Opcional)

Apenas se necessário, configure o prefixo global de forma cuidadosa:

```typescript
// src/main.ts - Adição de prefixo global
async function bootstrap() {
  // ... configurações anteriores
  
  // Configurar prefixo global apenas se necessário
  if (process.env.API_PREFIX) {
    app.setGlobalPrefix(process.env.API_PREFIX, {
      exclude: [
        // Excluir rotas que devem ficar sem prefixo
        { path: 'health', method: RequestMethod.GET },
        { path: 'health/ping', method: RequestMethod.GET },
        'api-docs',
      ],
    });
    console.log(`Prefixo global configurado: ${process.env.API_PREFIX}`);
  }
  
  // ... resto da configuração
}
```

### 8.2 Configuração Gradual de Middleware

Adicione middleware apenas conforme necessário e teste cada adição:

```typescript
// src/main.ts - Middleware essencial
import * as helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  // ... configurações anteriores
  
  // Segurança básica (apenas se necessário)
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
    app.use(compression());
    console.log('Middleware de produção configurado');
  }
  
  // ... resto da configuração
}
```

## Fase 9: Validação Final e Documentação

### 9.1 Suite de Testes Completa

Execute uma bateria completa de testes para garantir que tudo funciona:

```bash
# Script de teste completo
#!/bin/bash

echo "Iniciando suite de testes completa..."

# Iniciar aplicação
npm run start:dev &
NEST_PID=$!
sleep 20

# Array de endpoints para testar
declare -a endpoints=(
    "http://localhost:3000/"
    "http://localhost:3000/health"
    "http://localhost:3000/api-docs"
    "http://localhost:3000/auth/status"
)

# Testar cada endpoint
for endpoint in "${endpoints[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "ERROR")
    echo "Testando $endpoint: Status $status"
    
    if [[ "$status" =~ ^[45] ]]; then
        echo "AVISO: Endpoint retornou erro: $endpoint"
    fi
done

# Teste de carga básico
echo "Executando teste de carga básico..."
for i in {1..10}; do
    curl -s http://localhost:3000/health > /dev/null &
done
wait

echo "Teste de carga concluído"

# Parar aplicação
kill $NEST_PID
echo "Suite de testes completa"
```

### 9.2 Documentação da Migração

Documente o processo e os resultados para referência futura:

```bash
# Criar documentação da migração
cat > MIGRATION_REPORT.md << EOF
# Relatório de Migração - PGBen Server

## Data da Migração
$(date)

## Problemas Identificados no Sistema Original
- Rotas retornando 404 (exceto /api-docs)
- Timeouts de 5 segundos em requisições
- Possível problema com módulos @Global() ou interceptors

## Estratégia Utilizada
- Migração express preservando código existente
- Reconstrução limpia da configuração base
- Teste incremental de funcionalidades

## Módulos Migrados
$(find ./src/modules -name "*.module.ts" -exec basename {} .module.ts \; | sed 's/^/- /')

## Dependências Principais
$(npm list --depth=0 2>/dev/null | grep @nestjs | sed 's/^/- /')

## Status Final
- Aplicação inicializa sem erros: [VERIFICAR]
- Rotas principais funcionando: [VERIFICAR]
- Swagger operacional: [VERIFICAR]
- Conectividade com banco: [VERIFICAR]

## Próximos Passos
1. Configurar guards de autenticação se necessário
2. Adicionar interceptors globais gradualmente
3. Implementar monitoramento e métricas
4. Configurar ambiente de produção

EOF

echo "Documentação da migração criada: MIGRATION_REPORT.md"
```

## Considerações Finais e Melhores Práticas

### Princípios Fundamentais da Migração

A abordagem de migração express baseia-se em princípios fundamentais que garantem sucesso e minimizam riscos:

1. **Preservação de Lógica de Negócio**: Todo código relacionado à lógica de negócio é mantido intacto, reduzindo riscos operacionais e mantendo funcionalidades testadas.

2. **Reconstrução Seletiva**: Apenas componentes problemáticos (configuração global, inicialização) são reconstruídos, mantendo components funcionais.

3. **Teste Incremental**: Cada adição é testada independentemente, permitindo identificação rápida de problemas.

4. **Reversibilidade**: O processo mantém backups completos e permite reversão rápida se necessário.

### Tempo de Execução Realista

Com base na complexidade identificada e na estrutura do projeto:

- **Preparação e backup**: 15-30 minutos
- **Criação do projeto base**: 15-20 minutos  
- **Migração de código**: 30-45 minutos
- **Configuração e testes**: 45-60 minutos
- **Ajustes e otimização**: 15-30 minutos

**Total estimado**: 2-3 horas para migração completa e funcional.

### Indicadores de Sucesso

O processo será considerado bem-sucedido quando:

1. A aplicação inicializa sem erros ou warnings críticos
2. Todas as rotas principais respondem adequadamente (não 404)
3. Não há timeouts de 5 segundos em requisições
4. O Swagger continua funcionando normalmente
5. A conectividade com banco de dados está estabelecida
6. Logs mostram requisições chegando aos controllers

Esta abordagem sistemática garante uma migração segura e eficiente, resolvendo os problemas identificados enquanto preserva todo o trabalho de desenvolvimento já realizado.