# Guia de Implementação para Consolidação das Migrations

## Introdução

Este documento fornece instruções detalhadas para implementar o plano de consolidação das migrations do sistema SEMTAS, conforme definido no documento de análise. O objetivo é reorganizar as migrations existentes em uma estrutura mais coesa e manutenível, sem perder funcionalidade ou dados.

## Pré-requisitos

- Backup completo do banco de dados
- Ambiente de desenvolvimento configurado
- Permissões para modificar o código-fonte
- Conhecimento do TypeORM e PostgreSQL

## Etapas de Implementação

### 1. Preparação do Ambiente

```bash
# Criar diretório para migrations consolidadas
mkdir -p src/database/migrations-consolidadas

# Criar backup das migrations existentes
mkdir -p src/database/migrations-backup
cp src/database/migrations/*.ts src/database/migrations-backup/

# Executar script de análise para gerar template inicial
node scripts/consolidate-migrations.js
```

### 2. Consolidação da Estrutura Base

1. Criar a migration consolidada para a estrutura base:
   - Copiar o exemplo fornecido em `docs/Exemplos/1000000-CreateBaseStructure-Consolidado.ts`
   - Salvar como `src/database/migrations-consolidadas/1000000-CreateBaseStructure.ts`
   - Revisar e ajustar conforme necessário

2. Validar a migration consolidada:
   - Verificar se todas as colunas estão presentes
   - Confirmar que os índices e chaves estrangeiras estão corretos
   - Testar o método `down()` para garantir que reverte corretamente

### 3. Consolidação das Estruturas de Negócio

1. Consolidar a estrutura de cidadão:
   - Combinar `1710282000001-CreateCidadaoStructure.ts` e `1710282000008-UpdateTipoMoradiaEnum.ts`
   - Salvar como `src/database/migrations-consolidadas/1000001-CreateCidadaoStructure.ts`

2. Manter as estruturas de benefício e solicitação:
   - Copiar `1710282000002-CreateBeneficioStructure.ts` para `src/database/migrations-consolidadas/1000002-CreateBeneficioStructure.ts`
   - Copiar `1710282000003-CreateSolicitacaoStructure.ts` para `src/database/migrations-consolidadas/1000003-CreateSolicitacaoStructure.ts`

3. Consolidar a estrutura de demanda motivos:
   - Copiar `1710282000009-CreateDemandaMotivos.ts` para `src/database/migrations-consolidadas/1000004-CreateDemandaMotivos.ts`

### 4. Consolidação de Índices e Otimizações

1. Consolidar índices:
   - Combinar todos os índices de `1710282000004-AddIndicesCidadaosSolicitacoes.ts`
   - Salvar como `src/database/migrations-consolidadas/1000005-CreateIndicesEConstraints.ts`

2. Manter views e triggers:
   - Copiar `1710282000006-CreateViewsAndTriggers.ts` para `src/database/migrations-consolidadas/1000006-CreateViewsAndTriggers.ts`

3. Consolidar otimizações PostgreSQL:
   - Combinar `1710282000005-AddTablePartitioning.ts` e `1710282000007-AddPostgresOptimizations.ts`
   - Salvar como `src/database/migrations-consolidadas/1000007-AddPostgresOptimizations.ts`

### 5. Testes e Validação

1. Testar em ambiente de desenvolvimento:

```bash
# Limpar banco de dados de teste
npm run typeorm:drop

# Executar migrations consolidadas
NODE_ENV=development npm run typeorm:run

# Executar seeds para validar estrutura
npm run seed:run
```

2. Verificar integridade do banco de dados:
   - Confirmar que todas as tabelas foram criadas corretamente
   - Verificar se os índices e constraints estão presentes
   - Validar se as views e triggers estão funcionando

3. Testar funcionalidades da aplicação:
   - Executar testes automatizados
   - Realizar testes manuais das principais funcionalidades

### 6. Implementação em Produção

1. Preparar script de migração:

```bash
# Criar script de migração para produção
echo "#!/bin/bash" > scripts/migrate-production.sh
echo "# Backup do banco de dados" >> scripts/migrate-production.sh
echo "pg_dump -U \$DB_USER -h \$DB_HOST -d \$DB_NAME > backup_\$(date +%Y%m%d%H%M%S).sql" >> scripts/migrate-production.sh
echo "# Executar migrations consolidadas" >> scripts/migrate-production.sh
echo "NODE_ENV=production npm run typeorm:run" >> scripts/migrate-production.sh
chmod +x scripts/migrate-production.sh
```

2. Planejar janela de manutenção:
   - Comunicar a equipe sobre a atualização
   - Agendar horário com menor impacto para usuários
   - Preparar plano de rollback em caso de problemas

3. Executar migração em produção:
   - Realizar backup completo do banco
   - Executar script de migração
   - Validar funcionamento do sistema

## Verificação Pós-Implementação

### Checklist de Validação

- [ ] Todas as tabelas estão presentes e com estrutura correta
- [ ] Todos os índices e constraints estão funcionando
- [ ] Views e triggers estão operacionais
- [ ] Seeds executam sem erros
- [ ] Aplicação funciona normalmente
- [ ] Logs não mostram erros relacionados ao banco de dados

### Monitoramento

1. Monitorar performance do banco de dados:
   - Verificar tempo de resposta das consultas
   - Monitorar uso de CPU e memória
   - Observar comportamento em picos de uso

2. Monitorar logs da aplicação:
   - Verificar se há erros relacionados ao banco
   - Observar tempos de resposta da API
   - Identificar possíveis problemas de performance

## Rollback em Caso de Problemas

Se forem identificados problemas críticos após a implementação, siga estas etapas para rollback:

1. Parar a aplicação:
```bash
pm2 stop all # ou comando equivalente para seu ambiente
```

2. Restaurar backup do banco de dados:
```bash
psql -U $DB_USER -h $DB_HOST -d $DB_NAME < backup_YYYYMMDDHHMMSS.sql
```

3. Restaurar código-fonte original:
```bash
git checkout <commit_anterior>
npm install
```

4. Reiniciar a aplicação:
```bash
pm2 start all # ou comando equivalente para seu ambiente
```

## Documentação

Após a implementação bem-sucedida, atualize a documentação do projeto:

1. Atualizar README.md com informações sobre a nova estrutura
2. Documentar o processo de migração realizado
3. Atualizar diagramas de banco de dados
4. Revisar e atualizar documentação de API se necessário

---

## Apêndice: Mapeamento Detalhado de Migrations

| Migration Original | Nova Migration | Observações |
|--------------------|---------------|-------------|
| 1710282000000 | 1000000 | Incluir colunas de status e sigla em setor |
| 1710282000010, 1710282000011 | 1000000 | Consolidar em CreateBaseStructure |
| 1710282000012, 1710282000013 | 1000000 | Consolidar em CreateBaseStructure |
| 1710282000001 | 1000001 | Manter como está |
| 1710282000008 | 1000001 | Incorporar na estrutura de cidadão |
| 1710282000002 | 1000002 | Manter como está |
| 1710282000003 | 1000003 | Manter como está |
| 1710282000009 | 1000004 | Manter como está |
| 1710282000004 | 1000005 | Consolidar todos os índices |
| 1710282000006 | 1000006 | Manter como está |
| 1710282000005, 1710282000007 | 1000007 | Consolidar otimizações |