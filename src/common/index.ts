// Enums
export { ScopeType } from '../enums/scope-type.enum';

// Interfaces
export { IScopeContext } from './interfaces/scope-context.interface';
export {
  IUserIdentifierService,
  UserIdentificationResult,
  UserIdentificationStrategy,
} from './interfaces/user-identifier.interface';

// Exceptions
export {
  ScopeViolationException,
  InvalidScopeContextException,
  InvalidScopeTypeException,
} from './exceptions/scope.exceptions';

// Services
export { RequestContextHolder } from './services/request-context-holder.service';
export { UserIdentifierService } from './services/user-identifier.service';

// Repositories
export { ScopedRepository } from './repositories/scoped-repository';

// Providers
export {
  createScopedRepositoryProvider,
  getScopedRepositoryToken,
  InjectScopedRepository,
  createScopedRepositoryProviders,
} from './providers/scoped-repository.provider';

// Decorators
export {
  NoScope,
  hasNoScopeDecorator,
  NoScopeAuditInterceptor,
  NO_SCOPE_KEY,
} from './decorators/no-scope.decorator';

// Middleware
// ScopeContextMiddleware removido - substituído por ScopeContextInterceptor

// Module
export { CommonModule } from './common.module';
