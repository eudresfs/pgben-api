# Plano de Ação - Correções do Módulo de Pagamento

## Visão Geral

Este documento apresenta um plano de ação estruturado para implementar as correções identificadas no code review do módulo de pagamento, garantindo conformidade com as responsabilidades principais do módulo conforme definido no [guia de uso](./guia-uso.md).

## Responsabilidades Principais do Módulo

Segundo o guia de uso, o módulo de pagamento é responsável por:
- ✅ Controlar a liberação efetiva dos recursos para os beneficiários
- ✅ Gerenciar o ciclo completo de pagamentos (criação, liberação, confirmação)
- ✅ Integrar com outros módulos (Solicitação, Cidadão, Documento, Auditoria)
- ✅ Garantir segurança e auditoria de todas as operações
- ✅ Validar dados bancários e transições de status

## Priorização das Correções

### 🔴 **ALTA PRIORIDADE - Implementar Imediatamente**

#### 1. Segurança - Mascaramento de Dados Sensíveis
- [ ] **Tarefa**: Implementar mascaramento de dados bancários nos DTOs de resposta
- [ ] **Prazo**: 1 dia

**📋 Workflow de Implementação:**

**Passo 1: Criar utilitário de mascaramento**
- **Arquivo**: `src/modules/pagamento/utils/data-masking.util.ts`
- **Dependências**: Nenhuma adicional
- **Implementação**:
```typescript
export class DataMaskingUtil {
  /**
   * Mascara conta bancária mantendo apenas os últimos 4 dígitos
   * Regra: Mínimo 4 caracteres, máximo mascaramento de 12 caracteres
   */
  static maskConta(conta: string): string {
    if (!conta || conta.length < 4) return conta;
    const visibleDigits = 4;
    const maskedPart = '*'.repeat(Math.min(conta.length - visibleDigits, 12));
    return maskedPart + conta.slice(-visibleDigits);
  }

  /**
   * Mascara agência mantendo apenas os últimos 3 dígitos
   * Regra: Mínimo 3 caracteres para mascaramento
   */
  static maskAgencia(agencia: string): string {
    if (!agencia || agencia.length < 3) return agencia;
    const visibleDigits = 3;
    const maskedPart = '*'.repeat(agencia.length - visibleDigits);
    return maskedPart + agencia.slice(-visibleDigits);
  }

  /**
   * Mascara chave PIX baseada no tipo
   * Regras: CPF/CNPJ (***.***.***-**), Email (***@domain), Telefone (+55***), Aleatória (primeiros 8 chars)
   */
  static maskPixKey(pixKey: string, tipo: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA'): string {
    if (!pixKey) return pixKey;
    
    switch (tipo) {
      case 'CPF':
        return pixKey.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '***.***.***-**');
      case 'CNPJ':
        return pixKey.replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})-(\d{2})/, '**.***.***/****-**');
      case 'EMAIL':
        const [user, domain] = pixKey.split('@');
        return `***@${domain}`;
      case 'TELEFONE':
        return pixKey.replace(/(\+55)(\d{2})(\d+)/, '+55**$3'.replace(/\d/g, '*'));
      case 'ALEATORIA':
        return '*'.repeat(8) + pixKey.slice(-4);
      default:
        return '*'.repeat(pixKey.length);
    }
  }
}
```

**Passo 2: Atualizar DTO de resposta**
- **Arquivo**: `src/modules/pagamento/dtos/pagamento-response.dto.ts`
- **Dependências**: `class-transformer`, `./utils/data-masking.util`
- **Regras de Negócio**:
  - Dados bancários sempre mascarados em respostas
  - Logs de auditoria devem registrar acesso a dados sensíveis
  - Administradores podem ver dados completos (configurável)

```typescript
import { Transform, Expose } from 'class-transformer';
import { DataMaskingUtil } from '../utils/data-masking.util';

export class PagamentoResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Transform(({ value, obj }) => {
    if (!value) return value;
    
    // Regra: Admin pode ver dados completos se configurado
    const isAdmin = obj._context?.user?.perfil === 'ADMIN';
    const showFullData = obj._context?.showSensitiveData && isAdmin;
    
    if (showFullData) {
      return value;
    }

    return {
      ...value,
      conta: value.conta ? DataMaskingUtil.maskConta(value.conta) : undefined,
      agencia: value.agencia ? DataMaskingUtil.maskAgencia(value.agencia) : undefined,
      pixChave: value.pixChave ? DataMaskingUtil.maskPixKey(value.pixChave, value.pixTipo) : undefined,
      // Manter dados não sensíveis
      banco: value.banco,
      tipoConta: value.tipoConta,
      pixTipo: value.pixTipo
    };
  })
  dadosBancarios?: any;

  // ... outros campos
}
```

**Passo 3: Atualizar controller para contexto**
- **Arquivo**: `src/modules/pagamento/controllers/pagamento.controller.ts`
- **Método**: `mapToResponseDto`
- **Lógica**: Adicionar contexto do usuário para decisão de mascaramento

```typescript
private mapToResponseDto(pagamento: Pagamento, user?: any): PagamentoResponseDto {
  const context = {
    user,
    showSensitiveData: false // Configurável via feature flag
  };
  
  return plainToClass(PagamentoResponseDto, pagamento, {
    excludeExtraneousValues: true,
    enableImplicitConversion: true,
    exposeDefaultValues: true,
    // Passar contexto para transformers
    groups: user?.perfil === 'ADMIN' ? ['admin'] : ['user']
  });
}
```

**Passo 4: Atualizar testes**
- **Arquivo**: `src/modules/pagamento/tests/pagamento.controller.spec.ts`
- **Casos de teste**:
  - Dados mascarados para usuários normais
  - Dados completos para admins (se configurado)
  - Diferentes tipos de chave PIX

**Passo 5: Configuração de feature flag**
- **Arquivo**: `src/config/features.config.ts`
- **Variável**: `SHOW_SENSITIVE_DATA_TO_ADMIN=false`

#### 2. Performance - Correção do N+1 Problem
- [ ] **Tarefa**: Implementar eager loading no controller de pagamentos
- [ ] **Prazo**: 2 dias

**📋 Workflow de Implementação:**

**Passo 1: Analisar queries atuais**
- **Arquivo**: `src/modules/pagamento/services/pagamento.service.ts`
- **Ferramenta**: Habilitar logs SQL no TypeORM
- **Configuração**: `ormconfig.ts` → `logging: ['query', 'error']`
- **Análise**: Identificar métodos que fazem múltiplas consultas:
  - `findAll()` - busca pagamentos + N consultas para relações
  - `findBySolicitacao()` - busca por solicitação + relações
  - `findByStatus()` - busca por status + relações
  - `mapToResponseDto()` - acesso a propriedades lazy

**Passo 2: Criar query builder otimizado**
- **Arquivo**: `src/modules/pagamento/services/pagamento.service.ts`
- **Dependências**: TypeORM QueryBuilder
- **Implementação**:

```typescript
/**
 * Query builder base com todas as relações necessárias
 * Regra: Sempre incluir relações usadas no DTO de resposta
 */
private createBaseQuery(): SelectQueryBuilder<Pagamento> {
  return this.pagamentoRepository
    .createQueryBuilder('pagamento')
    .leftJoinAndSelect('pagamento.responsavelLiberacao', 'responsavel')
    .leftJoinAndSelect('pagamento.solicitacao', 'solicitacao')
    .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
    .leftJoinAndSelect('solicitacao.unidade', 'unidade')
    .leftJoinAndSelect('pagamento.comprovantes', 'comprovantes')
    .leftJoinAndSelect('pagamento.confirmacoes', 'confirmacoes')
    .leftJoinAndSelect('confirmacoes.responsavel', 'confirmacaoResponsavel');
}

/**
 * Busca otimizada por ID
 * Performance: 1 query vs N+1 queries
 */
async findOne(id: string): Promise<Pagamento> {
  const pagamento = await this.createBaseQuery()
    .where('pagamento.id = :id', { id })
    .getOne();

  if (!pagamento) {
    throw new NotFoundException(`Pagamento com ID ${id} não encontrado`);
  }

  return pagamento;
}

/**
 * Busca otimizada com filtros e paginação
 * Performance: 1 query principal + 1 query count vs N+1 queries
 */
async findAll(
  filtros: PagamentoFiltrosDto,
  paginacao: PaginacaoDto
): Promise<{ pagamentos: Pagamento[]; total: number }> {
  const query = this.createBaseQuery();

  // Aplicar filtros
  if (filtros.status) {
    query.andWhere('pagamento.status = :status', { status: filtros.status });
  }

  if (filtros.unidadeId) {
    query.andWhere('solicitacao.unidadeId = :unidadeId', { unidadeId: filtros.unidadeId });
  }

  if (filtros.dataInicio && filtros.dataFim) {
    query.andWhere('pagamento.createdAt BETWEEN :dataInicio AND :dataFim', {
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim
    });
  }

  // Ordenação
  query.orderBy('pagamento.createdAt', 'DESC');

  // Paginação
  const total = await query.getCount();
  const pagamentos = await query
    .skip((paginacao.page - 1) * paginacao.limit)
    .take(paginacao.limit)
    .getMany();

  return { pagamentos, total };
}

/**
 * Busca otimizada por solicitação
 * Performance: 1 query vs N+1 queries
 */
async findBySolicitacao(solicitacaoId: string): Promise<Pagamento[]> {
  return this.createBaseQuery()
    .where('solicitacao.id = :solicitacaoId', { solicitacaoId })
    .orderBy('pagamento.createdAt', 'DESC')
    .getMany();
}

/**
 * Busca otimizada por status
 * Performance: 1 query vs N+1 queries
 */
async findByStatus(status: StatusPagamento): Promise<Pagamento[]> {
  return this.createBaseQuery()
    .where('pagamento.status = :status', { status })
    .orderBy('pagamento.createdAt', 'DESC')
    .getMany();
}
```

**Passo 3: Otimizar controller**
- **Arquivo**: `src/modules/pagamento/controllers/pagamento.controller.ts`
- **Método**: Remover chamadas adicionais desnecessárias
- **Regras de Negócio**:
  - Dados já carregados via eager loading
  - Evitar acesso a propriedades lazy
  - Cache de dados de usuário quando possível

```typescript
/**
 * Método otimizado - remove busca adicional de usuário
 * Performance: Usa dados já carregados nas relações
 */
private async mapToResponseDto(pagamento: Pagamento): Promise<PagamentoResponseDto> {
  // Dados já disponíveis via eager loading - não fazer novas consultas
  const dto = new PagamentoResponseDto();
  dto.id = pagamento.id;
  dto.valor = pagamento.valor;
  dto.status = pagamento.status;
  dto.observacoes = pagamento.observacoes;
  dto.createdAt = pagamento.createdAt;
  dto.updatedAt = pagamento.updatedAt;
  
  // Usar dados já carregados
  if (pagamento.responsavelLiberacao) {
    dto.responsavelLiberacao = {
      id: pagamento.responsavelLiberacao.id,
      nome: pagamento.responsavelLiberacao.nome,
      email: pagamento.responsavelLiberacao.email
    };
  }

  if (pagamento.solicitacao) {
    dto.solicitacao = {
      id: pagamento.solicitacao.id,
      protocolo: pagamento.solicitacao.protocolo,
      beneficiario: pagamento.solicitacao.beneficiario ? {
        id: pagamento.solicitacao.beneficiario.id,
        nome: pagamento.solicitacao.beneficiario.nome,
        cpf: pagamento.solicitacao.beneficiario.cpf
      } : undefined,
      unidade: pagamento.solicitacao.unidade ? {
        id: pagamento.solicitacao.unidade.id,
        nome: pagamento.solicitacao.unidade.nome
      } : undefined
    };
  }

  // Comprovantes e confirmações já carregados
  dto.comprovantes = pagamento.comprovantes || [];
  dto.confirmacoes = pagamento.confirmacoes || [];

  return dto;
}
```

**Passo 4: Configurar logging para monitoramento**
- **Arquivo**: `ormconfig.ts`
- **Configuração**: Habilitar logs SQL em desenvolvimento

```typescript
export default {
  // ... outras configurações
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  logger: 'advanced-console',
  maxQueryExecutionTime: 1000, // Log queries > 1s
};
```

**Passo 5: Criar testes de performance**
- **Arquivo**: `src/modules/pagamento/tests/pagamento-performance.spec.ts`
- **Casos de teste**:
  - Contar número de queries executadas
  - Medir tempo de resposta
  - Validar dados carregados corretamente

```typescript
describe('Pagamento Performance Tests', () => {
  it('should execute only 1 query for findOne', async () => {
    const queryCount = await countQueries(async () => {
      await service.findOne('test-id');
    });
    expect(queryCount).toBeLessThanOrEqual(1);
  });

  it('should execute max 2 queries for findAll (data + count)', async () => {
    const queryCount = await countQueries(async () => {
      await service.findAll({}, { page: 1, limit: 10 });
    });
    expect(queryCount).toBeLessThanOrEqual(2);
  });
});
```

**Passo 6: Monitoramento pós-implementação**
- **Métricas**: Tempo de resposta, número de queries
- **Alertas**: Queries > 1s, mais de 3 queries por endpoint
- **Dashboard**: Grafana com métricas de performance

#### 3. Auditoria - Integração Real
- [ ] **Tarefa**: Substituir console.log por integração real com módulo de auditoria
- [ ] **Prazo**: 1 dia

**📋 Workflow de Implementação:**

**Passo 1: Analisar módulo de auditoria existente**
- **Arquivo**: `src/modules/auditoria/services/auditoria.service.ts`
- **Dependências**: Verificar interface e métodos disponíveis
- **Análise**: Identificar estrutura de dados esperada

**Passo 2: Criar interface de auditoria para pagamentos**
- **Arquivo**: `src/modules/pagamento/interfaces/auditoria-pagamento.interface.ts`
- **Dependências**: Tipos do módulo de auditoria
- **Implementação**:

```typescript
export interface IAuditoriaPagamento {
  /**
   * Registra criação de pagamento
   * Regra: Sempre auditar criação com dados completos
   */
  registrarCriacao(dados: {
    pagamentoId: string;
    solicitacaoId: string;
    valor: number;
    responsavelId: string;
    dadosBancarios: any;
    observacoes?: string;
  }): Promise<void>;

  /**
   * Registra mudança de status
   * Regra: Auditar todas as transições com motivo
   */
  registrarMudancaStatus(dados: {
    pagamentoId: string;
    statusAnterior: string;
    statusNovo: string;
    responsavelId: string;
    motivo?: string;
    observacoes?: string;
  }): Promise<void>;

  /**
   * Registra upload de comprovante
   * Regra: Auditar uploads com metadados do arquivo
   */
  registrarUploadComprovante(dados: {
    pagamentoId: string;
    comprovanteId: string;
    nomeArquivo: string;
    tamanhoArquivo: number;
    tipoArquivo: string;
    responsavelId: string;
  }): Promise<void>;

  /**
   * Registra remoção de comprovante
   * Regra: Auditar remoções com justificativa obrigatória
   */
  registrarRemocaoComprovante(dados: {
    pagamentoId: string;
    comprovanteId: string;
    motivo: string;
    responsavelId: string;
  }): Promise<void>;

  /**
   * Registra confirmação de pagamento
   * Regra: Auditar confirmações com dados do responsável
   */
  registrarConfirmacao(dados: {
    pagamentoId: string;
    confirmacaoId: string;
    responsavelId: string;
    observacoes?: string;
  }): Promise<void>;
}
```

**Passo 3: Implementar serviço de auditoria real**
- **Arquivo**: `src/modules/pagamento/services/auditoria-pagamento.service.ts`
- **Dependências**: `AuditoriaService`, `IAuditoriaPagamento`
- **Regras de Negócio**:
  - Todas as operações devem ser auditadas
  - Falhas de auditoria não devem impedir operações críticas
  - Dados sensíveis devem ser mascarados nos logs
  - Contexto do usuário sempre incluído

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { IAuditoriaPagamento } from '../interfaces/auditoria-pagamento.interface';
import { TipoOperacao, TipoRecurso } from '../../auditoria/enums';
import { DataMaskingUtil } from '../utils/data-masking.util';

@Injectable()
export class AuditoriaPagamentoService implements IAuditoriaPagamento {
  private readonly logger = new Logger(AuditoriaPagamentoService.name);

  constructor(
    private readonly auditoriaService: AuditoriaService
  ) {}

  /**
   * Registra criação de pagamento com dados mascarados
   * Performance: Async para não bloquear operação principal
   */
  async registrarCriacao(dados: {
    pagamentoId: string;
    solicitacaoId: string;
    valor: number;
    responsavelId: string;
    dadosBancarios: any;
    observacoes?: string;
  }): Promise<void> {
    try {
      // Mascarar dados sensíveis para auditoria
      const dadosMascarados = {
        ...dados.dadosBancarios,
        conta: dados.dadosBancarios.conta ? 
          DataMaskingUtil.maskConta(dados.dadosBancarios.conta) : undefined,
        agencia: dados.dadosBancarios.agencia ? 
          DataMaskingUtil.maskAgencia(dados.dadosBancarios.agencia) : undefined,
        pixChave: dados.dadosBancarios.pixChave ? 
          DataMaskingUtil.maskPixKey(dados.dadosBancarios.pixChave, dados.dadosBancarios.pixTipo) : undefined
      };

      await this.auditoriaService.registrar({
        tipoOperacao: TipoOperacao.CRIACAO,
        tipoRecurso: TipoRecurso.PAGAMENTO,
        recursoId: dados.pagamentoId,
        usuarioId: dados.responsavelId,
        detalhes: {
          solicitacaoId: dados.solicitacaoId,
          valor: dados.valor,
          dadosBancarios: dadosMascarados,
          observacoes: dados.observacoes
        },
        metadados: {
          modulo: 'pagamento',
          acao: 'criar_pagamento',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      // Log erro mas não falha operação principal
      this.logger.error(`Erro ao auditar criação de pagamento ${dados.pagamentoId}:`, error);
    }
  }

  /**
   * Registra mudança de status com contexto completo
   */
  async registrarMudancaStatus(dados: {
    pagamentoId: string;
    statusAnterior: string;
    statusNovo: string;
    responsavelId: string;
    motivo?: string;
    observacoes?: string;
  }): Promise<void> {
    try {
      await this.auditoriaService.registrar({
        tipoOperacao: TipoOperacao.ATUALIZACAO,
        tipoRecurso: TipoRecurso.PAGAMENTO,
        recursoId: dados.pagamentoId,
        usuarioId: dados.responsavelId,
        detalhes: {
          campo: 'status',
          valorAnterior: dados.statusAnterior,
          valorNovo: dados.statusNovo,
          motivo: dados.motivo,
          observacoes: dados.observacoes
        },
        metadados: {
          modulo: 'pagamento',
          acao: 'alterar_status',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error(`Erro ao auditar mudança de status do pagamento ${dados.pagamentoId}:`, error);
    }
  }

  /**
   * Registra upload de comprovante com metadados
   */
  async registrarUploadComprovante(dados: {
    pagamentoId: string;
    comprovanteId: string;
    nomeArquivo: string;
    tamanhoArquivo: number;
    tipoArquivo: string;
    responsavelId: string;
  }): Promise<void> {
    try {
      await this.auditoriaService.registrar({
        tipoOperacao: TipoOperacao.CRIACAO,
        tipoRecurso: TipoRecurso.DOCUMENTO,
        recursoId: dados.comprovanteId,
        usuarioId: dados.responsavelId,
        detalhes: {
          pagamentoId: dados.pagamentoId,
          nomeArquivo: dados.nomeArquivo,
          tamanhoArquivo: dados.tamanhoArquivo,
          tipoArquivo: dados.tipoArquivo
        },
        metadados: {
          modulo: 'pagamento',
          acao: 'upload_comprovante',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error(`Erro ao auditar upload de comprovante ${dados.comprovanteId}:`, error);
    }
  }

  /**
   * Registra remoção de comprovante com motivo obrigatório
   */
  async registrarRemocaoComprovante(dados: {
    pagamentoId: string;
    comprovanteId: string;
    motivo: string;
    responsavelId: string;
  }): Promise<void> {
    try {
      await this.auditoriaService.registrar({
        tipoOperacao: TipoOperacao.EXCLUSAO,
        tipoRecurso: TipoRecurso.DOCUMENTO,
        recursoId: dados.comprovanteId,
        usuarioId: dados.responsavelId,
        detalhes: {
          pagamentoId: dados.pagamentoId,
          motivo: dados.motivo
        },
        metadados: {
          modulo: 'pagamento',
          acao: 'remover_comprovante',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error(`Erro ao auditar remoção de comprovante ${dados.comprovanteId}:`, error);
    }
  }

  /**
   * Registra confirmação de pagamento
   */
  async registrarConfirmacao(dados: {
    pagamentoId: string;
    confirmacaoId: string;
    responsavelId: string;
    observacoes?: string;
  }): Promise<void> {
    try {
      await this.auditoriaService.registrar({
        tipoOperacao: TipoOperacao.ATUALIZACAO,
        tipoRecurso: TipoRecurso.PAGAMENTO,
        recursoId: dados.pagamentoId,
        usuarioId: dados.responsavelId,
        detalhes: {
          confirmacaoId: dados.confirmacaoId,
          observacoes: dados.observacoes
        },
        metadados: {
          modulo: 'pagamento',
          acao: 'confirmar_pagamento',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error(`Erro ao auditar confirmação do pagamento ${dados.pagamentoId}:`, error);
    }
  }
}
```

**Passo 4: Atualizar service principal**
- **Arquivo**: `src/modules/pagamento/services/pagamento.service.ts`
- **Método**: Substituir console.log por chamadas reais
- **Regras**: Auditoria assíncrona, não bloquear operações

```typescript
// Substituir em todos os métodos:
// console.log('Auditoria:', dados);
// Por:
await this.auditoriaPagamentoService.registrarCriacao(dados);
```

**Passo 5: Atualizar módulo**
- **Arquivo**: `src/modules/pagamento/pagamento.module.ts`
- **Dependências**: Importar AuditoriaModule

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Pagamento]),
    AuditoriaModule, // Adicionar import
    // ... outros imports
  ],
  providers: [
    PagamentoService,
    AuditoriaPagamentoService, // Registrar provider
    // ... outros providers
  ],
  // ...
})
export class PagamentoModule {}
```

**Passo 6: Criar testes de auditoria**
- **Arquivo**: `src/modules/pagamento/tests/auditoria-pagamento.spec.ts`
- **Casos de teste**:
  - Verificar chamadas para AuditoriaService
  - Validar mascaramento de dados sensíveis
  - Testar comportamento em caso de falha de auditoria

```typescript
describe('AuditoriaPagamentoService', () => {
  it('should mask sensitive data in audit logs', async () => {
    const mockAuditoriaService = {
      registrar: jest.fn()
    };
    
    await service.registrarCriacao({
      pagamentoId: 'test-id',
      dadosBancarios: {
        conta: '123456789',
        agencia: '1234',
        pixChave: 'user@email.com'
      }
    });
    
    expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        detalhes: expect.objectContaining({
          dadosBancarios: expect.objectContaining({
            conta: '*****6789',
            agencia: '*234',
            pixChave: '***@email.com'
          })
        })
      })
    );
  });
});
```

#### 4. Autorização - Validação Rigorosa
- [ ] **Tarefa**: Melhorar validação de unidade no guard
- [ ] **Prazo**: 2 dias

**📋 Workflow de Implementação:**

**Passo 1: Analisar estrutura atual de autorização**
- **Arquivo**: `src/modules/pagamento/guards/pagamento-access.guard.ts`
- **Dependências**: Verificar integração com módulo de usuários e unidades
- **Análise**: Identificar pontos de melhoria na validação

**Passo 2: Criar interface de contexto de autorização**
- **Arquivo**: `src/modules/pagamento/interfaces/authorization-context.interface.ts`
- **Dependências**: Tipos de usuário e unidade
- **Implementação**:

```typescript
export interface IAuthorizationContext {
  usuarioId: string;
  unidadeId: string;
  perfil: string;
  permissoes: string[];
  isAdmin: boolean;
  isSupervisor: boolean;
}

export interface IResourceAccess {
  recursoId: string;
  tipoRecurso: 'pagamento' | 'solicitacao' | 'comprovante';
  operacao: 'read' | 'write' | 'delete' | 'approve';
  contexto?: Record<string, any>;
}

export interface IAuthorizationResult {
  permitido: boolean;
  motivo?: string;
  restricoes?: string[];
}
```

**Passo 3: Implementar serviço de autorização robusto**
- **Arquivo**: `src/modules/pagamento/services/pagamento-authorization.service.ts`
- **Dependências**: `UsuarioService`, `UnidadeService`, `PagamentoService`
- **Regras de Negócio**:
  - Usuários só acessam recursos de sua unidade
  - Administradores têm acesso global
  - Supervisores têm acesso a unidades subordinadas
  - Validação de permissões específicas por operação

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { UsuarioService } from '../../usuario/services/usuario.service';
import { UnidadeService } from '../../unidade/services/unidade.service';
import { PagamentoService } from './pagamento.service';
import { 
  IAuthorizationContext, 
  IResourceAccess, 
  IAuthorizationResult 
} from '../interfaces/authorization-context.interface';

@Injectable()
export class PagamentoAuthorizationService {
  private readonly logger = new Logger(PagamentoAuthorizationService.name);

  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly unidadeService: UnidadeService,
    private readonly pagamentoService: PagamentoService
  ) {}

  /**
   * Valida se usuário pode acessar recurso específico
   * Regra: Verificação hierárquica de unidades e permissões
   */
  async validarAcesso(
    context: IAuthorizationContext,
    resource: IResourceAccess
  ): Promise<IAuthorizationResult> {
    try {
      // 1. Validação de administrador global
      if (context.isAdmin) {
        return { permitido: true };
      }

      // 2. Validação específica por tipo de recurso
      switch (resource.tipoRecurso) {
        case 'pagamento':
          return await this.validarAcessoPagamento(context, resource);
        case 'solicitacao':
          return await this.validarAcessoSolicitacao(context, resource);
        case 'comprovante':
          return await this.validarAcessoComprovante(context, resource);
        default:
          return {
            permitido: false,
            motivo: 'Tipo de recurso não reconhecido'
          };
      }
    } catch (error) {
      this.logger.error('Erro na validação de acesso:', error);
      return {
        permitido: false,
        motivo: 'Erro interno na validação de acesso'
      };
    }
  }

  /**
   * Valida acesso específico a pagamentos
   */
  private async validarAcessoPagamento(
    context: IAuthorizationContext,
    resource: IResourceAccess
  ): Promise<IAuthorizationResult> {
    // Buscar pagamento com dados da solicitação
    const pagamento = await this.pagamentoService.findByIdWithSolicitacao(
      resource.recursoId
    );

    if (!pagamento) {
      return {
        permitido: false,
        motivo: 'Pagamento não encontrado'
      };
    }

    // Validar unidade
    const unidadeValida = await this.validarUnidade(
      context,
      pagamento.solicitacao.unidadeId
    );

    if (!unidadeValida.permitido) {
      return unidadeValida;
    }

    // Validar permissão específica da operação
    return this.validarPermissaoOperacao(context, resource.operacao, 'pagamento');
  }

  /**
   * Valida acesso a solicitações
   */
  private async validarAcessoSolicitacao(
    context: IAuthorizationContext,
    resource: IResourceAccess
  ): Promise<IAuthorizationResult> {
    // Implementação similar ao pagamento
    // Buscar solicitação e validar unidade
    return { permitido: true }; // Placeholder
  }

  /**
   * Valida acesso a comprovantes
   */
  private async validarAcessoComprovante(
    context: IAuthorizationContext,
    resource: IResourceAccess
  ): Promise<IAuthorizationResult> {
    // Buscar comprovante através do pagamento
    // Validar unidade do pagamento associado
    return { permitido: true }; // Placeholder
  }

  /**
   * Valida se usuário tem acesso à unidade
   * Regra: Própria unidade ou unidades subordinadas (supervisores)
   */
  private async validarUnidade(
    context: IAuthorizationContext,
    unidadeRecurso: string
  ): Promise<IAuthorizationResult> {
    // Acesso à própria unidade
    if (context.unidadeId === unidadeRecurso) {
      return { permitido: true };
    }

    // Supervisores podem acessar unidades subordinadas
    if (context.isSupervisor) {
      const unidadesSubordinadas = await this.unidadeService
        .findUnidadesSubordinadas(context.unidadeId);
      
      const temAcesso = unidadesSubordinadas.some(
        unidade => unidade.id === unidadeRecurso
      );

      if (temAcesso) {
        return { permitido: true };
      }
    }

    return {
      permitido: false,
      motivo: 'Usuário não tem acesso a esta unidade',
      restricoes: [`Unidade requerida: ${unidadeRecurso}`, `Unidade do usuário: ${context.unidadeId}`]
    };
  }

  /**
   * Valida permissão específica para operação
   */
  private validarPermissaoOperacao(
    context: IAuthorizationContext,
    operacao: string,
    recurso: string
  ): IAuthorizationResult {
    const permissaoRequerida = `${recurso}:${operacao}`;
    
    if (context.permissoes.includes(permissaoRequerida)) {
      return { permitido: true };
    }

    // Verificar permissões genéricas
    const permissaoGenerica = `${recurso}:*`;
    if (context.permissoes.includes(permissaoGenerica)) {
      return { permitido: true };
    }

    return {
      permitido: false,
      motivo: `Permissão insuficiente para operação ${operacao} em ${recurso}`,
      restricoes: [`Permissão requerida: ${permissaoRequerida}`]
    };
  }

  /**
   * Cria contexto de autorização a partir do usuário
   */
  async criarContextoAutorizacao(usuarioId: string): Promise<IAuthorizationContext> {
    const usuario = await this.usuarioService.findByIdWithPermissoes(usuarioId);
    
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    return {
      usuarioId: usuario.id,
      unidadeId: usuario.unidadeId,
      perfil: usuario.perfil,
      permissoes: usuario.permissoes.map(p => p.codigo),
      isAdmin: usuario.perfil === 'ADMIN',
      isSupervisor: usuario.perfil === 'SUPERVISOR'
    };
  }
}
```

**Passo 4: Atualizar guard de autorização**
- **Arquivo**: `src/modules/pagamento/guards/pagamento-access.guard.ts`
- **Dependências**: `PagamentoAuthorizationService`
- **Regras**: Validação rigorosa com contexto completo

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PagamentoAuthorizationService } from '../services/pagamento-authorization.service';
import { IResourceAccess } from '../interfaces/authorization-context.interface';

@Injectable()
export class PagamentoAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: PagamentoAuthorizationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Criar contexto de autorização
    const authContext = await this.authorizationService
      .criarContextoAutorizacao(user.id);

    // Extrair informações do recurso da requisição
    const resourceAccess: IResourceAccess = {
      recursoId: request.params.id || request.params.pagamentoId,
      tipoRecurso: this.determinarTipoRecurso(request.route.path),
      operacao: this.determinarOperacao(request.method, request.route.path),
      contexto: {
        query: request.query,
        body: request.body
      }
    };

    // Validar acesso
    const resultado = await this.authorizationService
      .validarAcesso(authContext, resourceAccess);

    if (!resultado.permitido) {
      throw new ForbiddenException({
        message: resultado.motivo || 'Acesso negado',
        restrictions: resultado.restricoes
      });
    }

    // Adicionar contexto de autorização à requisição
    request.authContext = authContext;
    request.accessResult = resultado;

    return true;
  }

  /**
   * Determina tipo de recurso baseado na rota
   */
  private determinarTipoRecurso(path: string): 'pagamento' | 'solicitacao' | 'comprovante' {
    if (path.includes('/comprovante')) return 'comprovante';
    if (path.includes('/solicitacao')) return 'solicitacao';
    return 'pagamento';
  }

  /**
   * Determina operação baseada no método HTTP e rota
   */
  private determinarOperacao(method: string, path: string): 'read' | 'write' | 'delete' | 'approve' {
    if (method === 'GET') return 'read';
    if (method === 'DELETE') return 'delete';
    if (path.includes('/aprovar') || path.includes('/confirmar')) return 'approve';
    return 'write';
  }
}
```

**Passo 5: Atualizar controller para usar contexto**
- **Arquivo**: `src/modules/pagamento/controllers/pagamento.controller.ts`
- **Método**: Usar contexto de autorização em métodos sensíveis
- **Regras**: Filtrar resultados baseado no contexto

```typescript
@Get()
@UseGuards(PagamentoAccessGuard)
async findAll(
  @Query() query: any,
  @Req() request: any
): Promise<any> {
  const authContext = request.authContext;
  
  // Aplicar filtros baseados no contexto de autorização
  const filtros = {
    ...query,
    // Não-admins só veem pagamentos de suas unidades
    ...(authContext.isAdmin ? {} : { unidadeId: authContext.unidadeId })
  };
  
  return this.pagamentoService.findAll(filtros);
}
```

**Passo 6: Criar testes de autorização**
- **Arquivo**: `src/modules/pagamento/tests/pagamento-authorization.spec.ts`
- **Casos de teste**:
  - Validar acesso por unidade
  - Testar hierarquia de supervisores
  - Verificar permissões específicas
  - Validar comportamento de administradores

```typescript
describe('PagamentoAuthorizationService', () => {
  it('should deny access to different unit', async () => {
    const context = {
      usuarioId: 'user1',
      unidadeId: 'unit1',
      isAdmin: false,
      isSupervisor: false,
      permissoes: ['pagamento:read']
    };
    
    const resource = {
      recursoId: 'payment1',
      tipoRecurso: 'pagamento' as const,
      operacao: 'read' as const
    };
    
    // Mock pagamento de unidade diferente
    mockPagamentoService.findByIdWithSolicitacao.mockResolvedValue({
      id: 'payment1',
      solicitacao: { unidadeId: 'unit2' }
    });
    
    const result = await service.validarAcesso(context, resource);
    
    expect(result.permitido).toBe(false);
    expect(result.motivo).toContain('não tem acesso a esta unidade');
  });
  
  it('should allow supervisor access to subordinate units', async () => {
    const context = {
      usuarioId: 'supervisor1',
      unidadeId: 'unit1',
      isAdmin: false,
      isSupervisor: true,
      permissoes: ['pagamento:read']
    };
    
    // Mock unidades subordinadas
    mockUnidadeService.findUnidadesSubordinadas.mockResolvedValue([
      { id: 'unit2' },
      { id: 'unit3' }
    ]);
    
    const result = await service.validarAcesso(context, {
      recursoId: 'payment1',
      tipoRecurso: 'pagamento',
      operacao: 'read'
    });
    
    expect(result.permitido).toBe(true);
  });
});
```

### 🟡 **MÉDIA PRIORIDADE - Próxima Sprint**

#### 1. Validações - Consolidação
- [ ] **Tarefa**: Consolidar validações de dados bancários e PIX
- [ ] **Prazo**: 1 dia

**📋 Workflow de Implementação:**

**Passo 1: Analisar validações existentes**
- **Arquivos**: 
  - `src/modules/pagamento/validators/dados-bancarios.validator.ts`
  - `src/modules/pagamento/validators/pix.validator.ts`
  - `src/modules/pagamento/dto/create-pagamento.dto.ts`
- **Análise**: Identificar duplicações e inconsistências
- **Mapeamento**: Catalogar todas as regras de validação existentes

**Passo 2: Criar enums e tipos consolidados**
- **Arquivo**: `src/modules/pagamento/enums/dados-bancarios.enum.ts`
- **Dependências**: Nenhuma
- **Implementação**:

```typescript
export enum TipoConta {
  CORRENTE = 'CORRENTE',
  POUPANCA = 'POUPANCA',
  SALARIO = 'SALARIO'
}

export enum TipoPix {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  EMAIL = 'EMAIL',
  TELEFONE = 'TELEFONE',
  CHAVE_ALEATORIA = 'CHAVE_ALEATORIA'
}

export enum TipoPagamento {
  TRANSFERENCIA_BANCARIA = 'TRANSFERENCIA_BANCARIA',
  PIX = 'PIX'
}

export interface IDadosBancarios {
  tipoPagamento: TipoPagamento;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: TipoConta;
  pixTipo?: TipoPix;
  pixChave?: string;
  titular: string;
  cpfTitular: string;
}
```

**Passo 3: Implementar validador consolidado**
- **Arquivo**: `src/modules/pagamento/validators/dados-bancarios-consolidado.validator.ts`
- **Dependências**: Enums, utilitários de validação
- **Regras de Negócio**:
  - Validação específica por tipo de pagamento
  - Validação de formato de chaves PIX
  - Validação de dados bancários tradicionais
  - Validação de titularidade

```typescript
import { Injectable } from '@nestjs/common';
import { 
  TipoPagamento, 
  TipoPix, 
  TipoConta, 
  IDadosBancarios 
} from '../enums/dados-bancarios.enum';
import { CpfValidator } from '../../../shared/validators/cpf.validator';
import { EmailValidator } from '../../../shared/validators/email.validator';
import { TelefoneValidator } from '../../../shared/validators/telefone.validator';

export interface IValidationResult {
  valido: boolean;
  erros: string[];
  warnings?: string[];
}

@Injectable()
export class DadosBancariosConsolidadoValidator {
  constructor(
    private readonly cpfValidator: CpfValidator,
    private readonly emailValidator: EmailValidator,
    private readonly telefoneValidator: TelefoneValidator
  ) {}

  /**
   * Valida dados bancários completos
   * Regra: Validação específica baseada no tipo de pagamento
   */
  validar(dados: IDadosBancarios): IValidationResult {
    const erros: string[] = [];
    const warnings: string[] = [];

    // Validações básicas obrigatórias
    this.validarCamposObrigatorios(dados, erros);
    this.validarTitular(dados, erros);

    // Validações específicas por tipo
    switch (dados.tipoPagamento) {
      case TipoPagamento.TRANSFERENCIA_BANCARIA:
        this.validarTransferenciaBancaria(dados, erros, warnings);
        break;
      case TipoPagamento.PIX:
        this.validarPix(dados, erros, warnings);
        break;
      default:
        erros.push('Tipo de pagamento inválido');
    }

    return {
      valido: erros.length === 0,
      erros,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Valida campos obrigatórios básicos
   */
  private validarCamposObrigatorios(dados: IDadosBancarios, erros: string[]): void {
    if (!dados.tipoPagamento) {
      erros.push('Tipo de pagamento é obrigatório');
    }

    if (!dados.titular || dados.titular.trim().length < 3) {
      erros.push('Nome do titular deve ter pelo menos 3 caracteres');
    }

    if (!dados.cpfTitular) {
      erros.push('CPF do titular é obrigatório');
    } else if (!this.cpfValidator.validar(dados.cpfTitular)) {
      erros.push('CPF do titular inválido');
    }
  }

  /**
   * Valida dados específicos de transferência bancária
   */
  private validarTransferenciaBancaria(
    dados: IDadosBancarios, 
    erros: string[], 
    warnings: string[]
  ): void {
    // Validar banco
    if (!dados.banco || dados.banco.trim().length < 3) {
      erros.push('Nome do banco deve ter pelo menos 3 caracteres');
    }

    // Validar agência
    if (!dados.agencia) {
      erros.push('Agência é obrigatória para transferência bancária');
    } else {
      const agenciaLimpa = dados.agencia.replace(/\D/g, '');
      if (agenciaLimpa.length < 3 || agenciaLimpa.length > 5) {
        erros.push('Agência deve ter entre 3 e 5 dígitos');
      }
    }

    // Validar conta
    if (!dados.conta) {
      erros.push('Conta é obrigatória para transferência bancária');
    } else {
      const contaLimpa = dados.conta.replace(/\D/g, '');
      if (contaLimpa.length < 4 || contaLimpa.length > 12) {
        erros.push('Conta deve ter entre 4 e 12 dígitos');
      }
    }

    // Validar tipo de conta
    if (!dados.tipoConta) {
      warnings.push('Tipo de conta não informado, assumindo conta corrente');
    } else if (!Object.values(TipoConta).includes(dados.tipoConta)) {
      erros.push('Tipo de conta inválido');
    }
  }

  /**
   * Valida dados específicos de PIX
   */
  private validarPix(
    dados: IDadosBancarios, 
    erros: string[], 
    warnings: string[]
  ): void {
    if (!dados.pixTipo) {
      erros.push('Tipo de chave PIX é obrigatório');
      return;
    }

    if (!dados.pixChave) {
      erros.push('Chave PIX é obrigatória');
      return;
    }

    // Validação específica por tipo de chave PIX
    switch (dados.pixTipo) {
      case TipoPix.CPF:
        this.validarPixCpf(dados.pixChave, erros);
        break;
      case TipoPix.CNPJ:
        this.validarPixCnpj(dados.pixChave, erros);
        break;
      case TipoPix.EMAIL:
        this.validarPixEmail(dados.pixChave, erros);
        break;
      case TipoPix.TELEFONE:
        this.validarPixTelefone(dados.pixChave, erros);
        break;
      case TipoPix.CHAVE_ALEATORIA:
        this.validarPixChaveAleatoria(dados.pixChave, erros);
        break;
      default:
        erros.push('Tipo de chave PIX inválido');
    }

    // Validar consistência CPF titular vs chave PIX
    if (dados.pixTipo === TipoPix.CPF && dados.pixChave !== dados.cpfTitular) {
      warnings.push('Chave PIX CPF diferente do CPF do titular');
    }
  }

  /**
   * Valida chave PIX do tipo CPF
   */
  private validarPixCpf(chave: string, erros: string[]): void {
    if (!this.cpfValidator.validar(chave)) {
      erros.push('Chave PIX CPF inválida');
    }
  }

  /**
   * Valida chave PIX do tipo CNPJ
   */
  private validarPixCnpj(chave: string, erros: string[]): void {
    const cnpjLimpo = chave.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      erros.push('Chave PIX CNPJ deve ter 14 dígitos');
      return;
    }
    // Implementar validação de CNPJ completa
    // Por simplicidade, validando apenas o formato
  }

  /**
   * Valida chave PIX do tipo email
   */
  private validarPixEmail(chave: string, erros: string[]): void {
    if (!this.emailValidator.validar(chave)) {
      erros.push('Chave PIX email inválida');
    }
  }

  /**
   * Valida chave PIX do tipo telefone
   */
  private validarPixTelefone(chave: string, erros: string[]): void {
    if (!this.telefoneValidator.validar(chave)) {
      erros.push('Chave PIX telefone inválida');
    }
  }

  /**
   * Valida chave PIX aleatória
   */
  private validarPixChaveAleatoria(chave: string, erros: string[]): void {
    // Chave aleatória deve ter 32 caracteres alfanuméricos
    const regex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (!regex.test(chave)) {
      erros.push('Chave PIX aleatória deve estar no formato UUID');
    }
  }

  /**
   * Valida dados do titular
   */
  private validarTitular(dados: IDadosBancarios, erros: string[]): void {
    // Validar se nome tem pelo menos nome e sobrenome
    const partesNome = dados.titular.trim().split(' ');
    if (partesNome.length < 2) {
      erros.push('Nome do titular deve conter pelo menos nome e sobrenome');
    }

    // Validar caracteres especiais no nome
    const nomeRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
    if (!nomeRegex.test(dados.titular)) {
      erros.push('Nome do titular deve conter apenas letras e espaços');
    }
  }

  /**
   * Valida se dados bancários são consistentes com o beneficiário
   */
  validarConsistenciaBeneficiario(
    dadosBancarios: IDadosBancarios,
    beneficiario: { nome: string; cpf: string }
  ): IValidationResult {
    const erros: string[] = [];
    const warnings: string[] = [];

    // Verificar se titular é o mesmo que o beneficiário
    if (dadosBancarios.cpfTitular !== beneficiario.cpf) {
      warnings.push('CPF do titular da conta diferente do CPF do beneficiário');
    }

    // Verificar similaridade de nomes (tolerância para abreviações)
    const similaridade = this.calcularSimilaridadeNomes(
      dadosBancarios.titular,
      beneficiario.nome
    );

    if (similaridade < 0.7) {
      warnings.push('Nome do titular muito diferente do nome do beneficiário');
    }

    return {
      valido: erros.length === 0,
      erros,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Calcula similaridade entre nomes (algoritmo simplificado)
   */
  private calcularSimilaridadeNomes(nome1: string, nome2: string): number {
    const palavras1 = nome1.toLowerCase().split(' ');
    const palavras2 = nome2.toLowerCase().split(' ');
    
    let matches = 0;
    const totalPalavras = Math.max(palavras1.length, palavras2.length);
    
    palavras1.forEach(palavra1 => {
      if (palavras2.some(palavra2 => 
        palavra2.includes(palavra1) || palavra1.includes(palavra2)
      )) {
        matches++;
      }
    });
    
    return matches / totalPalavras;
  }
}
```

**Passo 4: Criar decorator de validação customizado**
- **Arquivo**: `src/modules/pagamento/decorators/validate-dados-bancarios.decorator.ts`
- **Dependências**: `class-validator`, `DadosBancariosConsolidadoValidator`
- **Implementação**:

```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { DadosBancariosConsolidadoValidator } from '../validators/dados-bancarios-consolidado.validator';

export function ValidateDadosBancarios(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'validateDadosBancarios',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const validator = new DadosBancariosConsolidadoValidator(
            // Injetar dependências necessárias
          );
          
          const resultado = validator.validar(value);
          return resultado.valido;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Dados bancários inválidos';
        }
      }
    });
  };
}
```

**Passo 5: Atualizar DTOs para usar validação consolidada**
- **Arquivo**: `src/modules/pagamento/dto/create-pagamento.dto.ts`
- **Método**: Substituir validações individuais por validação consolidada
- **Regras**: Manter compatibilidade com API existente

```typescript
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateDadosBancarios } from '../decorators/validate-dados-bancarios.decorator';
import { IDadosBancarios } from '../enums/dados-bancarios.enum';

export class CreatePagamentoDto {
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  solicitacaoId: string;

  @ValidateDadosBancarios({
    message: 'Dados bancários inválidos'
  })
  @ValidateNested()
  @Type(() => Object)
  dadosBancarios: IDadosBancarios;

  observacoes?: string;
}
```

**Passo 6: Criar testes abrangentes**
- **Arquivo**: `src/modules/pagamento/tests/dados-bancarios-consolidado.spec.ts`
- **Casos de teste**:
  - Validação de transferência bancária
  - Validação de cada tipo de chave PIX
  - Validação de consistência com beneficiário
  - Casos de erro e edge cases

```typescript
describe('DadosBancariosConsolidadoValidator', () => {
  describe('Transferência Bancária', () => {
    it('should validate valid bank transfer data', () => {
      const dados = {
        tipoPagamento: TipoPagamento.TRANSFERENCIA_BANCARIA,
        banco: 'Banco do Brasil',
        agencia: '1234',
        conta: '567890',
        tipoConta: TipoConta.CORRENTE,
        titular: 'João Silva',
        cpfTitular: '12345678901'
      };
      
      const result = validator.validar(dados);
      expect(result.valido).toBe(true);
    });
    
    it('should reject invalid account number', () => {
      const dados = {
        tipoPagamento: TipoPagamento.TRANSFERENCIA_BANCARIA,
        banco: 'Banco do Brasil',
        agencia: '1234',
        conta: '123', // Muito curta
        titular: 'João Silva',
        cpfTitular: '12345678901'
      };
      
      const result = validator.validar(dados);
      expect(result.valido).toBe(false);
      expect(result.erros).toContain('Conta deve ter entre 4 e 12 dígitos');
    });
  });
  
  describe('PIX', () => {
    it('should validate PIX with CPF key', () => {
      const dados = {
        tipoPagamento: TipoPagamento.PIX,
        pixTipo: TipoPix.CPF,
        pixChave: '12345678901',
        titular: 'João Silva',
        cpfTitular: '12345678901'
      };
      
      const result = validator.validar(dados);
      expect(result.valido).toBe(true);
    });
    
    it('should validate PIX with email key', () => {
      const dados = {
        tipoPagamento: TipoPagamento.PIX,
        pixTipo: TipoPix.EMAIL,
        pixChave: 'joao@email.com',
        titular: 'João Silva',
        cpfTitular: '12345678901'
      };
      
      const result = validator.validar(dados);
      expect(result.valido).toBe(true);
    });
  });
});
```

#### 2. Arquitetura - Refatoração do Controller (SRP)
- [ ] **Tarefa**: Extrair lógica de mapeamento para service dedicado
- [ ] **Prazo**: 2 dias

**📋 Workflow de Implementação:**

**Passo 1: Analisar responsabilidades atuais do controller**
- **Arquivo**: `src/modules/pagamento/controllers/pagamento.controller.ts`
- **Análise**: Identificar violações do SRP
- **Mapeamento**: Catalogar todas as responsabilidades encontradas
- **Regras de Negócio**: Controller deve apenas coordenar, não processar

**Responsabilidades identificadas para extração:**
- Mapeamento de DTOs para entidades
- Transformação de dados de resposta
- Formatação de dados para diferentes contextos
- Lógica de paginação e filtros
- Construção de respostas padronizadas

**Passo 2: Criar interfaces para os novos services**
- **Arquivo**: `src/modules/pagamento/interfaces/mapping.interface.ts`
- **Dependências**: DTOs, entidades, tipos de resposta
- **Implementação**:

```typescript
import { CreatePagamentoDto, UpdatePagamentoDto } from '../dto';
import { PagamentoResponseDto } from '../dto/pagamento-response.dto';
import { Pagamento } from '../entities/pagamento.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { FilterPagamentoDto } from '../dto/filter-pagamento.dto';

export interface IPagamentoMappingService {
  /**
   * Mapeia DTO de criação para entidade
   */
  mapCreateDtoToEntity(
    dto: CreatePagamentoDto,
    usuario: Usuario
  ): Promise<Partial<Pagamento>>;

  /**
   * Mapeia DTO de atualização para entidade
   */
  mapUpdateDtoToEntity(
    dto: UpdatePagamentoDto,
    pagamentoExistente: Pagamento,
    usuario: Usuario
  ): Promise<Partial<Pagamento>>;

  /**
   * Mapeia entidade para DTO de resposta
   */
  mapEntityToResponseDto(
    pagamento: Pagamento,
    contextoUsuario: IContextoUsuario
  ): Promise<PagamentoResponseDto>;

  /**
   * Mapeia lista de entidades para DTOs de resposta
   */
  mapEntitiesToResponseDtos(
    pagamentos: Pagamento[],
    contextoUsuario: IContextoUsuario
  ): Promise<PagamentoResponseDto[]>;

  /**
   * Constrói resposta paginada
   */
  buildPaginatedResponse<T>(
    items: T[],
    total: number,
    pagination: PaginationDto
  ): IPaginatedResponse<T>;

  /**
   * Mapeia filtros de query para critérios de busca
   */
  mapFiltersToCriteria(
    filters: FilterPagamentoDto,
    contextoUsuario: IContextoUsuario
  ): Promise<ICriteriosBusca>;
}

export interface IContextoUsuario {
  id: string;
  perfil: string;
  unidadeId?: string;
  permissoes: string[];
  isAdmin: boolean;
  isSupervisor: boolean;
}

export interface IPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ICriteriosBusca {
  where: any;
  relations: string[];
  order: any;
  skip: number;
  take: number;
}
```

**Passo 3: Implementar serviço de mapeamento**
- **Arquivo**: `src/modules/pagamento/services/pagamento-mapping.service.ts`
- **Dependências**: Interfaces, DTOs, entidades, utilitários
- **Regras de Negócio**:
  - Mapeamento contextual baseado no perfil do usuário
  - Aplicação de mascaramento de dados sensíveis
  - Validação de permissões durante o mapeamento
  - Otimização de queries para relacionamentos

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { 
  IPagamentoMappingService, 
  IContextoUsuario, 
  IPaginatedResponse, 
  ICriteriosBusca 
} from '../interfaces/mapping.interface';
import { CreatePagamentoDto, UpdatePagamentoDto } from '../dto';
import { PagamentoResponseDto } from '../dto/pagamento-response.dto';
import { Pagamento } from '../entities/pagamento.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { FilterPagamentoDto } from '../dto/filter-pagamento.dto';
import { DataMaskingUtil } from '../utils/data-masking.util';
import { SolicitacaoService } from '../../solicitacao/services/solicitacao.service';
import { StatusPagamento } from '../enums/status-pagamento.enum';

@Injectable()
export class PagamentoMappingService implements IPagamentoMappingService {
  private readonly logger = new Logger(PagamentoMappingService.name);

  constructor(
    private readonly dataMaskingUtil: DataMaskingUtil,
    private readonly solicitacaoService: SolicitacaoService
  ) {}

  /**
   * Mapeia DTO de criação para entidade
   * Regra: Validar solicitação e aplicar dados do usuário
   */
  async mapCreateDtoToEntity(
    dto: CreatePagamentoDto,
    usuario: Usuario
  ): Promise<Partial<Pagamento>> {
    this.logger.debug(`Mapeando DTO de criação para entidade - Usuário: ${usuario.id}`);

    // Buscar e validar solicitação
    const solicitacao = await this.solicitacaoService.findById(dto.solicitacaoId);
    if (!solicitacao) {
      throw new Error('Solicitação não encontrada');
    }

    if (solicitacao.status !== 'APROVADA') {
      throw new Error('Solicitação deve estar aprovada para criar pagamento');
    }

    // Mapear dados básicos
    const pagamentoData: Partial<Pagamento> = {
      solicitacaoId: dto.solicitacaoId,
      valor: solicitacao.valorAprovado || solicitacao.valorSolicitado,
      dadosBancarios: this.sanitizarDadosBancarios(dto.dadosBancarios),
      observacoes: dto.observacoes?.trim(),
      status: StatusPagamento.PENDENTE,
      criadoPor: usuario.id,
      unidadeId: usuario.unidadeId,
      dataVencimento: this.calcularDataVencimento(solicitacao.tipo),
      // Campos de auditoria
      criadoEm: new Date(),
      atualizadoEm: new Date()
    };

    // Aplicar regras específicas por tipo de benefício
    await this.aplicarRegrasTipoBeneficio(pagamentoData, solicitacao);

    return pagamentoData;
  }

  /**
   * Mapeia DTO de atualização para entidade
   * Regra: Preservar dados críticos e validar transições de status
   */
  async mapUpdateDtoToEntity(
    dto: UpdatePagamentoDto,
    pagamentoExistente: Pagamento,
    usuario: Usuario
  ): Promise<Partial<Pagamento>> {
    this.logger.debug(`Mapeando DTO de atualização - Pagamento: ${pagamentoExistente.id}`);

    const updateData: Partial<Pagamento> = {
      atualizadoEm: new Date(),
      atualizadoPor: usuario.id
    };

    // Atualizar apenas campos permitidos
    if (dto.dadosBancarios && this.podeAtualizarDadosBancarios(pagamentoExistente.status)) {
      updateData.dadosBancarios = this.sanitizarDadosBancarios(dto.dadosBancarios);
    }

    if (dto.observacoes !== undefined) {
      updateData.observacoes = dto.observacoes?.trim();
    }

    if (dto.status && this.podeAlterarStatus(pagamentoExistente.status, dto.status, usuario)) {
      updateData.status = dto.status;
      
      // Aplicar regras específicas por mudança de status
      await this.aplicarRegrasTransicaoStatus(
        updateData, 
        pagamentoExistente.status, 
        dto.status, 
        usuario
      );
    }

    return updateData;
  }

  /**
   * Mapeia entidade para DTO de resposta
   * Regra: Aplicar mascaramento baseado no contexto do usuário
   */
  async mapEntityToResponseDto(
    pagamento: Pagamento,
    contextoUsuario: IContextoUsuario
  ): Promise<PagamentoResponseDto> {
    const dto = new PagamentoResponseDto();

    // Dados básicos sempre visíveis
    dto.id = pagamento.id;
    dto.solicitacaoId = pagamento.solicitacaoId;
    dto.valor = pagamento.valor;
    dto.status = pagamento.status;
    dto.observacoes = pagamento.observacoes;
    dto.criadoEm = pagamento.criadoEm;
    dto.atualizadoEm = pagamento.atualizadoEm;

    // Dados bancários com mascaramento condicional
    dto.dadosBancarios = await this.dataMaskingUtil.maskDadosBancarios(
      pagamento.dadosBancarios,
      contextoUsuario
    );

    // Dados de auditoria (apenas para usuários autorizados)
    if (contextoUsuario.isAdmin || contextoUsuario.isSupervisor) {
      dto.criadoPor = pagamento.criadoPor;
      dto.atualizadoPor = pagamento.atualizadoPor;
      dto.unidadeId = pagamento.unidadeId;
    }

    // Relacionamentos (se carregados)
    if (pagamento.solicitacao) {
      dto.solicitacao = await this.mapSolicitacaoParaResponse(
        pagamento.solicitacao,
        contextoUsuario
      );
    }

    if (pagamento.historicoStatus && contextoUsuario.isAdmin) {
      dto.historicoStatus = pagamento.historicoStatus.map(h => ({
        status: h.status,
        dataAlteracao: h.dataAlteracao,
        usuario: h.usuario?.nome,
        observacao: h.observacao
      }));
    }

    return dto;
  }

  /**
   * Mapeia lista de entidades para DTOs de resposta
   */
  async mapEntitiesToResponseDtos(
    pagamentos: Pagamento[],
    contextoUsuario: IContextoUsuario
  ): Promise<PagamentoResponseDto[]> {
    return Promise.all(
      pagamentos.map(pagamento => 
        this.mapEntityToResponseDto(pagamento, contextoUsuario)
      )
    );
  }

  /**
   * Constrói resposta paginada padronizada
   */
  buildPaginatedResponse<T>(
    items: T[],
    total: number,
    pagination: PaginationDto
  ): IPaginatedResponse<T> {
    const totalPages = Math.ceil(total / pagination.limit);
    const currentPage = pagination.page;

    return {
      items,
      total,
      page: currentPage,
      limit: pagination.limit,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1
    };
  }

  /**
   * Mapeia filtros de query para critérios de busca
   */
  async mapFiltersToCriteria(
    filters: FilterPagamentoDto,
    contextoUsuario: IContextoUsuario
  ): Promise<ICriteriosBusca> {
    const where: any = {};
    const relations = ['solicitacao', 'solicitacao.beneficiario'];
    const order: any = {};

    // Aplicar filtros de acesso baseados no contexto
    if (!contextoUsuario.isAdmin) {
      if (contextoUsuario.unidadeId) {
        where.unidadeId = contextoUsuario.unidadeId;
      } else {
        where.criadoPor = contextoUsuario.id;
      }
    }

    // Filtros específicos
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dataInicio && filters.dataFim) {
      where.criadoEm = {
        gte: new Date(filters.dataInicio),
        lte: new Date(filters.dataFim)
      };
    }

    if (filters.valorMinimo || filters.valorMaximo) {
      where.valor = {};
      if (filters.valorMinimo) where.valor.gte = filters.valorMinimo;
      if (filters.valorMaximo) where.valor.lte = filters.valorMaximo;
    }

    if (filters.beneficiarioNome) {
      where.solicitacao = {
        beneficiario: {
          nome: {
            contains: filters.beneficiarioNome,
            mode: 'insensitive'
          }
        }
      };
    }

    if (filters.beneficiarioCpf) {
      where.solicitacao = {
        ...where.solicitacao,
        beneficiario: {
          ...where.solicitacao?.beneficiario,
          cpf: filters.beneficiarioCpf
        }
      };
    }

    // Ordenação
    if (filters.orderBy) {
      order[filters.orderBy] = filters.orderDirection || 'desc';
    } else {
      order.criadoEm = 'desc';
    }

    // Paginação
    const skip = (filters.page - 1) * filters.limit;
    const take = filters.limit;

    return {
      where,
      relations,
      order,
      skip,
      take
    };
  }

  /**
   * Métodos auxiliares privados
   */
  private sanitizarDadosBancarios(dadosBancarios: any): any {
    // Remove espaços e caracteres especiais desnecessários
    const sanitized = { ...dadosBancarios };
    
    if (sanitized.agencia) {
      sanitized.agencia = sanitized.agencia.replace(/\D/g, '');
    }
    
    if (sanitized.conta) {
      sanitized.conta = sanitized.conta.replace(/[^\d\-]/g, '');
    }
    
    if (sanitized.pixChave) {
      sanitized.pixChave = sanitized.pixChave.trim();
    }
    
    return sanitized;
  }

  private calcularDataVencimento(tipoBeneficio: string): Date {
    const hoje = new Date();
    const diasVencimento = tipoBeneficio === 'AUXILIO_NATALIDADE' ? 30 : 15;
    
    return new Date(hoje.getTime() + (diasVencimento * 24 * 60 * 60 * 1000));
  }

  private async aplicarRegrasTipoBeneficio(
    pagamentoData: Partial<Pagamento>,
    solicitacao: any
  ): Promise<void> {
    switch (solicitacao.tipo) {
      case 'AUXILIO_NATALIDADE':
        // Regras específicas para auxílio natalidade
        pagamentoData.prioridade = 'ALTA';
        break;
      case 'ALUGUEL_SOCIAL':
        // Regras específicas para aluguel social
        pagamentoData.prioridade = 'MEDIA';
        break;
    }
  }

  private podeAtualizarDadosBancarios(status: StatusPagamento): boolean {
    return [StatusPagamento.PENDENTE, StatusPagamento.EM_ANALISE].includes(status);
  }

  private podeAlterarStatus(
    statusAtual: StatusPagamento,
    novoStatus: StatusPagamento,
    usuario: Usuario
  ): boolean {
    // Implementar matriz de transições permitidas
    const transicoesPermitidas = {
      [StatusPagamento.PENDENTE]: [StatusPagamento.EM_ANALISE, StatusPagamento.CANCELADO],
      [StatusPagamento.EM_ANALISE]: [StatusPagamento.APROVADO, StatusPagamento.REJEITADO],
      [StatusPagamento.APROVADO]: [StatusPagamento.PROCESSADO],
      [StatusPagamento.PROCESSADO]: [StatusPagamento.CONCLUIDO]
    };

    return transicoesPermitidas[statusAtual]?.includes(novoStatus) || false;
  }

  private async aplicarRegrasTransicaoStatus(
    updateData: Partial<Pagamento>,
    statusAtual: StatusPagamento,
    novoStatus: StatusPagamento,
    usuario: Usuario
  ): Promise<void> {
    switch (novoStatus) {
      case StatusPagamento.APROVADO:
        updateData.aprovadoPor = usuario.id;
        updateData.dataAprovacao = new Date();
        break;
      case StatusPagamento.PROCESSADO:
        updateData.processadoPor = usuario.id;
        updateData.dataProcessamento = new Date();
        break;
      case StatusPagamento.CONCLUIDO:
        updateData.dataFinalizacao = new Date();
        break;
    }
  }

  private async mapSolicitacaoParaResponse(solicitacao: any, contexto: IContextoUsuario): Promise<any> {
    // Mapear dados da solicitação conforme permissões
    return {
      id: solicitacao.id,
      tipo: solicitacao.tipo,
      status: solicitacao.status,
      valorSolicitado: solicitacao.valorSolicitado,
      beneficiario: contexto.isAdmin ? {
        nome: solicitacao.beneficiario.nome,
        cpf: solicitacao.beneficiario.cpf
      } : {
        nome: this.dataMaskingUtil.maskNome(solicitacao.beneficiario.nome),
        cpf: this.dataMaskingUtil.maskCpf(solicitacao.beneficiario.cpf)
      }
    };
  }
}
```

**Passo 4: Criar serviço de resposta padronizada**
- **Arquivo**: `src/modules/pagamento/services/pagamento-response.service.ts`
- **Dependências**: Interfaces, DTOs de resposta
- **Responsabilidade**: Construir respostas HTTP padronizadas

```typescript
import { Injectable } from '@nestjs/common';
import { IPaginatedResponse } from '../interfaces/mapping.interface';

export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: any;
}

@Injectable()
export class PagamentoResponseService {
  /**
   * Constrói resposta de sucesso
   */
  success<T>(data: T, message?: string, meta?: any): IApiResponse<T> {
    return {
      success: true,
      data,
      message,
      meta
    };
  }

  /**
   * Constrói resposta de erro
   */
  error(message: string, errors?: string[]): IApiResponse<null> {
    return {
      success: false,
      message,
      errors
    };
  }

  /**
   * Constrói resposta paginada
   */
  paginated<T>(
    paginatedData: IPaginatedResponse<T>,
    message?: string
  ): IApiResponse<T[]> {
    return {
      success: true,
      data: paginatedData.items,
      message,
      meta: {
        pagination: {
          total: paginatedData.total,
          page: paginatedData.page,
          limit: paginatedData.limit,
          totalPages: paginatedData.totalPages,
          hasNext: paginatedData.hasNext,
          hasPrevious: paginatedData.hasPrevious
        }
      }
    };
  }

  /**
   * Constrói resposta de criação
   */
  created<T>(data: T, message: string = 'Recurso criado com sucesso'): IApiResponse<T> {
    return this.success(data, message);
  }

  /**
   * Constrói resposta de atualização
   */
  updated<T>(data: T, message: string = 'Recurso atualizado com sucesso'): IApiResponse<T> {
    return this.success(data, message);
  }

  /**
   * Constrói resposta de exclusão
   */
  deleted(message: string = 'Recurso excluído com sucesso'): IApiResponse<null> {
    return {
      success: true,
      message
    };
  }
}
```

**Passo 5: Refatorar controller para usar os novos services**
- **Arquivo**: `src/modules/pagamento/controllers/pagamento.controller.ts`
- **Método**: Remover lógica de mapeamento e processamento
- **Regras**: Controller apenas coordena e delega

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { PagamentoService } from '../services/pagamento.service';
import { PagamentoMappingService } from '../services/pagamento-mapping.service';
import { PagamentoResponseService } from '../services/pagamento-response.service';
import { CreatePagamentoDto, UpdatePagamentoDto } from '../dto';
import { FilterPagamentoDto } from '../dto/filter-pagamento.dto';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { IContextoUsuario } from '../interfaces/mapping.interface';

@ApiTags('pagamentos')
@Controller('pagamentos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PagamentoController {
  constructor(
    private readonly pagamentoService: PagamentoService,
    private readonly mappingService: PagamentoMappingService,
    private readonly responseService: PagamentoResponseService
  ) {}

  @Post()
  @Roles('admin', 'supervisor', 'operador')
  @ApiOperation({ summary: 'Criar novo pagamento' })
  @ApiResponse({ status: 201, description: 'Pagamento criado com sucesso' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreatePagamentoDto, @Request() req) {
    // 1. Mapear DTO para entidade
    const pagamentoData = await this.mappingService.mapCreateDtoToEntity(
      createDto,
      req.user
    );

    // 2. Criar pagamento via service
    const pagamento = await this.pagamentoService.create(pagamentoData);

    // 3. Mapear entidade para resposta
    const contextoUsuario = this.buildContextoUsuario(req.user);
    const responseDto = await this.mappingService.mapEntityToResponseDto(
      pagamento,
      contextoUsuario
    );

    // 4. Retornar resposta padronizada
    return this.responseService.created(
      responseDto,
      'Pagamento criado com sucesso'
    );
  }

  @Get()
  @Roles('admin', 'supervisor', 'operador', 'consultor')
  @ApiOperation({ summary: 'Listar pagamentos com filtros e paginação' })
  async findAll(
    @Query() filters: FilterPagamentoDto,
    @Query() pagination: PaginationDto,
    @Request() req
  ) {
    // 1. Mapear filtros para critérios de busca
    const contextoUsuario = this.buildContextoUsuario(req.user);
    const criterios = await this.mappingService.mapFiltersToCriteria(
      { ...filters, ...pagination },
      contextoUsuario
    );

    // 2. Buscar pagamentos via service
    const [pagamentos, total] = await this.pagamentoService.findAndCount(criterios);

    // 3. Mapear entidades para DTOs de resposta
    const responseDtos = await this.mappingService.mapEntitiesToResponseDtos(
      pagamentos,
      contextoUsuario
    );

    // 4. Construir resposta paginada
    const paginatedResponse = this.mappingService.buildPaginatedResponse(
      responseDtos,
      total,
      pagination
    );

    // 5. Retornar resposta padronizada
    return this.responseService.paginated(
      paginatedResponse,
      'Pagamentos listados com sucesso'
    );
  }

  @Get(':id')
  @Roles('admin', 'supervisor', 'operador', 'consultor')
  @ApiOperation({ summary: 'Buscar pagamento por ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    // 1. Buscar pagamento via service
    const pagamento = await this.pagamentoService.findById(id);

    // 2. Mapear entidade para resposta
    const contextoUsuario = this.buildContextoUsuario(req.user);
    const responseDto = await this.mappingService.mapEntityToResponseDto(
      pagamento,
      contextoUsuario
    );

    // 3. Retornar resposta padronizada
    return this.responseService.success(
      responseDto,
      'Pagamento encontrado com sucesso'
    );
  }

  @Put(':id')
  @Roles('admin', 'supervisor', 'operador')
  @ApiOperation({ summary: 'Atualizar pagamento' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePagamentoDto,
    @Request() req
  ) {
    // 1. Buscar pagamento existente
    const pagamentoExistente = await this.pagamentoService.findById(id);

    // 2. Mapear DTO de atualização para entidade
    const updateData = await this.mappingService.mapUpdateDtoToEntity(
      updateDto,
      pagamentoExistente,
      req.user
    );

    // 3. Atualizar via service
    const pagamentoAtualizado = await this.pagamentoService.update(id, updateData);

    // 4. Mapear entidade para resposta
    const contextoUsuario = this.buildContextoUsuario(req.user);
    const responseDto = await this.mappingService.mapEntityToResponseDto(
      pagamentoAtualizado,
      contextoUsuario
    );

    // 5. Retornar resposta padronizada
    return this.responseService.updated(
      responseDto,
      'Pagamento atualizado com sucesso'
    );
  }

  @Delete(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Excluir pagamento' })
  async remove(@Param('id') id: string) {
    // 1. Excluir via service
    await this.pagamentoService.remove(id);

    // 2. Retornar resposta padronizada
    return this.responseService.deleted('Pagamento excluído com sucesso');
  }

  /**
   * Método auxiliar para construir contexto do usuário
   */
  private buildContextoUsuario(user: any): IContextoUsuario {
    return {
      id: user.id,
      perfil: user.perfil,
      unidadeId: user.unidadeId,
      permissoes: user.permissoes || [],
      isAdmin: user.perfil === 'ADMIN',
      isSupervisor: ['ADMIN', 'SUPERVISOR'].includes(user.perfil)
    };
  }
}
```

**Passo 6: Atualizar módulo para registrar novos services**
- **Arquivo**: `src/modules/pagamento/pagamento.module.ts`
- **Método**: Adicionar novos providers
- **Dependências**: Importar módulos necessários

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagamentoController } from './controllers/pagamento.controller';
import { PagamentoService } from './services/pagamento.service';
import { PagamentoMappingService } from './services/pagamento-mapping.service';
import { PagamentoResponseService } from './services/pagamento-response.service';
import { Pagamento } from './entities/pagamento.entity';
import { DataMaskingUtil } from './utils/data-masking.util';
import { SolicitacaoModule } from '../solicitacao/solicitacao.module';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pagamento]),
    SolicitacaoModule,
    SharedModule
  ],
  controllers: [PagamentoController],
  providers: [
    PagamentoService,
    PagamentoMappingService,
    PagamentoResponseService,
    DataMaskingUtil
  ],
  exports: [
    PagamentoService,
    PagamentoMappingService
  ]
})
export class PagamentoModule {}
```

**Passo 7: Criar testes para os novos services**
- **Arquivo**: `src/modules/pagamento/tests/pagamento-mapping.service.spec.ts`
- **Casos de teste**:
  - Mapeamento de DTOs para entidades
  - Mapeamento de entidades para DTOs de resposta
  - Aplicação de mascaramento baseado no contexto
  - Construção de respostas paginadas
  - Mapeamento de filtros para critérios

```typescript
describe('PagamentoMappingService', () => {
  describe('mapCreateDtoToEntity', () => {
    it('should map create DTO to entity correctly', async () => {
      const dto = {
        solicitacaoId: 'sol-123',
        dadosBancarios: {
          tipoPagamento: TipoPagamento.PIX,
          pixTipo: TipoPix.CPF,
          pixChave: '12345678901',
          titular: 'João Silva',
          cpfTitular: '12345678901'
        }
      };
      
      const usuario = { id: 'user-123', unidadeId: 'unidade-456' };
      
      const result = await service.mapCreateDtoToEntity(dto, usuario);
      
      expect(result.solicitacaoId).toBe(dto.solicitacaoId);
      expect(result.criadoPor).toBe(usuario.id);
      expect(result.unidadeId).toBe(usuario.unidadeId);
      expect(result.status).toBe(StatusPagamento.PENDENTE);
    });
  });
  
  describe('mapEntityToResponseDto', () => {
    it('should apply data masking for non-admin users', async () => {
      const pagamento = {
        id: 'pag-123',
        dadosBancarios: {
          pixChave: '12345678901',
          titular: 'João Silva'
        }
      };
      
      const contextoUsuario = {
        isAdmin: false,
        isSupervisor: false
      };
      
      const result = await service.mapEntityToResponseDto(pagamento, contextoUsuario);
      
      expect(result.dadosBancarios.pixChave).toBe('123****8901');
      expect(result.dadosBancarios.titular).toBe('João S****');
    });
  });
});
```

#### 6. Interfaces - Dependency Inversion
- [ ] **Tarefa**: Criar interfaces para serviços de integração
- [ ] **Prazo**: 2 dias

**📋 Workflow de Implementação:**

**Passo 1: Analisar dependências externas atuais**
- **Arquivo**: `src/modules/pagamento/services/pagamento.service.ts`
- **Análise**: Identificar acoplamentos diretos com serviços externos
- **Mapeamento**: Catalogar todas as integrações necessárias
- **Regras de Negócio**: Aplicar inversão de dependência para facilitar testes

**Dependências identificadas para abstração:**
- Serviço de integração com solicitações
- Serviço de integração com dados do cidadão
- Serviço de integração com documentos
- Serviço de auditoria
- Serviço de notificação
- Serviço de validação bancária

**Passo 2: Criar interface para integração com solicitações**
- **Arquivo**: `src/modules/pagamento/interfaces/integracao-solicitacao.interface.ts`
- **Dependências**: DTOs de solicitação, tipos de benefício
- **Implementação**:

```typescript
import { StatusSolicitacao } from '../../solicitacao/enums/status-solicitacao.enum';
import { TipoBeneficio } from '../../solicitacao/enums/tipo-beneficio.enum';
import { Solicitacao } from '../../solicitacao/entities/solicitacao.entity';

/**
 * Interface para operações com solicitações
 */
export interface IIntegracaoSolicitacaoService {
  /**
   * Busca solicitação por ID com validações de acesso
   */
  buscarSolicitacao(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<Solicitacao>>;

  /**
   * Valida se solicitação pode receber pagamento
   */
  validarElegibilidadePagamento(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoElegibilidade>>;

  /**
   * Atualiza status da solicitação após pagamento
   */
  atualizarStatusAposPagamento(
    solicitacaoId: string,
    statusPagamento: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>>;

  /**
   * Busca histórico de pagamentos da solicitação
   */
  buscarHistoricoPagamentos(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IHistoricoPagamento[]>>;

  /**
   * Calcula valor elegível para pagamento
   */
  calcularValorElegivel(
    solicitacaoId: string,
    tipoBeneficio: TipoBeneficio,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<ICalculoValor>>;
}

/**
 * Interface para contexto do usuário
 */
export interface IContextoUsuario {
  id: string;
  perfil: string;
  unidadeId?: string;
  permissoes: string[];
  isAdmin: boolean;
  isSupervisor: boolean;
}

/**
 * Interface para resultado de operações
 */
export interface IResultadoOperacao<T = any> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
  codigo?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Interface para validação de elegibilidade
 */
export interface IValidacaoElegibilidade {
  elegivel: boolean;
  motivos: string[];
  restricoes: IRestricaoPagamento[];
  valorMaximo?: number;
  documentosObrigatorios: string[];
  prazoLimite?: Date;
}

export interface IRestricaoPagamento {
  tipo: 'TEMPORAL' | 'DOCUMENTAL' | 'FINANCEIRA' | 'ADMINISTRATIVA';
  descricao: string;
  bloqueante: boolean;
  dataResolucao?: Date;
}

/**
 * Interface para histórico de pagamentos
 */
export interface IHistoricoPagamento {
  id: string;
  valor: number;
  status: string;
  dataCriacao: Date;
  dataProcessamento?: Date;
  observacoes?: string;
  responsavel: string;
}

/**
 * Interface para cálculo de valor
 */
export interface ICalculoValor {
  valorBase: number;
  valorCalculado: number;
  descontos: IItemCalculo[];
  acrescimos: IItemCalculo[];
  valorFinal: number;
  fundamentoLegal: string;
  observacoes?: string[];
}

export interface IItemCalculo {
  descricao: string;
  valor: number;
  percentual?: number;
  fundamentoLegal?: string;
}
```

**Passo 3: Criar interface para integração com dados do cidadão**
- **Arquivo**: `src/modules/pagamento/interfaces/integracao-cidadao.interface.ts`
- **Dependências**: DTOs de cidadão, tipos de documento
- **Implementação**:

```typescript
import { Cidadao } from '../../cidadao/entities/cidadao.entity';

/**
 * Interface para operações com dados do cidadão
 */
export interface IIntegracaoCidadaoService {
  /**
   * Busca dados completos do cidadão
   */
  buscarDadosCidadao(
    cidadaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<ICidadaoCompleto>>;

  /**
   * Valida dados bancários do cidadão
   */
  validarDadosBancarios(
    cidadaoId: string,
    dadosBancarios: IDadosBancarios,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoBancaria>>;

  /**
   * Busca histórico de pagamentos do cidadão
   */
  buscarHistoricoPagamentosCidadao(
    cidadaoId: string,
    filtros: IFiltrosHistorico,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IHistoricoCidadao>>;

  /**
   * Verifica situação cadastral do cidadão
   */
  verificarSituacaoCadastral(
    cidadaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<ISituacaoCadastral>>;

  /**
   * Atualiza dados bancários do cidadão
   */
  atualizarDadosBancarios(
    cidadaoId: string,
    dadosBancarios: IDadosBancarios,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>>;
}

/**
 * Interface para dados completos do cidadão
 */
export interface ICidadaoCompleto {
  id: string;
  nome: string;
  cpf: string;
  rg?: string;
  dataNascimento: Date;
  endereco: IEndereco;
  contato: IContato;
  dadosBancarios?: IDadosBancarios;
  situacaoCadastral: ISituacaoCadastral;
  documentos: IDocumentoCidadao[];
}

export interface IEndereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface IContato {
  telefone?: string;
  celular?: string;
  email?: string;
}

export interface IDadosBancarios {
  tipoPagamento: 'PIX' | 'TED' | 'DOC';
  pixTipo?: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'CHAVE_ALEATORIA';
  pixChave?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  digito?: string;
  titular: string;
  cpfTitular: string;
}

export interface IValidacaoBancaria {
  valida: boolean;
  detalhes: {
    pixValido?: boolean;
    contaValida?: boolean;
    titularValido?: boolean;
  };
  erros: string[];
  avisos: string[];
}

export interface ISituacaoCadastral {
  ativa: boolean;
  bloqueios: IBloqueio[];
  observacoes?: string;
  dataUltimaAtualizacao: Date;
}

export interface IBloqueio {
  tipo: string;
  motivo: string;
  dataInicio: Date;
  dataFim?: Date;
  ativo: boolean;
}

export interface IDocumentoCidadao {
  id: string;
  tipo: string;
  numero: string;
  dataEmissao?: Date;
  dataValidade?: Date;
  orgaoEmissor?: string;
  arquivo?: string;
}

export interface IFiltrosHistorico {
  dataInicio?: Date;
  dataFim?: Date;
  tipoBeneficio?: string;
  status?: string[];
  valorMinimo?: number;
  valorMaximo?: number;
}

export interface IHistoricoCidadao {
  pagamentos: IHistoricoPagamento[];
  resumo: {
    totalPagamentos: number;
    valorTotal: number;
    ultimoPagamento?: Date;
    beneficiosMaisFrequentes: string[];
  };
}
```

**Passo 4: Criar interface para integração com documentos**
- **Arquivo**: `src/modules/pagamento/interfaces/integracao-documento.interface.ts`
- **Dependências**: DTOs de documento, tipos de arquivo
- **Implementação**:

```typescript
/**
 * Interface para operações com documentos
 */
export interface IIntegracaoDocumentoService {
  /**
   * Busca documentos da solicitação
   */
  buscarDocumentosSolicitacao(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IDocumento[]>>;

  /**
   * Valida documentos obrigatórios para pagamento
   */
  validarDocumentosObrigatorios(
    solicitacaoId: string,
    tipoBeneficio: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoDocumentos>>;

  /**
   * Gera comprovante de pagamento
   */
  gerarComprovantePagamento(
    pagamentoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IComprovante>>;

  /**
   * Anexa documento ao pagamento
   */
  anexarDocumento(
    pagamentoId: string,
    documento: IDocumentoUpload,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IDocumento>>;

  /**
   * Remove documento do pagamento
   */
  removerDocumento(
    documentoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>>;

  /**
   * Busca histórico de documentos
   */
  buscarHistoricoDocumentos(
    pagamentoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IHistoricoDocumento[]>>;
}

/**
 * Interface para documento
 */
export interface IDocumento {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  mimeType: string;
  url: string;
  hash: string;
  dataUpload: Date;
  uploadedBy: string;
  obrigatorio: boolean;
  validado: boolean;
  observacoes?: string;
}

/**
 * Interface para upload de documento
 */
export interface IDocumentoUpload {
  nome: string;
  tipo: string;
  arquivo: Buffer;
  mimeType: string;
  obrigatorio: boolean;
  observacoes?: string;
}

/**
 * Interface para validação de documentos
 */
export interface IValidacaoDocumentos {
  valida: boolean;
  documentosObrigatorios: IRequisitoDocumento[];
  documentosEncontrados: string[];
  documentosFaltantes: string[];
  documentosInvalidos: IDocumentoInvalido[];
  observacoes: string[];
}

export interface IRequisitoDocumento {
  tipo: string;
  descricao: string;
  obrigatorio: boolean;
  formatos: string[];
  tamanhoMaximo: number;
  observacoes?: string;
}

export interface IDocumentoInvalido {
  documentoId: string;
  motivos: string[];
  podeCorrigir: boolean;
}

/**
 * Interface para comprovante
 */
export interface IComprovante {
  id: string;
  numero: string;
  tipo: 'PAGAMENTO' | 'CANCELAMENTO' | 'ESTORNO';
  arquivo: Buffer;
  mimeType: string;
  dataGeracao: Date;
  hash: string;
  assinatura?: string;
}

/**
 * Interface para histórico de documentos
 */
export interface IHistoricoDocumento {
  id: string;
  acao: 'UPLOAD' | 'VALIDACAO' | 'REMOCAO' | 'DOWNLOAD';
  documento: string;
  usuario: string;
  dataAcao: Date;
  detalhes?: Record<string, any>;
}
```

**Passo 5: Implementar serviços concretos**
- **Arquivo**: `src/modules/pagamento/services/integracao-solicitacao.service.ts`
- **Dependências**: Repository de solicitação, validadores
- **Regras de Negócio**: Implementar lógica real de integração

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IIntegracaoSolicitacaoService,
  IContextoUsuario,
  IResultadoOperacao,
  IValidacaoElegibilidade,
  ICalculoValor
} from '../interfaces/integracao-solicitacao.interface';
import { Solicitacao } from '../../solicitacao/entities/solicitacao.entity';
import { StatusSolicitacao } from '../../solicitacao/enums/status-solicitacao.enum';
import { TipoBeneficio } from '../../solicitacao/enums/tipo-beneficio.enum';

@Injectable()
export class IntegracaoSolicitacaoService implements IIntegracaoSolicitacaoService {
  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>
  ) {}

  async buscarSolicitacao(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<Solicitacao>> {
    try {
      const solicitacao = await this.solicitacaoRepository
        .createQueryBuilder('solicitacao')
        .leftJoinAndSelect('solicitacao.cidadao', 'cidadao')
        .leftJoinAndSelect('solicitacao.unidade', 'unidade')
        .leftJoinAndSelect('solicitacao.documentos', 'documentos')
        .where('solicitacao.id = :id', { id: solicitacaoId })
        .getOne();

      if (!solicitacao) {
        return {
          sucesso: false,
          erro: 'Solicitação não encontrada',
          codigo: 'SOLICITACAO_NAO_ENCONTRADA',
          timestamp: new Date()
        };
      }

      // Verificar permissão de acesso
      if (!this.verificarPermissaoAcesso(solicitacao, contextoUsuario)) {
        return {
          sucesso: false,
          erro: 'Acesso negado à solicitação',
          codigo: 'ACESSO_NEGADO',
          timestamp: new Date()
        };
      }

      return {
        sucesso: true,
        dados: solicitacao,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        sucesso: false,
        erro: 'Erro interno ao buscar solicitação',
        codigo: 'ERRO_INTERNO',
        timestamp: new Date(),
        metadata: { error: error.message }
      };
    }
  }

  async validarElegibilidadePagamento(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoElegibilidade>> {
    try {
      const resultadoBusca = await this.buscarSolicitacao(solicitacaoId, contextoUsuario);
      
      if (!resultadoBusca.sucesso) {
        return resultadoBusca as IResultadoOperacao<IValidacaoElegibilidade>;
      }

      const solicitacao = resultadoBusca.dados!;
      const validacao = await this.executarValidacaoElegibilidade(solicitacao);

      return {
        sucesso: true,
        dados: validacao,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        sucesso: false,
        erro: 'Erro ao validar elegibilidade',
        codigo: 'ERRO_VALIDACAO',
        timestamp: new Date(),
        metadata: { error: error.message }
      };
    }
  }

  private verificarPermissaoAcesso(
    solicitacao: Solicitacao,
    contextoUsuario: IContextoUsuario
  ): boolean {
    // Admin tem acesso total
    if (contextoUsuario.isAdmin) {
      return true;
    }

    // Supervisor tem acesso a solicitações da sua unidade
    if (contextoUsuario.isSupervisor && 
        solicitacao.unidadeId === contextoUsuario.unidadeId) {
      return true;
    }

    // Usuário comum só acessa solicitações da sua unidade
    return solicitacao.unidadeId === contextoUsuario.unidadeId;
  }

  private async executarValidacaoElegibilidade(
    solicitacao: Solicitacao
  ): Promise<IValidacaoElegibilidade> {
    const motivos: string[] = [];
    const restricoes: any[] = [];
    let elegivel = true;

    // Validar status da solicitação
    if (solicitacao.status !== StatusSolicitacao.APROVADA) {
      elegivel = false;
      motivos.push('Solicitação não está aprovada');
      restricoes.push({
        tipo: 'ADMINISTRATIVA',
        descricao: 'Solicitação deve estar aprovada para receber pagamento',
        bloqueante: true
      });
    }

    // Validar documentos obrigatórios
    const documentosObrigatorios = this.getDocumentosObrigatorios(solicitacao.tipoBeneficio);
    const documentosPresentes = solicitacao.documentos?.map(d => d.tipo) || [];
    const documentosFaltantes = documentosObrigatorios.filter(
      doc => !documentosPresentes.includes(doc)
    );

    if (documentosFaltantes.length > 0) {
      elegivel = false;
      motivos.push(`Documentos obrigatórios faltantes: ${documentosFaltantes.join(', ')}`);
      restricoes.push({
        tipo: 'DOCUMENTAL',
        descricao: 'Documentos obrigatórios não foram anexados',
        bloqueante: true
      });
    }

    // Validar prazo limite
    const prazoLimite = this.calcularPrazoLimite(solicitacao);
    if (prazoLimite && new Date() > prazoLimite) {
      elegivel = false;
      motivos.push('Prazo limite para pagamento expirado');
      restricoes.push({
        tipo: 'TEMPORAL',
        descricao: 'Prazo para processamento do pagamento expirou',
        bloqueante: true
      });
    }

    return {
      elegivel,
      motivos,
      restricoes,
      valorMaximo: this.calcularValorMaximo(solicitacao.tipoBeneficio),
      documentosObrigatorios,
      prazoLimite
    };
  }

  private getDocumentosObrigatorios(tipoBeneficio: TipoBeneficio): string[] {
    const documentosPorTipo = {
      [TipoBeneficio.AUXILIO_NATALIDADE]: ['CERTIDAO_NASCIMENTO', 'CPF_RESPONSAVEL'],
      [TipoBeneficio.ALUGUEL_SOCIAL]: ['CONTRATO_ALUGUEL', 'COMPROVANTE_RENDA', 'CPF_TITULAR']
    };

    return documentosPorTipo[tipoBeneficio] || [];
  }

  private calcularPrazoLimite(solicitacao: Solicitacao): Date | undefined {
    // Regra: 90 dias após aprovação
    if (solicitacao.dataAprovacao) {
      const prazo = new Date(solicitacao.dataAprovacao);
      prazo.setDate(prazo.getDate() + 90);
      return prazo;
    }
    return undefined;
  }

  private calcularValorMaximo(tipoBeneficio: TipoBeneficio): number {
    const valoresPorTipo = {
      [TipoBeneficio.AUXILIO_NATALIDADE]: 500.00,
      [TipoBeneficio.ALUGUEL_SOCIAL]: 1200.00
    };

    return valoresPorTipo[tipoBeneficio] || 0;
  }

  // Implementar outros métodos da interface...
  async atualizarStatusAposPagamento(
    solicitacaoId: string,
    statusPagamento: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>> {
    // Implementação da atualização de status
    return {
      sucesso: true,
      timestamp: new Date()
    };
  }

  async buscarHistoricoPagamentos(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<any[]>> {
    // Implementação da busca de histórico
    return {
      sucesso: true,
      dados: [],
      timestamp: new Date()
    };
  }

  async calcularValorElegivel(
    solicitacaoId: string,
    tipoBeneficio: TipoBeneficio,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<ICalculoValor>> {
    // Implementação do cálculo de valor
    const valorBase = this.calcularValorMaximo(tipoBeneficio);
    
    return {
      sucesso: true,
      dados: {
        valorBase,
        valorCalculado: valorBase,
        descontos: [],
        acrescimos: [],
        valorFinal: valorBase,
        fundamentoLegal: 'Lei Municipal 123/2023'
      },
      timestamp: new Date()
    };
  }
}
```

**Passo 6: Criar implementações mock para testes**
- **Arquivo**: `src/modules/pagamento/mocks/integracao.mock.ts`
- **Dependências**: Interfaces criadas
- **Regras de Negócio**: Simular comportamentos para testes

```typescript
import { Injectable } from '@nestjs/common';
import {
  IIntegracaoSolicitacaoService,
  IIntegracaoCidadaoService,
  IIntegracaoDocumentoService,
  IContextoUsuario,
  IResultadoOperacao
} from '../interfaces';

@Injectable()
export class MockIntegracaoSolicitacaoService implements IIntegracaoSolicitacaoService {
  private solicitacoes: any[] = [];

  async buscarSolicitacao(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<any>> {
    const solicitacao = this.solicitacoes.find(s => s.id === solicitacaoId);
    
    if (!solicitacao) {
      return {
        sucesso: false,
        erro: 'Solicitação não encontrada',
        codigo: 'NOT_FOUND',
        timestamp: new Date()
      };
    }

    return {
      sucesso: true,
      dados: solicitacao,
      timestamp: new Date()
    };
  }

  // Implementar outros métodos mock...
  async validarElegibilidadePagamento(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<any>> {
    return {
      sucesso: true,
      dados: {
        elegivel: true,
        motivos: [],
        restricoes: [],
        valorMaximo: 1000,
        documentosObrigatorios: ['CPF'],
        prazoLimite: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      },
      timestamp: new Date()
    };
  }

  // Métodos para configurar mocks em testes
  setSolicitacoes(solicitacoes: any[]): void {
    this.solicitacoes = solicitacoes;
  }

  clearSolicitacoes(): void {
    this.solicitacoes = [];
  }
}

// Implementações similares para outros serviços mock...
```

**Passo 7: Atualizar serviço principal para usar interfaces**
- **Arquivo**: `src/modules/pagamento/services/pagamento.service.ts`
- **Método**: Injetar dependências via interfaces
- **Regras de Negócio**: Remover acoplamento direto

```typescript
constructor(
  @InjectRepository(Pagamento)
  private readonly pagamentoRepository: Repository<Pagamento>,
  @Inject('INTEGRACAO_SOLICITACAO_SERVICE')
  private readonly integracaoSolicitacaoService: IIntegracaoSolicitacaoService,
  @Inject('INTEGRACAO_CIDADAO_SERVICE')
  private readonly integracaoCidadaoService: IIntegracaoCidadaoService,
  @Inject('INTEGRACAO_DOCUMENTO_SERVICE')
  private readonly integracaoDocumentoService: IIntegracaoDocumentoService
) {}
```

**Passo 8: Atualizar módulo para registrar providers**
- **Arquivo**: `src/modules/pagamento/pagamento.module.ts`
- **Método**: Configurar injeção de dependência

```typescript
@Module({
  providers: [
    PagamentoService,
    {
      provide: 'INTEGRACAO_SOLICITACAO_SERVICE',
      useClass: process.env.NODE_ENV === 'test' 
        ? MockIntegracaoSolicitacaoService 
        : IntegracaoSolicitacaoService
    },
    {
      provide: 'INTEGRACAO_CIDADAO_SERVICE',
      useClass: process.env.NODE_ENV === 'test' 
        ? MockIntegracaoCidadaoService 
        : IntegracaoCidadaoService
    },
    {
      provide: 'INTEGRACAO_DOCUMENTO_SERVICE',
      useClass: process.env.NODE_ENV === 'test' 
        ? MockIntegracaoDocumentoService 
        : IntegracaoDocumentoService
    }
  ]
})
export class PagamentoModule {}
```

**Passo 9: Criar testes unitários**
- **Arquivo**: `src/modules/pagamento/tests/integracao-interfaces.spec.ts`
- **Casos de teste**:
  - Verificar contratos das interfaces
  - Testar implementações mock
  - Validar injeção de dependência
  - Testar cenários de erro

```typescript
describe('Integração Interfaces', () => {
  describe('IntegracaoSolicitacaoService', () => {
    it('should find solicitacao with proper access control', async () => {
      const service = new IntegracaoSolicitacaoService(mockRepository);
      const contexto = { id: 'user1', isAdmin: true } as IContextoUsuario;
      
      const result = await service.buscarSolicitacao('sol-123', contexto);
      
      expect(result.sucesso).toBe(true);
      expect(result.dados).toBeDefined();
    });
    
    it('should validate elegibility correctly', async () => {
      const service = new IntegracaoSolicitacaoService(mockRepository);
      const contexto = { id: 'user1', isAdmin: true } as IContextoUsuario;
      
      const result = await service.validarElegibilidadePagamento('sol-123', contexto);
      
      expect(result.sucesso).toBe(true);
      expect(result.dados.elegivel).toBeDefined();
    });
  });
  
  describe('Mock Services', () => {
    it('should implement all interface methods', () => {
      const mockService = new MockIntegracaoSolicitacaoService();
      
      expect(mockService.buscarSolicitacao).toBeDefined();
      expect(mockService.validarElegibilidadePagamento).toBeDefined();
      expect(mockService.atualizarStatusAposPagamento).toBeDefined();
    });
  });
});
```

#### 7. Performance - Índices de Banco
- [ ] **Tarefa**: Criar migration com índices otimizados
- [ ] **Arquivo**: Criar nova migration
- [ ] **Ação**: Adicionar índices compostos para queries frequentes
- [ ] **Critério**: Queries de listagem devem ser <100ms
- [ ] **Teste**: Executar EXPLAIN ANALYZE nas queries principais
- [ ] **Prazo**: 1 dia

**Workflow de Implementação:**

1. **Análise das Queries Atuais**
   - Identificar queries mais frequentes no serviço de pagamento
   - Analisar planos de execução com `EXPLAIN ANALYZE`
   - Mapear campos utilizados em WHERE, ORDER BY e JOIN

2. **Criação da Migration**
   ```typescript
   // src/database/migrations/YYYYMMDDHHMMSS-create-pagamento-indexes.ts
   import { MigrationInterface, QueryRunner } from 'typeorm';
   
   export class CreatePagamentoIndexes1234567890123 implements MigrationInterface {
     name = 'CreatePagamentoIndexes1234567890123';
   
     public async up(queryRunner: QueryRunner): Promise<void> {
       // Índices compostos para queries de listagem
       await queryRunner.query(`
         CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagamento_status_created_at 
         ON pagamentos(status, created_at DESC)
       `);
       
       await queryRunner.query(`
         CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagamento_unidade_status 
         ON pagamentos(unidade_id, status, created_at DESC)
       `);
       
       await queryRunner.query(`
         CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagamento_solicitacao_id 
         ON pagamentos(solicitacao_id)
       `);
       
       await queryRunner.query(`
         CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagamento_beneficiario_cpf 
         ON pagamentos(beneficiario_cpf)
       `);
       
       await queryRunner.query(`
         CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagamento_data_processamento 
         ON pagamentos(data_processamento) WHERE data_processamento IS NOT NULL
       `);
       
       await queryRunner.query(`
         CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagamento_valor_status 
         ON pagamentos(valor, status) WHERE status IN ('PROCESSADO', 'PAGO')
       `);
     }
   
     public async down(queryRunner: QueryRunner): Promise<void> {
       await queryRunner.query(`DROP INDEX IF EXISTS idx_pagamento_valor_status`);
       await queryRunner.query(`DROP INDEX IF EXISTS idx_pagamento_data_processamento`);
       await queryRunner.query(`DROP INDEX IF EXISTS idx_pagamento_beneficiario_cpf`);
       await queryRunner.query(`DROP INDEX IF EXISTS idx_pagamento_solicitacao_id`);
       await queryRunner.query(`DROP INDEX IF EXISTS idx_pagamento_unidade_status`);
       await queryRunner.query(`DROP INDEX IF EXISTS idx_pagamento_status_created_at`);
     }
   }
   ```

3. **Atualização da Entidade com Decorators de Índice**
   ```typescript
   // src/modules/pagamento/entities/pagamento.entity.ts
   import { Entity, Index } from 'typeorm';
   
   @Entity('pagamentos')
   @Index('idx_pagamento_status_created_at', ['status', 'createdAt'])
   @Index('idx_pagamento_unidade_status', ['unidadeId', 'status', 'createdAt'])
   @Index('idx_pagamento_solicitacao_id', ['solicitacaoId'])
   @Index('idx_pagamento_beneficiario_cpf', ['beneficiarioCpf'])
   @Index('idx_pagamento_data_processamento', ['dataProcessamento'], { 
     where: 'data_processamento IS NOT NULL' 
   })
   @Index('idx_pagamento_valor_status', ['valor', 'status'], {
     where: "status IN ('PROCESSADO', 'PAGO')"
   })
   export class PagamentoEntity {
     // ... propriedades existentes
   }
   ```

4. **Otimização das Queries no Serviço**
   ```typescript
   // src/modules/pagamento/services/pagamento.service.ts
   
   // Query otimizada para listagem por status e unidade
   async findByUnidadeAndStatus(
     unidadeId: string, 
     status: StatusPagamento[],
     pagination: PaginationDto
   ): Promise<PagamentoEntity[]> {
     return this.pagamentoRepository
       .createQueryBuilder('p')
       .where('p.unidade_id = :unidadeId', { unidadeId })
       .andWhere('p.status IN (:...status)', { status })
       .orderBy('p.created_at', 'DESC')
       .skip(pagination.skip)
       .take(pagination.take)
       .getMany();
   }
   
   // Query otimizada para busca por CPF
   async findByBeneficiarioCpf(cpf: string): Promise<PagamentoEntity[]> {
     return this.pagamentoRepository.find({
       where: { beneficiarioCpf: cpf },
       order: { createdAt: 'DESC' }
     });
   }
   ```

5. **Script de Análise de Performance**
   ```typescript
   // scripts/analyze-query-performance.ts
   import { DataSource } from 'typeorm';
   
   interface QueryAnalysis {
     query: string;
     executionTime: number;
     planningTime: number;
     usesIndex: boolean;
     indexesUsed: string[];
   }
   
   export class QueryPerformanceAnalyzer {
     constructor(private dataSource: DataSource) {}
   
     async analyzeQuery(sql: string, params: any[] = []): Promise<QueryAnalysis> {
       const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
       const result = await this.dataSource.query(explainQuery, params);
       
       const plan = result[0]['QUERY PLAN'][0];
       
       return {
         query: sql,
         executionTime: plan['Execution Time'],
         planningTime: plan['Planning Time'],
         usesIndex: this.checkIndexUsage(plan),
         indexesUsed: this.extractIndexNames(plan)
       };
     }
   
     private checkIndexUsage(plan: any): boolean {
       return JSON.stringify(plan).includes('Index Scan');
     }
   
     private extractIndexNames(plan: any): string[] {
       const planStr = JSON.stringify(plan);
       const indexMatches = planStr.match(/"Index Name":\s*"([^"]+)"/g);
       return indexMatches ? indexMatches.map(m => m.split('"')[3]) : [];
     }
   }
   
   // Exemplos de queries para análise
   const QUERIES_TO_ANALYZE = [
     {
       name: 'Listagem por status',
       sql: `SELECT * FROM pagamentos WHERE status = $1 ORDER BY created_at DESC LIMIT 20`,
       params: ['PENDENTE']
     },
     {
       name: 'Busca por unidade e status',
       sql: `SELECT * FROM pagamentos WHERE unidade_id = $1 AND status IN ($2, $3) ORDER BY created_at DESC`,
       params: ['uuid-unidade', 'PENDENTE', 'PROCESSANDO']
     },
     {
       name: 'Busca por solicitação',
       sql: `SELECT * FROM pagamentos WHERE solicitacao_id = $1`,
       params: ['uuid-solicitacao']
     }
   ];
   ```

6. **Testes de Performance**
   ```typescript
   // src/modules/pagamento/tests/performance/pagamento-performance.spec.ts
   import { Test } from '@nestjs/testing';
   import { PagamentoService } from '../services/pagamento.service';
   import { QueryPerformanceAnalyzer } from '../../../../scripts/analyze-query-performance';
   
   describe('PagamentoService Performance Tests', () => {
     let service: PagamentoService;
     let analyzer: QueryPerformanceAnalyzer;
   
     beforeEach(async () => {
       const module = await Test.createTestingModule({
         // ... configuração do módulo
       }).compile();
   
       service = module.get<PagamentoService>(PagamentoService);
       analyzer = new QueryPerformanceAnalyzer(dataSource);
     });
   
     it('deve executar listagem por status em menos de 100ms', async () => {
       const startTime = Date.now();
       await service.findByStatus(['PENDENTE'], { skip: 0, take: 20 });
       const executionTime = Date.now() - startTime;
   
       expect(executionTime).toBeLessThan(100);
     });
   
     it('deve usar índices nas queries principais', async () => {
       const analysis = await analyzer.analyzeQuery(
         'SELECT * FROM pagamentos WHERE status = $1 ORDER BY created_at DESC LIMIT 20',
         ['PENDENTE']
       );
   
       expect(analysis.usesIndex).toBe(true);
       expect(analysis.indexesUsed).toContain('idx_pagamento_status_created_at');
       expect(analysis.executionTime).toBeLessThan(100);
     });
   
     it('deve otimizar busca por unidade e status', async () => {
       const analysis = await analyzer.analyzeQuery(
         'SELECT * FROM pagamentos WHERE unidade_id = $1 AND status = $2',
         ['uuid-test', 'PENDENTE']
       );
   
       expect(analysis.usesIndex).toBe(true);
       expect(analysis.indexesUsed).toContain('idx_pagamento_unidade_status');
     });
   });
   ```

7. **Execução e Validação**
   ```bash
   # Executar a migration
   npm run migration:run
   
   # Executar análise de performance
   npm run script:analyze-performance
   
   # Executar testes de performance
   npm run test:performance
   ```

8. **Monitoramento Contínuo**
   ```typescript
   // src/common/interceptors/query-performance.interceptor.ts
   import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
   import { Observable } from 'rxjs';
   import { tap } from 'rxjs/operators';
   
   @Injectable()
   export class QueryPerformanceInterceptor implements NestInterceptor {
     private readonly logger = new Logger(QueryPerformanceInterceptor.name);
     private readonly SLOW_QUERY_THRESHOLD = 100; // ms
   
     intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
       const startTime = Date.now();
       const request = context.switchToHttp().getRequest();
       
       return next.handle().pipe(
         tap(() => {
           const executionTime = Date.now() - startTime;
           
           if (executionTime > this.SLOW_QUERY_THRESHOLD) {
             this.logger.warn(
               `Slow query detected: ${request.method} ${request.url} - ${executionTime}ms`
             );
           }
         })
       );
     }
   }
   ```

**Critérios de Sucesso:**
- Todas as queries de listagem executam em menos de 100ms
- Índices são utilizados conforme esperado (verificado via EXPLAIN ANALYZE)
- Testes de performance passam consistentemente
- Monitoramento não reporta queries lentas em operações normais

#### 8. DRY - Consolidação de Validações
- [ ] **Tarefa**: Criar método privado para validações repetidas
- [ ] **Arquivo**: `src/modules/pagamento/services/pagamento.service.ts`
- [ ] **Ação**: Extrair `findPagamentoOrThrow()` e `mapToResponseDto()`
- [ ] **Critério**: Eliminar duplicação de código
- [ ] **Teste**: Comportamento mantido após consolidação
- [ ] **Prazo**: 1 dia

### 🟢 **BAIXA PRIORIDADE - Backlog**

#### 9. Performance - Cursor Pagination
- [ ] **Tarefa**: Implementar paginação baseada em cursor
- [ ] **Arquivo**: `src/modules/pagamento/services/pagamento.service.ts`
- [ ] **Ação**: Substituir skip/take por cursor-based pagination
- [ ] **Critério**: Performance consistente independente do offset
- [ ] **Teste**: Benchmark com datasets grandes
- [ ] **Prazo**: 5 dias

#### 10. Arquitetura - Strategy Pattern para Transições
- [ ] **Tarefa**: Refatorar validator de transições
- [ ] **Arquivo**: `src/modules/pagamento/validators/status-transition-validator.ts`
- [ ] **Ação**: Implementar padrão Strategy para transições configuráveis
- [ ] **Critério**: Transições devem ser facilmente extensíveis
- [ ] **Teste**: Adicionar nova transição sem modificar código existente
- [ ] **Prazo**: 4 dias

#### 11. Limpeza - Remoção de Código Não Utilizado
- [ ] **Tarefa**: Remover serviços comentados e código morto
- [ ] **Arquivos**: 
  - `src/modules/pagamento/pagamento.module.ts`
  - Arquivos de validação não utilizados
- [ ] **Ação**: Limpar imports e providers comentados
- [ ] **Critério**: Código limpo sem comentários desnecessários
- [ ] **Teste**: Compilação e testes passando
- [ ] **Prazo**: 1 dia

#### 12. Simplificação - Consolidação de Arquivos
- [ ] **Tarefa**: Consolidar validators relacionados
- [ ] **Arquivo**: Criar `src/modules/pagamento/validators/index.ts`
- [ ] **Ação**: Agrupar validators pequenos em um arquivo
- [ ] **Critério**: Estrutura mais simples e navegável
- [ ] **Teste**: Imports funcionando corretamente
- [ ] **Prazo**: 2 dias

## Checklist de Conformidade com Responsabilidades

### ✅ Controle de Liberação de Recursos
- [ ] Fluxo completo de pagamento implementado (AGENDADO → LIBERADO → CONFIRMADO)
- [ ] Validações de transição de status funcionando
- [ ] Cancelamento de pagamentos com motivo obrigatório
- [ ] Dados sensíveis mascarados adequadamente

### ✅ Integração com Outros Módulos
- [ ] Integração com módulo de Solicitação funcionando
- [ ] Integração com módulo de Cidadão para dados bancários
- [ ] Integração com módulo de Documento para comprovantes
- [ ] Integração com módulo de Auditoria para logs

### ✅ Segurança e Auditoria
- [ ] Todas as operações auditadas
- [ ] Controle de acesso baseado em unidade
- [ ] Dados sensíveis protegidos
- [ ] Validações de entrada implementadas

### ✅ Validações de Negócio
- [ ] Dados bancários validados
- [ ] Chaves PIX validadas por tipo
- [ ] Limites de valor respeitados
- [ ] Status de solicitação verificado

## Cronograma de Implementação

### Semana 1 (Alta Prioridade)
- **Dia 1**: Mascaramento de dados sensíveis
- **Dia 2-3**: Correção do N+1 problem
- **Dia 4**: Integração real de auditoria
- **Dia 5**: Início da validação rigorosa de autorização

### Semana 2 (Média Prioridade)
- **Dia 1**: Finalização da validação de autorização
- **Dia 2-4**: Refatoração do controller (SRP)
- **Dia 5**: Criação de interfaces

### Semana 3 (Média Prioridade)
- **Dia 1**: Índices de banco
- **Dia 2**: Consolidação de validações
- **Dia 3-5**: Início das tarefas de baixa prioridade

## Critérios de Aceitação

### Segurança
- [ ] Nenhum dado sensível exposto em logs ou respostas
- [ ] Controle de acesso funcionando 100%
- [ ] Auditoria completa de todas as operações

### Performance
- [ ] Queries de listagem < 100ms
- [ ] Máximo 3 queries por operação de busca
- [ ] Paginação eficiente implementada

### Qualidade de Código
- [ ] Cobertura de testes > 80%
- [ ] Princípios SOLID respeitados
- [ ] Código DRY sem duplicações
- [ ] Arquitetura simples e navegável

## Testes de Validação

### Testes de Segurança
```bash
# Executar testes de segurança
npm run test:security
npm run test:integration -- --grep="segurança"
```

### Testes de Performance
```bash
# Executar testes de performance
npm run test:performance
npm run test:load
```

### Testes de Integração
```bash
# Executar suite completa
npm run test:integration
npm run test:e2e
```

## Monitoramento Pós-Implementação

### Métricas a Acompanhar
- [ ] Tempo de resposta dos endpoints
- [ ] Número de queries por operação
- [ ] Taxa de erro de autorização
- [ ] Cobertura de auditoria

### Alertas a Configurar
- [ ] Tempo de resposta > 500ms
- [ ] Falhas de autorização > 1%
- [ ] Dados sensíveis em logs
- [ ] Falhas de auditoria

## Responsáveis

- **Tech Lead**: Revisão de arquitetura e aprovação final
- **Desenvolvedor Senior**: Implementação de alta prioridade
- **Desenvolvedor Pleno**: Implementação de média prioridade
- **QA**: Validação de testes e critérios de aceitação
- **DevOps**: Configuração de índices e monitoramento

## Notas Importantes

1. **Backup**: Sempre fazer backup antes de modificações em produção
2. **Rollback**: Ter plano de rollback para cada mudança
3. **Comunicação**: Informar equipe sobre mudanças que afetam APIs
4. **Documentação**: Atualizar documentação após cada implementação
5. **Testes**: Executar suite completa antes de cada deploy

---

**Última atualização**: 2025-01-18  
**Versão**: 1.0  
**Status**: Em implementação