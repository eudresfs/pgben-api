import { Module } from '@nestjs/common';
import { ScheduleAdapterService } from './schedule-adapter.service';

/**
 * Módulo adaptador para agendamento
 * 
 * Este módulo fornece uma solução alternativa para o agendamento de tarefas
 * enquanto resolvemos os problemas de compatibilidade com o ScheduleModule.
 */
@Module({
  providers: [ScheduleAdapterService],
  exports: [ScheduleAdapterService]
})
export class ScheduleAdapterModule {}
