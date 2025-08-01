import { Provider, Inject, Optional } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ScopedRepository } from '../repositories/scoped-repository';
import { CacheService } from '../../shared/cache/cache.service';

/**
 * Cria um provider para ScopedRepository de uma entidade específica
 * 
 * @param entity - Classe da entidade
 * @returns Provider configurado para injeção de dependência
 */
export function createScopedRepositoryProvider<Entity>(
  entity: new () => Entity
): Provider {
  return {
    provide: getScopedRepositoryToken(entity),
    useFactory: (dataSource: DataSource, cacheService?: CacheService) => {
      // Obter o repository base do TypeORM
      const baseRepository = dataSource.getRepository(entity);
      
      // Criar uma instância do ScopedRepository usando o construtor correto
      const scopedRepository = new ScopedRepository(
        entity,
        baseRepository.manager,
        baseRepository.queryRunner,
        {
          strictMode: true,
          allowGlobalScope: false,
          enableMetadataCache: true,
          metadataCacheTTL: 3600,
          enableQueryHints: true,
          forceIndexUsage: false
        },
        cacheService
      );
      
      return scopedRepository;
    },
    inject: [getDataSourceToken(), { token: CacheService, optional: true }]
  };
}

/**
 * Gera o token para injeção do ScopedRepository
 * 
 * @param entity - Classe da entidade
 * @returns Token único para o ScopedRepository da entidade
 */
export function getScopedRepositoryToken<Entity>(
  entity: new () => Entity
): string {
  return `SCOPED_REPOSITORY_${entity.name.toUpperCase()}`;
}

/**
 * Decorator para injetar ScopedRepository
 * 
 * @param entity - Classe da entidade
 * @returns Decorator para injeção
 */
export function InjectScopedRepository<Entity>(
  entity: new () => Entity
) {
  const token = getScopedRepositoryToken(entity);
  return Inject(token);
}

/**
 * Utilitário para criar múltiplos providers de ScopedRepository
 * 
 * @param entities - Array de classes de entidades
 * @returns Array de providers configurados
 */
export function createScopedRepositoryProviders(
  entities: (new () => any)[]
): Provider[] {
  return entities.map(entity => createScopedRepositoryProvider(entity));
}