import { Provider, Inject } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ScopedRepository } from '../repositories/scoped-repository';

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
    useFactory: (dataSource: DataSource) => {
      // Obter o repository base do TypeORM
      const baseRepository = dataSource.getRepository(entity);
      
      // Criar uma instância do ScopedRepository e copiar as propriedades do repository base
      const scopedRepository = Object.create(ScopedRepository.prototype);
      Object.assign(scopedRepository, baseRepository);
      
      return scopedRepository;
    },
    inject: [getDataSourceToken()]
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