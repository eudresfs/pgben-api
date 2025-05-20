# Integração com AuditoriaModule

## Visão Geral

O módulo de Configuração fornece serviços que podem ser utilizados pelo módulo de Auditoria para parametrizar configurações de registro de logs e auditoria de operações. Esta documentação demonstra como implementar essa integração.

## Serviços Disponibilizados

### 1. Serviço de Parâmetros

O `ParametroService` permite acessar parâmetros operacionais que controlam o comportamento do sistema de auditoria.

### 2. Serviço de Limites

O `LimitesService` fornece configurações de retenção de logs e registros de auditoria.

## Implementação da Integração

### Passo 1: Importar o Módulo de Configuração

No arquivo `auditoria.module.ts`, importe o módulo de Configuração:

```typescript
import { Module } from '@nestjs/common';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { LogAuditoriaService } from './services/log-auditoria.service';
import { AuditoriaService } from './services/auditoria.service';
// Outros imports necessários...

@Module({
  imports: [
    ConfiguracaoModule,
    // Outros módulos necessários...
  ],
  controllers: [
    // Controllers do módulo de Auditoria...
  ],
  providers: [
    LogAuditoriaService,
    AuditoriaService,
    // Outros providers...
  ],
  exports: [
    LogAuditoriaService,
    AuditoriaService,
  ]
})
export class AuditoriaModule {}
```

### Passo 2: Injetar os Serviços Necessários

#### Exemplo: Serviço de Auditoria

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ParametroService } from '../../configuracao/services/parametro.service';
import { LimitesService } from '../../configuracao/services/limites.service';
import { RegistroAuditoriaRepository } from '../repositories/registro-auditoria.repository';
import { RegistroAuditoriaDto } from '../dtos/registro-auditoria.dto';
import { ParametroChavesEnum } from '../../configuracao/enums/parametro-chaves.enum';

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);
  private nivelDetalheAuditoria: number;

  constructor(
    private readonly registroRepository: RegistroAuditoriaRepository,
    private readonly parametroService: ParametroService,
    private readonly limitesService: LimitesService
  ) {
    this.carregarConfiguracoes();
  }

  /**
   * Carrega as configurações de auditoria
   */
  private async carregarConfiguracoes(): Promise<void> {
    try {
      // Obter nível de detalhe das auditorias (1-básico, 2-intermediário, 3-detalhado)
      const parametroNivel = await this.parametroService.buscarPorChave(
        ParametroChavesEnum.NIVEL_DETALHE_AUDITORIA
      );
      
      this.nivelDetalheAuditoria = parametroNivel ? Number(parametroNivel.valor) : 1;
      
      this.logger.log(`Nível de detalhe de auditoria configurado: ${this.nivelDetalheAuditoria}`);
    } catch (error) {
      this.logger.error(`Erro ao carregar configurações de auditoria: ${error.message}`, error.stack);
      // Usar valor padrão em caso de erro
      this.nivelDetalheAuditoria = 1;
    }
  }

  /**
   * Registra uma operação de auditoria
   * @param dto Dados da operação
   */
  async registrarOperacao(dto: RegistroAuditoriaDto): Promise<any> {
    try {
      // Verificar se o nível de detalhe da operação está habilitado
      if (dto.nivel && dto.nivel > this.nivelDetalheAuditoria) {
        // Operação com nível de detalhe superior ao configurado, não registrar
        return null;
      }
      
      // Registrar a operação
      const registro = await this.registroRepository.criar({
        ...dto,
        data: dto.data || new Date()
      });
      
      return registro;
    } catch (error) {
      this.logger.error(`Erro ao registrar operação de auditoria: ${error.message}`, error.stack);
      // Não propagar o erro para não interromper o fluxo principal
      return null;
    }
  }

  /**
   * Limpa registros de auditoria antigos
   */
  async limparRegistrosAntigos(): Promise<number> {
    try {
      // Obter período de retenção configurado (em dias)
      const periodoRetencao = await this.limitesService.buscarPeriodoRetencaoAuditoria();
      
      if (!periodoRetencao || periodoRetencao <= 0) {
        this.logger.log('Limpeza de registros de auditoria desabilitada.');
        return 0;
      }
      
      // Calcular data limite
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - periodoRetencao);
      
      // Excluir registros antigos
      const registrosExcluidos = await this.registroRepository.excluirAnterioresA(dataLimite);
      
      this.logger.log(`Limpeza de auditoria concluída: ${registrosExcluidos} registros excluídos.`);
      return registrosExcluidos;
    } catch (error) {
      this.logger.error(`Erro ao limpar registros de auditoria: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verifica se a auditoria está habilitada para um tipo específico de operação
   * @param tipoOperacao Tipo de operação
   */
  async isAuditoriaHabilitada(tipoOperacao: string): Promise<boolean> {
    try {
      // Obter parâmetro de tipos de operação habilitados
      const parametroTipos = await this.parametroService.buscarPorChave(
        ParametroChavesEnum.TIPOS_OPERACAO_AUDITORIA
      );
      
      if (!parametroTipos || !parametroTipos.valor) {
        // Se não houver configuração, auditar tudo
        return true;
      }
      
      // Verificar se o tipo está na lista de tipos habilitados
      const tiposHabilitados = parametroTipos.valor.split(',').map(tipo => tipo.trim());
      
      // Se a lista contém '*', todos os tipos estão habilitados
      if (tiposHabilitados.includes('*')) {
        return true;
      }
      
      return tiposHabilitados.includes(tipoOperacao);
    } catch (error) {
      this.logger.error(`Erro ao verificar habilitação de auditoria: ${error.message}`, error.stack);
      // Em caso de erro, assumir que a auditoria está habilitada (mais seguro)
      return true;
    }
  }
}
```

#### Exemplo: Serviço de Log de Auditoria

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ParametroService } from '../../configuracao/services/parametro.service';
import { ParametroChavesEnum } from '../../configuracao/enums/parametro-chaves.enum';
import { AuditoriaService } from './auditoria.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LogAuditoriaService {
  private readonly logger = new Logger(LogAuditoriaService.name);
  private diretorioLogs: string;
  private registrarArquivo: boolean;

  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly parametroService: ParametroService
  ) {
    this.carregarConfiguracoes();
  }

  /**
   * Carrega as configurações de logs
   */
  private async carregarConfiguracoes(): Promise<void> {
    try {
      // Obter diretório de logs
      const parametroDiretorio = await this.parametroService.buscarPorChave(
        ParametroChavesEnum.DIRETORIO_LOGS
      );
      
      this.diretorioLogs = parametroDiretorio?.valor || 'logs';
      
      // Verificar se deve registrar em arquivo
      const parametroRegistrarArquivo = await this.parametroService.buscarPorChave(
        ParametroChavesEnum.REGISTRAR_LOGS_ARQUIVO
      );
      
      this.registrarArquivo = parametroRegistrarArquivo?.valor === 'true';
      
      // Criar diretório de logs se não existir e estiver habilitado
      if (this.registrarArquivo) {
        await fs.promises.mkdir(this.diretorioLogs, { recursive: true });
      }
      
      this.logger.log(`Configurações de log carregadas: diretório=${this.diretorioLogs}, registrar em arquivo=${this.registrarArquivo}`);
    } catch (error) {
      this.logger.error(`Erro ao carregar configurações de log: ${error.message}`, error.stack);
      // Usar valores padrão em caso de erro
      this.diretorioLogs = 'logs';
      this.registrarArquivo = false;
    }
  }

  /**
   * Registra um log de auditoria
   * @param tipo Tipo de log
   * @param mensagem Mensagem do log
   * @param dados Dados adicionais
   * @param usuarioId ID do usuário (opcional)
   */
  async registrarLog(
    tipo: string,
    mensagem: string,
    dados?: any,
    usuarioId?: string
  ): Promise<void> {
    try {
      // Verificar se a auditoria está habilitada para este tipo
      const auditoriaHabilitada = await this.auditoriaService.isAuditoriaHabilitada(tipo);
      
      if (!auditoriaHabilitada) {
        return;
      }
      
      // Registrar na auditoria do banco de dados
      await this.auditoriaService.registrarOperacao({
        tipo,
        descricao: mensagem,
        dados: dados ? JSON.stringify(dados) : null,
        usuario_id: usuarioId,
        ip: this.obterIpAtual(),
        data: new Date(),
        nivel: 1 // Nível básico
      });
      
      // Registrar em arquivo se habilitado
      if (this.registrarArquivo) {
        await this.registrarEmArquivo(tipo, mensagem, dados, usuarioId);
      }
    } catch (error) {
      this.logger.error(`Erro ao registrar log: ${error.message}`, error.stack);
    }
  }

  /**
   * Registra um log de erro de auditoria
   * @param erro Objeto de erro
   * @param contexto Contexto do erro
   * @param usuarioId ID do usuário (opcional)
   */
  async registrarErro(
    erro: Error,
    contexto: string,
    usuarioId?: string
  ): Promise<void> {
    try {
      const dados = {
        mensagem: erro.message,
        stack: erro.stack,
        contexto
      };
      
      // Registrar na auditoria do banco de dados
      await this.auditoriaService.registrarOperacao({
        tipo: 'ERRO',
        descricao: `Erro em ${contexto}: ${erro.message}`,
        dados: JSON.stringify(dados),
        usuario_id: usuarioId,
        ip: this.obterIpAtual(),
        data: new Date(),
        nivel: 1 // Erros sempre são registrados com nível básico
      });
      
      // Registrar em arquivo se habilitado
      if (this.registrarArquivo) {
        await this.registrarEmArquivo('ERRO', erro.message, dados, usuarioId);
      }
    } catch (error) {
      this.logger.error(`Erro ao registrar erro: ${error.message}`, error.stack);
    }
  }

  /**
   * Registra log em arquivo
   */
  private async registrarEmArquivo(
    tipo: string,
    mensagem: string,
    dados?: any,
    usuarioId?: string
  ): Promise<void> {
    try {
      const data = new Date();
      const dataFormatada = this.formatarData(data);
      const nomeArquivo = `${dataFormatada.substr(0, 10)}.log`;
      const arquivoPath = path.join(this.diretorioLogs, nomeArquivo);
      
      // Formatar log
      const logFormatado = [
        `[${dataFormatada}]`,
        `[${tipo}]`,
        usuarioId ? `[Usuário: ${usuarioId}]` : '',
        mensagem,
        dados ? `Dados: ${JSON.stringify(dados)}` : ''
      ].filter(Boolean).join(' ');
      
      // Adicionar quebra de linha
      const logComQuebraLinha = `${logFormatado}\n`;
      
      // Append ao arquivo de log
      await fs.promises.appendFile(arquivoPath, logComQuebraLinha);
    } catch (error) {
      this.logger.error(`Erro ao registrar em arquivo: ${error.message}`, error.stack);
    }
  }

  /**
   * Obtém o IP atual (simulado)
   */
  private obterIpAtual(): string {
    // Em uma implementação real, obteria o IP da requisição
    return '127.0.0.1';
  }

  /**
   * Formata uma data para log
   */
  private formatarData(data: Date): string {
    return data.toISOString().replace('T', ' ').substr(0, 19);
  }
}
```

### Passo 3: Utilizar os Serviços em um Interceptor

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LogAuditoriaService } from '../services/log-auditoria.service';
import { ParametroService } from '../../configuracao/services/parametro.service';
import { ParametroChavesEnum } from '../../configuracao/enums/parametro-chaves.enum';

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditoriaInterceptor.name);
  private auditarRequisicoes: boolean;

  constructor(
    private readonly logAuditoriaService: LogAuditoriaService,
    private readonly parametroService: ParametroService
  ) {
    this.carregarConfiguracoes();
  }

  /**
   * Carrega configurações de auditoria de requisições
   */
  private async carregarConfiguracoes(): Promise<void> {
    try {
      const parametro = await this.parametroService.buscarPorChave(
        ParametroChavesEnum.AUDITAR_REQUISICOES
      );
      
      this.auditarRequisicoes = parametro?.valor === 'true';
      this.logger.log(`Auditoria de requisições: ${this.auditarRequisicoes ? 'habilitada' : 'desabilitada'}`);
    } catch (error) {
      this.logger.error(`Erro ao carregar configuração de auditoria: ${error.message}`, error.stack);
      this.auditarRequisicoes = false;
    }
  }

  /**
   * Intercepta requisições para auditoria
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.auditarRequisicoes) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { method, url, body, params, query, user } = request;
    const usuarioId = user?.id;
    
    // Dados da requisição
    const dadosRequisicao = {
      method,
      url,
      params,
      query
    };
    
    // Não incluir o body completo para evitar dados sensíveis ou muito grandes
    if (method !== 'GET') {
      dadosRequisicao['hasBody'] = !!body;
    }

    const now = Date.now();
    
    return next.handle().pipe(
      tap({
        next: (data) => {
          // Requisição bem-sucedida
          const tempoExecucao = Date.now() - now;
          
          this.logAuditoriaService.registrarLog(
            'REQUISICAO',
            `${method} ${url} - ${tempoExecucao}ms`,
            dadosRequisicao,
            usuarioId
          );
        },
        error: (error) => {
          // Requisição com erro
          const tempoExecucao = Date.now() - now;
          
          this.logAuditoriaService.registrarErro(
            error,
            `${method} ${url} - ${tempoExecucao}ms`,
            usuarioId
          );
        }
      })
    );
  }
}
```

### Passo 4: Configurar o Interceptor

No arquivo `app.module.ts` ou em um módulo específico:

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { AuditoriaInterceptor } from './modules/auditoria/interceptors/auditoria.interceptor';

@Module({
  imports: [
    AuditoriaModule,
    // Outros módulos...
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditoriaInterceptor
    }
  ]
})
export class AppModule {}
```

## Exemplo de Uso

### Auditoria de Ações Críticas

```typescript
// Em um serviço que precisa auditar ações críticas
import { Injectable } from '@nestjs/common';
import { LogAuditoriaService } from '../auditoria/services/log-auditoria.service';

@Injectable()
export class BeneficioService {
  constructor(
    private readonly logAuditoriaService: LogAuditoriaService
  ) {}

  async aprovarBeneficio(id: string, observacao: string, usuarioId: string) {
    try {
      // Lógica para aprovar o benefício...
      
      // Registrar a operação crítica na auditoria
      await this.logAuditoriaService.registrarLog(
        'APROVACAO_BENEFICIO',
        `Benefício ${id} aprovado`,
        {
          beneficio_id: id,
          observacao,
          data_aprovacao: new Date()
        },
        usuarioId
      );
      
      // Resto da lógica...
      return { success: true };
    } catch (error) {
      // Registrar erro na auditoria
      await this.logAuditoriaService.registrarErro(
        error,
        `Aprovação de benefício ${id}`,
        usuarioId
      );
      
      throw error;
    }
  }
}
```

### Limpeza Programada de Registros Antigos

```typescript
// Em um serviço de agendamento
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditoriaService } from '../auditoria/services/auditoria.service';

@Injectable()
export class TarefasAgendadasService {
  private readonly logger = new Logger(TarefasAgendadasService.name);

  constructor(
    private readonly auditoriaService: AuditoriaService
  ) {}

  /**
   * Executa limpeza de registros de auditoria antigos diariamente às 2h da manhã
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async limparRegistrosAuditoriaAntigos() {
    try {
      this.logger.log('Iniciando limpeza de registros de auditoria antigos');
      
      const registrosExcluidos = await this.auditoriaService.limparRegistrosAntigos();
      
      this.logger.log(`Limpeza concluída: ${registrosExcluidos} registros excluídos`);
    } catch (error) {
      this.logger.error(`Erro na limpeza de registros de auditoria: ${error.message}`, error.stack);
    }
  }
}
```

## Considerações de Implementação

1. **Performance**: Implemente a auditoria de forma assíncrona sempre que possível para não impactar o desempenho do sistema.
2. **Segurança**: Tenha cuidado com dados sensíveis nos logs, aplicando mascaramento ou filtragem adequada.
3. **Escalabilidade**: Use filas para processar registros de auditoria em sistemas de alto volume.
4. **Armazenamento**: Implemente rotações de logs e políticas de retenção adequadas para gerenciar o crescimento dos dados.
5. **Monitoramento**: Considere integrar com ferramentas de monitoramento para alertas sobre eventos críticos de auditoria.

## Parâmetros de Configuração

| Chave | Tipo | Descrição | Valor Padrão |
|-------|------|-----------|--------------|
| `NIVEL_DETALHE_AUDITORIA` | Número | Nível de detalhe para registros de auditoria (1-básico, 2-intermediário, 3-detalhado) | `1` |
| `TIPOS_OPERACAO_AUDITORIA` | Texto | Lista de tipos de operação habilitados para auditoria, separados por vírgula. Use '*' para todos | `*` |
| `DIRETORIO_LOGS` | Texto | Diretório para armazenamento de arquivos de log | `logs` |
| `REGISTRAR_LOGS_ARQUIVO` | Booleano | Se deve registrar logs em arquivo além do banco de dados | `false` |
| `AUDITAR_REQUISICOES` | Booleano | Se deve auditar todas as requisições HTTP | `false` |
| `PERIODO_RETENCAO_AUDITORIA` | Número | Período (em dias) para retenção de registros de auditoria | `365` |

## Segurança e Compliance

1. **LGPD**: Certifique-se de que os logs não contenham dados pessoais sensíveis sem consentimento explícito.
2. **Integridade**: Implemente mecanismos para garantir que os logs não possam ser alterados após o registro.
3. **Armazenamento Seguro**: Armazene logs em locais seguros com controle de acesso adequado.
4. **Rastreabilidade**: Garanta que todas as ações administrativas sejam rastreáveis para atender requisitos de compliance.
5. **Exportação**: Implemente mecanismos para exportar logs em formato padronizado para fins de auditoria externa.
