# ADR: Correção de Problemas de Integridade no MinIO

## Status
Implementado

## Contexto
Em produção, foram identificados logs recorrentes indicando falhas na verificação de integridade de arquivos no MinIO:

```
[Nest] 7  - 07/01/2025, 10:11:19 AM     LOG [MinioService] Arquivo default/OUTRO/1751364679159-ae561ad952e5cc88.txt enviado para o MinIO com sucesso 
[Nest] 7  - 07/01/2025, 10:11:19 AM   ERROR [MinioService] Integridade do arquivo default/OUTRO/1751364679159-ae561ad952e5cc88.txt comprometida 
[Nest] 7  - 07/01/2025, 10:11:19 AM   ERROR [MinioService] Erro ao baixar arquivo do MinIO: A integridade do documento foi comprometida. O hash não corresponde ao original.
```

## Problema Identificado
Após análise detalhada, foram identificadas as seguintes causas raiz:

1. **Configuração de Região Inconsistente**: O cliente MinIO não estava configurado com a região, mas o bucket era criado com região hardcoded 'us-east-1'
2. **Uso de Arquivo Temporário**: O método `fGetObject` criava arquivos temporários que podiam ter problemas de encoding ou corrupção
3. **Logs Insuficientes**: Falta de logs detalhados para debug de problemas de integridade

## Decisão
Implementar as seguintes correções no `MinioService`:

### 1. Configuração de Região
- Adicionar configuração de região no cliente MinIO
- Usar variável de ambiente `MINIO_REGION` (padrão: 'us-east-1')
- Aplicar a mesma região na criação de buckets

### 2. Substituição do Método de Download
- Substituir `fGetObject` por `getObject` com stream
- Eliminar dependência de arquivos temporários
- Processar dados diretamente em memória

### 3. Melhoria nos Logs
- Adicionar logs de debug detalhados
- Incluir informações de hash original vs calculado
- Registrar tamanhos de arquivo e status de criptografia

## Implementação

### Alterações no MinioService

```typescript
// Configuração do cliente com região
this.minioClient = new Minio.Client({
  endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
  port: this.configService.get<number>('MINIO_PORT', 9000),
  useSSL: useSSL,
  accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
  secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
  region: region, // Nova configuração
});

// Download usando stream em vez de arquivo temporário
const stream = await this.minioClient.getObject(this.bucketName, nomeArquivo);
const chunks: Buffer[] = [];
for await (const chunk of stream) {
  chunks.push(chunk);
}
const arquivoCriptografado = Buffer.concat(chunks);
```

### Configuração de Ambiente
Adicionada nova variável de ambiente:
```
MINIO_REGION=us-east-1
```

## Consequências

### Positivas
- Eliminação de problemas de integridade causados por inconsistência de região
- Redução de I/O desnecessário (sem arquivos temporários)
- Melhor observabilidade com logs detalhados
- Maior confiabilidade no armazenamento de documentos

### Neutras
- Pequeno aumento no uso de memória (processamento em stream)
- Necessidade de configurar MINIO_REGION em ambientes existentes

### Riscos Mitigados
- Corrupção de dados durante transferência
- Falhas de verificação de integridade
- Dificuldade de debug em problemas de storage

## Monitoramento
Após a implementação, monitorar:
- Redução de logs de erro de integridade
- Performance de upload/download
- Uso de memória durante operações de arquivo
- Logs de debug para validação das correções

## Data
07/01/2025

## Responsável
Arquiteto de Software - Correção de Integridade MinIO