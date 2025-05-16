# Estratégia de Armazenamento no MinIO

## Contexto
O PGBen necessita armazenar documentos de forma segura e escalável, garantindo conformidade com a LGPD e outros requisitos regulatórios.

## Decisão
Utilizar o MinIO como solução de armazenamento de objetos com as seguintes características:

### Estrutura de Buckets
- `pgben-documents`: Armazena documentos dos usuários
  - `/{userId}/comprovantes/` - Comprovantes de pagamento
  - `/{userId}/documentos/` - Documentos pessoais
  - `/{userId}/outros/` - Outros tipos de documentos

### Políticas de Segurança
- Criptografia em repouso habilitada
- Acesso baseado em políticas IAM
- Logs de auditoria para todas as operações
- Retenção configurada de acordo com a LGPD

### Padrões de Nomenclatura
- Nomes de arquivos no formato: `{timestamp}-{tipo}-{nome-original}.{ext}`
- Exemplo: `20250515-091500-comprovante-salario-0425.pdf`

### Metadados Obrigatórios
- `Content-Type`: Tipo MIME do arquivo
- `X-Amz-Meta-User-Id`: ID do usuário dono do arquivo
- `X-Amz-Meta-IsSensitive`: Indica se o arquivo contém dados sensíveis
- `X-Amz-Meta-Encryption`: Detalhes da criptografia (se aplicável)

### Testes
- Cobertura de testes unitários > 90%
- Testes de integração para operações críticas
- Testes de performance para cenários de carga

## Status
✅ Implementado

## Consequências
- **Positivas**:
  - Armazenamento escalável e durável
  - Conformidade com LGPD
  - Facilidade de backup e recuperação

- **Negativas**:
  - Curva de aprendizado para a equipe
  - Custo adicional de infraestrutura

## Referências
- [Documentação do MinIO](https://min.io/docs/minio/linux/index.html)
- [LGPD - Lei Geral de Proteção de Dados](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)

Última atualização: 2025-05-15