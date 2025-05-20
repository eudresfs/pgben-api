# Integração com PagamentoModule

## Visão Geral

O módulo de Configuração disponibiliza serviços que podem ser utilizados pelo módulo de Pagamento para parametrizar regras de processamento, configurar limites operacionais e gerenciar integrações com sistemas financeiros. Esta documentação demonstra como implementar essa integração.

## Serviços Disponibilizados

### 1. Serviço de Parâmetros

O `ParametroService` permite acessar parâmetros operacionais que controlam o comportamento do sistema de pagamentos.

### 2. Serviço de Limites

O `LimitesService` fornece configurações de valores máximos, prazos e outras restrições para pagamentos.

### 3. Serviço de Integrações

O `IntegracaoService` permite acessar configurações de integrações com instituições financeiras e sistemas de pagamento.

## Implementação da Integração

### Passo 1: Importar o Módulo de Configuração

No arquivo `pagamento.module.ts`, importe o módulo de Configuração:

```typescript
import { Module } from '@nestjs/common';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { PagamentoService } from './services/pagamento.service';
import { ProcessamentoPagamentoService } from './services/processamento-pagamento.service';
import { ValidacaoPagamentoService } from './services/validacao-pagamento.service';
// Outros imports necessários...

@Module({
  imports: [
    ConfiguracaoModule,
    // Outros módulos necessários...
  ],
  controllers: [
    // Controllers do módulo de Pagamento...
  ],
  providers: [
    PagamentoService,
    ProcessamentoPagamentoService,
    ValidacaoPagamentoService,
    // Outros providers...
  ],
  exports: [
    PagamentoService,
    // Outros serviços exportados...
  ]
})
export class PagamentoModule {}
```

### Passo 2: Injetar os Serviços Necessários

#### Exemplo: Serviço de Validação de Pagamento

```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ParametroService } from '../../configuracao/services/parametro.service';
import { LimitesService } from '../../configuracao/services/limites.service';
import { ParametroChavesEnum } from '../../configuracao/enums/parametro-chaves.enum';
import { PagamentoDto } from '../dtos/pagamento.dto';

@Injectable()
export class ValidacaoPagamentoService {
  private readonly logger = new Logger(ValidacaoPagamentoService.name);
  private valorMaximoPagamento: number;
  private periodoCarencia: number;

  constructor(
    private readonly parametroService: ParametroService,
    private readonly limitesService: LimitesService
  ) {
    this.carregarConfiguracoes();
  }

  /**
   * Carrega as configurações de validação de pagamentos
   */
  private async carregarConfiguracoes(): Promise<void> {
    try {
      // Obter valor máximo permitido para pagamento
      const limiteValor = await this.limitesService.buscarLimiteValor('PAGAMENTO_BENEFICIO');
      this.valorMaximoPagamento = limiteValor || 10000;
      
      // Obter período de carência (em dias)
      const parametroCarencia = await this.parametroService.buscarPorChave(
        ParametroChavesEnum.PERIODO_CARENCIA_PAGAMENTO
      );
      
      this.periodoCarencia = parametroCarencia ? Number(parametroCarencia.valor) : 30;
      
      this.logger.log(`Configurações carregadas: valor máximo=${this.valorMaximoPagamento}, período carência=${this.periodoCarencia} dias`);
    } catch (error) {
      this.logger.error(`Erro ao carregar configurações: ${error.message}`, error.stack);
      // Usar valores padrão em caso de erro
      this.valorMaximoPagamento = 10000;
      this.periodoCarencia = 30;
    }
  }

  /**
   * Valida um pagamento antes do processamento
   * @param dto Dados do pagamento
   */
  async validarPagamento(dto: PagamentoDto): Promise<boolean> {
    try {
      // Validar valor máximo
      if (dto.valor > this.valorMaximoPagamento) {
        throw new BadRequestException(`Valor excede o limite máximo permitido de ${this.valorMaximoPagamento}`);
      }
      
      // Validar valor negativo
      if (dto.valor <= 0) {
        throw new BadRequestException('Valor do pagamento deve ser maior que zero');
      }
      
      // Validar data futura
      if (dto.data_pagamento && new Date(dto.data_pagamento) > new Date()) {
        throw new BadRequestException('Data de pagamento não pode ser futura');
      }
      
      // Validar período de carência
      if (dto.beneficio_id) {
        const cumpreCarencia = await this.verificarCarencia(dto.beneficio_id);
        
        if (!cumpreCarencia) {
          throw new BadRequestException(`Benefício não cumpriu o período de carência de ${this.periodoCarencia} dias`);
        }
      }
      
      // Validar status do beneficiário
      if (dto.beneficiario_id) {
        const statusValido = await this.verificarStatusBeneficiario(dto.beneficiario_id);
        
        if (!statusValido) {
          throw new BadRequestException('Beneficiário com status inválido para recebimento');
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Erro na validação de pagamento: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verifica se um benefício cumpriu o período de carência
   * @param beneficioId ID do benefício
   */
  private async verificarCarencia(beneficioId: string): Promise<boolean> {
    // Implementação real buscaria a data de concessão do benefício no banco de dados
    // e compararia com a data atual considerando o período de carência
    
    // Implementação simplificada para exemplo
    return true;
  }

  /**
   * Verifica se o status do beneficiário permite receber pagamentos
   * @param beneficiarioId ID do beneficiário
   */
  private async verificarStatusBeneficiario(beneficiarioId: string): Promise<boolean> {
    // Implementação real buscaria o status do beneficiário no banco de dados
    // e verificaria se está ativo, suspenso, etc.
    
    // Implementação simplificada para exemplo
    return true;
  }
}
```

#### Exemplo: Serviço de Processamento de Pagamento

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { IntegracaoService } from '../../configuracao/services/integracao.service';
import { IntegracaoTipoEnum } from '../../configuracao/enums/integracao-tipo.enum';
import { PagamentoRepository } from '../repositories/pagamento.repository';
import { ValidacaoPagamentoService } from './validacao-pagamento.service';
import { PagamentoDto } from '../dtos/pagamento.dto';
import { PagamentoStatusEnum } from '../enums/pagamento-status.enum';
import axios from 'axios';

@Injectable()
export class ProcessamentoPagamentoService {
  private readonly logger = new Logger(ProcessamentoPagamentoService.name);

  constructor(
    private readonly pagamentoRepository: PagamentoRepository,
    private readonly validacaoService: ValidacaoPagamentoService,
    private readonly integracaoService: IntegracaoService
  ) {}

  /**
   * Processa um novo pagamento
   * @param dto Dados do pagamento
   * @param usuarioId ID do usuário que está processando o pagamento
   */
  async processarPagamento(dto: PagamentoDto, usuarioId: string): Promise<any> {
    try {
      // Validar o pagamento
      await this.validacaoService.validarPagamento(dto);
      
      // Registrar o pagamento com status PENDENTE
      const pagamento = await this.pagamentoRepository.criar({
        ...dto,
        status: PagamentoStatusEnum.PENDENTE,
        data_processamento: new Date(),
        created_by: usuarioId
      });
      
      // Enviar para processamento externo, se configurado
      const resultadoProcessamento = await this.enviarParaProcessamentoExterno(pagamento);
      
      // Atualizar status do pagamento com base no resultado
      const pagamentoAtualizado = await this.atualizarStatusPagamento(
        pagamento.id,
        resultadoProcessamento.aprovado ? PagamentoStatusEnum.APROVADO : PagamentoStatusEnum.REJEITADO,
        resultadoProcessamento.codigo,
        resultadoProcessamento.mensagem,
        usuarioId
      );
      
      return pagamentoAtualizado;
    } catch (error) {
      this.logger.error(`Erro ao processar pagamento: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Envia um pagamento para processamento em sistema externo
   * @param pagamento Dados do pagamento
   */
  private async enviarParaProcessamentoExterno(pagamento: any): Promise<any> {
    try {
      // Obter configuração de integração para processamento de pagamento
      const integracao = await this.integracaoService.buscarPorCodigo('processador-pagamento');
      
      if (!integracao || integracao.tipo !== IntegracaoTipoEnum.PROCESSADOR_PAGAMENTO || !integracao.ativo) {
        this.logger.warn('Configuração de processador de pagamento não encontrada ou inativa.');
        // Retornar aprovação manual se não houver processamento externo
        return {
          aprovado: true,
          codigo: 'APROVACAO_MANUAL',
          mensagem: 'Aprovado manualmente (sem processador externo)'
        };
      }
      
      // Obter configuração e credenciais
      const config = integracao.configuracao;
      const credenciais = integracao.credenciais;
      
      // Preparar dados para envio
      const dadosEnvio = {
        id_externo: pagamento.id,
        tipo: pagamento.tipo,
        valor: pagamento.valor,
        data: pagamento.data_pagamento || new Date(),
        beneficiario: {
          id: pagamento.beneficiario_id,
          tipo: 'CPF', // Tipo fixo para exemplo
          documento: pagamento.beneficiario_documento,
          nome: pagamento.beneficiario_nome,
          banco: pagamento.banco,
          agencia: pagamento.agencia,
          conta: pagamento.conta
        },
        beneficio: {
          id: pagamento.beneficio_id,
          tipo: pagamento.beneficio_tipo,
          numero: pagamento.beneficio_numero
        }
      };
      
      // Realizar chamada para o sistema externo
      const response = await axios.post(
        config.baseUrl + '/processamento',
        dadosEnvio,
        {
          headers: {
            'Authorization': `Bearer ${credenciais.apiKey}`,
            'Content-Type': 'application/json',
            'X-Sistema-Origem': 'PGBEN'
          },
          timeout: config.timeout || 30000
        }
      );
      
      // Verificar resposta
      if (response.status === 200 && response.data) {
        return {
          aprovado: response.data.aprovado,
          codigo: response.data.codigo,
          mensagem: response.data.mensagem,
          dados_externos: response.data
        };
      }
      
      // Em caso de falha na resposta, rejeitar o pagamento
      return {
        aprovado: false,
        codigo: 'ERRO_PROCESSAMENTO',
        mensagem: 'Erro na comunicação com o processador de pagamento'
      };
    } catch (error) {
      this.logger.error(`Erro no processamento externo: ${error.message}`, error.stack);
      
      // Em caso de erro, rejeitar o pagamento
      return {
        aprovado: false,
        codigo: 'ERRO_COMUNICACAO',
        mensagem: `Erro na comunicação: ${error.message}`
      };
    }
  }

  /**
   * Atualiza o status de um pagamento
   * @param id ID do pagamento
   * @param status Novo status
   * @param codigoProcessamento Código de processamento
   * @param mensagemProcessamento Mensagem de processamento
   * @param usuarioId ID do usuário que está atualizando o status
   */
  async atualizarStatusPagamento(
    id: string,
    status: PagamentoStatusEnum,
    codigoProcessamento?: string,
    mensagemProcessamento?: string,
    usuarioId?: string
  ): Promise<any> {
    try {
      // Atualizar o pagamento
      const pagamento = await this.pagamentoRepository.atualizar(id, {
        status,
        codigo_processamento: codigoProcessamento,
        mensagem_processamento: mensagemProcessamento,
        data_atualizacao_status: new Date(),
        updated_by: usuarioId
      });
      
      return pagamento;
    } catch (error) {
      this.logger.error(`Erro ao atualizar status do pagamento: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

### Passo 3: Utilizar os Serviços no Controller

```typescript
import { Controller, Post, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PagamentoService } from '../services/pagamento.service';
import { ProcessamentoPagamentoService } from '../services/processamento-pagamento.service';
import { PagamentoDto } from '../dtos/pagamento.dto';
import { PagamentoLoteDto } from '../dtos/pagamento-lote.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Pagamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pagamentos')
export class PagamentoController {
  constructor(
    private readonly pagamentoService: PagamentoService,
    private readonly processamentoService: ProcessamentoPagamentoService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Processar novo pagamento' })
  @Roles('FINANCEIRO', 'ADMIN')
  async processarPagamento(
    @Body() dto: PagamentoDto,
    @CurrentUser() usuario
  ) {
    const pagamento = await this.processamentoService.processarPagamento(dto, usuario.id);
    
    return {
      id: pagamento.id,
      valor: pagamento.valor,
      status: pagamento.status,
      data_processamento: pagamento.data_processamento,
      mensagem: pagamento.mensagem_processamento
    };
  }

  @Post('lote')
  @ApiOperation({ summary: 'Processar lote de pagamentos' })
  @Roles('FINANCEIRO', 'ADMIN')
  async processarLote(
    @Body() dto: PagamentoLoteDto,
    @CurrentUser() usuario
  ) {
    const resultado = await this.pagamentoService.processarLote(dto, usuario.id);
    
    return resultado;
  }

  @Get('limites')
  @ApiOperation({ summary: 'Obter limites de pagamento' })
  async obterLimites() {
    const limites = await this.pagamentoService.obterLimites();
    
    return limites;
  }

  @Put(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar pagamento' })
  @Roles('FINANCEIRO', 'ADMIN')
  async cancelarPagamento(
    @Param('id') id: string,
    @Body() dto: { motivo: string },
    @CurrentUser() usuario
  ) {
    const pagamento = await this.pagamentoService.cancelarPagamento(id, dto.motivo, usuario.id);
    
    return {
      id: pagamento.id,
      status: pagamento.status,
      data_cancelamento: pagamento.data_cancelamento,
      motivo_cancelamento: pagamento.motivo_cancelamento
    };
  }
}
```

## Exemplo de Uso

### Processamento de Pagamento de Benefício

```typescript
// Em um serviço que gerencia benefícios
import { Injectable } from '@nestjs/common';
import { PagamentoService } from '../pagamento/services/pagamento.service';

@Injectable()
export class BeneficioService {
  constructor(
    private readonly pagamentoService: PagamentoService
  ) {}

  async gerarPagamentoMensal(beneficioId: string, usuarioId: string) {
    // Buscar dados do benefício
    const beneficio = await this.buscarBeneficio(beneficioId);
    const beneficiario = await this.buscarBeneficiario(beneficio.beneficiario_id);
    
    // Criar pagamento
    const pagamento = await this.pagamentoService.processarPagamento(
      {
        tipo: 'PAGAMENTO_BENEFICIO',
        valor: beneficio.valor_mensal,
        data_pagamento: new Date(),
        beneficio_id: beneficioId,
        beneficio_tipo: beneficio.tipo,
        beneficio_numero: beneficio.numero,
        beneficiario_id: beneficiario.id,
        beneficiario_documento: beneficiario.cpf,
        beneficiario_nome: beneficiario.nome,
        banco: beneficiario.banco,
        agencia: beneficiario.agencia,
        conta: beneficiario.conta,
        observacao: `Pagamento mensal - ${this.obterMesReferencia()}`
      },
      usuarioId
    );
    
    // Registrar pagamento no histórico do benefício
    await this.registrarPagamentoHistorico(beneficioId, pagamento.id, usuarioId);
    
    return pagamento;
  }

  private async buscarBeneficio(id: string) {
    // Implementação real buscaria no banco de dados
    return {
      id,
      beneficiario_id: '123',
      tipo: 'AUXILIO_MORADIA',
      numero: '2025.0001',
      valor_mensal: 500.0
    };
  }

  private async buscarBeneficiario(id: string) {
    // Implementação real buscaria no banco de dados
    return {
      id,
      nome: 'Maria Silva',
      cpf: '123.456.789-00',
      banco: '001',
      agencia: '1234',
      conta: '123456-7'
    };
  }

  private obterMesReferencia() {
    const data = new Date();
    const mes = data.getMonth() + 1;
    const ano = data.getFullYear();
    
    return `${mes.toString().padStart(2, '0')}/${ano}`;
  }

  private async registrarPagamentoHistorico(beneficioId, pagamentoId, usuarioId) {
    // Implementação real registraria no banco de dados
    console.log(`Pagamento ${pagamentoId} registrado para benefício ${beneficioId}`);
  }
}
```

### Obtenção de Limites de Pagamento

```typescript
// Em um componente de interface que exibe os limites
import { Component, OnInit } from '@angular/core';
import { PagamentoService } from '../services/pagamento.service';

@Component({
  selector: 'app-limites-pagamento',
  template: `
    <div class="card">
      <div class="card-header">Limites de Pagamento</div>
      <div class="card-body">
        <ul class="list-group">
          <li class="list-group-item">
            Valor máximo por pagamento: {{ limites.valorMaximo | currency:'BRL' }}
          </li>
          <li class="list-group-item">
            Valor máximo diário: {{ limites.valorMaximoDiario | currency:'BRL' }}
          </li>
          <li class="list-group-item">
            Pagamentos por lote: {{ limites.pagamentosPorLote }}
          </li>
          <li class="list-group-item">
            Período de carência: {{ limites.periodoCarencia }} dias
          </li>
        </ul>
      </div>
    </div>
  `
})
export class LimitesPagamentoComponent implements OnInit {
  limites = {
    valorMaximo: 0,
    valorMaximoDiario: 0,
    pagamentosPorLote: 0,
    periodoCarencia: 0
  };

  constructor(private pagamentoService: PagamentoService) {}

  ngOnInit() {
    this.carregarLimites();
  }

  async carregarLimites() {
    try {
      this.limites = await this.pagamentoService.obterLimites();
    } catch (error) {
      console.error('Erro ao carregar limites:', error);
    }
  }
}
```

## Considerações de Implementação

1. **Segurança**: Implemente controles rigorosos de acesso e auditoria para operações de pagamento.
2. **Transações**: Utilize transações de banco de dados para garantir a integridade dos dados de pagamento.
3. **Idempotência**: Implemente mecanismos para evitar processamento duplicado de pagamentos.
4. **Retry**: Configure mecanismos de retry para operações que falham por problemas temporários.
5. **Notificações**: Integre com o módulo de Notificação para alertar sobre status de pagamentos.

## Parâmetros de Configuração

| Chave | Tipo | Descrição | Valor Padrão |
|-------|------|-----------|--------------|
| `PERIODO_CARENCIA_PAGAMENTO` | Número | Período de carência em dias para pagamentos após concessão | `30` |
| `PAGAMENTOS_POR_LOTE` | Número | Número máximo de pagamentos por lote | `100` |
| `HABILITAR_APROVACAO_AUTOMATICA` | Booleano | Se pagamentos devem ser aprovados automaticamente | `false` |
| `HABILITAR_NOTIFICACAO_PAGAMENTO` | Booleano | Se notificações devem ser enviadas para pagamentos | `true` |
| `DIAS_ANTECEDENCIA_AVISO` | Número | Dias de antecedência para aviso de pagamento | `3` |

## Limites Operacionais

| Tipo | Descrição | Valor Padrão |
|------|-----------|--------------|
| `PAGAMENTO_BENEFICIO` | Valor máximo para pagamento de benefício | `10000` |
| `PAGAMENTO_AUXILIO` | Valor máximo para pagamento de auxílio | `5000` |
| `PAGAMENTO_DIARIO` | Valor máximo total para pagamentos diários | `100000` |
| `PAGAMENTO_EMERGENCIAL` | Valor máximo para pagamento emergencial | `2000` |

## Segurança e Compliance

1. **Segregação de Funções**: Implemente segregação de funções entre quem cadastra, aprova e processa pagamentos.
2. **Dupla Aprovação**: Para valores acima de certos limites, exija aprovação por dois usuários diferentes.
3. **Trilha de Auditoria**: Mantenha registros detalhados de todas as operações de pagamento.
4. **Monitoramento**: Implemente alertas para padrões suspeitos de pagamento.
5. **Validação de Dados Bancários**: Implemente validações robustas para dados bancários.

## Integrações Financeiras

O módulo se integra com os seguintes sistemas financeiros:

1. **Sistemas de Pagamento**: Para processamento de pagamentos.
2. **Sistemas Bancários**: Para validação de contas e envio de arquivos de remessa.
3. **Sistemas de Contabilidade**: Para registro contábil das operações.
4. **Sistemas de Gestão Orçamentária**: Para verificação e alocação de recursos.
