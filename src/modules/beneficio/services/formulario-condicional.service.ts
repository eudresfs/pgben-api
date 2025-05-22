import { Injectable, NotFoundException } from '@nestjs/common';
import { FindOneOptions } from 'typeorm';
import { CampoDinamicoService } from './campo-dinamico.service';
import { EspecificacaoNatalidadeService } from './especificacao-natalidade.service';
import { EspecificacaoAluguelSocialService } from './especificacao-aluguel-social.service';
import { EspecificacaoFuneralService } from './especificacao-funeral.service';
import { EspecificacaoCestaBasicaService } from './especificacao-cesta-basica.service';
import { TipoBeneficioRepository } from '../repositories';
import { CampoDinamicoBeneficio } from '../entities/campo-dinamico-beneficio.entity';
import { TipoBeneficio } from '../entities/tipo-beneficio.entity';
import { EspecificacaoNatalidade } from '../entities/especificacao-natalidade.entity';
import { EspecificacaoAluguelSocial } from '../entities/especificacao-aluguel-social.entity';
import { EspecificacaoFuneral } from '../entities/especificacao-funeral.entity';
import { EspecificacaoCestaBasica } from '../entities/especificacao-cesta-basica.entity';
import { TipoDado } from '../entities/campo-dinamico-beneficio.entity';
import { MotivoAluguelSocial } from '../entities/especificacao-aluguel-social.entity';
import { TipoEntregaCestaBasica, PeriodicidadeCestaBasica, PeriodicidadeEntrega } from '../entities/especificacao-cesta-basica.entity';
import { TipoUrnaFuneraria } from '../entities/especificacao-funeral.entity';

/**
 * Interface para representar um campo de formulário processado
 * com todas as regras condicionais aplicadas
 */
export interface CampoFormularioProcessado {
  id: string;
  nome: string;
  label: string;
  tipo: TipoDado;
  obrigatorio: boolean;
  visivel: boolean;
  opcoes?: string[];
  validacoes: Record<string, any>;
  valor?: any;
  mensagemAjuda?: string;
  dependeDe?: {
    campo: string;
    valor: any;
    condicao: 'igual' | 'diferente' | 'maior' | 'menor' | 'contem';
  };
}

/**
 * Interface para representar um formulário completo
 * com todos os seus campos e metadados
 */
export interface FormularioProcessado {
  tipoBeneficioId: string;
  nomeBeneficio: string;
  descricao: string;
  versao: string;
  campos: CampoFormularioProcessado[];
  metadados: Record<string, any>;
}

/**
 * Serviço responsável por gerar formulários dinâmicos com base
 * nas configurações específicas de cada tipo de benefício
 */
@Injectable()
export class FormularioCondicionalService {
  constructor(
    private readonly campoDinamicoService: CampoDinamicoService,
    private readonly especificacaoNatalidadeService: EspecificacaoNatalidadeService,
    private readonly especificacaoAluguelSocialService: EspecificacaoAluguelSocialService,
    private readonly especificacaoFuneralService: EspecificacaoFuneralService,
    private readonly especificacaoCestaBasicaService: EspecificacaoCestaBasicaService,
    private readonly tipoBeneficioRepository: TipoBeneficioRepository,
  ) {}

  /**
   * Gera um formulário completo para um tipo de benefício específico,
   * aplicando todas as regras condicionais baseadas nas especificações
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Formulário processado com todos os campos e regras
   */
  async gerarFormulario(tipoBeneficioId: string): Promise<FormularioProcessado> {
    // Busca o tipo de benefício
    const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
      where: { id: tipoBeneficioId }
    } as FindOneOptions<TipoBeneficio>);
    if (!tipoBeneficio) {
      throw new NotFoundException(`Tipo de benefício com ID ${tipoBeneficioId} não encontrado`);
    }

    // Busca os campos dinâmicos configurados para este tipo de benefício
    const camposDinamicos = await this.campoDinamicoService.findByTipoBeneficio(tipoBeneficioId);

    // Busca as especificações do tipo de benefício
    const especificacoes = await this.obterEspecificacoesPorTipo(tipoBeneficio);

    // Aplica a lógica condicional baseada nas especificações
    const camposProcessados = await this.aplicarLogicaCondicional(
      camposDinamicos,
      tipoBeneficio,
      especificacoes,
    );

    return {
      tipoBeneficioId: tipoBeneficio.id,
      nomeBeneficio: tipoBeneficio.nome,
      descricao: tipoBeneficio.descricao,
      versao: '1.0', // Pode ser obtido de algum controle de versão
      campos: camposProcessados,
      metadados: this.gerarMetadados(tipoBeneficio, especificacoes),
    };
  }

  /**
   * Obtém as especificações específicas para o tipo de benefício
   * 
   * @param tipoBeneficio Tipo de benefício
   * @returns Objeto com as especificações específicas
   */
  private async obterEspecificacoesPorTipo(
    tipoBeneficio: TipoBeneficio,
  ): Promise<EspecificacaoNatalidade | EspecificacaoAluguelSocial | EspecificacaoFuneral | EspecificacaoCestaBasica | null> {
    // Identifica o tipo de benefício pelo nome ou código
    // Esta lógica pode ser melhorada com um sistema mais robusto de identificação
    const nomeBeneficio = tipoBeneficio.nome.toLowerCase();

    if (nomeBeneficio.includes('natalidade')) {
      return this.especificacaoNatalidadeService.findByTipoBeneficio(tipoBeneficio.id);
    } else if (nomeBeneficio.includes('aluguel') || nomeBeneficio.includes('moradia')) {
      return this.especificacaoAluguelSocialService.findByTipoBeneficio(tipoBeneficio.id);
    } else if (nomeBeneficio.includes('funeral') || nomeBeneficio.includes('obito')) {
      return this.especificacaoFuneralService.findByTipoBeneficio(tipoBeneficio.id);
    } else if (nomeBeneficio.includes('cesta') || nomeBeneficio.includes('alimentação')) {
      return this.especificacaoCestaBasicaService.findByTipoBeneficio(tipoBeneficio.id);
    }

    // Se não encontrar especificações, retorna null
    return null;
  }

  /**
   * Aplica a lógica condicional nos campos dinâmicos com base nas especificações
   * 
   * @param camposDinamicos Lista de campos dinâmicos
   * @param tipoBeneficio Tipo de benefício
   * @param especificacoes Especificações do benefício
   * @returns Lista de campos processados com regras aplicadas
   */
  private async aplicarLogicaCondicional(
    camposDinamicos: CampoDinamicoBeneficio[],
    tipoBeneficio: TipoBeneficio,
    especificacoes: EspecificacaoNatalidade | EspecificacaoAluguelSocial | EspecificacaoFuneral | EspecificacaoCestaBasica | null,
  ): Promise<CampoFormularioProcessado[]> {
    // Converte os campos dinâmicos para o formato processado
    const camposProcessados: CampoFormularioProcessado[] = camposDinamicos.map(campo => ({
      id: campo.id,
      nome: campo.nome,
      label: campo.label || campo.nome,
      tipo: campo.tipo,
      obrigatorio: campo.obrigatorio,
      visivel: true, // Por padrão, todos os campos são visíveis
      opcoes: campo.validacoes?.enum,
      validacoes: campo.validacoes || {},
      mensagemAjuda: campo.descricao,
    }));

    // Se não houver especificações, retorna os campos sem modificações
    if (!especificacoes) {
      return camposProcessados;
    }

    // Aplica regras específicas com base no tipo de benefício
    const nomeBeneficio = tipoBeneficio.nome.toLowerCase();

    if (nomeBeneficio.includes('natalidade')) {
      return this.aplicarRegrasNatalidade(
        camposProcessados,
        especificacoes as EspecificacaoNatalidade,
      );
    } else if (nomeBeneficio.includes('aluguel') || nomeBeneficio.includes('moradia')) {
      return this.aplicarRegrasAluguelSocial(
        camposProcessados,
        especificacoes as EspecificacaoAluguelSocial,
      );
    } else if (nomeBeneficio.includes('funeral') || nomeBeneficio.includes('obito')) {
      return this.aplicarRegrasFuneral(
        camposProcessados,
        especificacoes as EspecificacaoFuneral,
      );
    } else if (nomeBeneficio.includes('cesta') || nomeBeneficio.includes('alimentação')) {
      return this.aplicarRegrasCestaBasica(
        camposProcessados,
        especificacoes as EspecificacaoCestaBasica,
      );
    }

    return camposProcessados;
  }

  /**
   * Aplica regras específicas para o benefício de Auxílio Natalidade
   * 
   * @param campos Lista de campos processados
   * @param especificacao Especificação de Natalidade
   * @returns Lista de campos com regras de Natalidade aplicadas
   */
  private aplicarRegrasNatalidade(
    campos: CampoFormularioProcessado[],
    especificacao: EspecificacaoNatalidade,
  ): CampoFormularioProcessado[] {
    return campos.map(campo => {
      const campoAtualizado = { ...campo };

      // Regras para campo de data de parto/nascimento
      if (campo.nome === 'data_parto' || campo.nome === 'data_nascimento') {
        // Adiciona validação para prazo máximo após nascimento
        if (especificacao.prazo_maximo_apos_nascimento) {
          const hoje = new Date();
          const prazoMinimo = new Date();
          prazoMinimo.setDate(hoje.getDate() - especificacao.prazo_maximo_apos_nascimento);
          
          campoAtualizado.validacoes = {
            ...campoAtualizado.validacoes,
            minDate: prazoMinimo.toISOString().split('T')[0],
          };
          
          campoAtualizado.mensagemAjuda = `A data deve ser no máximo ${especificacao.prazo_maximo_apos_nascimento} dias antes da data atual.`;
        }
      }

      // Regras para campo de tempo de gestação
      if (campo.nome === 'tempo_gestacao') {
        if (especificacao.tempo_gestacao_minimo) {
          campoAtualizado.validacoes = {
            ...campoAtualizado.validacoes,
            min: especificacao.tempo_gestacao_minimo,
          };
          
          campoAtualizado.mensagemAjuda = `O tempo mínimo de gestação deve ser de ${especificacao.tempo_gestacao_minimo} semanas.`;
        }
      }

      // Regras para comprovante de pré-natal
      if (campo.nome === 'comprovante_pre_natal') {
        campoAtualizado.obrigatorio = especificacao.requer_pre_natal;
        campoAtualizado.visivel = especificacao.requer_pre_natal;
      }

      // Regras para comprovante de residência
      if (campo.nome === 'comprovante_residencia') {
        campoAtualizado.obrigatorio = especificacao.requer_comprovante_residencia;
        campoAtualizado.visivel = especificacao.requer_comprovante_residencia;
      }

      // Regras para número de filhos
      if (campo.nome === 'numero_filhos' && especificacao.numero_maximo_filhos) {
        campoAtualizado.validacoes = {
          ...campoAtualizado.validacoes,
          max: especificacao.numero_maximo_filhos,
        };
        
        campoAtualizado.mensagemAjuda = `O número máximo de filhos para este benefício é ${especificacao.numero_maximo_filhos}.`;
      }

      return campoAtualizado;
    });
  }

  /**
   * Aplica regras específicas para o benefício de Aluguel Social
   * 
   * @param campos Lista de campos processados
   * @param especificacao Especificação de Aluguel Social
   * @returns Lista de campos com regras de Aluguel Social aplicadas
   */
  private aplicarRegrasAluguelSocial(
    campos: CampoFormularioProcessado[],
    especificacao: EspecificacaoAluguelSocial,
  ): CampoFormularioProcessado[] {
    return campos.map(campo => {
      const campoAtualizado = { ...campo };

      // Regras para campo de valor do aluguel
      if (campo.nome === 'valor_aluguel' && especificacao.valor_maximo) {
        campoAtualizado.validacoes = {
          ...campoAtualizado.validacoes,
          max: especificacao.valor_maximo,
        };
        
        campoAtualizado.mensagemAjuda = `O valor máximo do aluguel para este benefício é R$ ${especificacao.valor_maximo.toFixed(2)}.`;
      }

      // Regras para campo de motivo da solicitação
      if (campo.nome === 'motivo_solicitacao' && especificacao.motivos_validos) {
        // Filtra as opções para mostrar apenas os motivos válidos
        if (campoAtualizado.opcoes && campoAtualizado.opcoes.length > 0) {
          campoAtualizado.opcoes = campoAtualizado.opcoes.filter(opcao => 
            especificacao.motivos_validos.includes(opcao as MotivoAluguelSocial)
          );
        }
      }

      // Regras para campo de comprovante de aluguel
      if (campo.nome === 'comprovante_aluguel') {
        campoAtualizado.obrigatorio = especificacao.requer_comprovante_aluguel;
        campoAtualizado.visivel = especificacao.requer_comprovante_aluguel;
      }

      // Regras para campos relacionados à vistoria
      if (campo.nome === 'data_vistoria' || campo.nome === 'endereco_vistoria') {
        campoAtualizado.visivel = especificacao.requer_vistoria;
        campoAtualizado.obrigatorio = especificacao.requer_vistoria;
      }

      // Regras para campos relacionados ao locador
      if (
        campo.nome === 'nome_locador' || 
        campo.nome === 'cpf_locador' || 
        campo.nome === 'dados_bancarios_locador'
      ) {
        campoAtualizado.visivel = especificacao.pago_diretamente_locador;
        campoAtualizado.obrigatorio = especificacao.pago_diretamente_locador;
      }

      // Regras para campo de renda familiar
      if (campo.nome === 'renda_familiar' && especificacao.percentual_maximo_renda) {
        // Adiciona dependência para calcular o valor máximo do aluguel com base na renda
        campoAtualizado.dependeDe = {
          campo: 'valor_aluguel',
          valor: null,
          condicao: 'menor',
        };
        
        campoAtualizado.mensagemAjuda = `O valor do aluguel não pode ultrapassar ${especificacao.percentual_maximo_renda * 100}% da renda familiar.`;
      }

      return campoAtualizado;
    });
  }

  /**
   * Gera metadados para o formulário com base no tipo de benefício e especificações
   * 
   * @param tipoBeneficio Tipo de benefício
   * @param especificacoes Especificações do benefício
   * @returns Objeto com metadados
   */
  private gerarMetadados(
    tipoBeneficio: TipoBeneficio,
    especificacoes: EspecificacaoNatalidade | EspecificacaoAluguelSocial | EspecificacaoFuneral | EspecificacaoCestaBasica | null,
  ): Record<string, any> {
    const metadados: Record<string, any> = {
      tipoBeneficio: tipoBeneficio.nome,
      descricao: tipoBeneficio.descricao,
      dataAtualizacao: new Date().toISOString(),
    };

    // Adiciona metadados específicos com base no tipo de benefício
    if (especificacoes) {
      const nomeBeneficio = tipoBeneficio.nome.toLowerCase();

      if (nomeBeneficio.includes('natalidade')) {
        const especificacaoNatalidade = especificacoes as EspecificacaoNatalidade;
        metadados.prazoMaximoAposNascimento = especificacaoNatalidade.prazo_maximo_apos_nascimento;
        metadados.requerPreNatal = especificacaoNatalidade.requer_pre_natal;
        metadados.valorComplementar = especificacaoNatalidade.valor_complementar;
      } else if (nomeBeneficio.includes('aluguel') || nomeBeneficio.includes('moradia')) {
        const especificacaoAluguel = especificacoes as EspecificacaoAluguelSocial;
        metadados.duracaoMaximaMeses = especificacaoAluguel.duracao_maxima_meses;
        metadados.permiteProrrogacao = especificacaoAluguel.permite_prorrogacao;
        metadados.valorMaximo = especificacaoAluguel.valor_maximo;
      } else if (nomeBeneficio.includes('funeral') || nomeBeneficio.includes('obito')) {
        const especificacaoFuneral = especificacoes as EspecificacaoFuneral;
        metadados.prazoMaximoAposObito = especificacaoFuneral.prazo_maximo_apos_obito;
        metadados.requerCertidaoObito = especificacaoFuneral.requer_certidao_obito;
        metadados.permiteReembolso = especificacaoFuneral.permite_reembolso;
        metadados.valorFixo = especificacaoFuneral.valor_fixo;
      } else if (nomeBeneficio.includes('cesta') || nomeBeneficio.includes('alimentação')) {
        const especificacaoCesta = especificacoes as EspecificacaoCestaBasica;
        metadados.tipoEntrega = especificacaoCesta.tipo_entrega;
        metadados.periodicidade = especificacaoCesta.periodicidade;
        metadados.quantidadeEntregas = especificacaoCesta.quantidade_entregas;
        metadados.valorCesta = especificacaoCesta.valor_cesta;
      }
    }

    return metadados;
  }

  /**
   * Aplica regras específicas para o benefício de Auxílio Funeral
   * 
   * @param campos Lista de campos processados
   * @param especificacao Especificação de Funeral
   * @returns Lista de campos com regras de Funeral aplicadas
   */
  private aplicarRegrasFuneral(
    campos: CampoFormularioProcessado[],
    especificacao: EspecificacaoFuneral,
  ): CampoFormularioProcessado[] {
    return campos.map(campo => {
      const campoAtualizado = { ...campo };

      // Regras para prazo máximo após óbito
      if (campo.nome === 'prazo_apos_obito') {
        campoAtualizado.validacoes = {
          ...campoAtualizado.validacoes,
          max: especificacao.prazo_maximo_apos_obito,
        };
        
        campoAtualizado.mensagemAjuda = `O prazo máximo para solicitação é de ${especificacao.prazo_maximo_apos_obito} dias após o óbito.`;
      }

      // Regras para parentesco
      if (campo.nome === 'parentesco_com_falecido') {
        // Nota: parentescos_permitidos foi removido da entidade
        campoAtualizado.mensagemAjuda = 'Selecione o grau de parentesco com o falecido.';
      }

      // Regras para documentos obrigatórios
      if (campo.nome === 'certidao_obito') {
        campoAtualizado.obrigatorio = especificacao.requer_certidao_obito;
        campoAtualizado.visivel = especificacao.requer_certidao_obito;
      }

      if (campo.nome === 'documento_identidade_falecido') {
        // Usando requer_comprovante_residencia como alternativa
        campoAtualizado.obrigatorio = especificacao.requer_comprovante_residencia;
        campoAtualizado.visivel = especificacao.requer_comprovante_residencia;
      }

      if (campo.nome === 'comprovante_residencia_falecido') {
        campoAtualizado.obrigatorio = especificacao.requer_comprovante_residencia;
        campoAtualizado.visivel = especificacao.requer_comprovante_residencia;
      }

      if (campo.nome === 'comprovante_hipossuficiencia') {
        // Usando requer_comprovante_despesas como alternativa
        campoAtualizado.obrigatorio = especificacao.requer_comprovante_despesas;
        campoAtualizado.visivel = especificacao.requer_comprovante_despesas;
      }

      if (campo.nome === 'declaracao_custos_funeral') {
        // Usando requer_comprovante_despesas como alternativa
        campoAtualizado.obrigatorio = especificacao.requer_comprovante_despesas;
        campoAtualizado.visivel = especificacao.requer_comprovante_despesas;
      }

      // Regras para valor máximo do benefício
      if (campo.nome === 'valor_solicitado' && especificacao.valor_fixo) {
        campoAtualizado.validacoes = {
          ...campoAtualizado.validacoes,
          max: especificacao.valor_fixo,
        };
        
        campoAtualizado.mensagemAjuda = `O valor máximo do benefício é R$ ${especificacao.valor_fixo.toFixed(2)}.`;
      }

      // Regras para isenção de taxas
      if (campo.nome === 'solicita_isencao_taxas') {
        campoAtualizado.visivel = especificacao.inclui_isencao_taxas;
      }
      
      // Regras para limitação ao município
      if (campo.nome === 'falecido_residente_municipio') {
        campoAtualizado.obrigatorio = especificacao.limitado_ao_municipio;
        campoAtualizado.visivel = especificacao.limitado_ao_municipio;
        
        if (especificacao.limitado_ao_municipio) {
          campoAtualizado.mensagemAjuda = 'O benefício é limitado a residentes do município.';
        }
      }
      
      // Regras para urna funerária
      if (campo.nome === 'inclui_urna_funeraria') {
        campoAtualizado.visivel = especificacao.inclui_urna_funeraria;
        campoAtualizado.valor = especificacao.inclui_urna_funeraria;
      }
      
      // Regras para tipo de urna funerária
      if (campo.nome === 'tipo_urna_funeraria') {
        campoAtualizado.visivel = especificacao.inclui_urna_funeraria;
        campoAtualizado.dependeDe = {
          campo: 'inclui_urna_funeraria',
          valor: true,
          condicao: 'igual'
        };
      }
      
      // Regras para edredom fúnebre
      if (campo.nome === 'inclui_edredom_funebre') {
        campoAtualizado.visivel = especificacao.inclui_edredom_funebre;
        campoAtualizado.valor = especificacao.inclui_edredom_funebre;
      }
      
      // Regras para despesas de sepultamento
      if (campo.nome === 'inclui_despesas_sepultamento') {
        campoAtualizado.visivel = especificacao.inclui_despesas_sepultamento;
        campoAtualizado.valor = especificacao.inclui_despesas_sepultamento;
      }
      
      // Regras para serviço de sobreaviso
      if (campo.nome === 'servico_sobreaviso') {
        campoAtualizado.visivel = !!especificacao.servico_sobreaviso;
        if (especificacao.servico_sobreaviso) {
          campoAtualizado.mensagemAjuda = `Serviço de sobreaviso: ${especificacao.servico_sobreaviso}`;
        }
      }

      return campoAtualizado;
    });
  }

  /**
   * Aplica regras específicas para o benefício de Cesta Básica
   * 
   * @param campos Lista de campos processados
   * @param especificacao Especificação de Cesta Básica
   * @returns Lista de campos com regras de Cesta Básica aplicadas
   */
  private aplicarRegrasCestaBasica(
    campos: CampoFormularioProcessado[],
    especificacao: EspecificacaoCestaBasica,
  ): CampoFormularioProcessado[] {
    return campos.map(campo => {
      const campoAtualizado = { ...campo };

      // Regras para campo de tipo de entrega
      if (campo.nome === 'tipo_entrega') {
        if (campoAtualizado.opcoes) {
          // Filtra as opções para mostrar apenas o tipo de entrega configurado
          campoAtualizado.opcoes = [especificacao.tipo_entrega];
        }
      }

      // Regras para campo de periodicidade
      if (campo.nome === 'periodicidade') {
        if (campoAtualizado.opcoes) {
          // Filtra as opções para mostrar apenas a periodicidade configurada
          campoAtualizado.opcoes = [especificacao.periodicidade];
        }
      }

      // Regras para campo de quantidade de entregas
      if (campo.nome === 'quantidade_entregas') {
        campoAtualizado.validacoes = {
          ...campoAtualizado.validacoes,
          max: especificacao.quantidade_entregas,
        };
        
        campoAtualizado.mensagemAjuda = `A quantidade máxima de entregas é ${especificacao.quantidade_entregas}.`;
      }

      // Regras para comprovante de residência
      if (campo.nome === 'comprovante_residencia') {
        campoAtualizado.obrigatorio = especificacao.exige_comprovante_residencia;
        campoAtualizado.visivel = especificacao.exige_comprovante_residencia;
      }

      // Regras para comprovante de renda
      if (campo.nome === 'comprovante_renda') {
        campoAtualizado.obrigatorio = especificacao.requer_comprovante_renda;
        campoAtualizado.visivel = especificacao.requer_comprovante_renda;
      }
      
      // Regras para comprovação de vulnerabilidade
      if (campo.nome === 'comprovante_vulnerabilidade') {
        campoAtualizado.obrigatorio = especificacao.exige_comprovacao_vulnerabilidade;
        campoAtualizado.visivel = especificacao.exige_comprovacao_vulnerabilidade;
      }

      // Regras para renda familiar
      if (campo.nome === 'renda_familiar' && especificacao.renda_maxima_per_capita) {
        campoAtualizado.validacoes = {
          ...campoAtualizado.validacoes,
          dependeDe: {
            campo: 'quantidade_dependentes',
            condicao: 'divisao',
            valor: especificacao.renda_maxima_per_capita,
          },
        };
        
        campoAtualizado.mensagemAjuda = `A renda per capita não pode ultrapassar R$ ${especificacao.renda_maxima_per_capita.toFixed(2)}.`;
      }

      // Regras para quantidade de dependentes
      if (campo.nome === 'quantidade_dependentes' && especificacao.quantidade_minima_dependentes) {
        campoAtualizado.validacoes = {
          ...campoAtualizado.validacoes,
          min: especificacao.quantidade_minima_dependentes,
        };
        
        campoAtualizado.mensagemAjuda = `A quantidade mínima de dependentes é ${especificacao.quantidade_minima_dependentes}.`;
      }

      // Regras para campos de priorização
      if (campo.nome === 'tem_criancas') {
        campoAtualizado.mensagemAjuda = especificacao.prioriza_familias_com_criancas 
          ? 'Famílias com crianças têm prioridade no atendimento.' 
          : '';
      }

      if (campo.nome === 'tem_idosos') {
        campoAtualizado.mensagemAjuda = especificacao.prioriza_idosos 
          ? 'Famílias com idosos têm prioridade no atendimento.' 
          : '';
      }

      if (campo.nome === 'tem_pcd') {
        campoAtualizado.mensagemAjuda = especificacao.prioriza_pcd 
          ? 'Famílias com pessoas com deficiência têm prioridade no atendimento.' 
          : '';
      }

      // Regras para itens da cesta
      if (campo.nome === 'itens_cesta') {
        if (especificacao.itens_obrigatorios && especificacao.itens_obrigatorios.length > 0) {
          campoAtualizado.mensagemAjuda = `Itens obrigatórios: ${especificacao.itens_obrigatorios.join(', ')}`;
        }
        
        if (especificacao.itens_opcionais && especificacao.itens_opcionais.length > 0) {
          const mensagemOpcionais = `Itens opcionais: ${especificacao.itens_opcionais.join(', ')}`;
          campoAtualizado.mensagemAjuda = campoAtualizado.mensagemAjuda 
            ? `${campoAtualizado.mensagemAjuda}. ${mensagemOpcionais}` 
            : mensagemOpcionais;
        }
      }

      // Regras para substituição de itens
      if (campo.nome === 'solicita_substituicao_itens') {
        campoAtualizado.visivel = especificacao.permite_substituicao_itens;
      }
      
      // Regras para local de entrega
      if (campo.nome === 'local_entrega') {
        if (especificacao.local_entrega) {
          campoAtualizado.valor = especificacao.local_entrega;
          campoAtualizado.mensagemAjuda = `Local de entrega: ${especificacao.local_entrega}`;
        }
      }
      
      // Regras para horário de entrega
      if (campo.nome === 'horario_entrega') {
        if (especificacao.horario_entrega) {
          campoAtualizado.valor = especificacao.horario_entrega;
          campoAtualizado.mensagemAjuda = `Horário de entrega: ${especificacao.horario_entrega}`;
        }
      }
      
      // Regras para agendamento
      if (campo.nome === 'requer_agendamento') {
        campoAtualizado.visivel = especificacao.exige_agendamento;
        campoAtualizado.valor = especificacao.exige_agendamento;
      }

      return campoAtualizado;
    });
  }
}
