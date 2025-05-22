# Catálogo de Permissões - Módulo de Relatórios

## Visão Geral

Este documento define as permissões granulares para o módulo de Relatórios, seguindo o esquema de nomenclatura `modulo.recurso.operacao` estabelecido. O módulo de Relatórios é importante para a geração de informações gerenciais no sistema PGBen, permitindo a visualização consolidada de dados para tomada de decisão e análise.

## Recursos Identificados

No módulo de Relatórios, identificamos os seguintes recursos principais:

1. **relatorio.beneficio** - Relatórios relacionados a benefícios
2. **relatorio.solicitacao** - Relatórios relacionados a solicitações
3. **relatorio.atendimento** - Relatórios relacionados a atendimentos
4. **relatorio.exportacao** - Operações de exportação de relatórios

## Permissões Detalhadas

### Relatórios de Benefícios

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `relatorio.beneficio.concedidos` | Gerar relatório de benefícios concedidos | GET /v1/relatorios/beneficios-concedidos |

### Relatórios de Solicitações

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `relatorio.solicitacao.por.status` | Gerar relatório de solicitações por status | GET /v1/relatorios/solicitacoes-por-status |

### Relatórios de Atendimentos

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `relatorio.atendimento.por.unidade` | Gerar relatório de atendimentos por unidade | GET /v1/relatorios/atendimentos-por-unidade |

### Exportação de Relatórios

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `relatorio.exportacao.pdf` | Exportar relatórios em formato PDF | Parâmetro format=pdf nos endpoints |
| `relatorio.exportacao.excel` | Exportar relatórios em formato Excel | Parâmetro format=excel nos endpoints |
| `relatorio.exportacao.csv` | Exportar relatórios em formato CSV | Parâmetro format=csv nos endpoints |

## Permissões Compostas

Além das permissões individuais, definimos também algumas permissões compostas:

| Permissão | Descrição | Permissões Incluídas |
|-----------|-----------|----------------------|
| `relatorio.*` | Todas as permissões do módulo de relatórios | Todas listadas acima |
| `relatorio.beneficio.*` | Todas as permissões de relatórios de benefícios | `relatorio.beneficio.concedidos` |
| `relatorio.solicitacao.*` | Todas as permissões de relatórios de solicitações | `relatorio.solicitacao.por.status` |
| `relatorio.atendimento.*` | Todas as permissões de relatórios de atendimentos | `relatorio.atendimento.por.unidade` |
| `relatorio.exportacao.*` | Todas as permissões de exportação | `relatorio.exportacao.pdf`, `relatorio.exportacao.excel`, `relatorio.exportacao.csv` |

## Considerações de Segurança

1. **Escopo de Dados**: Os relatórios devem respeitar o escopo de acesso do usuário:
   - Administradores podem ver relatórios de todas as unidades e cidadãos
   - Gestores podem ver relatórios de suas unidades e unidades subordinadas
   - Técnicos podem ver apenas relatórios relacionados à sua unidade

2. **Anonimização de Dados**: Para certos tipos de relatórios, especialmente quando exportados ou compartilhados, considerar a anonimização de dados pessoais sensíveis conforme exigido pela LGPD.

3. **Auditoria**: Todas as operações de geração de relatórios devem ser registradas pelo middleware de auditoria, incluindo:
   - Usuário que gerou o relatório
   - Tipo de relatório gerado
   - Parâmetros utilizados (período, filtros)
   - Formato de exportação

4. **Limitação de Volume**: Implementar limites para o volume de dados que pode ser exportado em uma única operação, para evitar sobrecarga do sistema e vazamento em massa de dados.

5. **Proteção contra Inferência**: Considerar proteções contra ataques de inferência, onde múltiplas consultas com diferentes filtros poderiam ser usadas para deduzir informações sobre indivíduos específicos.

6. **Watermarking**: Para relatórios em PDF, considerar a adição de marcas d'água com informações do usuário que gerou o relatório e timestamp, para fins de rastreabilidade.

## Regras de Negócio Adicionais

1. **Períodos Máximos**: Limitar o período máximo que pode ser consultado em um único relatório (por exemplo, máximo de 12 meses).

2. **Filtros Obrigatórios**: Exigir que todos os relatórios tenham pelo menos os filtros de data de início e data de fim.

3. **Agregação de Dados**: Para relatórios que envolvam dados sensíveis, implementar um limite mínimo de agregação (por exemplo, mínimo de 5 registros por grupo).

4. **Restrições Temporais**: Permitir a geração de relatórios apenas em horários específicos ou limitar o número de relatórios complexos gerados simultaneamente.

## Integração com Outros Módulos

As permissões deste módulo se relacionam com outros módulos:

1. **Integração com Módulo de Unidades**: O acesso a relatórios por unidade deve respeitar a hierarquia definida no módulo de Unidades.

2. **Integração com Módulo de Documento**: Para relatórios que podem ser exportados como arquivos, deve haver integração com as políticas de segurança do módulo de Documento.

3. **Integração com Módulo de Auditoria**: Todos os acessos a relatórios devem ser registrados no sistema de auditoria, especialmente aqueles contendo dados pessoais.
