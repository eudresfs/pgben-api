import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { addBusinessDays, isWeekend, format } from 'date-fns';

/**
 * Interface para representar um feriado nacional
 */
interface FeriadoNacional {
  date: string;
  name: string;
  type: string;
}

/**
 * Serviço responsável por gerenciar feriados nacionais e cálculos de dias úteis
 *
 * Este serviço centraliza toda a lógica relacionada a:
 * - Busca de feriados nacionais via API Brasil
 * - Cache de feriados por ano
 * - Verificação se uma data é feriado
 * - Cálculos de dias úteis
 * - Ajuste de datas para próximo dia útil
 */
@Injectable()
export class FeriadoService {
  private readonly logger = new Logger(FeriadoService.name);
  private readonly feriados = new Map<number, Set<string>>();
  private feriadosAno: number | null = null;

  constructor(private readonly httpService: HttpService) {}

  /**
   * Busca feriados nacionais para um ano específico
   * Utiliza cache para evitar múltiplas requisições para o mesmo ano
   *
   * @param ano - Ano para buscar os feriados
   * @returns Promise<Set<string>> - Set com as datas dos feriados no formato YYYY-MM-DD
   */
  async buscarFeriadosNacionais(ano: number): Promise<Set<string>> {
    // Verifica se já temos os feriados em cache
    if (this.feriados.has(ano)) {
      return this.feriados.get(ano)!;
    }

    try {
      const url = `https://brasilapi.com.br/api/feriados/v1/${ano}`;
      const response = await firstValueFrom(
        this.httpService.get<FeriadoNacional[]>(url),
      );

      const feriadosSet = new Set<string>();
      response.data.forEach((feriado) => {
        feriadosSet.add(feriado.date);
      });

      // Armazena no cache
      this.feriados.set(ano, feriadosSet);
      this.feriadosAno = ano;

      this.logger.log(
        `Feriados carregados para o ano ${ano}: ${feriadosSet.size} feriados`,
      );
      return feriadosSet;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar feriados para o ano ${ano}:`,
        error.message,
      );
      // Retorna set vazio em caso de erro para não quebrar o fluxo
      const feriadosVazio = new Set<string>();
      this.feriados.set(ano, feriadosVazio);
      return feriadosVazio;
    }
  }

  /**
   * Verifica se uma data é feriado nacional
   *
   * @param data - Data a ser verificada
   * @returns Promise<boolean> - true se for feriado, false caso contrário
   */
  async isFeriado(data: Date): Promise<boolean> {
    const ano = data.getFullYear();
    const dataFormatada = format(data, 'yyyy-MM-dd');

    const feriadosDoAno = await this.buscarFeriadosNacionais(ano);
    return feriadosDoAno.has(dataFormatada);
  }

  /**
   * Verifica se uma data é dia útil (não é fim de semana nem feriado)
   *
   * @param data - Data a ser verificada
   * @returns Promise<boolean> - true se for dia útil, false caso contrário
   */
  async isDiaUtil(data: Date): Promise<boolean> {
    // Verifica se é fim de semana
    if (isWeekend(data)) {
      return false;
    }

    // Verifica se é feriado
    const ehFeriado = await this.isFeriado(data);
    return !ehFeriado;
  }

  /**
   * Ajusta uma data para o próximo dia útil
   * Se a data já for um dia útil, retorna a própria data
   *
   * @param data - Data a ser ajustada
   * @returns Promise<Date> - Próximo dia útil
   */
  async ajustarParaProximoDiaUtil(data: Date): Promise<Date> {
    let dataAjustada = new Date(data);

    while (!(await this.isDiaUtil(dataAjustada))) {
      dataAjustada.setDate(dataAjustada.getDate() + 1);
    }

    return dataAjustada;
  }

  /**
   * Adiciona dias úteis a uma data
   *
   * @param dataInicial - Data inicial
   * @param diasUteis - Quantidade de dias úteis a adicionar
   * @returns Promise<Date> - Data resultante após adicionar os dias úteis
   */
  async adicionarDiasUteis(
    dataInicial: Date,
    diasUteis: number,
  ): Promise<Date> {
    if (diasUteis === 0) {
      return new Date(dataInicial);
    }

    // Usa date-fns para adicionar dias úteis (considera apenas fins de semana)
    let dataResultante = addBusinessDays(dataInicial, diasUteis);

    // Ajusta para considerar feriados
    let diasAdicionados = 0;
    let dataAtual = new Date(dataInicial);

    while (diasAdicionados < diasUteis) {
      dataAtual.setDate(dataAtual.getDate() + 1);

      if (await this.isDiaUtil(dataAtual)) {
        diasAdicionados++;
      }
    }

    return dataAtual;
  }

  /**
   * Limpa o cache de feriados
   * Útil para testes ou quando necessário recarregar os dados
   */
  limparCache(): void {
    this.feriados.clear();
    this.feriadosAno = null;
    this.logger.log('Cache de feriados limpo');
  }

  /**
   * Retorna estatísticas do cache de feriados
   * Útil para monitoramento e debugging
   */
  getEstatisticasCache(): { anosCarregados: number[]; totalFeriados: number } {
    const anosCarregados = Array.from(this.feriados.keys());
    const totalFeriados = Array.from(this.feriados.values()).reduce(
      (total, feriadosAno) => total + feriadosAno.size,
      0,
    );

    return {
      anosCarregados,
      totalFeriados,
    };
  }
}
