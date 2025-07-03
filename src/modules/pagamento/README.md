# Módulo de Pagamento - PGBEN

## Visão Geral

O módulo de pagamento é responsável por gerenciar todo o ciclo de vida dos pagamentos de benefícios sociais, implementando uma arquitetura robusta baseada em padrões SOLID e Strategy Pattern para cálculos específicos por tipo de benefício.

## Arquitetura

### Princípios Arquiteturais

- **Single Responsibility Principle (SRP)**: Cada classe tem uma responsabilidade específica
- **Open/Closed Principle (OCP)**: Extensível para novos tipos de benefício sem modificar código existente
- **Dependency Inversion Principle (DIP)**: Dependências baseadas em abstrações (interfaces)
- **Strategy Pattern**: Algoritmos de cálculo encapsulados em estratégias específicas

### Componentes Principais

```
src/modules/pagamento/
├── controllers/
│   └── pagamento.controller.ts
├── services/
│   ├── pagamento.service.ts              # Serviço principal
│   ├── pagamento-calculator.service.ts   # Calculadora central
│   └── beneficio-data.service.ts         # Provedor de dados
├── strategies/
│   ├── aluguel-social.strategy.ts        # Estratégia Aluguel Social
│   ├── cesta-basica.strategy.ts          # Estratégia Cesta Básica
│   ├── funeral.strategy.ts               # Estratégia Auxílio Funeral
│   └── natalidade.strategy.ts            # Estratégia Auxílio Natalidade
├── interfaces/
│   └── pagamento-calculator.interface.ts # Contratos e interfaces
├── entities/
│   └── pagamento.entity.ts
└── dtos/
    └── create-pagamento.dto.ts
```

## Strategy Pattern - Cálculo de Benefícios

### Conceito

Cada tipo de benefício possui regras específicas de cálculo implementadas através do Strategy Pattern, permitindo:

- **Extensibilidade**: Novos tipos de benefício podem ser adicionados facilmente
- **Manutenibilidade**: Lógica isolada por tipo de benefício
- **Testabilidade**: Cada estratégia pode ser testada independentemente

### Estratégias Implementadas

#### 1. Aluguel Social (`AluguelSocialStrategy`)
```typescript
// Características:
- Pagamento mensal recorrente
- Valor fixo por mês
- Considera dias úteis para liberação
- Vencimento no último dia do mês
```

#### 2. Cesta Básica (`CestaBasicaStrategy`)
```typescript
// Características:
- Pagamento mensal
- Valor baseado em configuração específica
- Liberação no primeiro dia útil do mês
- Vencimento flexível
```

#### 3. Auxílio Funeral (`FuneralStrategy`)
```typescript
// Características:
- Pagamento único
- Valor fixo configurável
- Liberação imediata (próximo dia útil)
- Sem recorrência
```

#### 4. Auxílio Natalidade (`NatalidadeStrategy`)
```typescript
// Características:
- Pagamento único por nascimento
- Valor baseado em tabela específica
- Liberação após validação de documentos
- Prazo de vencimento estendido
```

## Fluxo de Cálculo

### 1. Entrada de Dados
```typescript
interface DadosPagamento {
  solicitacaoId: string;
  beneficioId: string;
  valorTotal: number;
  dataInicio: Date;
  observacoes?: string;
}
```

### 2. Processamento
```typescript
// 1. PagamentoService recebe solicitação
// 2. Busca dados do benefício via BeneficioDataService
// 3. Delega cálculo para PagamentoCalculatorService
// 4. Calculator seleciona estratégia apropriada
// 5. Estratégia calcula parcelas e datas
// 6. Retorna resultado estruturado
```

### 3. Resultado
```typescript
interface ResultadoCalculoPagamento {
  parcelas: ParcelaPagamento[];
  valorTotal: number;
  quantidadeParcelas: number;
  dataInicio: Date;
  dataFim: Date;
  observacoes: string[];
}
```

## Serviços Auxiliares

### FeriadoService (Módulo Shared)
- Consulta API externa de feriados nacionais
- Cache de feriados para performance
- Cálculo de dias úteis
- Ajuste de datas para próximo dia útil

### BeneficioDataService
- Provedor de dados de benefício
- Acesso direto às entidades TipoBeneficio
- Evita dependência circular com BeneficioModule
- Interface IBeneficioDataProvider para desacoplamento

## Como Adicionar Nova Estratégia

### 1. Criar Nova Estratégia
```typescript
// src/modules/pagamento/strategies/novo-beneficio.strategy.ts
@Injectable()
export class NovoBeneficioStrategy implements IBeneficioCalculationStrategy {
  constructor(private readonly feriadoService: FeriadoService) {}

  async calcular(dados: DadosPagamento, beneficio: DadosBeneficio): Promise<ResultadoCalculoPagamento> {
    // Implementar lógica específica
  }

  getTipoBeneficio(): string {
    return 'NOVO_BENEFICIO';
  }
}
```

### 2. Registrar no Módulo
```typescript
// pagamento.module.ts
@Module({
  providers: [
    // ... outros providers
    NovoBeneficioStrategy,
  ],
})
export class PagamentoModule {}
```

### 3. Registrar no Calculator
```typescript
// pagamento-calculator.service.ts
private registrarEstrategias(): void {
  // ... outras estratégias
  this.estrategias.set('NOVO_BENEFICIO', this.novoBeneficioStrategy);
}
```

## Configuração e Uso

### Dependências
```typescript
// Módulos necessários
- SharedModule (para FeriadoService)
- TypeOrmModule (para entidades)
- HttpModule (para APIs externas)
```

### Exemplo de Uso
```typescript
// Gerar pagamentos para uma concessão
const resultado = await this.pagamentoService.gerarPagamentosParaConcessao(
  solicitacaoId,
  beneficioId,
  valorTotal,
  dataInicio,
  observacoes
);

console.log(`Geradas ${resultado.quantidadeParcelas} parcelas`);
console.log(`Valor total: R$ ${resultado.valorTotal}`);
```

## Testes

### Estrutura de Testes
```
test/
├── unit/
│   ├── strategies/
│   │   ├── aluguel-social.strategy.spec.ts
│   │   ├── cesta-basica.strategy.spec.ts
│   │   ├── funeral.strategy.spec.ts
│   │   └── natalidade.strategy.spec.ts
│   └── services/
│       ├── pagamento.service.spec.ts
│       └── pagamento-calculator.service.spec.ts
└── integration/
    └── pagamento.controller.spec.ts
```

### Executar Testes
```bash
# Testes unitários
npm run test:unit -- --testPathPattern=pagamento

# Testes de integração
npm run test:integration -- --testPathPattern=pagamento

# Coverage
npm run test:cov -- --testPathPattern=pagamento
```

## Monitoramento e Logs

### Métricas Importantes
- Tempo de cálculo por estratégia
- Taxa de erro por tipo de benefício
- Volume de pagamentos gerados
- Performance de consultas a feriados

### Logs Estruturados
```typescript
// Exemplo de log
this.logger.log({
  action: 'calcular_pagamento',
  beneficioTipo: 'ALUGUEL_SOCIAL',
  solicitacaoId,
  quantidadeParcelas: resultado.quantidadeParcelas,
  valorTotal: resultado.valorTotal,
  duration: Date.now() - startTime
});
```

## Considerações de Performance

### Otimizações Implementadas
- Cache de feriados no FeriadoService
- Consultas otimizadas ao banco de dados
- Processamento assíncrono quando possível
- Validação antecipada de dados

### Recomendações
- Monitorar performance das estratégias
- Implementar cache para dados de benefício frequentemente acessados
- Considerar processamento em lote para grandes volumes

## Troubleshooting

### Problemas Comuns

1. **Erro de estratégia não encontrada**
   - Verificar se a estratégia está registrada no calculator
   - Confirmar tipo de benefício na base de dados

2. **Falha na consulta de feriados**
   - Verificar conectividade com API externa
   - Validar configuração de timeout

3. **Datas incorretas**
   - Verificar configuração de timezone
   - Validar lógica de dias úteis

### Debug
```typescript
// Habilitar logs detalhados
process.env.LOG_LEVEL = 'debug';

// Verificar estratégias registradas
console.log(this.pagamentoCalculatorService.getEstrategiasDisponiveis());
```

## Roadmap

### Próximas Funcionalidades
- [ ] Suporte a pagamentos parcelados complexos
- [ ] Integração com sistema de aprovação
- [ ] Notificações automáticas de vencimento
- [ ] Dashboard de métricas em tempo real
- [ ] API para consulta de cronograma de pagamentos

### Melhorias Técnicas
- [ ] Implementar Event Sourcing para auditoria
- [ ] Adicionar circuit breaker para APIs externas
- [ ] Otimizar consultas com índices específicos
- [ ] Implementar cache distribuído

---

**Desenvolvido com ❤️ pela equipe PGBEN**

*Para dúvidas ou sugestões, consulte a documentação técnica completa em `/docs/modulo-pagamento/`*