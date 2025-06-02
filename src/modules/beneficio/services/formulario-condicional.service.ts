import { Injectable, NotFoundException } from '@nestjs/common';
import { FindOneOptions } from 'typeorm';
import { CampoDinamicoService } from './campo-dinamico.service';
import { DadosNatalidadeService } from './dados-natalidade.service';
import { DadosAluguelSocialService } from './dados-aluguel-social.service';
import { DadosFuneralService } from './dados-funeral.service';
import { DadosCestaBasicaService } from './dados-cesta-basica.service';
import { TipoBeneficioRepository } from '../repositories';
import { CampoDinamicoBeneficio } from '../../../entities/campo-dinamico-beneficio.entity';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import { DadosNatalidade } from '../../../entities/dados-natalidade.entity';
import { DadosAluguelSocial } from '../../../entities/dados-aluguel-social.entity';
import { DadosFuneral } from '../../../entities/dados-funeral.entity';
import { DadosCestaBasica } from '../../../entities/dados-cesta-basica.entity';
import { TipoDado } from '../../../entities/campo-dinamico-beneficio.entity';
import { 
  PublicoPrioritarioAluguel, 
  OrigemAtendimentoEnum,
  ParentescoEnum,
  TipoUrnaEnum,
  PeriodicidadeEnum
} from '@/enums';

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
    private readonly dadosNatalidadeService: DadosNatalidadeService,
    private readonly dadosAluguelSocialService: DadosAluguelSocialService,
    private readonly dadosFuneralService: DadosFuneralService,
    private readonly dadosCestaBasicaService: DadosCestaBasicaService,
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

    // Busca os dados específicos do tipo de benefício
    const dadosEspecificos = await this.obterDadosPorTipo(tipoBeneficio);

    // Aplica a lógica condicional baseada nos dados específicos
    const camposProcessados = await this.aplicarLogicaCondicional(
      camposDinamicos,
      tipoBeneficio,
      dadosEspecificos,
    );

    return {
      tipoBeneficioId: tipoBeneficio.id,
      nomeBeneficio: tipoBeneficio.nome,
      descricao: tipoBeneficio.descricao,
      versao: '1.0', // Pode ser obtido de algum controle de versão
      campos: camposProcessados,
      metadados: this.gerarMetadados(tipoBeneficio, dadosEspecificos),
    };
  }

  /**
   * Obtém os dados específicos para o tipo de benefício
   * 
   * @param tipoBeneficio Tipo de benefício
   * @returns Objeto com os dados específicos do benefício
   */
  private async obterDadosPorTipo(
    tipoBeneficio: TipoBeneficio,
  ): Promise<DadosNatalidade | DadosAluguelSocial | DadosFuneral | DadosCestaBasica | null> {
    // Identifica o tipo de benefício pelo nome ou código
    // Esta lógica pode ser melhorada com um sistema mais robusto de identificação
    const nomeBeneficio = tipoBeneficio.nome.toLowerCase();

    // Para formulários condicionais, retornamos dados padrão/template baseados no tipo
    // Em uma implementação real, isso poderia vir de configurações específicas
    if (nomeBeneficio.includes('natalidade')) {
      // Retorna dados padrão para natalidade para configurar o formulário
      return {
        id: 'template-natalidade',
        solicitacao_id: '',
        nome_completo_bebe: '',
        data_nascimento: new Date(),
        peso_nascimento: 0,
        hospital_nascimento: '',
        numero_declaracao_nascido_vivo: '',
        tempo_gestacao_semanas: 0,
        numero_filhos_vivos: 0,
        created_at: new Date(),
        updated_at: new Date(),
      } as unknown as DadosNatalidade;
    } else if (nomeBeneficio.includes('aluguel') || nomeBeneficio.includes('moradia')) {
      return {
        id: 'template-aluguel',
        solicitacao_id: '',
        valor_aluguel_solicitado: 0,
        endereco_completo_imovel: '',
        nome_completo_locador: '',
        publico_prioritario: PublicoPrioritarioAluguel.IDOSOS,
        data_inicio_locacao: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      } as unknown as DadosAluguelSocial;
    } else if (nomeBeneficio.includes('funeral') || nomeBeneficio.includes('obito')) {
      return {
        id: 'template-funeral',
        solicitacao_id: '',
        nome_completo_falecido: '',
        data_obito: new Date(),
        local_obito: 'Hospital',
        data_autorizacao: new Date(),
        grau_parentesco_requerente: ParentescoEnum.CONJUGE,
        tipo_urna_necessaria: TipoUrnaEnum.PADRAO,
        observacoes_especiais: '',
        numero_certidao_obito: '',
        cartorio_emissor: '',
        created_at: new Date(),
        updated_at: new Date(),
      } as DadosFuneral;
    } else if (nomeBeneficio.includes('cesta') || nomeBeneficio.includes('alimentação')) {
      return {
        id: 'template-cesta',
        solicitacao_id: '',
        quantidade_cestas_solicitadas: 1,
        periodo_concessao: PeriodicidadeEnum.MENSAL,
        origem_atendimento: OrigemAtendimentoEnum.DEMANDA_ESPONTANEA,
        numero_pessoas_familia: 1,
        justificativa_quantidade: '',
        observacoes_especiais: '',
        created_at: new Date(),
        updated_at: new Date(),
      } as DadosCestaBasica;
    }

    // Se não encontrar dados específicos, retorna null
    return null;
  }

  /**
   * Aplica a lógica condicional nos campos dinâmicos com base nos dados específicos
   * 
   * @param camposDinamicos Lista de campos dinâmicos
   * @param tipoBeneficio Tipo de benefício
   * @param dadosEspecificos Dados específicos do benefício
   * @returns Lista de campos processados com regras aplicadas
   */
  private async aplicarLogicaCondicional(
    camposDinamicos: CampoDinamicoBeneficio[],
    tipoBeneficio: TipoBeneficio,
    dadosEspecificos: DadosNatalidade | DadosAluguelSocial | DadosFuneral | DadosCestaBasica | null,
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

    // Se não houver dados específicos, retorna os campos sem modificações
    if (!dadosEspecificos) {
      return camposProcessados;
    }

    // Aplica regras específicas com base no tipo de benefício
    const nomeBeneficio = tipoBeneficio.nome.toLowerCase();

    if (nomeBeneficio.includes('natalidade')) {
      return this.aplicarRegrasNatalidade(
        camposProcessados,
        dadosEspecificos as DadosNatalidade,
      );
    } else if (nomeBeneficio.includes('aluguel') || nomeBeneficio.includes('moradia')) {
      return this.aplicarRegrasAluguelSocial(
        camposProcessados,
        dadosEspecificos as DadosAluguelSocial,
      );
    } else if (nomeBeneficio.includes('funeral') || nomeBeneficio.includes('obito')) {
      return this.aplicarRegrasFuneral(
        camposProcessados,
        dadosEspecificos as DadosFuneral,
      );
    } else if (nomeBeneficio.includes('cesta') || nomeBeneficio.includes('alimentação')) {
      return this.aplicarRegrasCestaBasica(
        camposProcessados,
        dadosEspecificos as DadosCestaBasica,
      );
    }

    return camposProcessados;
  }

  /**
   * Aplica regras específicas para o benefício de Auxílio Natalidade
   * 
   * @param campos Lista de campos processados
   * @param dados Dados específicos de Natalidade
   * @returns Lista de campos com regras de Natalidade aplicadas
   */
  private aplicarRegrasNatalidade(
    campos: CampoFormularioProcessado[],
    dados: DadosNatalidade,
  ): CampoFormularioProcessado[] {
    return campos.map(campo => {
      const campoAtualizado = { ...campo };

      // Regras para campo de data de parto/nascimento
      if (campo.nome === 'data_parto' || campo.nome === 'data_nascimento') {
        // Adiciona validação baseada na data provável do parto dos dados
        if (dados.data_provavel_parto) {
          const dataNascimento = new Date(dados.data_provavel_parto);
          
          campoAtualizado.validacoes = {
            ...campoAtualizado.validacoes,
            maxDate: dataNascimento.toISOString().split('T')[0],
          };
          
          campoAtualizado.mensagemAjuda = `A data deve corresponder à data de nascimento informada.`;
        }
      }

      // Regras para campo de tempo de gestação
      if (campo.nome === 'tempo_gestacao_semanas') {
        if (dados.gravidez_risco) {
          campoAtualizado.validacoes = {
            ...campoAtualizado.validacoes,
            min: 20, // Tempo mínimo padrão
            max: 42, // Tempo máximo padrão
          };
          
          campoAtualizado.mensagemAjuda = `O tempo de gestação deve estar entre 20 e 42 semanas.`;
        }
      }

      // Regras para comprovante de pré-natal
      if (campo.nome === 'comprovante_pre_natal') {
        campoAtualizado.obrigatorio = true;
        campoAtualizado.visivel = true;
      }

      // Regras para comprovante de residência
      if (campo.nome === 'comprovante_residencia') {
        campoAtualizado.obrigatorio = true;
        campoAtualizado.visivel = true;
      }

      // Regras para número de filhos
      if (campo.nome === 'numero_filhos') {
        campoAtualizado.validacoes = {
          ...campoAtualizado.validacoes,
          min: 0,
          max: 10, // Limite padrão
        };
        
        campoAtualizado.mensagemAjuda = `Informe o número de filhos.`;
      }

      return campoAtualizado;
    });
  }

  /**
   * Aplica regras específicas para o benefício de Aluguel Social
   * 
   * @param campos Lista de campos processados
   * @param dados Dados específicos de Aluguel Social
   * @returns Lista de campos com regras de Aluguel Social aplicadas
   */
  private aplicarRegrasAluguelSocial(
    campos: CampoFormularioProcessado[],
    dados: DadosAluguelSocial,
  ): CampoFormularioProcessado[] {
    return campos.map(campo => {
      const campoAtualizado = { ...campo };

      // Regras para campo de valor do aluguel
      if (campo.nome === 'valor_aluguel') {
        campoAtualizado.validacoes = {
          ...campoAtualizado.validacoes,
          min: 0,
          max: 5000, // Valor máximo padrão
        };
        
        campoAtualizado.mensagemAjuda = `Informe o valor do aluguel.`;
      }

      // Regras para campo de motivo da solicitação
      if (campo.nome === 'motivo_solicitacao') {
        // Mantém as opções padrão do campo
        campoAtualizado.obrigatorio = true;
      }

      // Regras para campo de comprovante de aluguel
      if (campo.nome === 'comprovante_aluguel') {
        campoAtualizado.obrigatorio = true;
        campoAtualizado.visivel = true;
      }

      // Regras para campos relacionados à vistoria
      if (campo.nome === 'data_vistoria' || campo.nome === 'endereco_vistoria') {
        campoAtualizado.visivel = dados.situacao_moradia_atual ? true : false;
        campoAtualizado.obrigatorio = dados.situacao_moradia_atual ? true : false;
      }

      // Regras para campos relacionados ao locador
      if (
        campo.nome === 'nome_locador' || 
        campo.nome === 'cpf_locador' || 
        campo.nome === 'dados_bancarios_locador'
      ) {
        campoAtualizado.visivel = dados.situacao_moradia_atual ? true : false;
        campoAtualizado.obrigatorio = dados.situacao_moradia_atual ? true : false;
      }

      // Regras para campo de renda familiar
      if (campo.nome === 'renda_familiar') {
        campoAtualizado.validacoes = {
          ...campoAtualizado.validacoes,
          min: 0,
        };
        
        campoAtualizado.mensagemAjuda = `Informe a renda familiar total.`;
      }

      return campoAtualizado;
    });
  }

  /**
   * Gera metadados para o formulário com base no tipo de benefício e dados específicos
   * 
   * @param tipoBeneficio Tipo de benefício
   * @param dadosEspecificos Dados específicos do benefício
   * @returns Objeto com metadados
   */
  private gerarMetadados(
    tipoBeneficio: TipoBeneficio,
    dadosEspecificos: DadosNatalidade | DadosAluguelSocial | DadosFuneral | DadosCestaBasica | null,
  ): Record<string, any> {
    const metadados: Record<string, any> = {
      tipoBeneficio: tipoBeneficio.nome,
      descricao: tipoBeneficio.descricao,
      dataAtualizacao: new Date().toISOString(),
    };

    // Adiciona metadados específicos com base no tipo de benefício
    if (dadosEspecificos) {
      const nomeBeneficio = tipoBeneficio.nome.toLowerCase();

      if (nomeBeneficio.includes('natalidade')) {
        const dadosNatalidade = dadosEspecificos as DadosNatalidade;
        metadados.dataNascimento = dadosNatalidade.data_provavel_parto;
        metadados.tempoGestacao = dadosNatalidade.gravidez_risco;
        metadados.numeroConsultasPreNatal = dadosNatalidade.realiza_pre_natal;
      } else if (nomeBeneficio.includes('aluguel') || nomeBeneficio.includes('moradia')) {
        const dadosAluguel = dadosEspecificos as DadosAluguelSocial;
        metadados.valorAluguel = dadosAluguel.situacao_moradia_atual;
        metadados.enderecoImovel = dadosAluguel.situacao_moradia_atual;
        metadados.nomeLocador = dadosAluguel.situacao_moradia_atual;
      } else if (nomeBeneficio.includes('funeral') || nomeBeneficio.includes('obito')) {
        const dadosFuneral = dadosEspecificos as DadosFuneral;
        metadados.nomefalecido = dadosFuneral.nome_completo_falecido;
        metadados.dataObito = dadosFuneral.data_obito;
        metadados.localObito = dadosFuneral.local_obito;
      } else if (nomeBeneficio.includes('cesta') || nomeBeneficio.includes('alimentação')) {
        const dadosCesta = dadosEspecificos as DadosCestaBasica;
        metadados.quantidadeCestas = dadosCesta.quantidade_cestas_solicitadas;
        metadados.origemAtendimento = dadosCesta.origem_atendimento;
        metadados.periodoConcessao = dadosCesta.periodo_concessao;
      }
    }

    return metadados;
  }

  /**
   * Aplica regras específicas para o benefício de Auxílio Funeral
   * 
   * @param campos Lista de campos processados
   * @param dados Dados específicos de Funeral
   * @returns Lista de campos com regras de Funeral aplicadas
   */
  private aplicarRegrasFuneral(
    campos: CampoFormularioProcessado[],
    dados: DadosFuneral,
  ): CampoFormularioProcessado[] {
    return campos.map(campo => {
      const campoAtualizado = { ...campo };

      // Regras para data de óbito
      if (campo.nome === 'data_obito') {
        if (dados.data_obito) {
          const dataObito = new Date(dados.data_obito);
          campoAtualizado.validacoes = {
            ...campoAtualizado.validacoes,
            maxDate: dataObito.toISOString().split('T')[0],
          };
        }
        campoAtualizado.mensagemAjuda = 'Informe a data do óbito.';
      }

      // Regras para parentesco
      if (campo.nome === 'parentesco_com_falecido') {
        campoAtualizado.mensagemAjuda = 'Selecione o grau de parentesco com o falecido.';
        campoAtualizado.obrigatorio = true;
      }

      // Regras para documentos obrigatórios
      if (campo.nome === 'certidao_obito') {
        campoAtualizado.obrigatorio = true;
        campoAtualizado.visivel = true;
      }

      if (campo.nome === 'documento_identidade_falecido') {
        campoAtualizado.obrigatorio = true;
        campoAtualizado.visivel = true;
      }

      if (campo.nome === 'comprovante_residencia_falecido') {
        campoAtualizado.obrigatorio = true;
        campoAtualizado.visivel = true;
      }

      if (campo.nome === 'comprovante_hipossuficiencia') {
        campoAtualizado.obrigatorio = true;
        campoAtualizado.visivel = true;
      }

      if (campo.nome === 'declaracao_custos_funeral') {
        campoAtualizado.obrigatorio = true;
        campoAtualizado.visivel = true;
      }

      // Regras para valor solicitado
      if (campo.nome === 'valor_solicitado') {
        if (dados.tipo_urna_necessaria) {
          campoAtualizado.validacoes = {
            ...campoAtualizado.validacoes,
            max: 5000,
          };
          campoAtualizado.mensagemAjuda = `O valor máximo do benefício é R$ 5000.00.`;
        } else {
          campoAtualizado.validacoes = {
            ...campoAtualizado.validacoes,
            min: 0,
          };
          campoAtualizado.mensagemAjuda = 'Informe o valor solicitado para o benefício.';
        }
      }

      // Regras para observações
      if (campo.nome === 'observacoes') {
        campoAtualizado.mensagemAjuda = 'Informações adicionais sobre o benefício funeral.';
      }
      
      // Regras para despesas de sepultamento
      if (campo.nome === 'inclui_despesas_sepultamento') {
        campoAtualizado.visivel = true;
        campoAtualizado.mensagemAjuda = 'Informe se inclui despesas de sepultamento.';
      }
      
      // Regras para serviço de sobreaviso
      if (campo.nome === 'servico_sobreaviso') {
        campoAtualizado.visivel = true;
        campoAtualizado.mensagemAjuda = 'Informe sobre o serviço de sobreaviso.';
      }

      return campoAtualizado;
    });
  }

  /**
   * Aplica regras específicas para o benefício de Cesta Básica
   * 
   * @param campos Lista de campos processados
   * @param dados Dados específicos de Cesta Básica
   * @returns Lista de campos com regras de Cesta Básica aplicadas
   */
  private aplicarRegrasCestaBasica(
    campos: CampoFormularioProcessado[],
    dados: DadosCestaBasica,
  ): CampoFormularioProcessado[] {
    return campos.map(campo => {
      const campoAtualizado = { ...campo };

      // Regras para quantidade de entregas
      if (campo.nome === 'quantidade_entregas') {
        if (dados.quantidade_cestas_solicitadas) {
          campoAtualizado.validacoes = {
            ...campoAtualizado.validacoes,
            max: dados.quantidade_cestas_solicitadas,
          };
          campoAtualizado.mensagemAjuda = `A quantidade máxima de entregas é ${dados.quantidade_cestas_solicitadas}.`;
        } else {
          campoAtualizado.validacoes = {
            ...campoAtualizado.validacoes,
            min: 1,
          };
          campoAtualizado.mensagemAjuda = 'Informe a quantidade de entregas.';
        }
      }

      // Regras para comprovante de residência
      if (campo.nome === 'comprovante_residencia') {
        campoAtualizado.obrigatorio = true;
        campoAtualizado.visivel = true;
      }

      // Regras para comprovante de renda
      if (campo.nome === 'comprovante_renda') {
        campoAtualizado.obrigatorio = true;
        campoAtualizado.visivel = true;
      }
      
      // Regras para comprovação de vulnerabilidade
      if (campo.nome === 'comprovante_vulnerabilidade') {
        campoAtualizado.obrigatorio = true;
        campoAtualizado.visivel = true;
      }

      // Regras para renda familiar
      if (campo.nome === 'renda_familiar') {
        campoAtualizado.validacoes = {
          ...campoAtualizado.validacoes,
          min: 0,
        };
        campoAtualizado.mensagemAjuda = 'Informe a renda familiar total.';
      }

      // Regras para quantidade de dependentes
      if (campo.nome === 'quantidade_dependentes') {
        campoAtualizado.validacoes = {
          ...campoAtualizado.validacoes,
          min: 0,
        };
        
        campoAtualizado.mensagemAjuda = 'Informe a quantidade de dependentes.';
      }

      // Regras para campos de priorização
      if (campo.nome === 'tem_criancas') {
        campoAtualizado.mensagemAjuda = 'Informe se há crianças na família.';
      }

      if (campo.nome === 'tem_idosos') {
        campoAtualizado.mensagemAjuda = 'Informe se há idosos na família.';
      }

      if (campo.nome === 'tem_pcd') {
        campoAtualizado.mensagemAjuda = 'Informe se há pessoas com deficiência na família.';
      }

      // Regras para observações
      if (campo.nome === 'observacoes') {
        campoAtualizado.mensagemAjuda = 'Informações adicionais sobre o benefício cesta básica.';
      }

      // Regras para substituição de itens
      if (campo.nome === 'solicita_substituicao_itens') {
        campoAtualizado.visivel = true;
        campoAtualizado.mensagemAjuda = 'Informe se solicita substituição de itens.';
      }
      
      // Regras para local de entrega
      if (campo.nome === 'local_entrega') {
        campoAtualizado.mensagemAjuda = 'Informe o local de entrega preferido.';
      }
      
      // Regras para horário de entrega
      if (campo.nome === 'horario_entrega') {
        campoAtualizado.mensagemAjuda = 'Informe o horário de entrega preferido.';
      }
      
      // Regras para agendamento
      if (campo.nome === 'requer_agendamento') {
        campoAtualizado.visivel = true;
        campoAtualizado.mensagemAjuda = 'Informe se requer agendamento.';
      }

      return campoAtualizado;
    });
  }
}
