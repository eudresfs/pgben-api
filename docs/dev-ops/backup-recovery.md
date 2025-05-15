# Documentação de Backup e Disaster Recovery - PGBen

## Introdução

Este documento descreve os procedimentos de backup e recuperação (disaster recovery) implementados para o PGBen. A estratégia de backup foi projetada para garantir a integridade e disponibilidade dos dados do sistema, incluindo o banco de dados PostgreSQL e os arquivos armazenados no MinIO.

## Visão Geral da Solução

A solução de backup e recuperação do PGBen inclui:

1. **Backup automatizado** do banco de dados PostgreSQL e dos buckets do MinIO
2. **Verificação periódica** da integridade dos backups
3. **Procedimentos de recuperação** para diferentes cenários de falha
4. **Política de retenção** para gerenciamento do espaço em disco
5. **Monitoramento e alertas** para falhas no processo de backup

## Componentes da Solução

### Scripts de Backup

- **postgres-backup.sh**: Realiza o backup completo do banco de dados PostgreSQL
- **minio-backup.sh**: Realiza o backup dos buckets do MinIO
- **verify-backups.sh**: Verifica a integridade dos backups e gera relatórios
- **restore.sh**: Restaura backups do PostgreSQL e MinIO em caso de desastre

### Configurações Kubernetes

- **postgres-backup-cronjob.yaml**: CronJob para execução automática do backup do PostgreSQL
- **minio-backup-cronjob.yaml**: CronJob para execução automática do backup do MinIO
- **verify-backups-cronjob.yaml**: CronJob para verificação periódica da integridade dos backups
- **backup-pvc.yaml**: PersistentVolumeClaim para armazenamento dos backups
- **backup-scripts-configmap.yaml**: ConfigMap contendo os scripts de backup

## Cronograma de Backup

| Componente | Frequência | Horário | Retenção |
|------------|------------|---------|----------|
| PostgreSQL | Diária | 02:00 | 30 dias |
| MinIO | Diária | 03:00 | 30 dias |
| Verificação | Semanal | Segunda-feira, 08:00 | N/A |

## Procedimentos de Backup

### Backup Manual do PostgreSQL

Para realizar um backup manual do banco de dados PostgreSQL:

```bash
# Acesse o pod do PostgreSQL
kubectl exec -it <postgres-pod-name> -n pgben -- bash

# Execute o script de backup
PGBEN_DB_NAME=pgben \
PGBEN_DB_USER=postgres \
PGBEN_DB_HOST=localhost \
PGBEN_DB_PORT=5432 \
PGBEN_DB_PASS=<senha> \
PGBEN_BACKUP_DIR=/backup/postgres \
PGBEN_RETENTION_DAYS=30 \
/scripts/postgres-backup.sh
```

### Backup Manual do MinIO

Para realizar um backup manual dos buckets do MinIO:

```bash
# Acesse o pod do MinIO Client
kubectl exec -it <minio-client-pod-name> -n pgben -- bash

# Execute o script de backup
PGBEN_MINIO_HOST=minio:9000 \
PGBEN_MINIO_ACCESS_KEY=<access-key> \
PGBEN_MINIO_SECRET_KEY=<secret-key> \
PGBEN_MINIO_BACKUP_DIR=/backup/minio \
PGBEN_RETENTION_DAYS=30 \
/scripts/minio-backup.sh
```

### Verificação Manual dos Backups

Para verificar manualmente a integridade dos backups:

```bash
# Execute o script de verificação
kubectl exec -it <verify-pod-name> -n pgben -- bash

PGBEN_BACKUP_DIR=/backup/postgres \
PGBEN_MINIO_BACKUP_DIR=/backup/minio \
PGBEN_VERIFY_DAYS=7 \
PGBEN_ADMIN_EMAIL=admin@semtas.natal.rn.gov.br \
/scripts/verify-backups.sh
```

## Procedimentos de Recuperação

### Recuperação do PostgreSQL

Para restaurar o banco de dados PostgreSQL a partir de um backup:

```bash
# Listar backups disponíveis
kubectl exec -it <restore-pod-name> -n pgben -- /scripts/restore.sh --list

# Restaurar um backup específico
kubectl exec -it <restore-pod-name> -n pgben -- /scripts/restore.sh --postgres <nome-do-arquivo-de-backup>

# Restaurar o backup mais recente
kubectl exec -it <restore-pod-name> -n pgben -- /scripts/restore.sh --all
```

### Recuperação do MinIO

Para restaurar os buckets do MinIO a partir de um backup:

```bash
# Listar backups disponíveis
kubectl exec -it <restore-pod-name> -n pgben -- /scripts/restore.sh --list

# Restaurar um backup específico
kubectl exec -it <restore-pod-name> -n pgben -- /scripts/restore.sh --minio <nome-do-arquivo-de-backup>

# Restaurar o backup mais recente
kubectl exec -it <restore-pod-name> -n pgben -- /scripts/restore.sh --all
```

## Cenários de Recuperação

### Cenário 1: Corrupção de Dados no PostgreSQL

1. Identifique o último backup válido do PostgreSQL
2. Execute o procedimento de recuperação do PostgreSQL
3. Verifique a integridade dos dados restaurados
4. Reinicie os serviços dependentes do banco de dados

### Cenário 2: Perda de Arquivos no MinIO

1. Identifique o último backup válido do MinIO
2. Execute o procedimento de recuperação do MinIO
3. Verifique a integridade dos arquivos restaurados
4. Atualize os metadados no banco de dados, se necessário

### Cenário 3: Recuperação Completa do Sistema

1. Provisione nova infraestrutura (Kubernetes, volumes, etc.)
2. Instale os componentes básicos (PostgreSQL, MinIO)
3. Restaure o backup do PostgreSQL
4. Restaure o backup do MinIO
5. Verifique a integridade dos dados e arquivos restaurados
6. Implante os demais componentes do sistema
7. Realize testes de validação

## Monitoramento e Alertas

Os processos de backup são monitorados através de:

1. **Logs detalhados** armazenados nos diretórios de backup
2. **Histórico de backups** em formato CSV para análise de tendências
3. **Relatórios de verificação** enviados por e-mail semanalmente
4. **Alertas** em caso de falhas nos backups ou espaço em disco crítico

## Boas Práticas

1. **Teste regularmente** os procedimentos de recuperação
2. **Verifique periodicamente** a integridade dos backups
3. **Monitore o espaço em disco** disponível para backups
4. **Mantenha cópias externas** dos backups mais importantes
5. **Documente alterações** nos procedimentos de backup e recuperação

## Troubleshooting

### Problema: Falha no Backup do PostgreSQL

Possíveis causas:
- Credenciais incorretas
- Banco de dados indisponível
- Espaço em disco insuficiente

Solução:
1. Verifique os logs em `/backup/postgres/backup-log.txt`
2. Corrija o problema identificado
3. Execute o backup manualmente para verificar a solução

### Problema: Falha no Backup do MinIO

Possíveis causas:
- Credenciais incorretas
- Servidor MinIO indisponível
- Espaço em disco insuficiente

Solução:
1. Verifique os logs em `/backup/minio/backup-log.txt`
2. Corrija o problema identificado
3. Execute o backup manualmente para verificar a solução

### Problema: Falha na Restauração

Possíveis causas:
- Arquivo de backup corrompido
- Permissões insuficientes
- Espaço em disco insuficiente

Solução:
1. Verifique a integridade do arquivo de backup
2. Tente um backup mais antigo
3. Verifique as permissões e o espaço em disco disponível

## Contatos

Em caso de problemas com os procedimentos de backup e recuperação, entre em contato com:

- **Equipe de Infraestrutura**: infra@semtas.natal.rn.gov.br
- **Administrador de Banco de Dados**: dba@semtas.natal.rn.gov.br
- **Suporte 24/7**: suporte@semtas.natal.rn.gov.br | Tel: (84) 3232-XXXX
