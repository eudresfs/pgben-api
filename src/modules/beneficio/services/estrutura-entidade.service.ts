import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TipoBeneficioSchemaRepository } from '../repositories/tipo-beneficio-schema.repository';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import {
  TipoBeneficioSchema,
  CampoEstrutura,
  MetadadosEstrutura,
} from '../../../entities/tipo-beneficio-schema.entity';
import { Logger } from '@nestjs/common';
import { Status } from '@/enums';

/**
 * Interface para resposta da estrutura da entidade
 */
export interface EstruturaEntidadeResponse {
  entidade_dados: string;
  campos: CampoEstrutura[];
  metadados: MetadadosEstrutura;
  versao: string;
}

/**
 * Serviço responsável por gerenciar a estrutura das entidades de dados
 * para cada tipo de benefício, eliminando a necessidade de formulários dinâmicos
 */
@Injectable()
export class EstruturaEntidadeService {
  private readonly logger = new Logger(EstruturaEntidadeService.name);

  /**
   * Mapeamento de tipos de benefícios para suas entidades de dados correspondentes
   */
  private readonly mapeamentoEntidades: Record<string, string> = {
    'beneficio-natalidade': 'DadosNatalidade',
    'beneficio natalidade': 'DadosNatalidade',
    natalidade: 'DadosNatalidade',
    'aluguel-social': 'DadosAluguelSocial',
    'aluguel social': 'DadosAluguelSocial',
    'beneficio-funeral': 'DadosFuneral',
    'beneficio funeral': 'DadosFuneral',
    funeral: 'DadosFuneral',
    'cesta-basica': 'DadosCestaBasica',
    'cesta básica': 'DadosCestaBasica',
    cesta: 'DadosCestaBasica',
  };

  constructor(
    private readonly tipoBeneficioSchemaRepository: TipoBeneficioSchemaRepository,
  ) {}

  /**
   * Obtém a estrutura da entidade para um tipo de benefício específico
   *
   * @param tipoBeneficio Dados do tipo de benefício
   * @returns Estrutura da entidade correspondente
   */
  async obterEstruturaEntidade(
    tipoBeneficio: TipoBeneficio,
  ): Promise<EstruturaEntidadeResponse> {
    try {
      // Primeiro, tenta buscar schema customizado no banco
      const schemaCustomizado =
        await this.tipoBeneficioSchemaRepository.findByTipoBeneficioId(
          tipoBeneficio.id,
        );

      if (schemaCustomizado) {
        this.logger.log(
          `Schema customizado encontrado para benefício ${tipoBeneficio.id}`,
        );
        return {
          entidade_dados: schemaCustomizado.entidade_dados,
          campos: schemaCustomizado.schema_estrutura.campos,
          metadados: schemaCustomizado.schema_estrutura.metadados,
          versao: schemaCustomizado.versao,
        };
      }

      // Se não encontrou schema customizado, gera estrutura padrão
      this.logger.log(
        `Gerando estrutura padrão para benefício ${tipoBeneficio.nome}`,
      );
      return await this.gerarEstruturaPadrao(tipoBeneficio);
    } catch (error) {
      this.logger.error(
        `Erro ao obter estrutura da entidade: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Erro ao obter estrutura da entidade');
    }
  }

  /**
   * Gera estrutura padrão baseada no tipo de benefício
   *
   * @param tipoBeneficio Dados do tipo de benefício
   * @returns Estrutura padrão da entidade
   */
  private async gerarEstruturaPadrao(
    tipoBeneficio: TipoBeneficio,
  ): Promise<EstruturaEntidadeResponse> {
    const nomeNormalizado = this.normalizarNomeBeneficio(tipoBeneficio.nome);
    const entidadeDados = this.mapeamentoEntidades[nomeNormalizado];

    if (!entidadeDados) {
      throw new NotFoundException(
        `Entidade de dados não encontrada para o benefício: ${tipoBeneficio.nome}`,
      );
    }

    const estrutura = await this.gerarEstruturaPorEntidade(
      entidadeDados,
      tipoBeneficio,
    );

    return {
      entidade_dados: entidadeDados,
      campos: estrutura.campos,
      metadados: estrutura.metadados,
      versao: '1.0.0',
    };
  }

  /**
   * Gera estrutura de campos baseada na entidade de dados
   *
   * @param entidadeDados Nome da entidade de dados
   * @param tipoBeneficio Dados do tipo de benefício
   * @returns Estrutura de campos e metadados
   */
  private async gerarEstruturaPorEntidade(
    entidadeDados: string,
    tipoBeneficio: TipoBeneficio,
  ): Promise<{ campos: CampoEstrutura[]; metadados: MetadadosEstrutura }> {
    switch (entidadeDados) {
      case 'DadosNatalidade':
        return this.gerarEstruturaNatalidade(tipoBeneficio);
      case 'DadosAluguelSocial':
        return this.gerarEstruturaAluguelSocial(tipoBeneficio);
      case 'DadosFuneral':
        return this.gerarEstruturaFuneral(tipoBeneficio);
      case 'DadosCestaBasica':
        return this.gerarEstruturaCestaBasica(tipoBeneficio);
      default:
        throw new BadRequestException(
          `Entidade de dados não suportada: ${entidadeDados}`,
        );
    }
  }

  /**
   * Gera estrutura específica para Auxílio Natalidade
   */
  private gerarEstruturaNatalidade(tipoBeneficio: TipoBeneficio): {
    campos: CampoEstrutura[];
    metadados: MetadadosEstrutura;
  } {
    const campos: CampoEstrutura[] = [
      {
        nome: 'realiza_pre_natal',
        tipo: 'boolean',
        obrigatorio: true,
        label: 'Realiza pré-natal',
        descricao: 'Indica se a gestante realiza acompanhamento pré-natal',
      },
      {
        nome: 'atendida_psf_ubs',
        tipo: 'boolean',
        obrigatorio: true,
        label: 'Atendida pelo PSF/UBS',
        descricao:
          'Indica se é atendida pelo Programa Saúde da Família ou Unidade Básica de Saúde',
      },
      {
        nome: 'gravidez_risco',
        tipo: 'boolean',
        obrigatorio: true,
        label: 'Gravidez de risco',
        descricao: 'Indica se a gravidez é considerada de alto risco',
      },
      {
        nome: 'data_provavel_parto',
        tipo: 'date',
        obrigatorio: false,
        label: 'Data provável do parto',
        descricao: 'Data estimada para o nascimento do bebê',
      },
      {
        nome: 'gemeos_trigemeos',
        tipo: 'boolean',
        obrigatorio: true,
        label: 'Gêmeos/Trigêmeos',
        descricao: 'Indica se a gestação é múltipla (gêmeos ou trigêmeos)',
      },
      {
        nome: 'ja_tem_filhos',
        tipo: 'boolean',
        obrigatorio: true,
        label: 'Já tem filhos',
        descricao: 'Indica se a gestante já possui outros filhos',
      },
      {
        nome: 'quantidade_filhos',
        tipo: 'number',
        obrigatorio: false,
        label: 'Quantidade de filhos',
        descricao: 'Número de filhos que a gestante já possui',
        validacoes: { min: 0, max: 20 },
        dependeDe: {
          campo: 'ja_tem_filhos',
          valor: true,
          condicao: 'igual',
        },
      },
      {
        nome: 'telefone_cadastrado_cpf',
        tipo: 'string',
        obrigatorio: false,
        label: 'Telefone cadastrado no CPF',
        descricao: 'Número de telefone vinculado ao CPF da gestante',
      },
      {
        nome: 'chave_pix',
        tipo: 'string',
        obrigatorio: false,
        label: 'Chave PIX',
        descricao: 'Chave PIX para recebimento do benefício',
      },
    ];

    const metadados: MetadadosEstrutura = {
      versao: '1.0.0',
      descricao: 'Estrutura de dados para solicitação de Auxílio Natalidade',
      categoria: 'assistencia-social',
      tags: ['natalidade', 'gestante', 'beneficio'],
      configuracoes: {
        permiteProrrogacao: false,
        tempoMaximoSolicitacao: '180 dias após o nascimento',
        valorFixo: tipoBeneficio.valor,
      },
    };

    return { campos, metadados };
  }

  /**
   * Gera estrutura específica para Aluguel Social
   */
  private gerarEstruturaAluguelSocial(tipoBeneficio: TipoBeneficio): {
    campos: CampoEstrutura[];
    metadados: MetadadosEstrutura;
  } {
    const campos: CampoEstrutura[] = [
      {
        nome: 'publico_prioritario',
        tipo: 'enum',
        obrigatorio: true,
        label: 'Público prioritário',
        descricao: 'Categoria do público prioritário para aluguel social',
        opcoes: [
          'IDOSO',
          'PESSOA_DEFICIENCIA',
          'FAMILIA_VULNERAVEL',
          'VITIMA_VIOLENCIA',
          'SITUACAO_RUA',
          'OUTROS',
        ],
      },
      {
        nome: 'especificacoes',
        tipo: 'array',
        obrigatorio: false,
        label: 'Especificações',
        descricao: 'Especificações adicionais do caso',
        opcoes: ['EMERGENCIAL', 'TEMPORARIO', 'JUDICIAL', 'SOCIAL'],
      },
      {
        nome: 'situacao_moradia_atual',
        tipo: 'string',
        obrigatorio: true,
        label: 'Situação da moradia atual',
        descricao: 'Descrição detalhada da situação atual de moradia',
      },
      {
        nome: 'possui_imovel_interditado',
        tipo: 'boolean',
        obrigatorio: true,
        label: 'Possui imóvel interditado',
        descricao:
          'Indica se possui imóvel que foi interditado por autoridade competente',
      },
      {
        nome: 'caso_judicializado_maria_penha',
        tipo: 'boolean',
        obrigatorio: true,
        label: 'Caso judicializado Lei Maria da Penha',
        descricao: 'Indica se o caso está relacionado à Lei Maria da Penha',
      },
      {
        nome: 'observacoes_adicionais',
        tipo: 'string',
        obrigatorio: false,
        label: 'Observações adicionais',
        descricao: 'Informações complementares sobre o caso',
      },
    ];

    const metadados: MetadadosEstrutura = {
      versao: '1.0.0',
      descricao: 'Estrutura de dados para solicitação de Aluguel Social',
      categoria: 'assistencia-social',
      tags: ['aluguel', 'moradia', 'social'],
      configuracoes: {
        permiteProrrogacao: true,
        duracaoMaximaMeses:
          tipoBeneficio.especificacoes?.duracao_maxima_meses || 12,
        valorMaximo: tipoBeneficio.valor,
      },
    };

    return { campos, metadados };
  }

  /**
   * Gera estrutura específica para Auxílio Funeral
   */
  private gerarEstruturaFuneral(tipoBeneficio: TipoBeneficio): {
    campos: CampoEstrutura[];
    metadados: MetadadosEstrutura;
  } {
    const campos: CampoEstrutura[] = [
      {
        nome: 'nome_falecido',
        tipo: 'string',
        obrigatorio: true,
        label: 'Nome do falecido',
        descricao: 'Nome completo da pessoa falecida',
      },
      {
        nome: 'data_obito',
        tipo: 'date',
        obrigatorio: true,
        label: 'Data do óbito',
        descricao: 'Data em que ocorreu o falecimento',
      },
      {
        nome: 'parentesco_solicitante',
        tipo: 'enum',
        obrigatorio: true,
        label: 'Parentesco com o solicitante',
        descricao: 'Grau de parentesco entre o falecido e o solicitante',
        opcoes: ['CONJUGE', 'FILHO', 'PAI', 'MAE', 'IRMAO', 'OUTROS'],
      },
      {
        nome: 'tipo_urna',
        tipo: 'enum',
        obrigatorio: true,
        label: 'Tipo de urna',
        descricao: 'Tipo de urna funerária solicitada',
        opcoes: ['SIMPLES', 'INTERMEDIARIA', 'LUXO'],
      },
      {
        nome: 'valor_solicitado',
        tipo: 'number',
        obrigatorio: true,
        label: 'Valor solicitado',
        descricao: 'Valor total solicitado para o auxílio funeral',
        validacoes: { min: 0, max: tipoBeneficio.valor },
      },
    ];

    const metadados: MetadadosEstrutura = {
      versao: '1.0.0',
      descricao: 'Estrutura de dados para solicitação de Auxílio Funeral',
      categoria: 'assistencia-social',
      tags: ['funeral', 'obito', 'beneficio'],
      configuracoes: {
        permiteProrrogacao: false,
        prazoMaximoSolicitacao: '30 dias após o óbito',
        valorMaximo: tipoBeneficio.valor,
      },
    };

    return { campos, metadados };
  }

  /**
   * Gera estrutura específica para Cesta Básica
   */
  private gerarEstruturaCestaBasica(tipoBeneficio: TipoBeneficio): {
    campos: CampoEstrutura[];
    metadados: MetadadosEstrutura;
  } {
    const campos: CampoEstrutura[] = [
      {
        nome: 'quantidade_pessoas_familia',
        tipo: 'number',
        obrigatorio: true,
        label: 'Quantidade de pessoas na família',
        descricao: 'Número total de pessoas que compõem o núcleo familiar',
        validacoes: { min: 1, max: 20 },
      },
      {
        nome: 'possui_restricao_alimentar',
        tipo: 'boolean',
        obrigatorio: true,
        label: 'Possui restrição alimentar',
        descricao:
          'Indica se algum membro da família possui restrição alimentar',
      },
      {
        nome: 'tipo_restricao',
        tipo: 'string',
        obrigatorio: false,
        label: 'Tipo de restrição',
        descricao: 'Descrição das restrições alimentares',
        dependeDe: {
          campo: 'possui_restricao_alimentar',
          valor: true,
          condicao: 'igual',
        },
      },
      {
        nome: 'periodicidade_solicitada',
        tipo: 'enum',
        obrigatorio: true,
        label: 'Periodicidade solicitada',
        descricao: 'Frequência desejada para recebimento da cesta básica',
        opcoes: ['MENSAL', 'BIMESTRAL', 'TRIMESTRAL'],
      },
      {
        nome: 'local_entrega_preferido',
        tipo: 'string',
        obrigatorio: false,
        label: 'Local de entrega preferido',
        descricao: 'Endereço ou local preferido para entrega da cesta básica',
      },
    ];

    const metadados: MetadadosEstrutura = {
      versao: '1.0.0',
      descricao: 'Estrutura de dados para solicitação de Cesta Básica',
      categoria: 'assistencia-social',
      tags: ['cesta', 'alimentacao', 'basica'],
      configuracoes: {
        permiteProrrogacao: true,
        quantidadeMaximaCestas:
          tipoBeneficio.especificacoes?.quantidade_maxima_cestas || 6,
        pesoTotalKg: tipoBeneficio.especificacoes?.peso_total_kg || 15,
      },
    };

    return { campos, metadados };
  }

  /**
   * Normaliza o nome do benefício para busca no mapeamento
   *
   * @param nome Nome do benefício
   * @returns Nome normalizado
   */
  private normalizarNomeBeneficio(nome: string): string {
    return nome
      .toLowerCase()
      .trim()
      .replace(/[áàâã]/g, 'a')
      .replace(/[éèê]/g, 'e')
      .replace(/[íì]/g, 'i')
      .replace(/[óòôõ]/g, 'o')
      .replace(/[úù]/g, 'u')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  /**
   * Cria um schema customizado para um tipo de benefício
   *
   * @param tipoBeneficioId ID do tipo de benefício
   * @param estrutura Estrutura customizada
   * @returns Schema criado
   */
  async criarSchemaCustomizado(
    tipoBeneficioId: string,
    estrutura: EstruturaEntidadeResponse,
  ): Promise<TipoBeneficioSchema> {
    const schema = this.tipoBeneficioSchemaRepository.create({
      tipo_beneficio_id: tipoBeneficioId,
      entidade_dados: estrutura.entidade_dados,
      schema_estrutura: {
        campos: estrutura.campos,
        metadados: estrutura.metadados,
      },
      versao: estrutura.versao,
      status: Status.ATIVO,
    });

    return this.tipoBeneficioSchemaRepository.save(schema);
  }

  /**
   * Lista todas as entidades de dados disponíveis
   *
   * @returns Lista de entidades disponíveis
   */
  getEntidadesDisponiveis(): string[] {
    return Array.from(new Set(Object.values(this.mapeamentoEntidades)));
  }
}
