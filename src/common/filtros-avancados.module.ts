import { Module } from '@nestjs/common';
import { FiltrosAvancadosService } from './services/filtros-avancados.service';
import { FiltrosAvancadosCacheService } from './cache/filtros-avancados-cache.service';

/**
 * Módulo central para o sistema de filtros avançados
 * 
 * Responsabilidades:
 * - Fornecer o serviço principal de filtros
 * - Integrar sistema de cache
 * - Centralizar lógica de filtragem
 * 
 * Este módulo deve ser importado por todos os módulos
 * que precisam utilizar filtros avançados.
 */
@Module({
  providers: [
    FiltrosAvancadosService,
    FiltrosAvancadosCacheService,
  ],
  exports: [
    FiltrosAvancadosService,
    FiltrosAvancadosCacheService,
  ],
})
export class FiltrosAvancadosModule {}