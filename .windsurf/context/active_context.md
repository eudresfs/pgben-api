# Contexto Ativo

## Projeto Atual
- **Nome**: PGBen Server
- **Tipo**: Backend API
- **Tecnologias Principais**: 
  - Node.js
  - TypeScript
  - NestJS
  - PostgreSQL
  - MinIO
  - Docker

## Tarefa Atual
- **Arquivo**: `src/shared/services/tests/minio.service.spec.ts`
- **Tipo**: Testes unitários e de integração
- **Objetivo**: Garantir a cobertura de testes para o serviço MinIO
- **Status**: Em andamento
  - ✅ Testes de upload/download de arquivos não sensíveis
  - ✅ Testes de upload/download de arquivos sensíveis com criptografia
  - ⏳ Testes de remoção de arquivos
  - ⏳ Testes de tratamento de erros

## Estado do Projeto
- **Fase Atual**: Testes automatizados
- **Próximos Passos**: 
  1. Completar testes unitários do MinioService (em andamento)
  2. Implementar testes de integração com o serviço de criptografia
  3. Configurar CI/CD para execução automática de testes
  4. Documentar padrões de uso do serviço MinIO

## Decisões Técnicas Recentes
- Estratégia de armazenamento no MinIO definida e documentada
- Padrões de nomenclatura e metadados estabelecidos
- Políticas de segurança implementadas

## Ambiente
- **Sistema Operacional**: Windows
- **Gerenciador de Pacotes**: npm
- **Banco de Dados**: PostgreSQL em container Docker
- **Armazenamento**: MinIO em container Docker

## Configurações Importantes
- **Porta da API**: 3000
- **Porta do MinIO**: 9000
- **Porta do PostgreSQL**: 5432
- **Modo**: Desenvolvimento

## Dependências Críticas
- @nestjs/common
- @nestjs/config
- minio
- typeorm
- @nestjs/typeorm

## Observações
- O projeto está configurado para usar variáveis de ambiente via .env
- Os testes devem ser executados em um ambiente isolado
- A cobertura de código é monitorada via SonarQube
