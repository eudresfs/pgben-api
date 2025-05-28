# Script de Migração - Consolidação de Determinação Judicial

## Contexto

Este documento contém os scripts e comandos necessários para executar a migração gradual dos módulos de determinação judicial conforme o plano de consolidação.

## Fase 1: Implementação do Serviço Consolidado ✅

### Arquivos Criados
- ✅ `src/modules/judicial/services/determinacao-judicial-consolidado.service.ts`
- ✅ `src/modules/solicitacao/services/determinacao-judicial-adapter.service.ts`

### Módulos Atualizados
- ✅ `src/modules/judicial/judicial.module.ts` - Adicionado serviço consolidado
- ✅ `src/modules/solicitacao/solicitacao.module.ts` - Adicionado adaptador

## Fase 2: Migração dos Controllers

### 2.1 Atualizar Controller do Módulo Judicial

```bash
# Backup do controller atual
cp src/modules/judicial/controllers/determinacao-judicial.controller.ts src/modules/judicial/controllers/determinacao-judicial.controller.ts.backup
```

**Alterações necessárias no controller judicial:**

```typescript
// Substituir injeção de dependência
// DE:
constructor(
  private readonly determinacaoJudicialService: DeterminacaoJudicialService,
) {}

// PARA:
constructor(
  private readonly determinacaoJudicialService: DeterminacaoJudicialConsolidadoService,
) {}
```

### 2.2 Atualizar Controller do Módulo Solicitação

```bash
# Backup do controller atual
cp src/modules/solicitacao/controllers/determinacao-judicial.controller.ts src/modules/solicitacao/controllers/determinacao-judicial.controller.ts.backup
```

**Alterações necessárias no controller de solicitação:**

```typescript
// Substituir injeção de dependência
// DE:
constructor(
  private readonly determinacaoJudicialService: DeterminacaoJudicialService,
) {}

// PARA:
constructor(
  private readonly determinacaoJudicialService: DeterminacaoJudicialAdapterService,
) {}
```

## Fase 3: Testes de Integração

### 3.1 Executar Testes Unitários

```bash
# Executar testes do módulo judicial
npm run test -- --testPathPattern=judicial

# Executar testes do módulo solicitação
npm run test -- --testPathPattern=solicitacao

# Executar todos os testes relacionados a determinação judicial
npm run test -- --testNamePattern="determinacao.*judicial"
```

### 3.2 Testes de Integração Manual

**Cenários de teste:**

1. **Criação de determinação judicial via módulo judicial**
   ```bash
   curl -X POST http://localhost:3000/api/judicial/determinacoes-judiciais \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "processo_judicial_id": "<id>",
       "numero_determinacao": "DET-2024-001",
       "tipo": "CUMPRIMENTO",
       "descricao": "Teste de migração",
       "data_determinacao": "2024-01-15",
       "data_prazo": "2024-02-15"
     }'
   ```

2. **Criação de determinação judicial via módulo solicitação**
   ```bash
   curl -X POST http://localhost:3000/api/solicitacoes/determinacoes-judiciais \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "solicitacao_id": "<id>",
       "numero_processo": "PROC-2024-001",
       "orgao_judicial": "Vara da Família",
       "comarca": "São Paulo",
       "juiz": "Dr. João Silva",
       "data_decisao": "2024-01-15",
       "descricao_decisao": "Teste de migração"
     }'
   ```

3. **Busca de determinações por solicitação**
   ```bash
   curl -X GET "http://localhost:3000/api/solicitacoes/<id>/determinacoes-judiciais" \
     -H "Authorization: Bearer <token>"
   ```

4. **Atualização de determinação judicial**
   ```bash
   curl -X PATCH "http://localhost:3000/api/judicial/determinacoes-judiciais/<id>" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "observacao": "Atualização via migração"
     }'
   ```

## Fase 4: Deprecação Gradual

### 4.1 Marcar Serviços Antigos como Deprecated

```typescript
// Em determinacao-judicial.service.ts (módulo judicial)
/**
 * @deprecated Use DeterminacaoJudicialConsolidadoService instead
 * Este serviço será removido na versão 2.0
 */
@Injectable()
export class DeterminacaoJudicialService {
  // ...
}

// Em determinacao-judicial.service.ts (módulo solicitação)
/**
 * @deprecated Use DeterminacaoJudicialAdapterService instead
 * Este serviço será removido na versão 2.0
 */
@Injectable()
export class DeterminacaoJudicialService {
  // ...
}
```

### 4.2 Atualizar Documentação

```bash
# Gerar nova documentação da API
npm run docs:generate

# Atualizar README com informações sobre a migração
echo "## Migração de Determinação Judicial" >> README.md
echo "Os serviços de determinação judicial foram consolidados." >> README.md
echo "Consulte docs/ADRs/plano-consolidacao-determinacao-judicial.md" >> README.md
```

## Fase 5: Limpeza (Futuro)

### 5.1 Remover Serviços Antigos (Após período de transição)

```bash
# Remover serviços antigos (CUIDADO: Executar apenas após confirmação)
# rm src/modules/judicial/services/determinacao-judicial.service.ts
# rm src/modules/solicitacao/services/determinacao-judicial.service.ts

# Atualizar módulos para remover referências aos serviços antigos
# Editar judicial.module.ts e solicitacao.module.ts
```

## Comandos de Verificação

### Verificar Compilação
```bash
# Verificar se o código compila sem erros
npm run build

# Verificar tipos TypeScript
npm run type-check
```

### Verificar Dependências
```bash
# Verificar se todas as dependências estão corretas
npm run lint

# Verificar imports não utilizados
npm run lint -- --fix
```

### Verificar Testes
```bash
# Executar todos os testes
npm run test

# Executar testes com coverage
npm run test:cov

# Executar testes e2e
npm run test:e2e
```

## Rollback (Se Necessário)

### Em caso de problemas, reverter alterações:

```bash
# Restaurar controllers originais
cp src/modules/judicial/controllers/determinacao-judicial.controller.ts.backup src/modules/judicial/controllers/determinacao-judicial.controller.ts
cp src/modules/solicitacao/controllers/determinacao-judicial.controller.ts.backup src/modules/solicitacao/controllers/determinacao-judicial.controller.ts

# Reverter alterações nos módulos
git checkout HEAD -- src/modules/judicial/judicial.module.ts
git checkout HEAD -- src/modules/solicitacao/solicitacao.module.ts

# Remover novos arquivos
rm src/modules/judicial/services/determinacao-judicial-consolidado.service.ts
rm src/modules/solicitacao/services/determinacao-judicial-adapter.service.ts
```

## Checklist de Validação

- [ ] Serviço consolidado criado e funcionando
- [ ] Adaptador criado e funcionando
- [ ] Módulos atualizados corretamente
- [ ] Controllers migrados
- [ ] Testes unitários passando
- [ ] Testes de integração passando
- [ ] Documentação atualizada
- [ ] Performance mantida ou melhorada
- [ ] Logs funcionando corretamente
- [ ] Tratamento de erros funcionando
- [ ] Transações funcionando corretamente

## Observações Importantes

1. **Backup**: Sempre fazer backup dos arquivos antes de modificar
2. **Testes**: Executar testes após cada alteração
3. **Gradual**: Implementar a migração de forma gradual
4. **Monitoramento**: Monitorar logs e performance após a migração
5. **Rollback**: Ter plano de rollback pronto em caso de problemas

## Próximos Passos

1. Executar Fase 2 (Migração dos Controllers)
2. Executar testes extensivos
3. Monitorar em ambiente de desenvolvimento
4. Planejar deploy em ambiente de produção
5. Documentar lições aprendidas