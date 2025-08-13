import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO genérico para respostas paginadas
 * Fornece estrutura padrão para todas as consultas paginadas do sistema
 */
export class RespostaPaginadaDto<T> {
  @ApiProperty({
    description: 'Lista de itens da página atual',
    isArray: true,
  })
  dados: T[];

  @ApiProperty({
    description: 'Informações de paginação',
    example: {
      pagina_atual: 1,
      total_paginas: 5,
      total_itens: 100,
      itens_por_pagina: 20,
      tem_proxima: true,
      tem_anterior: false,
    },
  })
  paginacao: {
    pagina_atual: number;
    total_paginas: number;
    total_itens: number;
    itens_por_pagina: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };

  @ApiProperty({
    description: 'Filtros aplicados na consulta',
    example: {
      status: 'PENDENTE',
      prioridade: 'ALTA',
      data_inicio: '2024-01-01T00:00:00Z',
      data_fim: '2024-01-31T23:59:59Z',
    },
  })
  filtros_aplicados: Record<string, any>;

  @ApiProperty({
    description: 'Informações de ordenação',
    example: {
      campo: 'created_at',
      direcao: 'DESC',
    },
  })
  ordenacao: {
    campo: string;
    direcao: 'ASC' | 'DESC';
  };

  constructor(
    dados: T[],
    total: number,
    pagina: number,
    limite: number,
    filtros: Record<string, any> = {},
    ordenacao: { campo: string; direcao: 'ASC' | 'DESC' } = {
      campo: 'created_at',
      direcao: 'DESC',
    },
  ) {
    this.dados = dados;
    this.filtros_aplicados = filtros;
    this.ordenacao = ordenacao;

    const totalPaginas = Math.ceil(total / limite);

    this.paginacao = {
      pagina_atual: pagina,
      total_paginas: totalPaginas,
      total_itens: total,
      itens_por_pagina: limite,
      tem_proxima: pagina < totalPaginas,
      tem_anterior: pagina > 1,
    };
  }
}

/**
 * DTO específico para resposta paginada de solicitações
 */
export class RespostaPaginadaSolicitacaoDto extends RespostaPaginadaDto<any> {
  @ApiProperty({
    description: 'Estatísticas adicionais das solicitações',
    example: {
      total_pendentes: 15,
      total_aprovadas: 45,
      total_rejeitadas: 8,
      total_expiradas: 2,
      valor_total_envolvido: 150000.0,
      tempo_medio_aprovacao_horas: 24.5,
    },
  })
  estatisticas?: {
    total_pendentes: number;
    total_aprovadas: number;
    total_rejeitadas: number;
    total_expiradas: number;
    valor_total_envolvido: number;
    tempo_medio_aprovacao_horas: number;
  };
}

/**
 * DTO específico para resposta paginada de histórico
 */
export class RespostaPaginadaHistoricoDto extends RespostaPaginadaDto<any> {
  @ApiProperty({
    description: 'Resumo das ações do histórico',
    example: {
      total_aprovacoes: 25,
      total_rejeicoes: 5,
      total_delegacoes: 3,
      total_cancelamentos: 2,
      usuarios_mais_ativos: [
        { usuario_id: 'uuid1', nome: 'João Silva', total_acoes: 15 },
        { usuario_id: 'uuid2', nome: 'Maria Santos', total_acoes: 12 },
      ],
    },
  })
  resumo?: {
    total_aprovacoes: number;
    total_rejeicoes: number;
    total_delegacoes: number;
    total_cancelamentos: number;
    usuarios_mais_ativos: Array<{
      usuario_id: string;
      nome: string;
      total_acoes: number;
    }>;
  };
}
