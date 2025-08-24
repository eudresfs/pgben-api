# Sistema de Download em Lote de Documentos

Este sistema permite aos usuários baixar múltiplos documentos de forma assíncrona, organizados em um arquivo ZIP.

## Funcionalidades

### 📦 Download em Lote
- Download assíncrono de múltiplos documentos
- Geração automática de arquivo ZIP
- Filtros avançados por tipo, data e outros critérios
- Controle de progresso em tempo real
- Limite de documentos por job (configurável)

### 🔄 Gerenciamento de Jobs
- Criação e rastreamento de jobs de download
- Status em tempo real (pending, processing, completed, failed, cancelled)
- Cancelamento de jobs em andamento
- Listagem de jobs do usuário
- Limpeza automática de jobs antigos

### 🛡️ Segurança e Controle
- Permissão específica: `documento.download_lote`
- Isolamento por usuário (cada usuário só vê seus próprios jobs)
- Validação de filtros e parâmetros
- Logs detalhados de operações

### 🧹 Limpeza Automática
- Remoção automática de jobs antigos (configurável)
- Limpeza de arquivos temporários
- Agendamento via cron jobs
- Relatórios de limpeza

## Endpoints da API

### POST `/documentos/download-lote`
Inicia um novo job de download em lote.

**Body:**
```json
{
  "tipos": ["CPF", "RG"],
  "dataInicio": "2024-01-01T00:00:00.000Z",
  "dataFim": "2024-12-31T23:59:59.999Z",
  "unidadeId": 123,
  "usuarioId": 456,
  "tags": ["importante", "urgente"]
}
```

**Response:**
```json
{
  "jobId": "batch_1234567890_abc123",
  "status": "pending",
  "statusUrl": "/documentos/download-lote/batch_1234567890_abc123/status",
  "estimativa": {
    "totalDocumentos": 150,
    "tamanhoEstimado": "45.2 MB"
  }
}
```

### GET `/documentos/download-lote/:jobId/status`
Verifica o status de um job específico.

**Response:**
```json
{
  "jobId": "batch_1234567890_abc123",
  "status": "processing",
  "progresso": {
    "processados": 75,
    "total": 150,
    "percentual": 50,
    "tamanhoAtual": "22.6 MB"
  },
  "criadoEm": "2024-01-15T10:30:00.000Z",
  "atualizadoEm": "2024-01-15T10:35:00.000Z",
  "downloadUrl": null
}
```

### GET `/documentos/download-lote/:jobId/download`
Baixa o arquivo ZIP gerado (apenas para jobs completos).

**Response:** Stream do arquivo ZIP

### GET `/documentos/download-lote/meus-jobs`
Lista todos os jobs do usuário autenticado.

**Query Parameters:**
- `status`: Filtrar por status (pending, processing, completed, failed, cancelled)
- `limite`: Número máximo de resultados (padrão: 50)
- `pagina`: Página dos resultados (padrão: 1)

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "batch_1234567890_abc123",
      "status": "completed",
      "criadoEm": "2024-01-15T10:30:00.000Z",
      "completadoEm": "2024-01-15T10:45:00.000Z",
      "totalDocumentos": 150,
      "tamanhoFinal": "43.8 MB"
    }
  ],
  "total": 1,
  "pagina": 1,
  "totalPaginas": 1
}
```

### DELETE `/documentos/download-lote/:jobId`
Cancela um job em andamento.

**Response:**
```json
{
  "sucesso": true,
  "mensagem": "Job cancelado com sucesso"
}
```

## Configuração

### Variáveis de Ambiente

```env
# Diretório para arquivos temporários
DOWNLOAD_LOTE_TEMP_DIR=./temp/download-lote

# Limite máximo de documentos por job
DOWNLOAD_LOTE_MAX_DOCUMENTOS=1000

# Tempo de vida dos jobs em horas
DOWNLOAD_LOTE_TTL_HORAS=24

# Intervalo de limpeza automática (cron)
DOWNLOAD_LOTE_CLEANUP_CRON=0 2 * * *

# Tamanho máximo do arquivo ZIP em MB
DOWNLOAD_LOTE_MAX_SIZE_MB=500
```

### Permissões

Adicione a permissão `documento.download_lote` aos perfis que devem ter acesso:

```sql
INSERT INTO permissions (name, description, active) 
VALUES ('documento.download_lote', 'Download em lote de documentos', true);
```

## Arquitetura

### Componentes Principais

1. **DocumentoBatchService**
   - Gerenciamento de jobs de download
   - Processamento assíncrono
   - Geração de arquivos ZIP

2. **DocumentoBatchSchedulerService**
   - Limpeza automática de jobs antigos
   - Remoção de arquivos temporários
   - Agendamento via cron

3. **DocumentoBatchController**
   - Endpoints da API REST
   - Validação de entrada
   - Controle de acesso

### Fluxo de Processamento

1. **Criação do Job**
   - Validação dos filtros
   - Estimativa de documentos e tamanho
   - Geração de ID único
   - Armazenamento em memória/cache

2. **Processamento Assíncrono**
   - Busca de documentos por lotes
   - Download de arquivos do storage
   - Adição ao arquivo ZIP
   - Atualização do progresso

3. **Finalização**
   - Salvamento do arquivo ZIP
   - Atualização do status
   - Notificação (opcional)

4. **Limpeza**
   - Remoção automática após TTL
   - Limpeza de arquivos temporários
   - Logs de auditoria

## Monitoramento

### Logs

O sistema gera logs detalhados para:
- Criação de jobs
- Progresso de processamento
- Erros e falhas
- Operações de limpeza

### Métricas

- Número de jobs ativos
- Taxa de sucesso/falha
- Tempo médio de processamento
- Uso de espaço em disco
- Performance de download

## Limitações e Considerações

### Limitações Técnicas
- Máximo de 1000 documentos por job (configurável)
- Tamanho máximo do ZIP: 500MB (configurável)
- TTL padrão: 24 horas
- Processamento sequencial (não paralelo)

### Considerações de Performance
- Jobs grandes podem consumir bastante memória
- Arquivos temporários ocupam espaço em disco
- Network I/O intensivo durante o download
- CPU intensivo durante compressão ZIP

### Recomendações
- Monitore o uso de disco regularmente
- Configure limpeza automática adequada
- Implemente alertas para jobs com falha
- Considere usar storage distribuído para arquivos grandes

## Troubleshooting

### Problemas Comuns

**Job fica "stuck" em processing:**
- Verifique logs de erro
- Reinicie o serviço se necessário
- Implemente timeout para jobs

**Espaço em disco insuficiente:**
- Execute limpeza manual
- Ajuste configurações de TTL
- Monitore uso de disco

**Performance lenta:**
- Verifique latência do storage
- Otimize queries de busca
- Considere processamento em lotes menores

**Falhas de permissão:**
- Verifique se usuário tem permissão `documento.download_lote`
- Confirme configuração de guards
- Valide tokens JWT

## Desenvolvimento

### Executar Testes

```bash
# Testes unitários
npm run test documento-batch

# Testes de integração
npm run test:e2e documento-batch

# Coverage
npm run test:cov documento-batch
```

### Estrutura de Arquivos

```
src/modules/documento/
├── controllers/
│   └── documento.controller.ts
├── services/
│   ├── documento-batch.service.ts
│   └── documento-batch-scheduler.service.ts
├── dto/
│   ├── batch-download.dto.ts
│   ├── batch-status.dto.ts
│   └── batch-job.dto.ts
├── interfaces/
│   └── batch-job.interface.ts
└── tests/
    ├── documento-batch.service.spec.ts
    └── documento-batch-scheduler.service.spec.ts
```

### Contribuindo

1. Siga os padrões de código existentes
2. Adicione testes para novas funcionalidades
3. Atualize documentação quando necessário
4. Use TypeScript strict mode
5. Implemente logs adequados

## Roadmap

### Próximas Funcionalidades
- [ ] Processamento paralelo de documentos
- [ ] Notificações por email/webhook
- [ ] Compressão avançada (diferentes algoritmos)
- [ ] Suporte a filtros mais complexos
- [ ] Dashboard de monitoramento
- [ ] API de estatísticas
- [ ] Integração com sistemas de fila (Redis/Bull)
- [ ] Suporte a múltiplos formatos de arquivo
- [ ] Criptografia de arquivos ZIP
- [ ] Assinatura digital de arquivos

### Melhorias de Performance
- [ ] Cache de metadados de documentos
- [ ] Streaming de arquivos grandes
- [ ] Compressão incremental
- [ ] Otimização de queries de banco
- [ ] Pool de conexões otimizado
- [ ] Balanceamento de carga para jobs