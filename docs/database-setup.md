# Configuração do Banco de Dados PGBen

Este documento descreve a configuração e gerenciamento do banco de dados para o projeto PGBen, incluindo instruções para desenvolvimento, geração de migrations, backups e otimizações.

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração Inicial](#configuração-inicial)
3. [Ambiente de Desenvolvimento](#ambiente-de-desenvolvimento)
4. [Gerenciamento de Migrations](#gerenciamento-de-migrations)
5. [Backups e Restauração](#backups-e-restauração)
6. [Otimizações do PostgreSQL](#otimizações-do-postgresql)
7. [Solução de Problemas](#solução-de-problemas)

## Pré-requisitos

- Docker e Docker Compose instalados
- Node.js >= 18 (recomendado 18.x LTS)
- npm >= 8
- PostgreSQL Client (para executar comandos pg_dump e pg_restore)

## Configuração Inicial

### 1. Clone o repositório:
```bash
git clone https://seu-repositorio/pgben.git
cd pgben
```

### 2. Copie o arquivo de exemplo de ambiente:
```bash
cp .env.example .env
```

### 3. Ajuste as variáveis de ambiente no arquivo `.env`:
```
# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=pgben
DB_SSL=false

# Configurações do PGAdmin
PGADMIN_EMAIL=admin@admin.com
PGADMIN_PASSWORD=admin
```

### 4. Instale as dependências:
```bash
npm install
```

## Ambiente de Desenvolvimento

### Iniciar ambiente de desenvolvimento otimizado

Para iniciar um ambiente de desenvolvimento otimizado com PostgreSQL e PGAdmin:

```bash
npm run db:dev
```

Este comando inicia:
- PostgreSQL 14 com configurações otimizadas para desenvolvimento
- PGAdmin 4 para gerenciamento do banco de dados (http://localhost:8080)

### Parar ambiente de desenvolvimento

```bash
npm run db:dev:down
```

### Verificar conexão com o banco de dados

```bash
npm run db:check
```

Este comando verifica:
- Conexão com o banco de dados
- Versão do PostgreSQL
- Configurações atuais
- Tamanho do banco de dados
- Tabelas com mais registros

## Gerenciamento de Migrations

### Problema com Migrations Padrão

O TypeORM pode apresentar problemas ao gerar migrations com tipos enum. Para resolver esse problema, foram criados scripts personalizados para geração e execução de migrations.

### Gerar uma nova migration (método corrigido)

```bash
npm run db:fix:generate NomeDaMigration
```

Este comando:
1. Inicializa o DataSource
2. Gera o SQL necessário para a migration
3. Cria um arquivo de migration com o SQL gerado
4. Fecha a conexão com o banco de dados

### Executar migrations pendentes

```bash
npm run db:fix:run
```

### Reverter a última migration

```bash
npm run db:fix:revert
```

### Verificar status das migrations

```bash
npm run db:fix:status
```

## Backups e Restauração

### Criar um backup do banco de dados

```bash
npm run db:backup
```

Este comando:
1. Cria um backup do banco de dados usando pg_dump
2. Salva o backup na pasta `backups` com timestamp
3. Mantém apenas os 5 backups mais recentes

### Restaurar um backup

```bash
npm run db:restore
```

Este comando:
1. Lista os backups disponíveis
2. Permite escolher qual backup restaurar
3. Restaura o backup escolhido para o banco de dados

## Otimizações do PostgreSQL

O ambiente de desenvolvimento foi configurado com as seguintes otimizações para o PostgreSQL:

```
max_connections = 100
shared_buffers = 128MB
work_mem = 4MB
maintenance_work_mem = 64MB
effective_cache_size = 512MB
random_page_cost = 1.1
checkpoint_completion_target = 0.9
autovacuum = on
log_statement = ddl
log_min_duration_statement = 200
```

Estas configurações são adequadas para desenvolvimento. Para produção, recomenda-se ajustar os valores conforme as características do servidor.

## Solução de Problemas

### Erro ao gerar migrations

Se você encontrar erros ao gerar migrations com o comando padrão (`npm run migration:generate`), use o método corrigido:

```bash
npm run db:fix:generate NomeDaMigration
```

### Erro de conexão com o banco de dados

1. Verifique se o PostgreSQL está em execução:
```bash
docker ps | grep postgres
```

2. Verifique as configurações no arquivo `.env`

3. Teste a conexão com o comando:
```bash
npm run db:check
```

### Erro ao executar migrations

Se houver erros ao executar migrations, verifique:

1. Se há conflitos entre entidades (nomes duplicados)
2. Se as definições de enum estão corretas
3. Se há referências circulares entre entidades

Para resolver problemas com migrations, use o comando:
```bash
npm run db:fix:status
```

Para ver detalhes sobre as migrations executadas e pendentes.

## Boas Práticas

1. **Migrações**:
   - Sempre crie migrations para alterações no banco de dados
   - Teste o método `down()` para garantir a reversão correta
   - Documente alterações complexas com comentários

2. **Seeds**:
   - Mantenha os seeds idempotentes (podem ser executados múltiplas vezes sem duplicar dados)
   - Separe dados iniciais (necessários) de dados de teste

3. **Backups**:
   - Crie backups antes de executar migrations em produção
   - Mantenha um histórico de backups

4. **Segurança**:
   - Nunca comite credenciais nos arquivos de configuração
   - Use variáveis de ambiente para configurações sensíveis
