import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as mathjs from 'mathjs';

import { MetricaDefinicao, TipoMetrica } from '../../../entities/metrica-definicao.entity';
import { MetricaSnapshot } from '../../../entities/metrica-snapshot.entity';

/**
 * Serviço responsável pelo cálculo de valores de métricas
 * 
 * Este serviço implementa algoritmos para calcular valores de métricas
 * conforme seu tipo, fonte de dados e fórmulas definidas.
 */
@Injectable()
export class MetricaCalculoService {
  private readonly logger = new Logger(MetricaCalculoService.name);
  private readonly mathParser: mathjs.Parser;
  
  constructor(
    @InjectRepository(MetricaDefinicao)
    private readonly metricaDefinicaoRepository: Repository<MetricaDefinicao>,
    
    @InjectRepository(MetricaSnapshot)
    private readonly metricaSnapshotRepository: Repository<MetricaSnapshot>,
    
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    // Inicializar o parser matemático para cálculo de fórmulas
    this.mathParser = mathjs.parser();
  }
  
  /**
   * Calcula o valor de uma métrica conforme sua definição e tipo
   * 
   * @param metrica Definição da métrica
   * @param periodoInicio Data de início do período
   * @param periodoFim Data de fim do período
   * @param dimensoes Dimensões para filtrar o cálculo
   * @returns Valor numérico da métrica
   */
  async calcularValorMetrica(
    metrica: MetricaDefinicao,
    periodoInicio: Date,
    periodoFim: Date,
    dimensoes: Record<string, any> = {},
  ): Promise<number> {
    this.logger.debug(`Calculando valor para métrica: ${metrica.codigo}`);
    
    try {
      switch (metrica.tipo) {
        case TipoMetrica.CONTAGEM:
          return this.calcularContagem(metrica, periodoInicio, periodoFim, dimensoes);
          
        case TipoMetrica.SOMA:
          return this.calcularSoma(metrica, periodoInicio, periodoFim, dimensoes);
          
        case TipoMetrica.MEDIA:
          return this.calcularMedia(metrica, periodoInicio, periodoFim, dimensoes);
          
        case TipoMetrica.MINIMO:
          return this.calcularMinimo(metrica, periodoInicio, periodoFim, dimensoes);
          
        case TipoMetrica.MAXIMO:
          return this.calcularMaximo(metrica, periodoInicio, periodoFim, dimensoes);
          
        case TipoMetrica.PERCENTIL:
          const percentil = metrica.parametros_especificos?.percentil || 90;
          return this.calcularPercentil(metrica, periodoInicio, periodoFim, dimensoes, percentil);
          
        case TipoMetrica.CARDINALIDADE:
          return this.calcularCardinalidade(metrica, periodoInicio, periodoFim, dimensoes);
          
        case TipoMetrica.TAXA_VARIACAO:
          return this.calcularTaxaVariacao(metrica, periodoInicio, periodoFim, dimensoes);
          
        case TipoMetrica.COMPOSTA:
          return this.calcularMetricaComposta(metrica, periodoInicio, periodoFim, dimensoes);
          
        default:
          throw new Error(`Tipo de métrica não suportado: ${metrica.tipo}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao calcular métrica ${metrica.codigo}: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Calcula métrica do tipo CONTAGEM
   */
  private async calcularContagem(
    metrica: MetricaDefinicao,
    periodoInicio: Date,
    periodoFim: Date,
    dimensoes: Record<string, any>,
  ): Promise<number> {
    if (!metrica.sql_consulta) {
      throw new Error(`Consulta SQL não definida para métrica ${metrica.codigo}`);
    }
    
    const sqlOriginal = metrica.sql_consulta;
    
    // Substituir placeholders de período
    let sql = sqlOriginal
      .replace(/\$\{PERIODO_INICIO\}/g, `'${periodoInicio.toISOString()}'`)
      .replace(/\$\{PERIODO_FIM\}/g, `'${periodoFim.toISOString()}'`);
    
    // Substituir placeholders de dimensões
    for (const [chave, valor] of Object.entries(dimensoes)) {
      const placeholder = `\${DIMENSAO.${chave}}`;
      sql = sql.replace(
        new RegExp(placeholder, 'g'), 
        typeof valor === 'string' ? `'${valor}'` : String(valor)
      );
    }
    
    try {
      // Executar consulta SQL
      const resultado = await this.dataSource.query(sql);
      
      if (!resultado || resultado.length === 0) {
        return 0;
      }
      
      // Obter o primeiro valor da primeira linha
      const primeiraLinha = resultado[0];
      const primeiraColuna = Object.values(primeiraLinha)[0];
      
      return Number(primeiraColuna) || 0;
    } catch (error) {
      this.logger.error(`Erro na execução da consulta SQL: ${error.message}`);
      throw new Error(`Erro ao executar consulta para métrica ${metrica.codigo}: ${error.message}`);
    }
  }
  
  /**
   * Calcula métrica do tipo SOMA
   */
  private async calcularSoma(
    metrica: MetricaDefinicao,
    periodoInicio: Date,
    periodoFim: Date,
    dimensoes: Record<string, any>,
  ): Promise<number> {
    // A implementação é similar à contagem, pois a diferença está na consulta SQL
    return this.calcularContagem(metrica, periodoInicio, periodoFim, dimensoes);
  }
  
  /**
   * Calcula métrica do tipo MEDIA
   */
  private async calcularMedia(
    metrica: MetricaDefinicao,
    periodoInicio: Date,
    periodoFim: Date,
    dimensoes: Record<string, any>,
  ): Promise<number> {
    // A implementação é similar à contagem, pois a diferença está na consulta SQL
    return this.calcularContagem(metrica, periodoInicio, periodoFim, dimensoes);
  }
  
  /**
   * Calcula métrica do tipo MINIMO
   */
  private async calcularMinimo(
    metrica: MetricaDefinicao,
    periodoInicio: Date,
    periodoFim: Date,
    dimensoes: Record<string, any>,
  ): Promise<number> {
    // A implementação é similar à contagem, pois a diferença está na consulta SQL
    return this.calcularContagem(metrica, periodoInicio, periodoFim, dimensoes);
  }
  
  /**
   * Calcula métrica do tipo MAXIMO
   */
  private async calcularMaximo(
    metrica: MetricaDefinicao,
    periodoInicio: Date,
    periodoFim: Date,
    dimensoes: Record<string, any>,
  ): Promise<number> {
    // A implementação é similar à contagem, pois a diferença está na consulta SQL
    return this.calcularContagem(metrica, periodoInicio, periodoFim, dimensoes);
  }
  
  /**
   * Calcula métrica do tipo PERCENTIL
   */
  private async calcularPercentil(
    metrica: MetricaDefinicao,
    periodoInicio: Date,
    periodoFim: Date,
    dimensoes: Record<string, any>,
    percentil: number,
  ): Promise<number> {
    if (!metrica.sql_consulta) {
      throw new Error(`Consulta SQL não definida para métrica ${metrica.codigo}`);
    }
    
    // Substituir placeholder de percentil na consulta
    let sql = metrica.sql_consulta
      .replace(/\$\{PERIODO_INICIO\}/g, `'${periodoInicio.toISOString()}'`)
      .replace(/\$\{PERIODO_FIM\}/g, `'${periodoFim.toISOString()}'`)
      .replace(/\$\{PERCENTIL\}/g, percentil.toString());
    
    // Substituir placeholders de dimensões
    for (const [chave, valor] of Object.entries(dimensoes)) {
      const placeholder = `\${DIMENSAO.${chave}}`;
      sql = sql.replace(
        new RegExp(placeholder, 'g'), 
        typeof valor === 'string' ? `'${valor}'` : String(valor)
      );
    }
    
    try {
      // Executar consulta SQL
      const resultado = await this.dataSource.query(sql);
      
      if (!resultado || resultado.length === 0) {
        return 0;
      }
      
      // Obter o primeiro valor da primeira linha
      const primeiraLinha = resultado[0];
      const primeiraColuna = Object.values(primeiraLinha)[0];
      
      return Number(primeiraColuna) || 0;
    } catch (error) {
      this.logger.error(`Erro na execução da consulta SQL: ${error.message}`);
      throw new Error(`Erro ao executar consulta para métrica ${metrica.codigo}: ${error.message}`);
    }
  }
  
  /**
   * Calcula métrica do tipo CARDINALIDADE
   */
  private async calcularCardinalidade(
    metrica: MetricaDefinicao,
    periodoInicio: Date,
    periodoFim: Date,
    dimensoes: Record<string, any>,
  ): Promise<number> {
    // A implementação é similar à contagem, pois a diferença está na consulta SQL
    return this.calcularContagem(metrica, periodoInicio, periodoFim, dimensoes);
  }
  
  /**
   * Calcula métrica do tipo TAXA_VARIACAO
   */
  private async calcularTaxaVariacao(
    metrica: MetricaDefinicao,
    periodoInicio: Date,
    periodoFim: Date,
    dimensoes: Record<string, any>,
  ): Promise<number> {
    // Calcular valor atual
    const valorAtual = await this.calcularContagem(metrica, periodoInicio, periodoFim, dimensoes);
    
    // Calcular valor do período anterior
    const periodoDuracao = periodoFim.getTime() - periodoInicio.getTime();
    const periodoAnteriorFim = new Date(periodoInicio.getTime());
    const periodoAnteriorInicio = new Date(periodoInicio.getTime() - periodoDuracao);
    
    let valorAnterior: number;
    
    try {
      valorAnterior = await this.calcularContagem(
        metrica, 
        periodoAnteriorInicio, 
        periodoAnteriorFim, 
        dimensoes
      );
    } catch (error) {
      this.logger.warn(`Erro ao calcular valor anterior para taxa de variação: ${error.message}`);
      valorAnterior = 0;
    }
    
    // Evitar divisão por zero
    if (valorAnterior === 0) {
      // Se o valor anterior for zero e o atual não for, temos 100% de aumento
      return valorAtual > 0 ? 100 : 0;
    }
    
    // Calcular taxa de variação percentual
    const taxaVariacao = ((valorAtual - valorAnterior) / Math.abs(valorAnterior)) * 100;
    return Number(taxaVariacao.toFixed(2));
  }
  
  /**
   * Calcula métrica do tipo COMPOSTA
   */
  private async calcularMetricaComposta(
    metrica: MetricaDefinicao,
    periodoInicio: Date,
    periodoFim: Date,
    dimensoes: Record<string, any>,
  ): Promise<number> {
    if (!metrica.formula_calculo) {
      throw new Error(`Fórmula de cálculo não definida para métrica composta ${metrica.codigo}`);
    }
    
    if (!metrica.metricas_dependentes || metrica.metricas_dependentes.length === 0) {
      throw new Error(`Métricas dependentes não definidas para métrica composta ${metrica.codigo}`);
    }
    
    // Obter valores de todas as métricas dependentes
    const valoresMetricas: Record<string, number> = {};
    
    for (const codigoMetrica of metrica.metricas_dependentes) {
      try {
        // Buscar definição da métrica dependente
        const metricaDependente = await this.metricaDefinicaoRepository.findOne({
          where: { codigo: codigoMetrica, ativa: true },
        });
        
        if (!metricaDependente) {
          throw new Error(`Métrica dependente não encontrada ou inativa: ${codigoMetrica}`);
        }
        
        // Calcular valor da métrica dependente
        const valor = await this.calcularValorMetrica(
          metricaDependente,
          periodoInicio,
          periodoFim,
          dimensoes
        );
        
        valoresMetricas[codigoMetrica] = valor;
      } catch (error) {
        this.logger.error(`Erro ao calcular métrica dependente ${codigoMetrica}: ${error.message}`);
        throw new Error(`Erro ao calcular métrica dependente ${codigoMetrica}: ${error.message}`);
      }
    }
    
    // Avaliar a fórmula de cálculo com os valores obtidos
    try {
      // Limpar o contexto do parser
      this.mathParser.clear();
      
      // Definir variáveis com os valores das métricas dependentes
      for (const [codigo, valor] of Object.entries(valoresMetricas)) {
        this.mathParser.set(codigo, valor);
      }
      
      // Avaliar a fórmula
      const resultado = this.mathParser.evaluate(metrica.formula_calculo);
      
      if (isNaN(resultado)) {
        throw new Error(`Resultado do cálculo é NaN`);
      }
      
      return Number(resultado);
    } catch (error) {
      this.logger.error(`Erro ao avaliar fórmula para métrica ${metrica.codigo}: ${error.message}`);
      throw new Error(`Erro ao avaliar fórmula para métrica ${metrica.codigo}: ${error.message}`);
    }
  }
}
