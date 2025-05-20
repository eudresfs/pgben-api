# Workflows de Benefícios

## Visão Geral

O sistema de workflows do PGBen permite definir fluxos de trabalho personalizados para cada tipo de benefício. Cada workflow consiste em uma série de etapas, com regras de transição entre elas, permitindo controlar o ciclo de vida das solicitações de benefícios.

## Conceitos Básicos

- **Workflow**: Conjunto de etapas e transições que definem o fluxo de trabalho para um tipo específico de benefício.
- **Etapa**: Estado ou fase do processo, como "Recebimento", "Análise Documental", "Entrevista", etc.
- **Ação**: Operação que pode ser realizada em uma etapa, como "Aprovar", "Rejeitar", "Solicitar Revisão", etc.
- **Transição**: Mudança de uma etapa para outra, desencadeada por uma ação.
- **SLA (Service Level Agreement)**: Prazo definido para conclusão de uma etapa.

## Estrutura de um Workflow

Um workflow é composto por:

1. **Dados Básicos**:
   - Tipo de Benefício associado
   - Nome do workflow
   - Descrição
   - Status de ativação

2. **Etapas**:
   - Código da etapa
   - Nome da etapa
   - Descrição
   - Prazo em dias (SLA)
   - Perfis autorizados
   - Ações permitidas
   - Etapas de destino para cada ação

## Ações Suportadas

O sistema suporta as seguintes ações padrão:

| Ação | Código | Descrição |
|------|--------|-----------|
| Criar | `CRIAR` | Criar uma nova solicitação |
| Visualizar | `VISUALIZAR` | Visualizar detalhes da solicitação |
| Editar | `EDITAR` | Editar dados da solicitação |
| Aprovar | `APROVAR` | Aprovar a etapa atual |
| Rejeitar | `REJEITAR` | Rejeitar a solicitação |
| Solicitar Revisão | `SOLICITAR_REVISAO` | Solicitar revisão de dados/documentos |
| Enviar Documentos | `ENVIAR_DOCUMENTOS` | Anexar documentos à solicitação |
| Marcar Entrevista | `MARCAR_ENTREVISTA` | Agendar entrevista com o cidadão |
| Realizar Entrevista | `REALIZAR_ENTREVISTA` | Registrar realização da entrevista |
| Encaminhar | `ENCAMINHAR` | Encaminhar para outro setor/profissional |
| Arquivar | `ARQUIVAR` | Arquivar a solicitação |

## Workflows Pré-configurados

O sistema vem com workflows pré-configurados para os principais tipos de benefícios:

### Auxílio Natalidade

1. **Recebimento**
   - Ações: Aprovar (→ Análise Documental), Rejeitar (→ Rejeitada)
   - SLA: 2 dias
   - Perfis: Atendente, Assistente Social

2. **Análise Documental**
   - Ações: Aprovar (→ Entrevista), Solicitar Revisão (→ Pendente Documentação), Rejeitar (→ Rejeitada)
   - SLA: 5 dias
   - Perfis: Assistente Social

3. **Pendente Documentação**
   - Ações: Enviar Documentos (→ Análise Documental)
   - SLA: 10 dias
   - Perfis: Cidadão

4. **Entrevista**
   - Ações: Marcar Entrevista (→ Entrevista Agendada), Aprovar (→ Aprovação), Rejeitar (→ Rejeitada)
   - SLA: 3 dias
   - Perfis: Assistente Social

5. **Entrevista Agendada**
   - Ações: Realizar Entrevista (→ Aprovação)
   - SLA: 7 dias
   - Perfis: Assistente Social

6. **Aprovação**
   - Ações: Aprovar (→ Pagamento), Rejeitar (→ Rejeitada)
   - SLA: 3 dias
   - Perfis: Coordenador

7. **Pagamento**
   - Ações: Aprovar (→ Concluída)
   - SLA: 5 dias
   - Perfis: Financeiro

8. **Concluída**
   - Estado final positivo

9. **Rejeitada**
   - Estado final negativo

### Aluguel Social

Segue estrutura similar, adaptada para as particularidades deste benefício.

## Utilizando o Serviço de Workflows

Para utilizar o serviço de workflows em seu código:

```typescript
import { Injectable } from '@nestjs/common';
import { WorkflowService } from '../configuracao/services/workflow.service';
import { WorkflowAcaoEnum } from '../configuracao/enums/workflow-acao.enum';

@Injectable()
export class SolicitacaoService {
  constructor(
    private readonly workflowService: WorkflowService
  ) {}

  async criarSolicitacao(dados) {
    // Criar a solicitação no banco de dados
    const solicitacao = await this.solicitacaoRepository.create({
      ...dados,
      status: 'Recebimento' // Etapa inicial
    });
    
    // Obter o workflow para o tipo de benefício
    const workflow = await this.workflowService.buscarPorTipoBeneficio(
      dados.tipoBeneficioId
    );
    
    // Verificar se o workflow existe
    if (!workflow) {
      throw new Error('Workflow não encontrado para este tipo de benefício');
    }
    
    // Obter a etapa inicial
    const etapaInicial = workflow.etapas.find(e => e.inicial);
    
    // Calcular data limite baseada no SLA da etapa
    const dataLimite = await this.workflowService.calcularDataLimite(
      etapaInicial.codigo,
      workflow.id
    );
    
    // Atualizar solicitação com informações do workflow
    await this.solicitacaoRepository.update(solicitacao.id, {
      workflow_id: workflow.id,
      etapa_atual: etapaInicial.codigo,
      data_limite_etapa: dataLimite
    });
    
    return solicitacao;
  }

  async executarAcao(solicitacaoId, acao, dados) {
    // Buscar solicitação
    const solicitacao = await this.solicitacaoRepository.findById(solicitacaoId);
    
    if (!solicitacao) {
      throw new Error('Solicitação não encontrada');
    }
    
    // Verificar se a ação é permitida na etapa atual
    const proximaEtapa = await this.workflowService.calcularProximaEtapa(
      solicitacao.workflow_id,
      solicitacao.etapa_atual,
      acao as WorkflowAcaoEnum
    );
    
    if (!proximaEtapa) {
      throw new Error('Ação não permitida para esta etapa');
    }
    
    // Calcular nova data limite baseada no SLA da próxima etapa
    const novaDataLimite = await this.workflowService.calcularDataLimite(
      proximaEtapa,
      solicitacao.workflow_id
    );
    
    // Atualizar solicitação
    await this.solicitacaoRepository.update(solicitacaoId, {
      etapa_atual: proximaEtapa,
      data_limite_etapa: novaDataLimite,
      // Outros dados específicos da ação
      ...dados
    });
    
    // Registrar histórico da transição
    await this.historicoRepository.create({
      solicitacao_id: solicitacaoId,
      etapa_origem: solicitacao.etapa_atual,
      etapa_destino: proximaEtapa,
      acao: acao,
      data: new Date(),
      usuario_id: dados.usuario_id,
      observacao: dados.observacao
    });
    
    return {
      etapa_anterior: solicitacao.etapa_atual,
      etapa_atual: proximaEtapa,
      data_limite: novaDataLimite
    };
  }

  async verificarAcoesPermitidas(solicitacaoId, usuarioId) {
    // Buscar solicitação
    const solicitacao = await this.solicitacaoRepository.findById(solicitacaoId);
    
    if (!solicitacao) {
      throw new Error('Solicitação não encontrada');
    }
    
    // Buscar perfis do usuário
    const usuario = await this.usuarioRepository.findById(usuarioId);
    const perfis = usuario.perfis.map(p => p.codigo);
    
    // Obter ações permitidas para a etapa atual e perfis do usuário
    const acoesPermitidas = await this.workflowService.obterAcoesPermitidas(
      solicitacao.workflow_id,
      solicitacao.etapa_atual,
      perfis
    );
    
    return acoesPermitidas;
  }
}
```

## Gerenciando Workflows Programaticamente

Além de usar a interface administrativa, você pode gerenciar workflows programaticamente:

```typescript
// Criar novo workflow
const workflow = await this.workflowService.criar({
  tipo_beneficio_id: '550e8400-e29b-41d4-a716-446655440000',
  nome: 'Workflow para Cesta Básica',
  descricao: 'Fluxo de trabalho para solicitações de cesta básica',
  ativo: true,
  etapas: [
    {
      codigo: 'RECEBIMENTO',
      nome: 'Recebimento',
      descricao: 'Etapa inicial de recebimento da solicitação',
      prazo_dias: 2,
      inicial: true,
      final: false,
      perfis_permitidos: ['ATENDENTE', 'ASSISTENTE_SOCIAL'],
      acoes: [
        {
          acao: WorkflowAcaoEnum.APROVAR,
          etapa_destino: 'ANALISE'
        },
        {
          acao: WorkflowAcaoEnum.REJEITAR,
          etapa_destino: 'REJEITADA'
        }
      ]
    },
    // Outras etapas...
  ]
});

// Atualizar workflow existente
await this.workflowService.atualizar(workflowId, {
  nome: 'Workflow Atualizado para Cesta Básica',
  descricao: 'Descrição atualizada',
  // Outras propriedades...
});

// Ativar/desativar workflow
await this.workflowService.alterarStatus(workflowId, false); // desativar
```

## Validação de Workflows

O sistema realiza as seguintes validações em workflows:

1. **Consistência de etapas**:
   - Deve haver pelo menos uma etapa inicial
   - Deve haver pelo menos uma etapa final
   - Todas as etapas devem ser alcançáveis a partir da etapa inicial

2. **Detecção de ciclos**:
   - O sistema detecta e alerta sobre ciclos infinitos no workflow

3. **Validação de transições**:
   - Cada ação deve ter uma etapa de destino válida
   - Não pode haver ações duplicadas em uma etapa

## Cálculo de SLA

O sistema calcula automaticamente datas limite baseadas nos SLAs definidos para cada etapa:

```typescript
// Calcular data limite para uma etapa
const dataLimite = await this.workflowService.calcularDataLimite(
  'ANALISE_DOCUMENTAL',
  workflowId
);

// Verificar se uma etapa está atrasada
const atrasada = await this.workflowService.verificarAtraso(
  solicitacaoId,
  dataAtual
);
```

O cálculo de SLA considera:
- Dias úteis (excluindo finais de semana e feriados)
- Horário de expediente
- Pausas no fluxo (quando aplicável)

## Boas Práticas

1. **Mantenha workflows simples**: Evite fluxos excessivamente complexos.
2. **Documente as etapas**: Forneça descrições claras para cada etapa.
3. **Defina SLAs realistas**: Considere a capacidade operacional da equipe.
4. **Evite ciclos infinitos**: Garanta que todos os fluxos tenham saída.
5. **Teste fluxos completos**: Simule todos os caminhos possíveis no workflow.

## Exemplos Práticos

### Verificação de Transições Possíveis

```typescript
@Injectable()
export class SolicitacaoController {
  constructor(
    private readonly solicitacaoService: SolicitacaoService,
    private readonly workflowService: WorkflowService
  ) {}

  @Get(':id/acoes-permitidas')
  async obterAcoesPermitidas(@Param('id') id: string, @Req() request) {
    const usuarioId = request.user.id;
    
    // Buscar solicitação
    const solicitacao = await this.solicitacaoService.buscarPorId(id);
    
    // Buscar perfis do usuário
    const usuario = await this.usuarioService.buscarPorId(usuarioId);
    const perfis = usuario.perfis.map(p => p.codigo);
    
    // Obter ações permitidas
    const acoesPermitidas = await this.workflowService.obterAcoesPermitidas(
      solicitacao.workflow_id,
      solicitacao.etapa_atual,
      perfis
    );
    
    // Mapear ações para informações mais detalhadas
    const acoesDetalhadas = acoesPermitidas.map(acao => {
      const etapaDestino = this.workflowService.obterEtapa(
        solicitacao.workflow_id,
        this.workflowService.obterEtapaDestino(
          solicitacao.workflow_id,
          solicitacao.etapa_atual,
          acao
        )
      );
      
      return {
        acao: acao,
        descricao: this.obterDescricaoAcao(acao),
        etapa_destino: etapaDestino.nome,
        requer_observacao: ['REJEITAR', 'SOLICITAR_REVISAO'].includes(acao)
      };
    });
    
    return acoesDetalhadas;
  }
  
  private obterDescricaoAcao(acao: string): string {
    const descricoes = {
      'APROVAR': 'Aprovar e avançar para próxima etapa',
      'REJEITAR': 'Rejeitar solicitação',
      'SOLICITAR_REVISAO': 'Solicitar revisão de documentos',
      // Outras ações...
    };
    
    return descricoes[acao] || acao;
  }
}
```
