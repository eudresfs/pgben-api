# Guia de Implementação - Sistema de Download em Lote de Documentos

## 📋 Visão Geral

Este guia fornece instruções completas para implementar e configurar o sistema de download em lote de documentos no PGBen.

## 🚀 Implementação Realizada

### Arquivos Criados/Modificados

#### 1. **Estrutura de Arquivos**
```
src/modules/documento/
├── services/
│   └── batch-download/
│       ├── documento-batch.service.ts
│       ├── documento-batch-scheduler.service.ts
│       ├── documento-batch.service.spec.ts
│       ├── documento-batch-scheduler.service.spec.ts
│       ├── index.ts
│       ├── controllers/
│       │   └── documento-batch.controller.ts
│       ├── dto/
│       │   └── batch-download.dto.ts
│       ├── entities/
│       │   └── documento-batch-job.entity.ts
│       └── interfaces/
│           └── documento-batch.interface.ts
```

#### 2. **Serviços Principais**
- `src/modules/documento/services/batch-download/documento-batch.service.ts` - Serviço principal para download em lote
- `src/modules/documento/services/batch-download/documento-batch-scheduler.service.ts` - Agendador para limpeza automática

#### 3. **Controllers e DTOs**
- `src/modules/documento/services/batch-download/controllers/documento-batch.controller.ts` - Endpoints da API
- `src/modules/documento/services/batch-download/dto/batch-download.dto.ts` - DTOs para validação

#### 4. **Entidades**
- `src/modules/documento/services/batch-download/entities/documento-batch-job.entity.ts` - Entidade do job de download

#### 5. **Interfaces**
- `src/modules/documento/services/batch-download/interfaces/documento-batch.interface.ts` - Interfaces e tipos

#### 6. **Testes**
- `src/modules/documento/services/batch-download/documento-batch.service.spec.ts`
- `src/modules/documento/services/batch-download/documento-batch-scheduler.service.spec.ts`

#### 6. **Migrations**
- `src/database/migrations/1704067250000-CreateDocumentoBatchJobsTable.ts` - Tabela de jobs

#### 7. **Configurações**
- Atualizações em `src/config/env.ts` - Variáveis de ambiente
- Atualizações em `.env.example` - Exemplo de configuração
- Atualizações em `src/modules/documento/documento.module.ts` - Registro dos serviços
- Atualizações em `src/app.module.ts` - Configuração do ScheduleModule

#### 8. **Permissões**
- `src/database/seeds/permission-documento.seed.ts` - Nova permissão `documento.download_lote`

#### 9. **Documentação**
- `README-download-lote.md` - Documentação técnica detalhada

## 🔧 Configuração e Execução

### Passo 1: Configurar Variáveis de Ambiente

1. **Copie as configurações do `.env.example` para seu `.env`:**

```bash
# ========================================
# CONFIGURAÇÕES DE DOWNLOAD EM LOTE DE DOCUMENTOS
# ========================================
# Diretório para arquivos temporários de download em lote
DOWNLOAD_LOTE_TEMP_DIR=./temp/download-lote

# Limite máximo de documentos por job de download
DOWNLOAD_LOTE_MAX_DOCUMENTOS=1000

# Tempo de vida dos jobs em horas
DOWNLOAD_LOTE_TTL_HORAS=24

# Agendamento da limpeza automática (formato cron)
DOWNLOAD_LOTE_CLEANUP_CRON=0 2 * * *

# Tamanho máximo do arquivo ZIP gerado em MB
DOWNLOAD_LOTE_MAX_SIZE_MB=500

# Número de documentos processados por lote
DOWNLOAD_LOTE_BATCH_SIZE=50

# Timeout para operações de download em millisegundos
DOWNLOAD_LOTE_TIMEOUT_MS=300000
```

### Passo 2: Executar Migration

1. **Verificar migrations pendentes:**
```bash
npm run migration:show
```

2. **Executar a nova migration:**
```bash
npm run migration:run
```

3. **Verificar se a migration foi aplicada:**
```bash
# Conectar ao banco e verificar a tabela
psql -U seu_usuario -d pgben_db
\dt documento_batch_jobs
```

### Passo 3: Executar Seeds de Permissões

1. **Executar seeds para criar a nova permissão:**
```bash
npm run seed:direct
```

### Passo 4: Criar Diretório Temporário

1. **Criar o diretório configurado:**
```bash
# Windows
mkdir temp\download-lote

# Linux/Mac
mkdir -p temp/download-lote
```

2. **Configurar permissões (Linux/Mac):**
```bash
chmod 755 temp/download-lote
```

### Passo 5: Reiniciar a Aplicação

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run start:prod
```

## 🧪 Testando a Implementação

### 1. **Executar Testes Unitários**

```bash
# Testar serviços de download em lote
npm test -- --testPathPattern=documento-batch

# Testar com coverage
npm run test:cov -- --testPathPattern=documento-batch
```

### 2. **Testar Endpoints da API**

#### Iniciar Download em Lote
```bash
curl -X POST http://localhost:3000/api/v1/documentos/download-lote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "filtros": {
      "dataInicio": "2024-01-01",
      "dataFim": "2024-12-31",
      "tipos": ["CERTIDAO_NASCIMENTO"]
    }
  }'
```

#### Verificar Status do Job
```bash
curl -X GET http://localhost:3000/api/v1/documentos/download-lote/JOB_ID/status \
  -H "Authorization: Bearer SEU_TOKEN"
```

#### Listar Jobs do Usuário
```bash
curl -X GET http://localhost:3000/api/v1/documentos/download-lote/meus-jobs \
  -H "Authorization: Bearer SEU_TOKEN"
```

### 3. **Verificar Logs**

```bash
# Verificar logs da aplicação
tail -f logs/application.log

# Verificar logs específicos do download em lote
grep "DocumentoBatch" logs/application.log
```

## 🔍 Monitoramento e Troubleshooting

### Verificar Status do Sistema

1. **Verificar jobs no banco de dados:**
```sql
SELECT 
  id,
  status,
  total_documentos,
  documentos_processados,
  progresso_percentual,
  created_at,
  data_expiracao
FROM documento_batch_jobs 
ORDER BY created_at DESC 
LIMIT 10;
```

2. **Verificar arquivos temporários:**
```bash
# Windows
dir temp\download-lote

# Linux/Mac
ls -la temp/download-lote/
```

3. **Verificar agendamento de limpeza:**
```bash
# Verificar se o cron está configurado corretamente
# Os logs devem mostrar execução da limpeza automática
grep "limpeza automática" logs/application.log
```

### Problemas Comuns e Soluções

#### 1. **Migration não executa**
```bash
# Verificar conexão com banco
npm run db:check

# Verificar status das migrations
npm run migration:show

# Forçar execução se necessário
npm run migration:run
```

#### 2. **Diretório temporário não encontrado**
```bash
# Criar diretório manualmente
mkdir -p temp/download-lote

# Verificar permissões
ls -la temp/
```

#### 3. **Jobs ficam em status 'processando'**
```sql
-- Verificar jobs órfãos
SELECT * FROM documento_batch_jobs 
WHERE status = 'processando' 
AND data_inicio < NOW() - INTERVAL '1 hour';

-- Cancelar jobs órfãos se necessário
UPDATE documento_batch_jobs 
SET status = 'erro', erro_detalhes = 'Job órfão cancelado automaticamente'
WHERE status = 'processando' 
AND data_inicio < NOW() - INTERVAL '1 hour';
```

#### 4. **Limpeza automática não funciona**
```bash
# Verificar se o ScheduleModule está configurado
grep "ScheduleModule" src/app.module.ts

# Executar limpeza manual
curl -X POST http://localhost:3000/api/v1/documentos/download-lote/limpeza \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

## 📊 Métricas e Performance

### Monitoramento Recomendado

1. **Métricas de Jobs:**
   - Número de jobs criados por dia
   - Tempo médio de processamento
   - Taxa de sucesso/erro
   - Tamanho médio dos arquivos gerados

2. **Métricas de Sistema:**
   - Uso de disco no diretório temporário
   - Uso de memória durante processamento
   - Tempo de resposta dos endpoints

3. **Alertas Recomendados:**
   - Jobs em erro por mais de 1 hora
   - Diretório temporário com mais de 80% de uso
   - Mais de 10 jobs simultâneos

## 🔐 Segurança

### Validações Implementadas

1. **Autenticação:** Todos os endpoints requerem token JWT válido
2. **Autorização:** Permissão `documento.download_lote` obrigatória
3. **Isolamento:** Usuários só acessam seus próprios jobs
4. **Validação:** Filtros são validados antes do processamento
5. **Sanitização:** Nomes de arquivos são sanitizados
6. **Limitações:** Limites de documentos e tamanho de arquivo

### Recomendações Adicionais

1. **Rate Limiting:** Configure limites por usuário/IP
2. **Auditoria:** Monitore downloads em lote via logs de auditoria
3. **Backup:** Considere backup dos arquivos temporários importantes
4. **Criptografia:** Considere criptografar arquivos ZIP sensíveis

## 🚀 Próximos Passos

1. **Implementar notificações em tempo real** via WebSocket/SSE
2. **Adicionar compressão avançada** para arquivos grandes
3. **Implementar cache** para filtros frequentes
4. **Adicionar métricas** no Prometheus/Grafana
5. **Implementar retry automático** para jobs com erro
6. **Adicionar suporte a formatos** além de ZIP

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte os logs da aplicação
2. Verifique a documentação técnica em `README-download-lote.md`
3. Execute os testes para validar a implementação
4. Consulte o time de desenvolvimento

---

**Implementação concluída com sucesso! 🎉**

O sistema de download em lote está pronto para uso em produção, seguindo as melhores práticas de arquitetura, segurança e performance.