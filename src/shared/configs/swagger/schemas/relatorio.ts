import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para parâmetros de relatório de solicitações
 */
export class RelatorioSolicitacoesDto {
  @ApiProperty({
    description: 'Data inicial do período do relatório',
    example: '2025-01-01',
    type: 'string',
    format: 'date'
  })
  dataInicio: string;

  @ApiProperty({
    description: 'Data final do período do relatório',
    example: '2025-01-31',
    type: 'string',
    format: 'date'
  })
  dataFim: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de benefício específico',
    example: '507f1f77bcf86cd799439011',
    type: 'string'
  })
  tipoBeneficioId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por status das solicitações',
    example: 'APROVADA',
    enum: ['PENDENTE', 'EM_ANALISE', 'APROVADA', 'REJEITADA', 'CANCELADA'],
    type: 'string'
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por analista responsável',
    example: '507f1f77bcf86cd799439014',
    type: 'string'
  })
  analistaId?: string;

  @ApiPropertyOptional({
    description: 'Formato de saída do relatório',
    example: 'PDF',
    enum: ['PDF', 'EXCEL', 'CSV', 'JSON'],
    type: 'string',
    default: 'PDF'
  })
  formato?: string;

  @ApiPropertyOptional({
    description: 'Incluir detalhes dos cidadãos no relatório',
    example: true,
    type: 'boolean',
    default: false
  })
  incluirDetalhesCidadao?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir documentos anexados',
    example: false,
    type: 'boolean',
    default: false
  })
  incluirDocumentos?: boolean;

  @ApiPropertyOptional({
    description: 'Agrupar resultados por campo específico',
    example: 'tipoBeneficio',
    enum: ['tipoBeneficio', 'status', 'analista', 'mes', 'bairro'],
    type: 'string'
  })
  agruparPor?: string;
}

/**
 * DTO para resposta de relatório de solicitações
 */
export class RelatorioSolicitacoesResponseDto {
  @ApiProperty({
    description: 'Período do relatório',
    type: 'object',
    properties: {
      dataInicio: {
        type: 'string',
        format: 'date',
        description: 'Data inicial'
      },
      dataFim: {
        type: 'string',
        format: 'date',
        description: 'Data final'
      }
    },
    example: {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31'
    }
  })
  periodo: {
    dataInicio: string;
    dataFim: string;
  };

  @ApiProperty({
    description: 'Resumo estatístico do período',
    type: 'object',
    properties: {
      totalSolicitacoes: {
        type: 'integer',
        description: 'Total de solicitações no período'
      },
      solicitacoesAprovadas: {
        type: 'integer',
        description: 'Solicitações aprovadas'
      },
      solicitacoesRejeitadas: {
        type: 'integer',
        description: 'Solicitações rejeitadas'
      },
      solicitacoesPendentes: {
        type: 'integer',
        description: 'Solicitações pendentes'
      },
      valorTotalConcedido: {
        type: 'number',
        format: 'float',
        description: 'Valor total concedido em benefícios'
      },
      tempoMedioAnalise: {
        type: 'number',
        format: 'float',
        description: 'Tempo médio de análise em dias'
      }
    },
    example: {
      totalSolicitacoes: 150,
      solicitacoesAprovadas: 120,
      solicitacoesRejeitadas: 25,
      solicitacoesPendentes: 5,
      valorTotalConcedido: 45000.00,
      tempoMedioAnalise: 3.5
    }
  })
  resumo: {
    totalSolicitacoes: number;
    solicitacoesAprovadas: number;
    solicitacoesRejeitadas: number;
    solicitacoesPendentes: number;
    valorTotalConcedido: number;
    tempoMedioAnalise: number;
  };

  @ApiProperty({
    description: 'Distribuição por tipo de benefício',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        tipoBeneficio: {
          type: 'string',
          description: 'Nome do tipo de benefício'
        },
        quantidade: {
          type: 'integer',
          description: 'Quantidade de solicitações'
        },
        valorTotal: {
          type: 'number',
          format: 'float',
          description: 'Valor total concedido'
        },
        percentual: {
          type: 'number',
          format: 'float',
          description: 'Percentual do total'
        }
      }
    },
    example: [
      {
        tipoBeneficio: 'Auxílio Natalidade',
        quantidade: 80,
        valorTotal: 24000.00,
        percentual: 53.3
      },
      {
        tipoBeneficio: 'Aluguel Social',
        quantidade: 70,
        valorTotal: 21000.00,
        percentual: 46.7
      }
    ]
  })
  distribuicaoPorTipo: Array<{
    tipoBeneficio: string;
    quantidade: number;
    valorTotal: number;
    percentual: number;
  }>;

  @ApiProperty({
    description: 'Evolução temporal das solicitações',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        periodo: {
          type: 'string',
          description: 'Período (dia, semana ou mês)'
        },
        quantidade: {
          type: 'integer',
          description: 'Quantidade de solicitações'
        },
        aprovadas: {
          type: 'integer',
          description: 'Solicitações aprovadas'
        },
        rejeitadas: {
          type: 'integer',
          description: 'Solicitações rejeitadas'
        }
      }
    },
    example: [
      {
        periodo: '2025-01-01',
        quantidade: 15,
        aprovadas: 12,
        rejeitadas: 3
      },
      {
        periodo: '2025-01-02',
        quantidade: 18,
        aprovadas: 15,
        rejeitadas: 3
      }
    ]
  })
  evolucaoTemporal: Array<{
    periodo: string;
    quantidade: number;
    aprovadas: number;
    rejeitadas: number;
  }>;

  @ApiProperty({
    description: 'Data e hora de geração do relatório',
    example: '2025-01-18T15:30:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  dataGeracao: string;

  @ApiProperty({
    description: 'Usuário que gerou o relatório',
    example: 'João Silva Santos',
    type: 'string'
  })
  geradoPor: string;

  @ApiPropertyOptional({
    description: 'URL para download do arquivo do relatório (quando formato != JSON)',
    example: 'https://storage.example.com/reports/relatorio_20250118_153000.pdf',
    type: 'string',
    format: 'uri'
  })
  urlDownload?: string;
}

/**
 * DTO para dashboard de métricas
 */
export class DashboardMetricasDto {
  @ApiPropertyOptional({
    description: 'Período para cálculo das métricas (em dias)',
    example: 30,
    type: 'integer',
    minimum: 1,
    maximum: 365,
    default: 30
  })
  periodo?: number;

  @ApiPropertyOptional({
    description: 'Incluir comparação com período anterior',
    example: true,
    type: 'boolean',
    default: true
  })
  incluirComparacao?: boolean;
}

/**
 * DTO para resposta do dashboard de métricas
 */
export class DashboardMetricasResponseDto {
  @ApiProperty({
    description: 'Métricas principais do período',
    type: 'object',
    properties: {
      totalSolicitacoes: {
        type: 'integer',
        description: 'Total de solicitações'
      },
      solicitacoesAprovadas: {
        type: 'integer',
        description: 'Solicitações aprovadas'
      },
      solicitacoesPendentes: {
        type: 'integer',
        description: 'Solicitações pendentes de análise'
      },
      taxaAprovacao: {
        type: 'number',
        format: 'float',
        description: 'Taxa de aprovação em percentual'
      },
      valorTotalConcedido: {
        type: 'number',
        format: 'float',
        description: 'Valor total concedido'
      },
      tempoMedioAnalise: {
        type: 'number',
        format: 'float',
        description: 'Tempo médio de análise em horas'
      },
      cidadaosAtendidos: {
        type: 'integer',
        description: 'Número de cidadãos únicos atendidos'
      },
      documentosValidados: {
        type: 'integer',
        description: 'Total de documentos validados'
      }
    },
    example: {
      totalSolicitacoes: 245,
      solicitacoesAprovadas: 198,
      solicitacoesPendentes: 12,
      taxaAprovacao: 85.5,
      valorTotalConcedido: 73500.00,
      tempoMedioAnalise: 48.5,
      cidadaosAtendidos: 189,
      documentosValidados: 456
    }
  })
  metricas: {
    totalSolicitacoes: number;
    solicitacoesAprovadas: number;
    solicitacoesPendentes: number;
    taxaAprovacao: number;
    valorTotalConcedido: number;
    tempoMedioAnalise: number;
    cidadaosAtendidos: number;
    documentosValidados: number;
  };

  @ApiPropertyOptional({
    description: 'Comparação com período anterior (quando solicitado)',
    type: 'object',
    properties: {
      totalSolicitacoes: {
        type: 'object',
        properties: {
          valor: { type: 'integer' },
          variacao: { type: 'number', format: 'float' },
          percentual: { type: 'number', format: 'float' }
        }
      },
      taxaAprovacao: {
        type: 'object',
        properties: {
          valor: { type: 'number', format: 'float' },
          variacao: { type: 'number', format: 'float' },
          percentual: { type: 'number', format: 'float' }
        }
      },
      valorTotalConcedido: {
        type: 'object',
        properties: {
          valor: { type: 'number', format: 'float' },
          variacao: { type: 'number', format: 'float' },
          percentual: { type: 'number', format: 'float' }
        }
      }
    },
    example: {
      totalSolicitacoes: {
        valor: 198,
        variacao: 47,
        percentual: 23.7
      },
      taxaAprovacao: {
        valor: 82.1,
        variacao: 3.4,
        percentual: 4.1
      },
      valorTotalConcedido: {
        valor: 59400.00,
        variacao: 14100.00,
        percentual: 23.7
      }
    }
  })
  comparacao?: {
    totalSolicitacoes: {
      valor: number;
      variacao: number;
      percentual: number;
    };
    taxaAprovacao: {
      valor: number;
      variacao: number;
      percentual: number;
    };
    valorTotalConcedido: {
      valor: number;
      variacao: number;
      percentual: number;
    };
  };

  @ApiProperty({
    description: 'Top 5 tipos de benefícios mais solicitados',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        nome: {
          type: 'string',
          description: 'Nome do tipo de benefício'
        },
        quantidade: {
          type: 'integer',
          description: 'Quantidade de solicitações'
        },
        percentual: {
          type: 'number',
          format: 'float',
          description: 'Percentual do total'
        }
      }
    },
    example: [
      {
        nome: 'Auxílio Natalidade',
        quantidade: 125,
        percentual: 51.0
      },
      {
        nome: 'Aluguel Social',
        quantidade: 98,
        percentual: 40.0
      },
      {
        nome: 'Auxílio Funeral',
        quantidade: 22,
        percentual: 9.0
      }
    ]
  })
  topBeneficios: Array<{
    nome: string;
    quantidade: number;
    percentual: number;
  }>;

  @ApiProperty({
    description: 'Distribuição de solicitações por status',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Status da solicitação'
        },
        quantidade: {
          type: 'integer',
          description: 'Quantidade de solicitações'
        },
        percentual: {
          type: 'number',
          format: 'float',
          description: 'Percentual do total'
        }
      }
    },
    example: [
      {
        status: 'APROVADA',
        quantidade: 198,
        percentual: 80.8
      },
      {
        status: 'REJEITADA',
        quantidade: 35,
        percentual: 14.3
      },
      {
        status: 'PENDENTE',
        quantidade: 12,
        percentual: 4.9
      }
    ]
  })
  distribuicaoStatus: Array<{
    status: string;
    quantidade: number;
    percentual: number;
  }>;

  @ApiProperty({
    description: 'Alertas e notificações importantes',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        tipo: {
          type: 'string',
          enum: ['INFO', 'WARNING', 'ERROR'],
          description: 'Tipo do alerta'
        },
        titulo: {
          type: 'string',
          description: 'Título do alerta'
        },
        mensagem: {
          type: 'string',
          description: 'Mensagem detalhada'
        },
        contador: {
          type: 'integer',
          description: 'Contador relacionado ao alerta'
        }
      }
    },
    example: [
      {
        tipo: 'WARNING',
        titulo: 'Solicitações Pendentes',
        mensagem: 'Existem solicitações pendentes há mais de 5 dias',
        contador: 3
      },
      {
        tipo: 'INFO',
        titulo: 'Meta Mensal',
        mensagem: 'Meta de atendimento mensal atingida',
        contador: 100
      }
    ]
  })
  alertas: Array<{
    tipo: 'INFO' | 'WARNING' | 'ERROR';
    titulo: string;
    mensagem: string;
    contador: number;
  }>;

  @ApiProperty({
    description: 'Data e hora da última atualização das métricas',
    example: '2025-01-18T15:45:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  ultimaAtualizacao: string;
}

/**
 * DTO para relatório financeiro
 */
export class RelatorioFinanceiroDto {
  @ApiProperty({
    description: 'Ano de referência do relatório',
    example: 2025,
    type: 'integer',
    minimum: 2020,
    maximum: 2030
  })
  ano: number;

  @ApiPropertyOptional({
    description: 'Mês específico (1-12), se não informado considera o ano todo',
    example: 1,
    type: 'integer',
    minimum: 1,
    maximum: 12
  })
  mes?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de benefício',
    example: '507f1f77bcf86cd799439011',
    type: 'string'
  })
  tipoBeneficioId?: string;

  @ApiPropertyOptional({
    description: 'Incluir projeções para os próximos meses',
    example: true,
    type: 'boolean',
    default: false
  })
  incluirProjecoes?: boolean;
}

/**
 * DTO para resposta do relatório financeiro
 */
export class RelatorioFinanceiroResponseDto {
  @ApiProperty({
    description: 'Período do relatório',
    type: 'object',
    properties: {
      ano: {
        type: 'integer',
        description: 'Ano de referência'
      },
      mes: {
        type: 'integer',
        description: 'Mês específico (opcional)'
      }
    },
    example: {
      ano: 2025,
      mes: 1
    }
  })
  periodo: {
    ano: number;
    mes?: number;
  };

  @ApiProperty({
    description: 'Resumo financeiro do período',
    type: 'object',
    properties: {
      valorTotalConcedido: {
        type: 'number',
        format: 'float',
        description: 'Valor total concedido em benefícios'
      },
      valorTotalPago: {
        type: 'number',
        format: 'float',
        description: 'Valor total efetivamente pago'
      },
      valorPendentePagamento: {
        type: 'number',
        format: 'float',
        description: 'Valor pendente de pagamento'
      },
      numeroTotalBeneficios: {
        type: 'integer',
        description: 'Número total de benefícios concedidos'
      },
      numeroTotalBeneficiarios: {
        type: 'integer',
        description: 'Número total de beneficiários únicos'
      },
      ticketMedio: {
        type: 'number',
        format: 'float',
        description: 'Valor médio por benefício'
      }
    },
    example: {
      valorTotalConcedido: 125000.00,
      valorTotalPago: 118500.00,
      valorPendentePagamento: 6500.00,
      numeroTotalBeneficios: 312,
      numeroTotalBeneficiarios: 289,
      ticketMedio: 400.64
    }
  })
  resumo: {
    valorTotalConcedido: number;
    valorTotalPago: number;
    valorPendentePagamento: number;
    numeroTotalBeneficios: number;
    numeroTotalBeneficiarios: number;
    ticketMedio: number;
  };

  @ApiProperty({
    description: 'Distribuição por tipo de benefício',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        tipoBeneficio: {
          type: 'string',
          description: 'Nome do tipo de benefício'
        },
        valorConcedido: {
          type: 'number',
          format: 'float',
          description: 'Valor total concedido'
        },
        valorPago: {
          type: 'number',
          format: 'float',
          description: 'Valor total pago'
        },
        quantidade: {
          type: 'integer',
          description: 'Quantidade de benefícios'
        },
        percentualOrcamento: {
          type: 'number',
          format: 'float',
          description: 'Percentual do orçamento total'
        }
      }
    },
    example: [
      {
        tipoBeneficio: 'Auxílio Natalidade',
        valorConcedido: 75000.00,
        valorPago: 71250.00,
        quantidade: 250,
        percentualOrcamento: 60.0
      },
      {
        tipoBeneficio: 'Aluguel Social',
        valorConcedido: 50000.00,
        valorPago: 47250.00,
        quantidade: 62,
        percentualOrcamento: 40.0
      }
    ]
  })
  distribuicaoPorTipo: Array<{
    tipoBeneficio: string;
    valorConcedido: number;
    valorPago: number;
    quantidade: number;
    percentualOrcamento: number;
  }>;

  @ApiProperty({
    description: 'Evolução mensal dos gastos',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        mes: {
          type: 'integer',
          description: 'Mês (1-12)'
        },
        valorConcedido: {
          type: 'number',
          format: 'float',
          description: 'Valor concedido no mês'
        },
        valorPago: {
          type: 'number',
          format: 'float',
          description: 'Valor pago no mês'
        },
        quantidade: {
          type: 'integer',
          description: 'Quantidade de benefícios no mês'
        }
      }
    },
    example: [
      {
        mes: 1,
        valorConcedido: 125000.00,
        valorPago: 118500.00,
        quantidade: 312
      }
    ]
  })
  evolucaoMensal: Array<{
    mes: number;
    valorConcedido: number;
    valorPago: number;
    quantidade: number;
  }>;

  @ApiPropertyOptional({
    description: 'Projeções para os próximos meses (quando solicitado)',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        mes: {
          type: 'integer',
          description: 'Mês da projeção'
        },
        valorProjetado: {
          type: 'number',
          format: 'float',
          description: 'Valor projetado'
        },
        quantidadeProjetada: {
          type: 'integer',
          description: 'Quantidade projetada'
        },
        confianca: {
          type: 'number',
          format: 'float',
          description: 'Nível de confiança da projeção (0-100)'
        }
      }
    },
    example: [
      {
        mes: 2,
        valorProjetado: 130000.00,
        quantidadeProjetada: 325,
        confianca: 85.5
      }
    ]
  })
  projecoes?: Array<{
    mes: number;
    valorProjetado: number;
    quantidadeProjetada: number;
    confianca: number;
  }>;

  @ApiProperty({
    description: 'Data e hora de geração do relatório',
    example: '2025-01-18T16:00:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  dataGeracao: string;
}