import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan, Not } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MetricaDefinicao } from '../entities/metrica-definicao.entity';
import { MetricaSnapshot } from '../entities/metrica-snapshot.entity';

import { 
  NivelConfiancaAnomalia, 
  ResultadoDeteccaoAnomalia,
  ResultadoDeteccaoAnomaliaPorCodigo,
  AnomaliaDetectada
} from '../interfaces/anomalias.interface';
import { 
  ResultadoPrevisao,
  PontoPrevisao,
  PrevisaoMetrica
} from '../interfaces/previsoes.interface';
import { ResultadoAnaliseTendencia } from '../interfaces/tendencias.interface';
import { EstatisticaUtils } from '../utils/estatistica.utils';

/**
 * Serviço responsável pela detecção de anomalias e análise de tendências
 * 
 * Este serviço implementa algoritmos estatísticos para identificar valores
 * anômalos e tendências nas séries temporais de métricas.
 */
@Injectable()
export class MetricasAnomaliasService {
  private readonly logger = new Logger(MetricasAnomaliasService.name);
  
  // Limites de Z-score para diferentes níveis de confiança
  private readonly Z_SCORE_LIMITES = {
    [NivelConfiancaAnomalia.BAIXO]: 2.0,    // 95.5% dos dados dentro deste limite
    [NivelConfiancaAnomalia.MEDIO]: 2.5,    // 98.8% dos dados dentro deste limite
    [NivelConfiancaAnomalia.ALTO]: 3.0,     // 99.7% dos dados dentro deste limite
  };
  
  // Número mínimo de pontos para análise estatística confiável
  private readonly MIN_PONTOS_ANALISE = 5;
  
  constructor(
    @InjectRepository(MetricaDefinicao)
    private readonly metricaDefinicaoRepository: Repository<MetricaDefinicao>,
    
    @InjectRepository(MetricaSnapshot)
    private readonly metricaSnapshotRepository: Repository<MetricaSnapshot>,
    
    private readonly eventEmitter: EventEmitter2,
  ) {}
  
  /**
   * Detecta anomalias para um snapshot específico
   * 
   * @param snapshotId ID do snapshot a ser analisado
   * @param nivelConfianca Nível de confiança para detecção
   * @param janelaTemporal Número de dias a considerar para o histórico
   * @returns Resultado da detecção de anomalias
   */
  async detectarAnomaliasPorSnapshot(
    snapshotId: string,
    nivelConfianca: NivelConfiancaAnomalia = NivelConfiancaAnomalia.MEDIO,
    janelaTemporal: number = 30,
  ): Promise<ResultadoDeteccaoAnomalia> {
    this.logger.debug(`Analisando anomalias para snapshot: ${snapshotId}`);
    
    // Buscar snapshot a ser analisado
    const snapshot = await this.metricaSnapshotRepository.findOne({
      where: { id: snapshotId },
      relations: ['definicao'],
    });
    
    if (!snapshot) {
      throw new Error(`Snapshot não encontrado: ${snapshotId}`);
    }
    
    // Calcular limite de data para o histórico
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - janelaTemporal);
    
    // Buscar snapshots históricos para comparação
    const snapshotsHistoricos = await this.metricaSnapshotRepository.find({
      where: {
        definicao_id: snapshot.definicao_id,
        dimensoes_hash: snapshot.dimensoes_hash,
        periodo_fim: Between(dataLimite, snapshot.periodo_inicio),
        id: Not(snapshot.id), // Excluir o próprio snapshot da análise
      },
      order: {
        periodo_fim: 'DESC',
      },
    });
    
    // Verificar se há pontos suficientes para análise
    if (snapshotsHistoricos.length < this.MIN_PONTOS_ANALISE) {
      this.logger.debug(
        `Pontos insuficientes para análise estatística confiável: ${snapshotsHistoricos.length} < ${this.MIN_PONTOS_ANALISE}`
      );
      
      // Carregar dados da definição para acesso às propriedades
    const definicao = await snapshot.definicao;
    
    return {
      metrica_id: snapshot.definicao_id,
      metrica_codigo: definicao.codigo,
      metrica_nome: definicao.nome,
      snapshot_id: snapshot.id,
      valor: snapshot.valor,
      valor_medio_historico: 0,
      desvio_padrao_historico: 0,
      z_score: 0,
      e_anomalia: false,
      gravidade: 0,
      dimensoes: snapshot.dimensoes,
      periodo: {
        inicio: snapshot.periodo_inicio,
        fim: snapshot.periodo_fim,
      },
      timestamp: new Date(),
    };
    }
    
    // Calcular média e desvio padrão dos valores históricos
    const valoresHistoricos = snapshotsHistoricos.map(s => s.valor);
    const media = EstatisticaUtils.calcularMedia(valoresHistoricos);
    const desvioPadrao = EstatisticaUtils.calcularDesvioPadrao(valoresHistoricos, media);
    
    // Calcular Z-score (número de desvios padrão em relação à média)
    const zScore = desvioPadrao === 0 ? 0 : Math.abs((snapshot.valor - media) / desvioPadrao);
    
    // Determinar se o valor é uma anomalia
    const limiteZScore = this.Z_SCORE_LIMITES[nivelConfianca];
    const eAnomalia = zScore > limiteZScore;
    
    // Carregar dados da definição para acesso às propriedades
  const definicao = await snapshot.definicao;
  
  const resultado: ResultadoDeteccaoAnomalia = {
    metrica_id: snapshot.definicao_id,
    metrica_codigo: definicao.codigo,
    metrica_nome: definicao.nome,
    snapshot_id: snapshot.id,
    valor: snapshot.valor,
    valor_medio_historico: media,
    desvio_padrao_historico: desvioPadrao,
    z_score: zScore,
    e_anomalia: eAnomalia,
    gravidade: zScore,
    dimensoes: snapshot.dimensoes,
    periodo: {
      inicio: snapshot.periodo_inicio,
      fim: snapshot.periodo_fim,
    },
    timestamp: new Date(),
  };
    
    // Emitir evento se for detectada uma anomalia
    if (eAnomalia) {
      this.logger.warn(
        `Anomalia detectada para métrica ${definicao.codigo}: valor=${snapshot.valor}, z-score=${zScore.toFixed(2)}`
      );
      
      this.eventEmitter.emit('metrica.anomalia.detectada', resultado);
    }
    
    return resultado;
  }
  
  /**
   * Detecta anomalias para uma métrica específica por código
   * 
   * @param codigo Código da métrica a ser analisada
   * @param dataInicio Data de início do período de análise
   * @param dataFim Data de fim do período de análise
   * @returns Lista de anomalias detectadas no período
   */
  async detectarAnomaliasPorCodigo(
    codigo: string,
    dataInicio?: Date,
    dataFim?: Date
  ): Promise<ResultadoDeteccaoAnomaliaPorCodigo> {
    this.logger.debug(`Analisando anomalias para métrica: ${codigo}`);
    
    // Buscar métrica pelo código
    const metrica = await this.metricaDefinicaoRepository.findOne({
      where: { codigo }
    });
    
    if (!metrica) {
      throw new Error(`Métrica não encontrada: ${codigo}`);
    }
    
    // Definir período de análise se não informado
    const dataFimEfetiva = dataFim || new Date();
    
    // Se data início não informada, usar 30 dias antes da data fim
    let dataInicioEfetiva = dataInicio;
    if (!dataInicioEfetiva) {
      dataInicioEfetiva = new Date(dataFimEfetiva);
      dataInicioEfetiva.setDate(dataInicioEfetiva.getDate() - 30);
    }
    
    // Buscar snapshots no período
    const snapshots = await this.metricaSnapshotRepository.find({
      where: {
        definicao_id: metrica.id,
        periodo_fim: Between(dataInicioEfetiva, dataFimEfetiva)
      },
      order: {
        periodo_fim: 'ASC'
      }
    });
    
    if (snapshots.length < this.MIN_PONTOS_ANALISE) {
      return {
        codigo: metrica.codigo,
        nome: metrica.nome,
        periodo: {
          inicio: dataInicioEfetiva,
          fim: dataFimEfetiva
        },
        total_snapshots: snapshots.length,
        anomalias: [],
        estatisticas: {
          media: 0,
          desvio_padrao: 0,
          mediana: 0,
          min: 0,
          max: 0
        },
        mensagem: `Pontos insuficientes para análise (mínimo: ${this.MIN_PONTOS_ANALISE})`
      };
    }
    
    // Calcular estatísticas básicas
    const valores = snapshots.map(s => s.valor);
    const media = EstatisticaUtils.calcularMedia(valores);
    const desvioPadrao = EstatisticaUtils.calcularDesvioPadrao(valores, media);
    const valoresOrdenados = [...valores].sort((a, b) => a - b);
    const min = valoresOrdenados[0];
    const max = valoresOrdenados[valoresOrdenados.length - 1];
    const mediana = EstatisticaUtils.calcularMediana(valoresOrdenados);
    
    // Detectar anomalias usando Z-score
    const anomalias: AnomaliaDetectada[] = [];
    const limiteZScore = this.Z_SCORE_LIMITES[NivelConfiancaAnomalia.MEDIO];
    
    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i];
      const zScore = desvioPadrao === 0 ? 0 : Math.abs((snapshot.valor - media) / desvioPadrao);
      
      if (zScore > limiteZScore) {
        let severidade: 'baixa' | 'media' | 'alta';
        
        if (zScore > this.Z_SCORE_LIMITES[NivelConfiancaAnomalia.ALTO]) {
          severidade = 'alta';
        } else if (zScore > this.Z_SCORE_LIMITES[NivelConfiancaAnomalia.MEDIO]) {
          severidade = 'media';
        } else {
          severidade = 'baixa';
        }
        
        anomalias.push({
          data: snapshot.periodo_fim,
          valor: snapshot.valor,
          desvio_padrao: zScore,
          severidade,
          dimensoes: snapshot.dimensoes
        });
      }
    }
    
    return {
      codigo: metrica.codigo,
      nome: metrica.nome,
      periodo: {
        inicio: dataInicioEfetiva,
        fim: dataFimEfetiva
      },
      total_snapshots: snapshots.length,
      estatisticas: {
        media,
        desvio_padrao: desvioPadrao,
        mediana,
        min,
        max
      },
      anomalias,
      total_anomalias: anomalias.length
    };
  }

  /**
   * Analisa anomalias em lote para todas as métricas
   * 
   * @param janelaTemporal Número de dias a considerar
   * @param nivelConfianca Nível de confiança para detecção
   * @returns Lista de anomalias detectadas
   */
  async detectarAnomaliasBatch(
    janelaTemporal = 7, 
    nivelConfianca = NivelConfiancaAnomalia.MEDIO
  ): Promise<ResultadoDeteccaoAnomalia[]> {
    this.logger.log(`Iniciando detecção de anomalias em lote (janela: ${janelaTemporal} dias)`);
    
    const anomalias: ResultadoDeteccaoAnomalia[] = [];
    
    try {
      // Calcular data limite para análise
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - janelaTemporal);
      
      // Buscar métricas ativas
      const metricas = await this.metricaDefinicaoRepository.find({
        where: { ativa: true }
      });
      
      this.logger.debug(`Analisando ${metricas.length} métricas ativas`);
      
      // Para cada métrica, analisar os snapshots mais recentes
      for (const metrica of metricas) {
        // Buscar snapshots recentes agrupados por dimensão
        const snapshots = await this.metricaSnapshotRepository.find({
          where: {
            definicao_id: metrica.id,
            periodo_fim: MoreThan(dataLimite)
          },
          order: {
            periodo_fim: 'DESC'
          }
        });
        
        // Agrupar por dimensão e analisar apenas o snapshot mais recente de cada grupo
        const grupoPorDimensao: Record<string, MetricaSnapshot[]> = {};
        
        for (const snapshot of snapshots) {
          if (!grupoPorDimensao[snapshot.dimensoes_hash]) {
            grupoPorDimensao[snapshot.dimensoes_hash] = [];
          }
          
          grupoPorDimensao[snapshot.dimensoes_hash].push(snapshot);
        }
        
        // Analisar o snapshot mais recente de cada grupo
        for (const grupo of Object.values(grupoPorDimensao)) {
          if (grupo.length > 0) {
            const snapshotRecente = grupo[0];
            
            try {
              const resultado = await this.detectarAnomaliasPorSnapshot(
                snapshotRecente.id, 
                nivelConfianca, 
                janelaTemporal
              );
              
              if (resultado.e_anomalia) {
                anomalias.push(resultado);
              }
            } catch (error) {
              this.logger.error(
                `Erro ao analisar anomalias para métrica ${metrica.codigo} (snapshot ${snapshotRecente.id}): ${error.message}`,
                error.stack
              );
            }
          }
        }
      }
      
      this.logger.log(`Detecção de anomalias concluída: ${anomalias.length} anomalias encontradas`);
      
      return anomalias;
    } catch (error) {
      this.logger.error(`Erro na detecção de anomalias em lote: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Analisa tendências para uma métrica em um período específico
   * 
   * @param metricaId ID da métrica a ser analisada
   * @param inicio Data de início do período
   * @param fim Data de fim do período
   * @param dimensoes Dimensões para filtrar os snapshots
   * @returns Resultado da análise de tendências
   */
  async analisarTendencias(
    metricaId: string,
    inicio: Date,
    fim: Date,
    dimensoes: Record<string, any> = {},
  ): Promise<ResultadoAnaliseTendencia> {
    this.logger.debug(`Analisando tendências para métrica: ${metricaId}`);
    
    // Buscar métrica
    const metrica = await this.metricaDefinicaoRepository.findOne({
      where: { id: metricaId },
    });
    
    if (!metrica) {
      throw new Error(`Métrica não encontrada: ${metricaId}`);
    }
    
    // Gerar hash das dimensões
    const dimensoesHash = EstatisticaUtils.gerarHashDimensoes(dimensoes);
    
    // Buscar snapshots no período
    const snapshots = await this.metricaSnapshotRepository.find({
      where: {
        definicao_id: metricaId,
        dimensoes_hash: dimensoesHash,
        periodo_fim: Between(inicio, fim),
      },
      order: {
        periodo_fim: 'ASC',
      },
    });
    
    // Verificar se há pontos suficientes para análise
    if (snapshots.length < this.MIN_PONTOS_ANALISE) {
      this.logger.debug(
        `Pontos insuficientes para análise de tendências: ${snapshots.length} < ${this.MIN_PONTOS_ANALISE}`
      );
      
      return {
        metrica_id: metricaId,
        metrica_codigo: metrica.codigo,
        metrica_nome: metrica.nome,
        direcao: 'estavel',
        intensidade: 0,
        confianca: 0,
        previsao: {
          valor: 0,
          intervalo_confianca: {
            minimo: 0,
            maximo: 0,
          },
        },
        valores_analisados: snapshots.map(s => ({
          valor: s.valor,
          periodo_inicio: s.periodo_inicio,
          periodo_fim: s.periodo_fim,
        })),
        dimensoes,
        periodo: { inicio, fim },
        timestamp: new Date(),
      };
    }
    
    // Extrair valores para análise
    const valores = snapshots.map(s => s.valor);
    
    // Calcular tendência usando regressão linear simples
    const { coeficienteAngular, intercepto, r2 } = EstatisticaUtils.calcularRegressaoLinear(valores);
    
    // Determinar direção da tendência
    let direcao: 'crescente' | 'decrescente' | 'estavel';
    
    if (Math.abs(coeficienteAngular) < 0.01) {
      direcao = 'estavel';
    } else if (coeficienteAngular > 0) {
      direcao = 'crescente';
    } else {
      direcao = 'decrescente';
    }
    
    // Calcular intensidade (variação percentual média por período)
    const valorMedio = EstatisticaUtils.calcularMedia(valores);
    const intensidade = (coeficienteAngular / valorMedio) * 100;
    
    // Calcular previsão para o próximo período
    const proximoPeriodo = valores.length + 1;
    const valorPrevisto = intercepto + coeficienteAngular * proximoPeriodo;
    
    // Calcular intervalo de confiança (simplificado)
    const errosPreditos = valores.map((valor, i) => 
      valor - (intercepto + coeficienteAngular * (i + 1))
    );
    const erroPadrao = Math.sqrt(errosPreditos.reduce((sum, e) => sum + e * e, 0) / (valores.length - 2));
    const intervaloConfianca = 1.96 * erroPadrao; // 95% de confiança
    
    const resultado: ResultadoAnaliseTendencia = {
      metrica_id: metricaId,
      metrica_codigo: metrica.codigo,
      metrica_nome: metrica.nome,
      direcao,
      intensidade: Number(intensidade.toFixed(2)),
      confianca: Number(r2.toFixed(4)),
      previsao: {
        valor: Number(valorPrevisto.toFixed(2)),
        intervalo_confianca: {
          minimo: Number((valorPrevisto - intervaloConfianca).toFixed(2)),
          maximo: Number((valorPrevisto + intervaloConfianca).toFixed(2)),
        },
      },
      valores_analisados: snapshots.map(s => ({
        valor: s.valor,
        periodo_inicio: s.periodo_inicio,
        periodo_fim: s.periodo_fim,
      })),
      dimensoes,
      periodo: { inicio, fim },
      timestamp: new Date(),
    };
    
    // Emitir evento com resultado da análise
    this.eventEmitter.emit('metrica.tendencia.analisada', resultado);
    
    return resultado;
  }

  /**
   * Gera previsões para uma métrica específica
   * 
   * @param metricaId ID da métrica
   * @param horizonte Número de períodos para prever
   * @param intervaloConfianca Nível de confiança para o intervalo de previsão
   * @param modeloNome Nome do modelo de previsão a ser utilizado
   * @returns Previsão com valores e intervalos de confiança
   */
  async gerarPrevisaoMetrica(
    metricaId: string,
    horizonte: number = 3,
    intervaloConfianca: number = 0.95,
    modeloNome: string = 'auto'
  ): Promise<PrevisaoMetrica> {
    this.logger.debug(`Gerando previsão para métrica ID: ${metricaId}`);
    
    // Buscar métrica
    const metrica = await this.metricaDefinicaoRepository.findOne({
      where: { id: metricaId }
    });
    
    if (!metrica) {
      throw new Error(`Métrica não encontrada: ${metricaId}`);
    }
    
    return this.gerarPrevisaoImpl(
      metrica,
      horizonte,
      intervaloConfianca,
      modeloNome
    );
  }
  
  /**
   * Gera previsões para uma métrica específica pelo código
   * 
   * @param codigo Código da métrica
   * @param horizonte Número de períodos para prever
   * @param intervaloConfianca Nível de confiança para o intervalo de previsão
   * @param modeloNome Nome do modelo de previsão a ser utilizado
   * @returns Previsão com valores e intervalos de confiança
   */
  async gerarPrevisaoPorCodigo(
    codigo: string,
    horizonte: number = 3,
    intervaloConfianca: number = 0.95,
    modeloNome: string = 'auto'
  ): Promise<PrevisaoMetrica> {
    this.logger.debug(`Gerando previsão para métrica código: ${codigo}`);
    
    // Buscar métrica pelo código
    const metrica = await this.metricaDefinicaoRepository.findOne({
      where: { codigo }
    });
    
    if (!metrica) {
      throw new Error(`Métrica não encontrada: ${codigo}`);
    }
    
    return this.gerarPrevisaoImpl(
      metrica,
      horizonte,
      intervaloConfianca,
      modeloNome
    );
  }
  
  /**
   * Implementação da geração de previsão
   * @private
   */
  private async gerarPrevisaoImpl(
    metrica: MetricaDefinicao,
    horizonte: number,
    intervaloConfianca: number,
    modeloNome: string
  ): Promise<PrevisaoMetrica> {
    // Buscar dados históricos (90 dias)
    const dataFim = new Date();
    const dataInicio = new Date(dataFim);
    dataInicio.setDate(dataInicio.getDate() - 90);

    // Buscar snapshots no período
    const snapshots = await this.metricaSnapshotRepository.find({
      where: {
        definicao_id: metrica.id,
        periodo_fim: Between(dataInicio, dataFim)
      },
      order: {
        periodo_fim: 'ASC'
      }
    });

    // Verificar se há pontos suficientes para previsão
    if (snapshots.length < this.MIN_PONTOS_ANALISE) {
      throw new Error(`Pontos insuficientes para previsão (mínimo: ${this.MIN_PONTOS_ANALISE})`);
    }

    // Extrair valores e datas para análise
    const valores = snapshots.map(s => s.valor);
    const datas = snapshots.map(s => s.periodo_fim);

    // Determinar o melhor modelo de previsão
    let modeloEfetivo = modeloNome;
    if (modeloNome === 'auto') {
      // Para automático, escolhemos com base na análise dos dados
      if (snapshots.length >= 20) {
        // Com mais dados, podemos usar modelos mais sofisticados
        modeloEfetivo = 'suavizacao_exponencial';
      } else if (snapshots.length >= 10) {
        // Com quantidade média de dados
        modeloEfetivo = 'media_movel';
      } else {
        // Com poucos dados
        modeloEfetivo = 'regressao_linear';
      }
    }

    // Gerar previsão com base no modelo selecionado
    let resultado: ResultadoPrevisao;

    switch (modeloEfetivo) {
      case 'regressao_linear':
        resultado = this.previsaoRegressaoLinear(valores, datas, horizonte, intervaloConfianca);
        break;
      case 'media_movel':
        resultado = this.previsaoMediaMovel(valores, datas, horizonte, intervaloConfianca);
        break;
      case 'suavizacao_exponencial':
        resultado = this.previsaoSuavizacaoExponencial(valores, datas, horizonte, intervaloConfianca);
        break;
      default:
        resultado = this.previsaoRegressaoLinear(valores, datas, horizonte, intervaloConfianca);
    }

    return {
      metrica_id: metrica.id,
      metrica_codigo: metrica.codigo,
      metrica_nome: metrica.nome,
      resultado,
      dimensoes: {},
      periodo_historico: {
        inicio: dataInicio,
        fim: dataFim
      },
      timestamp: new Date()
    };
  }

  /**
   * Gera previsão usando regressão linear
   * @private
   */
  private previsaoRegressaoLinear(
    valores: number[],
    datas: Date[],
    horizonte: number,
    intervaloConfianca: number
  ): ResultadoPrevisao {
    // Converter datas para índices numéricos (dias desde a primeira data)
    const primeiraData = new Date(datas[0]);
    const indicesDias = datas.map(d => Math.floor((d.getTime() - primeiraData.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calcular regressão linear
    const { coeficienteAngular, intercepto, r2 } = EstatisticaUtils.calcularRegressaoLinear(
      indicesDias.map((x, i) => [x, valores[i]] as [number, number])
    );
    
    // Calcular erro padrão da estimação
    const valoresPreditos = indicesDias.map(x => intercepto + coeficienteAngular * x);
    const erros = valores.map((v, i) => v - valoresPreditos[i]);
    const somaQuadradosErros = erros.reduce((sum, e) => sum + e * e, 0);
    const erroMedio = Math.sqrt(somaQuadradosErros / (valores.length - 2));
    
    // Calcular fator para intervalo de confiança (aproximação normal)
    const z = intervaloConfianca >= 0.99 ? 2.576 : 
             intervaloConfianca >= 0.95 ? 1.96 : 
             intervaloConfianca >= 0.90 ? 1.645 : 1.28;
    
    // Gerar previsões para o horizonte
    const previsao: PontoPrevisao[] = [];
    
    const ultimoIndice = indicesDias[indicesDias.length - 1];
    const intervaloEntreDatas = Math.max(1, Math.floor(ultimoIndice / indicesDias.length));
    
    for (let i = 1; i <= horizonte; i++) {
      const indicePrevisao = ultimoIndice + i * intervaloEntreDatas;
      const valorPrevisto = intercepto + coeficienteAngular * indicePrevisao;
      const margemErro = z * erroMedio * Math.sqrt(1 + 1/valores.length + 
        Math.pow(indicePrevisao - EstatisticaUtils.calcularMedia(indicesDias), 2) / 
        indicesDias.reduce((sum, x) => sum + Math.pow(x - EstatisticaUtils.calcularMedia(indicesDias), 2), 0));
      
      const dataPrevisao = new Date(primeiraData);
      dataPrevisao.setDate(primeiraData.getDate() + indicePrevisao);
      
      previsao.push({
        data: dataPrevisao,
        valor: Number(valorPrevisto.toFixed(2)),
        intervalo_confianca: {
          minimo: Number((valorPrevisto - margemErro).toFixed(2)),
          maximo: Number((valorPrevisto + margemErro).toFixed(2))
        }
      });
    }
    
    return {
      previsao,
      r2,
      erro_medio: erroMedio,
      modelo: 'regressao_linear'
    };
  }

  /**
   * Gera previsão usando média móvel
   * @private
   */
  private previsaoMediaMovel(
    valores: number[],
    datas: Date[],
    horizonte: number,
    intervaloConfianca: number
  ): ResultadoPrevisao {
    // Tamanho da janela para média móvel (1/4 dos dados ou mínimo 3)
    const tamanhoJanela = Math.max(3, Math.floor(valores.length / 4));

    // Calcular médias móveis históricas
    const mediasMoveis: number[] = [];
    const erros: number[] = [];

    for (let i = tamanhoJanela; i < valores.length; i++) {
      const janela = valores.slice(i - tamanhoJanela, i);
      const mediaMovel = EstatisticaUtils.calcularMedia(janela);
      mediasMoveis.push(mediaMovel);
      erros.push(valores[i] - mediaMovel);
    }

    // Calcular erro médio e desvio padrão dos erros
    const erroMedio = EstatisticaUtils.calcularMedia(erros.map(e => Math.abs(e)));
    const desvioPadraoErros = EstatisticaUtils.calcularDesvioPadrao(erros);

    // Calcular fator para intervalo de confiança
    const z = intervaloConfianca >= 0.99 ? 2.576 : 
      intervaloConfianca >= 0.95 ? 1.96 :
      intervaloConfianca >= 0.90 ? 1.645 : 1.28;

    // Gerar previsões
    const previsao: PontoPrevisao[] = [];
    
    let valoresPrevistos = [...valores];

    for (let i = 1; i <= horizonte; i++) {
      // Usar os últimos 'tamanhoJanela' valores para prever o próximo
      const ultimosValores = valoresPrevistos.slice(-tamanhoJanela);
      const proximoValor = EstatisticaUtils.calcularMedia(ultimosValores);

      // Adicionar à lista de valores para usar nas próximas previsões
      valoresPrevistos.push(proximoValor);

      // Calcular data da previsão
      const ultimaData = new Date(datas[datas.length - 1]);
      const dataPrevisao = new Date(ultimaData);
      const intervaloMedioDias = Math.floor(
        (datas[datas.length - 1].getTime() - datas[0].getTime()) / 
        (1000 * 60 * 60 * 24 * (datas.length - 1))
      );

      dataPrevisao.setDate(ultimaData.getDate() + i * intervaloMedioDias);

      previsao.push({
        data: dataPrevisao,
        valor: Number(proximoValor.toFixed(2)),
        intervalo_confianca: {
          minimo: Number((proximoValor - z * desvioPadraoErros).toFixed(2)),
          maximo: Number((proximoValor + z * desvioPadraoErros).toFixed(2))
        }
      });
    }

    // Calcular pseudo-R² (1 - SSE/SST)
    const media = EstatisticaUtils.calcularMedia(valores);
    const sst = valores.reduce((sum, v) => sum + Math.pow(v - media, 2), 0);
    const sse = erros.reduce((sum, e) => sum + Math.pow(e, 2), 0);
    const r2 = sst === 0 ? 0 : 1 - (sse / sst);

    return {
      previsao,
      r2,
      erro_medio: erroMedio,
      modelo: 'media_movel'
    };
  }

  /**
   * Gera previsão usando suavização exponencial simples
   * @private
   */
  private previsaoSuavizacaoExponencial(
    valores: number[],
    datas: Date[],
    horizonte: number,
    intervaloConfianca: number
  ): ResultadoPrevisao {
    // Fator de suavização (alpha)
    const alpha = 0.3;

    // Calcular valores suavizados
    const valoresSuavizados: number[] = [valores[0]];
    const erros: number[] = [0];

    for (let i = 1; i < valores.length; i++) {
      const valorSuavizado = alpha * valores[i] + (1 - alpha) * valoresSuavizados[i - 1];
      valoresSuavizados.push(valorSuavizado);
      erros.push(valores[i] - valorSuavizado);
    }

    // Calcular erro médio e desvio padrão dos erros
    const erroMedio = EstatisticaUtils.calcularMedia(erros.slice(1).map(e => Math.abs(e)));
    const desvioPadraoErros = EstatisticaUtils.calcularDesvioPadrao(erros.slice(1));

    // Calcular fator para intervalo de confiança
    const z = intervaloConfianca >= 0.99 ? 2.576 :
      intervaloConfianca >= 0.95 ? 1.96 :
      intervaloConfianca >= 0.90 ? 1.645 : 1.28;

    // Último valor suavizado para iniciar a previsão
    const ultimoValorSuavizado = valoresSuavizados[valoresSuavizados.length - 1];

    // Gerar previsões
    const previsao: PontoPrevisao[] = [];

    for (let i = 1; i <= horizonte; i++) {
      // Na suavização exponencial simples, a previsão é o último valor suavizado
      // (constante para todos os horizontes futuros)

      // Calcular data da previsão
      const ultimaData = new Date(datas[datas.length - 1]);
      const dataPrevisao = new Date(ultimaData);
      const intervaloMedioDias = Math.floor(
        (datas[datas.length - 1].getTime() - datas[0].getTime()) /
        (1000 * 60 * 60 * 24 * (datas.length - 1))
      );

      dataPrevisao.setDate(ultimaData.getDate() + i * intervaloMedioDias);

      // Aumentar a incerteza com o horizonte
      const fatorIncerteza = Math.sqrt(i);

      previsao.push({
        data: dataPrevisao,
        valor: Number(ultimoValorSuavizado.toFixed(2)),
        intervalo_confianca: {
          minimo: Number((ultimoValorSuavizado - z * desvioPadraoErros * fatorIncerteza).toFixed(2)),
          maximo: Number((ultimoValorSuavizado + z * desvioPadraoErros * fatorIncerteza).toFixed(2))
        }
      });
    }

    // Calcular pseudo-R² (1 - SSE/SST)
    const media = EstatisticaUtils.calcularMedia(valores);
    const sst = valores.reduce((sum, v) => sum + Math.pow(v - media, 2), 0);
    const sse = erros.slice(1).reduce((sum, e) => sum + Math.pow(e, 2), 0);
    const r2 = sst === 0 ? 0 : 1 - (sse / sst);

    return {
      previsao,
      r2,
      erro_medio: erroMedio,
      modelo: 'suavizacao_exponencial'
    };
  }
}