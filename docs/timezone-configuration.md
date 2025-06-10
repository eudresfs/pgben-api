# Configuração de Timezone no PostgreSQL com TypeORM

## Problema Identificado

O TypeORM não suporta a propriedade `timezone` diretamente na configuração do `DataSource`. Tentativas de adicionar esta propriedade resultam em erros de compilação TypeScript:

```
Object literal may only specify known properties, and 'timezone' does not exist in type 'PostgresConnectionOptions'.
```

## Soluções Recomendadas

### 1. Configuração no Servidor PostgreSQL

A abordagem mais robusta é configurar o timezone diretamente no servidor PostgreSQL:

```sql
-- Configuração global no postgresql.conf
timezone = 'America/Sao_Paulo'

-- Ou configuração por sessão
SET timezone = 'America/Sao_Paulo';
```

### 2. Configuração via Connection String

Adicione o timezone na string de conexão:

```typescript
const dataSource = new DataSource({
  type: 'postgres',
  url: 'postgresql://user:password@localhost:5432/database?timezone=America/Sao_Paulo',
  // ... outras configurações
});
```

### 3. Configuração via Variável de Ambiente Node.js

Defina a variável de ambiente `TZ` antes de inicializar a aplicação:

```typescript
// No início da aplicação (main.ts ou app.ts)
process.env.TZ = 'America/Sao_Paulo';
```

### 4. Configuração via Extra Options (Recomendado)

Use as opções extras do driver pg:

```typescript
const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'database',
  extra: {
    timezone: 'America/Sao_Paulo',
  },
  // ... outras configurações
});
```

## Implementação no Projeto

Para este projeto, recomendamos:

1. **Configurar no Docker Compose**: Adicionar a variável de ambiente `TZ` no container PostgreSQL
2. **Configurar no Node.js**: Definir `process.env.TZ` no início da aplicação
3. **Manter a configuração centralizada**: Usar a variável `DB_TIMEZONE` do arquivo de configuração para referência

### Exemplo de Implementação

```typescript
// src/main.ts
import { env } from './config/env';

// Configurar timezone do Node.js
process.env.TZ = env.DB_TIMEZONE;

async function bootstrap() {
  // ... resto da configuração da aplicação
}
```

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    environment:
      - TZ=America/Sao_Paulo
      - PGTZ=America/Sao_Paulo
    # ... outras configurações
```

## Verificação

Para verificar se o timezone está configurado corretamente:

```sql
-- Verificar timezone do PostgreSQL
SHOW timezone;

-- Verificar timezone atual
SELECT now(), current_timestamp, localtimestamp;
```

## Considerações Importantes

1. **Consistência**: Mantenha o mesmo timezone em toda a stack (aplicação, banco, sistema operacional)
2. **UTC vs Local**: Para aplicações distribuídas, considere usar UTC no banco e converter na aplicação
3. **Daylight Saving Time**: Timezones como 'America/Sao_Paulo' lidam automaticamente com horário de verão
4. **Logs**: Certifique-se de que os logs também usem o timezone correto

## Referências

- [TypeORM DataSource Options](https://typeorm.io/data-source-options)
- [PostgreSQL Timezone Documentation](https://www.postgresql.org/docs/current/datetime-config-files.html)
- [Node.js Process Environment](https://nodejs.org/api/process.html#process_process_env)