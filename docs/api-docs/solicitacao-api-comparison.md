# Comparação entre APIs V1 e V2 do Módulo de Solicitação

## Resumo das Mudanças

A API V2 foi redesenhada para resolver conflitos de rotas, eliminar duplicações e criar uma estrutura hierárquica mais organizada e intuitiva.

## Principais Melhorias

### 1. Estrutura Hierárquica
- **V1**: Recursos espalhados em controllers separados sem hierarquia clara
- **V2**: Estrutura hierárquica com recursos organizados sob `/v2/solicitacao/:id/`

### 2. Eliminação de Duplicações
- **V1**: Operações de workflow duplicadas entre `SolicitacaoController` e `WorkflowSolicitacaoController`
- **V2**: Operações de workflow centralizadas em `WorkflowV2Controller`

### 3. Padronização de Rotas
- **V1**: Inconsistências entre kebab-case e camelCase
- **V2**: Padronização completa com kebab-case

### 4. Organização por Contexto
- **V1**: Recursos relacionados em controllers diferentes
- **V2**: Recursos agrupados logicamente por funcionalidade

## Mapeamento de Endpoints

### Solicitação Base

| V1 | V2 | Mudanças |
|----|----|----------|
| `GET /solicitacao` | `GET /v2/solicitacao` | Mantido |
| `POST /solicitacao` | `POST /v2/solicitacao` | Mantido |
| `GET /solicitacao/:id` | `GET /v2/solicitacao/:id` | Mantido |
| `PUT /solicitacao/:id` | `PUT /v2/solicitacao/:id` | Mantido |
| `GET /solicitacao/:id/historico` | `GET /v2/solicitacao/:id/historico` | Mantido |
| `POST /solicitacao/converter-papel` | `POST /v2/solicitacao/converter-papel` | Mantido |
| `GET /solicitacao/exportacao/csv` | `GET /v2/solicitacao/exportacao/csv` | Reorganizado |

### Workflow

| V1 | V2 | Mudanças |
|----|----|----------|
| `GET /solicitacao/workflow/:solicitacaoId/estados-possiveis` | `GET /v2/solicitacao/:id/workflow/estados-possiveis` | Hierárquico |
| `POST /solicitacao/workflow/:solicitacaoId/submeter` | `POST /v2/solicitacao/:id/workflow/submeter` | Hierárquico |
| `POST /solicitacao/workflow/:solicitacaoId/aprovar` | `POST /v2/solicitacao/:id/workflow/aprovar` | Hierárquico |
| `POST /solicitacao/workflow/:solicitacaoId/rejeitar` | `POST /v2/solicitacao/:id/workflow/rejeitar` | Hierárquico |
| `POST /solicitacao/workflow/:solicitacaoId/liberar` | `POST /v2/solicitacao/:id/workflow/liberar` | Hierárquico |
| `POST /solicitacao/workflow/:solicitacaoId/cancelar` | `POST /v2/solicitacao/:id/workflow/cancelar` | Hierárquico |
| `POST /solicitacao/workflow/:solicitacaoId/arquivar` | `POST /v2/solicitacao/:id/workflow/arquivar` | Hierárquico |
| `POST /solicitacao/workflow/:solicitacaoId/concluir` | `POST /v2/solicitacao/:id/workflow/concluir` | Hierárquico |
| `POST /solicitacao/workflow/:solicitacaoId/transicao/:estado` | `POST /v2/solicitacao/:id/workflow/transicao/:estado` | Hierárquico |

**Eliminadas duplicações:**
- `PUT /solicitacao/:id/submeter` → Consolidado em workflow
- `PUT /solicitacao/:id/avaliar` → Consolidado em workflow
- `PUT /solicitacao/:id/liberar` → Consolidado em workflow
- `PUT /solicitacao/:id/cancelar` → Consolidado em workflow

### Determinação Judicial

| V1 | V2 | Mudanças |
|----|----|----------|
| `POST /solicitacao/determinacao-judicial` | `POST /v2/solicitacao/:id/determinacao-judicial` | Hierárquico |
| `GET /solicitacao/determinacao-judicial/solicitacao/:solicitacaoId` | `GET /v2/solicitacao/:id/determinacao-judicial` | Simplificado |
| `GET /solicitacao/determinacao-judicial/:id` | `GET /v2/solicitacao/:id/determinacao-judicial/:determinacaoId` | Hierárquico |
| `PATCH /solicitacao/determinacao-judicial/:id` | `PATCH /v2/solicitacao/:id/determinacao-judicial/:determinacaoId` | Hierárquico |
| `DELETE /solicitacao/determinacao-judicial/:id` | `DELETE /v2/solicitacao/:id/determinacao-judicial/:determinacaoId` | Hierárquico |
| `PATCH /solicitacao/determinacao-judicial/:id/cumprir` | `POST /v2/solicitacao/:id/determinacao-judicial/:determinacaoId/cumprir` | Hierárquico |

**Eliminadas duplicações:**
- `POST /solicitacao/:id/determinacao-judicial` → Consolidado
- `DELETE /solicitacao/:id/determinacao-judicial` → Consolidado

### Processo Judicial

| V1 | V2 | Mudanças |
|----|----|----------|
| `POST /solicitacao/:id/processo-judicial` | `POST /v2/solicitacao/:id/processo-judicial` | Mantido hierárquico |
| `DELETE /solicitacao/:id/processo-judicial` | `DELETE /v2/solicitacao/:id/processo-judicial` | Mantido hierárquico |

### Pendências

| V1 | V2 | Mudanças |
|----|----|----------|
| `POST /solicitacao/pendencias` | `POST /v2/solicitacao/:id/pendencias` | Hierárquico |
| `GET /solicitacao/pendencias` | `GET /v2/solicitacao/pendencias` | Global |
| `GET /solicitacao/pendencias/:id` | `GET /v2/solicitacao/:id/pendencias/:pendenciaId` | Hierárquico |
| `PUT /solicitacao/pendencias/:pendenciaId/resolver` | `PUT /v2/solicitacao/:id/pendencias/:pendenciaId/resolver` | Hierárquico |
| `PUT /solicitacao/pendencias/:pendenciaId/cancelar` | `PUT /v2/solicitacao/:id/pendencias/:pendenciaId/cancelar` | Hierárquico |
| `GET /solicitacao/pendencias/solicitacao/:solicitacaoId` | `GET /v2/solicitacao/:id/pendencias` | Simplificado |
| `GET /solicitacao/pendencias/relatorios/vencidas` | `GET /v2/solicitacao/pendencias/vencidas` | Simplificado |

### Monitoramento

| V1 | V2 | Mudanças |
|----|----|----------|
| `POST /monitoramento-aluguel-social/registrar-visita` | `POST /v2/solicitacao/:id/monitoramento/visitas` | Hierárquico |
| `GET /monitoramento-aluguel-social/pendentes` | `GET /v2/solicitacao/monitoramento/pendentes` | Integrado |
| `GET /monitoramento-aluguel-social/alertas` | `GET /v2/solicitacao/monitoramento/alertas` | Integrado |
| `GET /monitoramento-aluguel-social/:id/status-monitoramento` | `GET /v2/solicitacao/:id/monitoramento/status` | Hierárquico |
| `GET /monitoramento-aluguel-social/:id/historico-visitas` | `GET /v2/solicitacao/:id/monitoramento/historico` | Hierárquico |
| `PATCH /monitoramento-aluguel-social/:id/visitas/:indice` | `PATCH /v2/solicitacao/:id/monitoramento/visitas/:indice` | Hierárquico |
| `DELETE /monitoramento-aluguel-social/:id/visitas/:indice` | `DELETE /v2/solicitacao/:id/monitoramento/visitas/:indice` | Hierárquico |

## Benefícios da V2

### 1. Hierarquia Clara
- Todos os recursos relacionados a uma solicitação estão sob `/v2/solicitacao/:id/`
- Facilita a compreensão da estrutura da API
- Melhora a experiência do desenvolvedor

### 2. Eliminação de Conflitos
- Não há mais rotas duplicadas ou conflitantes
- Cada operação tem um endpoint único e bem definido
- Reduz confusão sobre qual endpoint usar

### 3. Consistência
- Padronização completa de nomenclatura
- Estrutura previsível para todos os recursos
- Verbos HTTP apropriados para cada operação

### 4. Manutenibilidade
- Código mais organizado e fácil de manter
- Separação clara de responsabilidades
- Facilita adição de novos recursos

### 5. Documentação
- Swagger mais organizado com tags hierárquicas
- Documentação mais clara e navegável
- Exemplos mais consistentes

## Estratégia de Migração

### Fase 1: Implementação Paralela
- ✅ Implementar controllers V2 em paralelo aos V1
- ✅ Manter compatibilidade com V1 durante transição
- ✅ Documentar diferenças e benefícios

### Fase 2: Migração Gradual
- [ ] Atualizar clientes para usar endpoints V2
- [ ] Implementar redirecionamentos de V1 para V2
- [ ] Monitorar uso dos endpoints V1

### Fase 3: Deprecação
- [ ] Marcar endpoints V1 como deprecated
- [ ] Adicionar headers de deprecação
- [ ] Comunicar timeline de remoção

### Fase 4: Remoção
- [ ] Remover controllers V1
- [ ] Limpar código não utilizado
- [ ] Atualizar documentação final

## Considerações de Compatibilidade

### Breaking Changes
- Mudança na estrutura de URLs
- Alguns endpoints foram consolidados
- Parâmetros de rota reorganizados

### Compatibilidade Mantida
- Mesmos DTOs de entrada e saída
- Mesma lógica de negócio
- Mesmas permissões e validações

### Redirecionamentos Sugeridos
```typescript
// Exemplo de middleware de redirecionamento
@Controller('solicitacao/workflow')
export class WorkflowRedirectController {
  @All(':solicitacaoId/*')
  redirect(@Param('solicitacaoId') id: string, @Req() req: Request, @Res() res: Response) {
    const newPath = req.path.replace(`/solicitacao/workflow/${id}/`, `/v2/solicitacao/${id}/workflow/`);
    res.redirect(301, newPath);
  }
}
```

## Conclusão

A API V2 representa uma evolução significativa na organização e usabilidade dos endpoints do módulo de solicitação. A estrutura hierárquica, eliminação de duplicações e padronização tornam a API mais intuitiva, mantendo toda a funcionalidade existente.

A migração deve ser feita de forma gradual, permitindo que os clientes se adaptem às mudanças sem interrupção do serviço.
