import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Solicitacao } from '../entities/solicitacao.entity';
import { TipoBeneficio } from '../../beneficio/entities/tipo-beneficio.entity';

/**
 * Serviço de Exportação de Dados
 *
 * Responsável por exportar dados de solicitações de benefícios em diferentes formatos,
 * como CSV, para análise e relatórios.
 */
@Injectable()
export class ExportacaoService {
  private readonly logger = new Logger(ExportacaoService.name);

  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    @InjectRepository(TipoBeneficio)
    private readonly tipoBeneficioRepository: Repository<TipoBeneficio>,
  ) {}

  /**
   * Exporta solicitações de benefício em formato CSV
   *
   * @param filtros Filtros para as solicitações a serem exportadas
   * @returns String em formato CSV
   */
  async exportarSolicitacoesCSV(filtros?: any): Promise<string> {
    try {
      // Construir query com filtros opcionais
      const where: any = {};

      if (filtros?.cidadao_id) {
        where.cidadao_id = filtros.cidadao_id;
      }

      if (filtros?.tipo_beneficio_id) {
        where.tipo_beneficio_id = filtros.tipo_beneficio_id;
      }

      if (filtros?.status) {
        where.status = filtros.status;
      }

      if (filtros?.data_inicio && filtros?.data_fim) {
        where.created_at = {
          $gte: new Date(filtros.data_inicio),
          $lte: new Date(filtros.data_fim),
        };
      }

      // Buscar solicitações
      const solicitacoes = await this.solicitacaoRepository.find({
        where,
        relations: ['tipo_beneficio'],
        order: { created_at: 'DESC' },
      });

      // Transformar dados para CSV
      const dados = await this.transformarDadosParaCSV(solicitacoes);

      // Definir cabeçalhos padrão
      const cabecalhosBasicos = [
        'ID',
        'ID do Cidadão',
        'Tipo de Benefício',
        'Status',
        'Data da Solicitação',
        'Última Atualização',
      ];

      // Obter todos os campos dinâmicos
      const camposDinamicos = new Set<string>();
      dados.forEach((item) => {
        Object.keys(item).forEach((key) => {
          if (
            ![
              'id',
              'cidadao_id',
              'tipo_beneficio',
              'status',
              'data_solicitacao',
              'updated_at',
            ].includes(key)
          ) {
            camposDinamicos.add(key);
          }
        });
      });

      // Montar cabeçalho completo
      const cabecalhoCompleto = [
        ...cabecalhosBasicos,
        ...Array.from(camposDinamicos),
      ];

      // Gerar linha de cabeçalho CSV
      let csv = cabecalhoCompleto.map(this.escaparCampoCSV).join(',') + '\n';

      // Gerar linhas de dados
      dados.forEach((item) => {
        const linha = [
          this.escaparCampoCSV(item.id || ''),
          this.escaparCampoCSV(item.cidadao_id || ''),
          this.escaparCampoCSV(item.tipo_beneficio || ''),
          this.escaparCampoCSV(item.status || ''),
          this.escaparCampoCSV(item.data_solicitacao || ''),
          this.escaparCampoCSV(item.updated_at || ''),
        ];

        // Adicionar campos dinâmicos
        camposDinamicos.forEach((campo) => {
          linha.push(this.escaparCampoCSV(item[campo] || ''));
        });

        csv += linha.join(',') + '\n';
      });

      return csv;
    } catch (error) {
      this.logger.error(
        `Erro ao exportar solicitações para CSV: ${error.message}`,
        error.stack,
      );
      throw new Error('Erro ao exportar solicitações para CSV');
    }
  }

  /**
   * Transforma dados de solicitações para o formato CSV
   *
   * @param solicitacoes Lista de solicitações
   * @returns Dados formatados para CSV
   */
  private async transformarDadosParaCSV(
    solicitacoes: Solicitacao[],
  ): Promise<any[]> {
    return solicitacoes.map((solicitacao) => {
      // Dados básicos
      const dadosBasicos = {
        id: solicitacao.id,
        cidadao_id: solicitacao.beneficiario_id,
        tipo_beneficio: solicitacao.tipo_beneficio?.nome || 'Não especificado',
        status: solicitacao.status,
        data_solicitacao: this.formatarData(solicitacao.created_at),
        updated_at: this.formatarData(solicitacao.updated_at),
      };

      // Adicionar dados dinâmicos
      const dadosDinamicos = solicitacao.dados_dinamicos || {};

      // Mesclar dados básicos com dados dinâmicos
      return {
        ...dadosBasicos,
        ...this.processarDadosDinamicos(dadosDinamicos),
      };
    });
  }

  /**
   * Processa dados dinâmicos para exportação
   *
   * @param dados Dados dinâmicos
   * @returns Dados processados
   */
  private processarDadosDinamicos(dados: any): any {
    const resultado = {};

    // Processar cada campo dinâmico
    Object.keys(dados).forEach((chave) => {
      const valor = dados[chave];

      // Processar conforme o tipo
      if (valor === null || valor === undefined) {
        resultado[chave] = '';
      } else if (typeof valor === 'object' && valor instanceof Date) {
        resultado[chave] = this.formatarData(valor);
      } else if (typeof valor === 'object') {
        resultado[chave] = JSON.stringify(valor);
      } else {
        resultado[chave] = String(valor);
      }
    });

    return resultado;
  }

  /**
   * Formata data para string no formato DD/MM/YYYY HH:MM:SS
   *
   * @param data Data a ser formatada
   * @returns Data formatada
   */
  private formatarData(data: Date): string {
    if (!data) {return '';}

    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const ano = data.getFullYear();
    const hora = data.getHours().toString().padStart(2, '0');
    const minuto = data.getMinutes().toString().padStart(2, '0');
    const segundo = data.getSeconds().toString().padStart(2, '0');

    return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
  }

  /**
   * Escapa um campo para formato CSV
   *
   * @param valor Valor a ser escapado
   * @returns Valor escapado para CSV
   */
  private escaparCampoCSV(valor: any): string {
    if (valor === null || valor === undefined) {
      return '';
    }

    const str = String(valor);

    // Se o valor contém vírgulas, aspas ou quebras de linha, envolvê-lo em aspas duplas
    if (
      str.includes(',') ||
      str.includes('"') ||
      str.includes('\n') ||
      str.includes('\r')
    ) {
      // Substituir aspas duplas por duas aspas duplas (padrão CSV)
      return '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
  }
}
