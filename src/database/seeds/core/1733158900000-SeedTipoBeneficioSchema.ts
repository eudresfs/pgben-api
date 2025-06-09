import { DataSource } from 'typeorm';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import {
  TipoBeneficioSchema,
  CampoEstrutura,
  MetadadosEstrutura,
} from '../../../entities/tipo-beneficio-schema.entity';
import { Status } from '@/enums';

/**
 * Seed para popular a tabela tipo_beneficio_schema com estruturas das entidades existentes
 */
export class SeedTipoBeneficioSchema1733158900000 {
  public async run(dataSource: DataSource): Promise<void> {
    const tipoBeneficioRepository = dataSource.getRepository(TipoBeneficio);
    const tipoBeneficioSchemaRepository =
      dataSource.getRepository(TipoBeneficioSchema);

    // Buscar todos os tipos de benefícios existentes
    const tiposBeneficios = await tipoBeneficioRepository.find();

    // Definir estruturas para cada tipo de benefício
    const estruturas = this.definirEstruturas();

    for (const tipoBeneficio of tiposBeneficios) {
      const chaveEstrutura = this.obterChaveEstrutura(tipoBeneficio.nome);
      const estrutura = estruturas[chaveEstrutura];

      if (estrutura) {
        // Verificar se já existe um schema para este tipo de benefício
        const schemaExistente = await tipoBeneficioSchemaRepository.findOne({
          where: { tipo_beneficio_id: tipoBeneficio.id },
        });

        if (!schemaExistente) {
          const novoSchema = tipoBeneficioSchemaRepository.create({
            tipo_beneficio_id: tipoBeneficio.id,
            entidade_dados: estrutura.entidade_dados,
            schema_estrutura: {
              campos: this.converterParaCampos(estrutura.schema_estrutura),
              metadados: {
                versao: '1.0.0',
                descricao: `Schema para ${tipoBeneficio.nome}`,
                categoria: 'beneficio_eventual',
                tags: [this.normalizarNome(tipoBeneficio.nome)],
              },
            },
            versao: '1.0.0',
            status: Status.ATIVO,
          });

          await tipoBeneficioSchemaRepository.save(novoSchema);
          console.log(`✅ Schema criado para: ${tipoBeneficio.nome}`);
        } else {
          console.log(`⚠️  Schema já existe para: ${tipoBeneficio.nome}`);
        }
      } else {
        console.warn(`❌ Estrutura não definida para: ${tipoBeneficio.nome} (chave: ${chaveEstrutura})`);
      }
    }
  }

  /**
   * Obtém a chave correspondente na estrutura baseado no nome do benefício
   */
  private obterChaveEstrutura(nome: string): string {
    const nomeNormalizado = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // Mapeamento dos nomes para as chaves do objeto estruturas
    const mapeamento: Record<string, string> = {
      'beneficio_natalidade': 'beneficio_natalidade',
      'beneficio_funeral': 'beneficio_funeral',
      'cesta_basica': 'cesta_basica',
      'aluguel_social': 'aluguel_social',
    };

    return mapeamento[nomeNormalizado] || nomeNormalizado;
  }

  /**
   * Normaliza o nome para uso em tags e identificadores
   */
  private normalizarNome(nome: string): string {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Converte a estrutura de campos para o formato CampoEstrutura
   * Compatível com formulários dinâmicos do frontend
   */
  private converterParaCampos(schemaEstrutura: any): CampoEstrutura[] {
    const campos: CampoEstrutura[] = [];

    for (const [nomeCampo, config] of Object.entries(schemaEstrutura)) {
      const campo = config as any;

      // Construir objeto de validações de forma mais completa
      const validacoes: any = {};
      
      // Mapear validações do campo principal
      if (campo.min !== undefined) {validacoes.min = campo.min;}
      if (campo.max !== undefined) {validacoes.max = campo.max;}
      
      // Mapear validações do objeto validation
      if (campo.validation) {
        if (campo.validation.min !== undefined) {validacoes.min = campo.validation.min;}
        if (campo.validation.max !== undefined) {validacoes.max = campo.validation.max;}
        if (campo.validation.minLength !== undefined) {validacoes.minLength = campo.validation.minLength;}
        if (campo.validation.maxLength !== undefined) {validacoes.maxLength = campo.validation.maxLength;}
        if (campo.validation.pattern) {validacoes.pattern = campo.validation.pattern;}
        if (campo.validation.minDate) {validacoes.minDate = campo.validation.minDate;}
        if (campo.validation.maxDate) {validacoes.maxDate = campo.validation.maxDate;}
        if (campo.validation.integer !== undefined) {validacoes.integer = campo.validation.integer;}
        if (campo.validation.maxItems !== undefined) {validacoes.maxItems = campo.validation.maxItems;}
        if (campo.validation.items) {validacoes.items = campo.validation.items;}
      }

      // Mapear opções para select/multiselect/radio com novo formato
      let opcoes: Array<{ value: string | number; label: string; disabled?: boolean }> | undefined;
      if (campo.options && Array.isArray(campo.options)) {
        opcoes = campo.options.map((option: any) => {
          if (typeof option === 'string') {
            return { value: option, label: option };
          } else if (typeof option === 'object' && option.value !== undefined) {
            return {
              value: option.value,
              label: option.label || option.value,
              disabled: option.disabled || false
            };
          }
          return { value: option, label: String(option) };
        });
      } else if (campo.validation?.enum) {
        opcoes = campo.validation.enum.map((value: any) => ({
          value: value,
          label: String(value)
        }));
      }

      // Construir objeto de dependência se existir
      let dependeDe: any = undefined;
      if (campo.dependeDe) {
        dependeDe = {
          campo: campo.dependeDe.campo,
          valor: campo.dependeDe.valor,
          condicao: campo.dependeDe.condicao || 'igual',
          acao: campo.dependeDe.acao || 'mostrar'
        };
      }

      // Mapear propriedades de UI expandidas
      const ui: any = {
        // Layout e posicionamento
        colSpan: campo.colSpan || 1,
        order: campo.order,
        
        // Formatação e máscara
        placeholder: campo.placeholder,
        mask: this.obterMascara(nomeCampo, campo.type),
        
        // Comportamento
        disabled: campo.disabled || false,
        readonly: campo.readonly || false,
        hidden: campo.hidden || false,
        
        // Estilo e aparência
        variant: campo.variant || 'outlined',
        size: campo.size || 'medium',
        color: campo.color || 'primary',
        
        // Propriedades específicas por tipo
        multiple: campo.multiple,
        accept: campo.accept,
        step: campo.step,
        
        // Ajuda e documentação
        helpText: campo.helpText,
        tooltip: campo.tooltip,
        
        // Validação visual
        showValidationIcon: campo.showValidationIcon !== false,
        
        // Agrupamento
        group: campo.group,
        section: campo.section
      };

      // Para textarea, mapear rows
      if (campo.type === 'textarea' && campo.rows) {
        ui.rows = campo.rows;
      }

      // Construir campo completo com todas as propriedades
      const campoEstrutura: CampoEstrutura = {
        nome: nomeCampo,
        tipo: campo.type, // Usar o tipo diretamente da estrutura
        obrigatorio: campo.required || false,
        label: campo.label || nomeCampo,
        descricao: campo.description || campo.placeholder,
        validacoes: Object.keys(validacoes).length > 0 ? validacoes : undefined,
        opcoes: opcoes,
        dependeDe: dependeDe,
        ui: ui
      };

      campos.push(campoEstrutura);
    }

    return campos;
  }

  /**
   * Valida se o tipo de campo é suportado
   */
  private validarTipoCampo(tipo: string): boolean {
    const tiposSuportados = [
      'text', 'textarea', 'number', 'checkbox', 'date', 
      'select', 'multiselect', 'radio', 'file'
    ];
    return tiposSuportados.includes(tipo);
  }

  /**
   * Obtém a máscara apropriada baseada no nome do campo ou tipo
   */
  private obterMascara(nomeCampo: string, tipo: string): string | undefined {
    // Máscaras baseadas no nome do campo
    const mascarasPorNome: Record<string, string> = {
      'cpf': '000.000.000-00',
      'cnpj': '00.000.000/0000-00',
      'telefone': '(00) 00000-0000',
      'telefone_cadastrado_cpf': '(00) 00000-0000',
      'telefone_contato': '(00) 00000-0000',
      'celular': '(00) 00000-0000',
      'cep': '00000-000',
      'rg': '00.000.000-0',
      'numero_certidao_obito': '000000 00 00 0000 0 00000 000 0000000-00',
      'numero_certidao_nascimento': '000000 00 00 0000 0 00000 000 0000000-00',
      'numero_nis': '000.00000.00-0',
      'numero_titulo_eleitor': '0000 0000 0000'
    };

    // Verificar se existe máscara específica para o nome do campo
    for (const [campo, mascara] of Object.entries(mascarasPorNome)) {
      if (nomeCampo.toLowerCase().includes(campo)) {
        return mascara;
      }
    }

    // Máscaras baseadas no tipo de campo
    switch (tipo) {
      case 'date':
        return '00/00/0000';
      case 'number':
        // Para campos numéricos que representam valores monetários
        if (nomeCampo.toLowerCase().includes('valor') || 
            nomeCampo.toLowerCase().includes('renda') ||
            nomeCampo.toLowerCase().includes('salario')) {
          return 'R$ 0.000,00';
        }
        break;
    }

    return undefined;
  }

  private definirEstruturas(): Record<
    string,
    { entidade_dados: string; schema_estrutura: any }
  > {
    return {
      beneficio_natalidade: {
        entidade_dados: 'DadosNatalidade',
        schema_estrutura: {
          realiza_pre_natal: {
            type: 'checkbox',
            label: 'Realiza pré-natal',
            required: false,
            colSpan: 1,
            placeholder: 'Marque se a gestante realiza acompanhamento pré-natal',
            helpText: 'Indique se a gestante está fazendo acompanhamento médico regular',
            section: 'dados_gestacao',
            validation: {
              type: 'boolean',
            },
          },
          atendida_psf_ubs: {
            type: 'checkbox',
            label: 'Atendida pelo PSF/UBS',
            required: false,
            colSpan: 1,
            placeholder:
              'Marque se é atendida pelo Programa Saúde da Família ou Unidade Básica de Saúde',
            validation: {
              type: 'boolean',
            },
          },
          gravidez_risco: {
            type: 'checkbox',
            label: 'Gravidez de risco',
            required: false,
            colSpan: 1,
            placeholder: 'Marque se a gravidez foi classificada como de risco',
            validation: {
              type: 'boolean',
            },
          },
          data_provavel_parto: {
            type: 'date',
            label: 'Data provável do parto',
            required: false,
            colSpan: 2,
            placeholder: 'Informe a data prevista para o nascimento',
            helpText: 'Data estimada pelo médico para o nascimento do bebê',
            section: 'dados_gestacao',
            variant: 'outlined',
            size: 'medium',
            validation: {
              type: 'date',
              minDate: 'today',
              maxDate: '+12months',
            },
          },
          gemeos_trigemeos: {
            type: 'checkbox',
            label: 'Gêmeos/Trigêmeos',
            required: false,
            colSpan: 1,
            placeholder: 'Marque se é uma gestação múltipla',
            validation: {
              type: 'boolean',
            },
          },
          ja_tem_filhos: {
            type: 'checkbox',
            label: 'Já tem filhos',
            required: false,
            colSpan: 1,
            placeholder: 'Marque se a gestante já possui outros filhos',
            validation: {
              type: 'boolean',
            },
          },
          quantidade_filhos: {
            type: 'select',
            label: 'Quantidade de filhos',
            required: false,
            colSpan: 1,
            placeholder: 'Selecione a quantidade de filhos',
            helpText: 'Número de filhos que a gestante já possui',
            section: 'dados_familiares',
            options: [
              { value: 0, label: 'Nenhum filho' },
              { value: 1, label: '1 filho' },
              { value: 2, label: '2 filhos' },
              { value: 3, label: '3 filhos' },
              { value: 4, label: '4 filhos' },
              { value: 5, label: '5 ou mais filhos' }
            ],
            validation: {
              type: 'number',
              min: 0,
              max: 20,
              integer: true,
            },
          },
          telefone_cadastrado_cpf: {
            type: 'text',
            label: 'Telefone cadastrado no CPF',
            required: false,
            colSpan: 1,
            placeholder: 'Ex: (11) 99999-9999',
            validation: {
              type: 'string',
              minLength: 10,
              maxLength: 15,
              pattern: '^\\(?\\d{2}\\)?[\\s-]?\\d{4,5}[\\s-]?\\d{4}$',
            },
          },
          chave_pix: {
            type: 'text',
            label: 'Chave PIX',
            required: false,
            colSpan: 1,
            placeholder: 'Informe a chave PIX para recebimento do benefício',
            validation: {
              type: 'string',
              minLength: 11,
              maxLength: 77,
              pattern:
                '^([0-9]{11}|[0-9]{14}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$',
            },
          },
        },
      },
      aluguel_social: {
        entidade_dados: 'DadosAluguelSocial',
        schema_estrutura: {
          publico_prioritario: {
            type: 'select',
            label: 'Público prioritário',
            required: true,
            colSpan: 2,
            placeholder: 'Selecione o tipo de público prioritário',
            options: [
              {
                label: 'Mulheres vítimas de violência',
                value: 'mulheres_vitimas_violencia',
              },
              {
                label: 'Atingidos por calamidade',
                value: 'atingidos_calamidade',
              },
              { label: 'Situação de risco', value: 'situacao_risco' },
              {
                label: 'Crianças e adolescentes',
                value: 'criancas_adolescentes',
              },
              { label: 'Gestantes e nutrizes', value: 'gestantes_nutrizes' },
              { label: 'Idosos', value: 'idosos' },
              { label: 'Pessoas com deficiência', value: 'pcd' },
            ],
            validation: {
              type: 'enum',
              enum: [
                'mulheres_vitimas_violencia',
                'atingidos_calamidade',
                'situacao_risco',
                'criancas_adolescentes',
                'gestantes_nutrizes',
                'idosos',
                'pcd',
              ],
            },
          },
          especificacoes: {
            type: 'multiselect',
            label: 'Especificações',
            required: false,
            colSpan: 2,
            placeholder: 'Selecione as especificações que se aplicam',
            options: [
              { label: 'Exploração sexual', value: 'exploracao_sexual' },
              { label: 'Vítima de violência', value: 'vitima_violencia' },
              { label: 'Situação de rua', value: 'situacao_rua' },
              { label: 'Drogadição', value: 'drogadicao' },
            ],
            validation: {
              type: 'array',
              items: {
                type: 'enum',
                enum: [
                  'exploracao_sexual',
                  'vitima_violencia',
                  'situacao_rua',
                  'drogadicao',
                ],
              },
              maxItems: 4,
            },
          },
          situacao_moradia_atual: {
            type: 'textarea',
            label: 'Situação da moradia atual',
            required: true,
            colSpan: 2,
            rows: 3,
            placeholder:
              'Descreva detalhadamente a situação atual da moradia da família',
            validation: {
              type: 'string',
              minLength: 20,
              maxLength: 1000,
            },
          },
          possui_imovel_interditado: {
            type: 'checkbox',
            label: 'Possui imóvel interditado',
            required: false,
            colSpan: 1,
            placeholder: 'Marque se possui imóvel que foi interditado',
            validation: {
              type: 'boolean',
            },
          },
          caso_judicializado_maria_penha: {
            type: 'checkbox',
            label: 'Caso judicializado Lei Maria da Penha',
            required: false,
            colSpan: 1,
            placeholder:
              'Marque se há processo judicial relacionado à Lei Maria da Penha',
            validation: {
              type: 'boolean',
            },
          },
          observacoes_adicionais: {
            type: 'textarea',
            label: 'Observações adicionais',
            required: false,
            colSpan: 2,
            rows: 2,
            placeholder:
              'Informações complementares relevantes para a análise do caso',
            validation: {
              type: 'string',
              maxLength: 500,
            },
          },
        },
      },
      cesta_basica: {
        entidade_dados: 'DadosCestaBasica',
        schema_estrutura: {
          quantidade_cestas_solicitadas: {
            type: 'number',
            label: 'Quantidade de cestas solicitadas',
            required: true,
            colSpan: 1,
            min: 1,
            max: 12,
            placeholder: 'Informe a quantidade de cestas necessárias (1-12)',
            validation: {
              type: 'number',
              min: 1,
              max: 12,
              integer: true,
            },
          },
          periodo_concessao: {
            type: 'select',
            label: 'Período de concessão',
            required: true,
            colSpan: 1,
            placeholder: 'Selecione a periodicidade da entrega',
            options: [
              { label: 'Único', value: 'unico' },
              { label: 'Mensal', value: 'mensal' },
              { label: 'Bimestral', value: 'bimestral' },
              { label: 'Trimestral', value: 'trimestral' },
              { label: 'Semestral', value: 'semestral' },
            ],
            validation: {
              type: 'enum',
              enum: ['unico', 'mensal', 'bimestral', 'trimestral', 'semestral'],
            },
          },
          origem_atendimento: {
            type: 'select',
            label: 'Origem do atendimento',
            required: true,
            colSpan: 1,
            placeholder: 'Selecione a origem do atendimento',
            options: [
              { label: 'CRAS', value: 'cras' },
              { label: 'CREAS', value: 'creas' },
              { label: 'Busca ativa', value: 'busca_ativa' },
              {
                label: 'Encaminhamento externo',
                value: 'encaminhamento_externo',
              },
              { label: 'Unidade básica', value: 'unidade_basica' },
              { label: 'Demanda espontânea', value: 'demanda_espontanea' },
            ],
            validation: {
              type: 'enum',
              enum: [
                'cras',
                'creas',
                'busca_ativa',
                'encaminhamento_externo',
                'unidade_basica',
                'demanda_espontanea',
              ],
            },
          },
          numero_pessoas_familia: {
            type: 'number',
            label: 'Número de pessoas na família',
            required: false,
            colSpan: 1,
            min: 1,
            max: 30,
            placeholder: 'Informe o total de pessoas que compõem a família',
            validation: {
              type: 'number',
              min: 1,
              max: 30,
              integer: true,
            },
          },
          justificativa_quantidade: {
            type: 'textarea',
            label: 'Justificativa da quantidade',
            required: false,
            colSpan: 2,
            rows: 3,
            placeholder:
              'Justifique a quantidade solicitada, especialmente se for acima do recomendado',
            validation: {
              type: 'string',
              minLength: 10,
              maxLength: 500,
            },
          },
          observacoes_especiais: {
            type: 'textarea',
            label: 'Observações especiais',
            required: false,
            colSpan: 2,
            rows: 2,
            placeholder: 'Informações adicionais relevantes para a análise',
            validation: {
              type: 'string',
              maxLength: 500,
            },
          },
          tecnico_responsavel: {
            type: 'text',
            label: 'Técnico responsável',
            required: false,
            colSpan: 1,
            placeholder: 'Nome do técnico responsável pelo atendimento',
            validation: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              pattern: '^[A-Za-zÀ-ÿ\\s]+$',
            },
          },
          unidade_solicitante: {
            type: 'text',
            label: 'Unidade solicitante',
            required: false,
            colSpan: 1,
            placeholder: 'Nome da unidade que está solicitando o benefício',
            validation: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
            },
          },
        },
      },
      beneficio_funeral: {
        entidade_dados: 'DadosFuneral',
        schema_estrutura: {
          nome_completo_falecido: {
            type: 'text',
            label: 'Nome completo do falecido',
            required: true,
            colSpan: 2,
            placeholder: 'Informe o nome completo conforme certidão de óbito',
            validation: {
              type: 'string',
              minLength: 2,
              maxLength: 150,
              pattern: '^[A-Za-zÀ-ÿ\\s]+$',
            },
          },
          data_obito: {
            type: 'date',
            label: 'Data do óbito',
            required: true,
            colSpan: 1,
            placeholder: 'Data conforme certidão de óbito',
            validation: {
              type: 'date',
              maxDate: 'today',
            },
          },
          local_obito: {
            type: 'text',
            label: 'Local do óbito',
            required: true,
            colSpan: 1,
            placeholder: 'Ex: Hospital Municipal, Residência, etc.',
            validation: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
            },
          },
          data_autorizacao: {
            type: 'date',
            label: 'Data da autorização',
            required: false,
            colSpan: 1,
            placeholder: 'Data da autorização do sepultamento',
            validation: {
              type: 'date',
              maxDate: 'today',
            },
          },
          grau_parentesco_requerente: {
            type: 'select',
            label: 'Grau de parentesco do requerente',
            required: true,
            colSpan: 1,
            placeholder: 'Selecione o grau de parentesco',
            options: [
              { label: 'Cônjuge', value: 'conjuge' },
              { label: 'Filho(a)', value: 'filho' },
              { label: 'Pai', value: 'pai' },
              { label: 'Mãe', value: 'mae' },
              { label: 'Irmão/Irmã', value: 'irmao' },
              { label: 'Avô/Avó', value: 'avo' },
              { label: 'Neto(a)', value: 'neto' },
              { label: 'Outro', value: 'outro' },
            ],
            validation: {
              type: 'enum',
              enum: [
                'conjuge',
                'filho',
                'pai',
                'mae',
                'irmao',
                'avo',
                'neto',
                'outro',
              ],
            },
          },
          tipo_urna_necessaria: {
            type: 'select',
            label: 'Tipo de urna necessária',
            required: true,
            colSpan: 1,
            placeholder: 'Selecione o tipo de urna',
            options: [
              { label: 'Padrão', value: 'padrao' },
              { label: 'Infantil', value: 'infantil' },
              { label: 'Especial', value: 'especial' },
              { label: 'Para obeso', value: 'obeso' },
            ],
            validation: {
              type: 'enum',
              enum: ['padrao', 'infantil', 'especial', 'obeso'],
            },
          },
          observacoes_especiais: {
            type: 'textarea',
            label: 'Observações especiais',
            required: false,
            colSpan: 2,
            rows: 2,
            placeholder: 'Informações adicionais relevantes',
            validation: {
              type: 'string',
              maxLength: 1000,
            },
          },
          numero_certidao_obito: {
            type: 'text',
            label: 'Número da certidão de óbito',
            required: false,
            colSpan: 1,
            placeholder: 'Número conforme certidão de óbito',
            validation: {
              type: 'string',
              minLength: 5,
              maxLength: 50,
              pattern: '^[A-Za-z0-9\\-\\/\\s]+$',
            },
          },
          cartorio_emissor: {
            type: 'text',
            label: 'Cartório emissor',
            required: false,
            colSpan: 1,
            placeholder: 'Nome do cartório que emitiu a certidão',
            validation: {
              type: 'string',
              minLength: 5,
              maxLength: 150,
            },
          },
        },
      },
    };
  }
}