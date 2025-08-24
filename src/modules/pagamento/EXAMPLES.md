# Exemplos de Uso - Módulo de Pagamento

## Índice
- [Configuração Básica](#configuração-básica)
- [Exemplos por Estratégia](#exemplos-por-estratégia)
- [Casos de Uso Avançados](#casos-de-uso-avançados)
- [Testes e Validação](#testes-e-validação)

## Configuração Básica

### Injeção de Dependências

```typescript
// app.module.ts
@Module({
  imports: [
    // ... outros módulos
    PagamentoModule,
    SharedModule, // Para FeriadoService
  ],
})
export class AppModule {}
```

### Uso no Controller

```typescript
// exemplo.controller.ts
@Controller('exemplo')
export class ExemploController {
  constructor(
    private readonly pagamentoService: PagamentoService,
    private readonly pagamentoCalculatorService: PagamentoCalculatorService
  ) {}

  @Post('gerar-pagamentos')
  async gerarPagamentos(@Body() dto: GerarPagamentosDto) {
    return await this.pagamentoService.gerarPagamentosParaConcessao(
      dto.solicitacaoId,
      dto.beneficioId,
      dto.valorTotal,
      dto.dataInicio,
      dto.observacoes
    );
  }
}
```

## Exemplos por Estratégia

### 1. Aluguel Social

```typescript
// Dados de entrada
const dadosAluguelSocial = {
  solicitacaoId: 'sol-123',
  beneficioId: 'ben-aluguel-001',
  valorTotal: 1200.00, // R$ 400/mês por 3 meses
  dataInicio: new Date('2024-01-01'),
  observacoes: 'Benefício aprovado para família vulnerável'
};

// Configuração do benefício
const beneficioAluguel = {
  id: 'ben-aluguel-001',
  valor: 400.00,
  periodicidade: 'MENSAL',
  configuracao: {
    quantidadeParcelas: 3,
    diaVencimento: 30,
    diaLiberacao: 1
  }
};

// Resultado esperado
const resultado = {
  parcelas: [
    {
      numero: 1,
      valor: 400.00,
      dataLiberacao: new Date('2024-01-02'), // Próximo dia útil
      dataVencimento: new Date('2024-01-31'),
      observacoes: 'Parcela 1/3 - Aluguel Social'
    },
    {
      numero: 2,
      valor: 400.00,
      dataLiberacao: new Date('2024-02-01'),
      dataVencimento: new Date('2024-02-29'),
      observacoes: 'Parcela 2/3 - Aluguel Social'
    },
    {
      numero: 3,
      valor: 400.00,
      dataLiberacao: new Date('2024-03-01'),
      dataVencimento: new Date('2024-03-31'),
      observacoes: 'Parcela 3/3 - Aluguel Social'
    }
  ],
  valorTotal: 1200.00,
  quantidadeParcelas: 3,
  dataInicio: new Date('2024-01-01'),
  dataFim: new Date('2024-03-31'),
  observacoes: ['Benefício mensal recorrente', 'Liberação no primeiro dia útil']
};
```

### 2. Cesta Básica

```typescript
// Dados de entrada
const dadosCestaBasica = {
  solicitacaoId: 'sol-456',
  beneficioId: 'ben-cesta-001',
  valorTotal: 600.00, // R$ 150/mês por 4 meses
  dataInicio: new Date('2024-02-01'),
  observacoes: 'Auxílio alimentação emergencial'
};

// Configuração específica
const beneficioCesta = {
  id: 'ben-cesta-001',
  valor: 150.00,
  periodicidade: 'MENSAL',
  configuracao: {
    quantidadeParcelas: 4,
    tipoAlimento: 'BASICA',
    validadeVoucher: 30 // dias
  }
};

// Uso direto da estratégia
const cestaStrategy = new CestaBasicaStrategy(feriadoService);
const resultado = await cestaStrategy.calcular(dadosCestaBasica, beneficioCesta);

console.log(`Geradas ${resultado.quantidadeParcelas} parcelas de cesta básica`);
```

### 3. Auxílio Funeral

```typescript
// Dados de entrada
const dadosFuneral = {
  solicitacaoId: 'sol-789',
  beneficioId: 'ben-funeral-001',
  valorTotal: 2000.00, // Valor único
  dataInicio: new Date('2024-03-15'),
  observacoes: 'Auxílio funeral - falecimento comprovado'
};

// Configuração do auxílio funeral
const beneficioFuneral = {
  id: 'ben-funeral-001',
  valor: 2000.00,
  periodicidade: 'UNICO',
  configuracao: {
    quantidadeParcelas: 1,
    prazoLiberacao: 2, // dias úteis
    documentosObrigatorios: ['certidao_obito', 'comprovante_despesas']
  }
};

// Resultado esperado
const resultado = {
  parcelas: [
    {
      numero: 1,
      valor: 2000.00,
      dataLiberacao: new Date('2024-03-19'), // 2 dias úteis após solicitação
      dataVencimento: new Date('2024-04-19'), // 30 dias para utilização
      observacoes: 'Auxílio Funeral - Pagamento único'
    }
  ],
  valorTotal: 2000.00,
  quantidadeParcelas: 1,
  dataInicio: new Date('2024-03-15'),
  dataFim: new Date('2024-03-15'),
  observacoes: ['Pagamento único', 'Liberação em 2 dias úteis']
};
```

### 4. Auxílio Natalidade

```typescript
// Dados de entrada
const dadosNatalidade = {
  solicitacaoId: 'sol-101',
  beneficioId: 'ben-natalidade-001',
  valorTotal: 500.00,
  dataInicio: new Date('2024-04-10'),
  observacoes: 'Auxílio natalidade - nascimento registrado'
};

// Configuração específica
const beneficioNatalidade = {
  id: 'ben-natalidade-001',
  valor: 500.00,
  periodicidade: 'UNICO',
  configuracao: {
    quantidadeParcelas: 1,
    idadeMaximaCrianca: 90, // dias
    valorPorCrianca: 500.00,
    maximoCriancas: 1
  }
};

// Validação específica
const natalidadeStrategy = new NatalidadeStrategy(feriadoService);
const isValido = await natalidadeStrategy.validarElegibilidade({
  dataNascimento: new Date('2024-04-08'),
  dataRegistro: new Date('2024-04-10'),
  numeroFilhos: 1
});

if (isValido) {
  const resultado = await natalidadeStrategy.calcular(dadosNatalidade, beneficioNatalidade);
  console.log('Auxílio natalidade calculado com sucesso');
}
```

## Casos de Uso Avançados

### Cálculo com Múltiplas Estratégias

```typescript
// Serviço que processa múltiplos benefícios
@Injectable()
export class ProcessadorBeneficiosService {
  constructor(
    private readonly pagamentoCalculatorService: PagamentoCalculatorService
  ) {}

  async processarSolicitacaoCompleta(solicitacaoId: string) {
    const beneficios = await this.buscarBeneficiosSolicitacao(solicitacaoId);
    const resultados = [];

    for (const beneficio of beneficios) {
      const dados = {
        solicitacaoId,
        beneficioId: beneficio.id,
        valorTotal: beneficio.valorAprovado,
        dataInicio: beneficio.dataInicio,
        observacoes: beneficio.observacoes
      };

      const resultado = await this.pagamentoCalculatorService.calcularPagamentos(dados);
      resultados.push({
        tipoBeneficio: beneficio.tipo,
        resultado
      });
    }

    return {
      solicitacaoId,
      totalBeneficios: beneficios.length,
      valorTotalGeral: resultados.reduce((acc, r) => acc + r.resultado.valorTotal, 0),
      resultados
    };
  }
}
```

### Validação Customizada por Estratégia

```typescript
// Implementação de validação específica
@Injectable()
export class ValidadorBeneficiosService {
  constructor(
    private readonly pagamentoCalculatorService: PagamentoCalculatorService
  ) {}

  async validarEProcessar(dados: DadosPagamento) {
    // 1. Validação geral
    const validacaoGeral = await this.pagamentoCalculatorService.validarDados(dados);
    if (!validacaoGeral.valido) {
      throw new BadRequestException(validacaoGeral.erros);
    }

    // 2. Buscar estratégia específica
    const estrategia = await this.pagamentoCalculatorService.obterEstrategia(dados.beneficioId);
    
    // 3. Validação específica da estratégia (se implementada)
    if (estrategia.validarEspecifico) {
      const validacaoEspecifica = await estrategia.validarEspecifico(dados);
      if (!validacaoEspecifica.valido) {
        throw new BadRequestException(validacaoEspecifica.erros);
      }
    }

    // 4. Processar cálculo
    return await this.pagamentoCalculatorService.calcularPagamentos(dados);
  }
}
```

### Simulação de Cenários

```typescript
// Serviço para simulação de diferentes cenários
@Injectable()
export class SimuladorPagamentosService {
  constructor(
    private readonly pagamentoCalculatorService: PagamentoCalculatorService
  ) {}

  async simularCenarios(dadosBase: DadosPagamento) {
    const cenarios = [
      { nome: 'Cenário Base', dados: dadosBase },
      { 
        nome: 'Início em Feriado', 
        dados: { ...dadosBase, dataInicio: new Date('2024-12-25') } 
      },
      { 
        nome: 'Valor Dobrado', 
        dados: { ...dadosBase, valorTotal: dadosBase.valorTotal * 2 } 
      },
      { 
        nome: 'Início no Fim de Semana', 
        dados: { ...dadosBase, dataInicio: new Date('2024-06-01') } // Sábado
      }
    ];

    const resultados = [];
    for (const cenario of cenarios) {
      try {
        const resultado = await this.pagamentoCalculatorService.calcularPagamentos(cenario.dados);
        resultados.push({
          cenario: cenario.nome,
          sucesso: true,
          resultado
        });
      } catch (error) {
        resultados.push({
          cenario: cenario.nome,
          sucesso: false,
          erro: error.message
        });
      }
    }

    return resultados;
  }
}
```

## Testes e Validação

### Teste Unitário de Estratégia

```typescript
// aluguel-social.strategy.spec.ts
describe('AluguelSocialStrategy', () => {
  let strategy: AluguelSocialStrategy;
  let feriadoService: jest.Mocked<FeriadoService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AluguelSocialStrategy,
        {
          provide: FeriadoService,
          useValue: {
            ajustarParaProximoDiaUtil: jest.fn(),
            adicionarDiasUteis: jest.fn(),
          }
        }
      ]
    }).compile();

    strategy = module.get<AluguelSocialStrategy>(AluguelSocialStrategy);
    feriadoService = module.get(FeriadoService);
  });

  it('deve calcular pagamentos mensais corretamente', async () => {
    // Arrange
    const dados: DadosPagamento = {
      solicitacaoId: 'test-001',
      beneficioId: 'aluguel-001',
      valorTotal: 1200,
      dataInicio: new Date('2024-01-01'),
      observacoes: 'Teste'
    };

    const beneficio: DadosBeneficio = {
      id: 'aluguel-001',
      valor: 400,
      periodicidade: 'MENSAL',
      configuracao: { quantidadeParcelas: 3 }
    };

    feriadoService.ajustarParaProximoDiaUtil.mockResolvedValue(new Date('2024-01-02'));

    // Act
    const resultado = await strategy.calcular(dados, beneficio);

    // Assert
    expect(resultado.quantidadeParcelas).toBe(3);
    expect(resultado.valorTotal).toBe(1200);
    expect(resultado.parcelas).toHaveLength(3);
    expect(resultado.parcelas[0].valor).toBe(400);
  });

  it('deve ajustar datas para dias úteis', async () => {
    // Teste específico para validação de dias úteis
    const dataFeriado = new Date('2024-12-25'); // Natal
    const proximoDiaUtil = new Date('2024-12-26');
    
    feriadoService.ajustarParaProximoDiaUtil.mockResolvedValue(proximoDiaUtil);

    const dados: DadosPagamento = {
      solicitacaoId: 'test-002',
      beneficioId: 'aluguel-002',
      valorTotal: 400,
      dataInicio: dataFeriado,
      observacoes: 'Teste feriado'
    };

    const beneficio: DadosBeneficio = {
      id: 'aluguel-002',
      valor: 400,
      periodicidade: 'MENSAL',
      configuracao: { quantidadeParcelas: 1 }
    };

    const resultado = await strategy.calcular(dados, beneficio);

    expect(feriadoService.ajustarParaProximoDiaUtil).toHaveBeenCalledWith(dataFeriado);
    expect(resultado.parcelas[0].dataLiberacao).toEqual(proximoDiaUtil);
  });
});
```

### Teste de Integração

```typescript
// pagamento-calculator.integration.spec.ts
describe('PagamentoCalculatorService Integration', () => {
  let app: INestApplication;
  let calculatorService: PagamentoCalculatorService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [PagamentoModule, SharedModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    calculatorService = app.get<PagamentoCalculatorService>(PagamentoCalculatorService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve processar todos os tipos de benefício', async () => {
    const tiposBeneficio = ['ALUGUEL_SOCIAL', 'CESTA_BASICA', 'FUNERAL', 'NATALIDADE'];
    
    for (const tipo of tiposBeneficio) {
      const dados = criarDadosTeste(tipo);
      const resultado = await calculatorService.calcularPagamentos(dados);
      
      expect(resultado).toBeDefined();
      expect(resultado.parcelas.length).toBeGreaterThan(0);
      expect(resultado.valorTotal).toBeGreaterThan(0);
    }
  });

  function criarDadosTeste(tipo: string): DadosPagamento {
    return {
      solicitacaoId: `test-${tipo}`,
      beneficioId: `ben-${tipo.toLowerCase()}`,
      valorTotal: 1000,
      dataInicio: new Date(),
      observacoes: `Teste ${tipo}`
    };
  }
});
```

### Teste de Performance

```typescript
// performance.spec.ts
describe('Performance Tests', () => {
  let calculatorService: PagamentoCalculatorService;

  beforeEach(async () => {
    // Setup do módulo de teste
  });

  it('deve processar 1000 cálculos em menos de 5 segundos', async () => {
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 1000; i++) {
      const dados = {
        solicitacaoId: `perf-test-${i}`,
        beneficioId: 'aluguel-001',
        valorTotal: 400,
        dataInicio: new Date(),
        observacoes: `Performance test ${i}`
      };
      
      promises.push(calculatorService.calcularPagamentos(dados));
    }

    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // 5 segundos
  });
});
```

## Monitoramento e Debugging

### Logs Estruturados

```typescript
// Exemplo de implementação de logs
@Injectable()
export class LoggedPagamentoService {
  private readonly logger = new Logger(LoggedPagamentoService.name);

  constructor(
    private readonly pagamentoCalculatorService: PagamentoCalculatorService
  ) {}

  async calcularComLogs(dados: DadosPagamento) {
    const startTime = Date.now();
    
    this.logger.log({
      action: 'inicio_calculo',
      solicitacaoId: dados.solicitacaoId,
      beneficioId: dados.beneficioId,
      valorTotal: dados.valorTotal
    });

    try {
      const resultado = await this.pagamentoCalculatorService.calcularPagamentos(dados);
      
      const duration = Date.now() - startTime;
      this.logger.log({
        action: 'calculo_concluido',
        solicitacaoId: dados.solicitacaoId,
        quantidadeParcelas: resultado.quantidadeParcelas,
        valorCalculado: resultado.valorTotal,
        duration
      });

      return resultado;
    } catch (error) {
      this.logger.error({
        action: 'erro_calculo',
        solicitacaoId: dados.solicitacaoId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}
```

### Métricas Customizadas

```typescript
// Implementação de métricas
@Injectable()
export class MetricasPagamentoService {
  private contadores = new Map<string, number>();
  private tempos = new Map<string, number[]>();

  registrarCalculo(tipo: string, duracao: number, sucesso: boolean) {
    // Contador de execuções
    const chaveContador = `${tipo}_${sucesso ? 'sucesso' : 'erro'}`;
    this.contadores.set(chaveContador, (this.contadores.get(chaveContador) || 0) + 1);

    // Tempos de execução
    if (sucesso) {
      const tempos = this.tempos.get(tipo) || [];
      tempos.push(duracao);
      this.tempos.set(tipo, tempos);
    }
  }

  obterEstatisticas() {
    const estatisticas = {};
    
    for (const [tipo, tempos] of this.tempos.entries()) {
      estatisticas[tipo] = {
        execucoes: tempos.length,
        tempoMedio: tempos.reduce((a, b) => a + b, 0) / tempos.length,
        tempoMinimo: Math.min(...tempos),
        tempoMaximo: Math.max(...tempos)
      };
    }

    return {
      contadores: Object.fromEntries(this.contadores),
      tempos: estatisticas
    };
  }
}
```

Esses exemplos demonstram como utilizar efetivamente o módulo de pagamento refatorado, desde casos simples até implementações avançadas com monitoramento e testes abrangentes.