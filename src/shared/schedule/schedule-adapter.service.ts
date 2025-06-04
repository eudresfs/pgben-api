import { Injectable, Logger } from '@nestjs/common';

/**
 * Serviço adaptador para agendamento
 *
 * Este serviço implementa uma solução alternativa para o agendamento de tarefas
 * enquanto resolvemos os problemas de compatibilidade com o ScheduleModule.
 */
@Injectable()
export class ScheduleAdapterService {
  private readonly logger = new Logger(ScheduleAdapterService.name);
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Agenda uma tarefa para ser executada em intervalos regulares
   *
   * @param name Nome único para identificar a tarefa
   * @param milliseconds Intervalo em milissegundos
   * @param callback Função a ser executada
   */
  scheduleInterval(
    name: string,
    milliseconds: number,
    callback: () => Promise<void>,
  ): void {
    // Cancela o intervalo existente, se houver
    this.cancelInterval(name);

    // Cria um novo intervalo
    const interval = setInterval(async () => {
      try {
        await callback();
      } catch (error) {
        this.logger.error(
          `Erro ao executar tarefa agendada ${name}: ${error.message}`,
        );
      }
    }, milliseconds);

    // Armazena o intervalo para referência futura
    this.intervals.set(name, interval);
    this.logger.log(
      `Tarefa ${name} agendada para executar a cada ${milliseconds}ms`,
    );
  }

  /**
   * Cancela uma tarefa agendada
   *
   * @param name Nome da tarefa a ser cancelada
   */
  cancelInterval(name: string): void {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
      this.logger.log(`Tarefa ${name} cancelada`);
    }
  }

  /**
   * Agenda uma tarefa para ser executada diariamente em um horário específico
   *
   * @param name Nome único para identificar a tarefa
   * @param hour Hora do dia (0-23)
   * @param minute Minuto (0-59)
   * @param callback Função a ser executada
   */
  scheduleDailyTask(
    name: string,
    hour: number,
    minute: number,
    callback: () => Promise<void>,
  ): void {
    this.cancelInterval(name);

    const calculateNextRun = (): number => {
      const now = new Date();
      const nextRun = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute,
        0,
      );

      // Se o horário já passou hoje, agendar para amanhã
      if (nextRun.getTime() <= now.getTime()) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      return nextRun.getTime() - now.getTime();
    };

    const scheduleNext = () => {
      const timeUntilNextRun = calculateNextRun();

      const timeout = setTimeout(async () => {
        try {
          await callback();
        } catch (error) {
          this.logger.error(
            `Erro ao executar tarefa diária ${name}: ${error.message}`,
          );
        }

        // Agenda a próxima execução
        scheduleNext();
      }, timeUntilNextRun);

      this.intervals.set(name, timeout as unknown as NodeJS.Timeout);
      this.logger.log(
        `Tarefa diária ${name} agendada para executar em ${Math.floor(timeUntilNextRun / 1000 / 60)} minutos`,
      );
    };

    // Inicia o agendamento
    scheduleNext();
  }

  /**
   * Agenda uma tarefa para ser executada uma única vez em uma data específica
   *
   * @param name Nome único para identificar a tarefa
   * @param date Data e hora para execução da tarefa
   * @param callback Função a ser executada
   */
  scheduleOnce(name: string, date: Date, callback: () => Promise<void>): void {
    // Cancela o timeout existente, se houver
    this.cancelTimeout(name);

    const now = new Date();
    const delay = date.getTime() - now.getTime();

    if (delay <= 0) {
      // Se a data já passou, executar imediatamente
      callback().catch((error) => {
        this.logger.error(
          `Erro ao executar tarefa agendada ${name}: ${error.message}`,
        );
      });
      return;
    }

    // Criar um novo timeout
    const timeout = setTimeout(async () => {
      try {
        await callback();
        // Remover da lista após execução
        this.timeouts.delete(name);
      } catch (error) {
        this.logger.error(
          `Erro ao executar tarefa agendada ${name}: ${error.message}`,
        );
      }
    }, delay);

    // Armazenar o timeout para referência futura
    this.timeouts.set(name, timeout);
    this.logger.log(
      `Tarefa ${name} agendada para executar em ${new Date(now.getTime() + delay).toISOString()}`,
    );
  }

  /**
   * Cancela um timeout agendado
   *
   * @param name Nome da tarefa a ser cancelada
   */
  cancelTimeout(name: string): void {
    const timeout = this.timeouts.get(name);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(name);
      this.logger.log(`Timeout ${name} cancelado`);
    }
  }
}
