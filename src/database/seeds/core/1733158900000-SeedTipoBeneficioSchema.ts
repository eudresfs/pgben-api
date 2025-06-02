import { DataSource } from 'typeorm';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import { TipoBeneficioSchema, CampoEstrutura, MetadadosEstrutura } from '../../../entities/tipo-beneficio-schema.entity';

/**
 * Seed para popular a tabela tipo_beneficio_schema com estruturas das entidades existentes
 */
export class SeedTipoBeneficioSchema1733158900000 {
  public async run(dataSource: DataSource): Promise<void> {
    const tipoBeneficioRepository = dataSource.getRepository(TipoBeneficio);
    const tipoBeneficioSchemaRepository = dataSource.getRepository(TipoBeneficioSchema);

    // Buscar todos os tipos de benefícios existentes
    const tiposBeneficios = await tipoBeneficioRepository.find();

    // Definir estruturas para cada tipo de benefício
    const estruturas = this.definirEstruturas();

    for (const tipoBeneficio of tiposBeneficios) {
      const nomeNormalizado = this.normalizarNome(tipoBeneficio.nome);
      const estrutura = estruturas[nomeNormalizado];

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
                tags: [nomeNormalizado]
              }
            },
            versao: '1.0.0',
            ativo: true,
          });

          await tipoBeneficioSchemaRepository.save(novoSchema);
          console.log(`Schema criado para: ${tipoBeneficio.nome}`);
        } else {
          console.log(`Schema já existe para: ${tipoBeneficio.nome}`);
        }
      } else {
        console.warn(`Estrutura não definida para: ${tipoBeneficio.nome}`);
      }
    }
  }

  private normalizarNome(nome: string): string {
    const nomeNormalizado = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    // Mapeamento específico para os códigos dos benefícios existentes
    const mapeamento: Record<string, string> = {
      'beneficio_natalidade': 'BENEFICIO_NATALIDADE',
      'beneficio_funeral': 'BENEFICIO_FUNERAL', 
      'cesta_basica': 'CESTA_BASICA',
      'aluguel_social': 'ALUGUEL_SOCIAL'
    };
    
    return mapeamento[nomeNormalizado] || nomeNormalizado;
  }

  /**
   * Converte a estrutura de schema atual para o formato CampoEstrutura[]
   */
  private converterParaCampos(schemaEstrutura: any): CampoEstrutura[] {
    const campos: CampoEstrutura[] = [];
    
    for (const [nomeCampo, config] of Object.entries(schemaEstrutura)) {
      const campo = config as any;
      
      campos.push({
        nome: nomeCampo,
        tipo: this.mapearTipo(campo.type),
        obrigatorio: campo.required || false,
        label: campo.label || nomeCampo,
        descricao: campo.placeholder,
        validacoes: {
          min: campo.validation?.min || campo.min,
          max: campo.validation?.max || campo.max,
          pattern: campo.validation?.pattern,
          opcoes: campo.options?.map((opt: any) => opt.value) || campo.validation?.enum
        },
        opcoes: campo.options?.map((opt: any) => opt.value) || campo.validation?.enum
      });
    }
    
    return campos;
  }

  /**
   * Mapeia os tipos de campo para o formato esperado
   */
  private mapearTipo(tipo: string): 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array' {
    switch (tipo) {
      case 'text':
      case 'textarea':
        return 'string';
      case 'number':
        return 'number';
      case 'checkbox':
        return 'boolean';
      case 'date':
        return 'date';
      case 'select':
      case 'multiselect':
        return 'enum';
      default:
        return 'string';
    }
  }

  private definirEstruturas(): Record<string, { entidade_dados: string; schema_estrutura: any }> {
    return {
      BENEFICIO_NATALIDADE: {
        entidade_dados: 'DadosNatalidade',
        schema_estrutura: {
          realiza_pre_natal: {
            type: 'checkbox',
            label: 'Realiza pré-natal',
            required: false,
            colSpan: 1,
            placeholder: 'Marque se a gestante realiza acompanhamento pré-natal',
            validation: {
              type: 'boolean'
            }
          },
          atendida_psf_ubs: {
            type: 'checkbox',
            label: 'Atendida pelo PSF/UBS',
            required: false,
            colSpan: 1,
            placeholder: 'Marque se é atendida pelo Programa Saúde da Família ou Unidade Básica de Saúde',
            validation: {
              type: 'boolean'
            }
          },
          gravidez_risco: {
            type: 'checkbox',
            label: 'Gravidez de risco',
            required: false,
            colSpan: 1,
            placeholder: 'Marque se a gravidez foi classificada como de risco',
            validation: {
              type: 'boolean'
            }
          },
          data_provavel_parto: {
            type: 'date',
            label: 'Data provável do parto',
            required: false,
            colSpan: 1,
            placeholder: 'Informe a data prevista para o nascimento',
            validation: {
              type: 'date',
              minDate: 'today',
              maxDate: '+12months'
            }
          },
          gemeos_trigemeos: {
            type: 'checkbox',
            label: 'Gêmeos/Trigêmeos',
            required: false,
            colSpan: 1,
            placeholder: 'Marque se é uma gestação múltipla',
            validation: {
              type: 'boolean'
            }
          },
          ja_tem_filhos: {
            type: 'checkbox',
            label: 'Já tem filhos',
            required: false,
            colSpan: 1,
            placeholder: 'Marque se a gestante já possui outros filhos',
            validation: {
              type: 'boolean'
            }
          },
          quantidade_filhos: {
            type: 'number',
            label: 'Quantidade de filhos',
            required: false,
            colSpan: 1,
            min: 0,
            max: 20,
            placeholder: 'Informe o número de filhos que já possui',
            validation: {
              type: 'number',
              min: 0,
              max: 20,
              integer: true
            }
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
              pattern: '^\\(?\\d{2}\\)?[\\s-]?\\d{4,5}[\\s-]?\\d{4}$'
            }
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
              pattern: '^([0-9]{11}|[0-9]{14}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$'
            }
          }
        },
      },
      ALUGUEL_SOCIAL: {
        entidade_dados: 'DadosAluguelSocial',
        schema_estrutura: {
          publico_prioritario: {
            type: 'select',
            label: 'Público prioritário',
            required: true,
            colSpan: 2,
            placeholder: 'Selecione o tipo de público prioritário',
            options: [
              { label: 'Mulheres vítimas de violência', value: 'MULHERES_VITIMAS_VIOLENCIA' },
              { label: 'Atingidos por calamidade', value: 'ATINGIDOS_CALAMIDADE' },
              { label: 'Situação de risco', value: 'SITUACAO_RISCO' },
              { label: 'Crianças e adolescentes', value: 'CRIANCAS_ADOLESCENTES' },
              { label: 'Gestantes e nutrizes', value: 'GESTANTES_NUTRIZES' },
              { label: 'Idosos', value: 'IDOSOS' },
              { label: 'Pessoas com deficiência', value: 'PCD' }
            ],
            validation: {
              type: 'enum',
              enum: ['MULHERES_VITIMAS_VIOLENCIA', 'ATINGIDOS_CALAMIDADE', 'SITUACAO_RISCO', 'CRIANCAS_ADOLESCENTES', 'GESTANTES_NUTRIZES', 'IDOSOS', 'PCD']
            }
          },
          especificacoes: {
            type: 'multiselect',
            label: 'Especificações',
            required: false,
            colSpan: 2,
            placeholder: 'Selecione as especificações que se aplicam',
            options: [
              { label: 'Exploração sexual', value: 'EXPLORACAO_SEXUAL' },
              { label: 'Vítima de violência', value: 'VITIMA_VIOLENCIA' },
              { label: 'Situação de rua', value: 'SITUACAO_RUA' },
              { label: 'Drogadição', value: 'DROGADICAO' }
            ],
            validation: {
              type: 'array',
              items: {
                type: 'enum',
                enum: ['EXPLORACAO_SEXUAL', 'VITIMA_VIOLENCIA', 'SITUACAO_RUA', 'DROGADICAO']
              },
              maxItems: 4
            }
          },
          situacao_moradia_atual: {
            type: 'textarea',
            label: 'Situação da moradia atual',
            required: true,
            colSpan: 2,
            rows: 3,
            placeholder: 'Descreva detalhadamente a situação atual da moradia da família',
            validation: {
              type: 'string',
              minLength: 20,
              maxLength: 1000
            }
          },
          possui_imovel_interditado: {
            type: 'checkbox',
            label: 'Possui imóvel interditado',
            required: false,
            colSpan: 1,
            placeholder: 'Marque se possui imóvel que foi interditado',
            validation: {
              type: 'boolean'
            }
          },
          caso_judicializado_maria_penha: {
            type: 'checkbox',
            label: 'Caso judicializado Lei Maria da Penha',
            required: false,
            colSpan: 1,
            placeholder: 'Marque se há processo judicial relacionado à Lei Maria da Penha',
            validation: {
              type: 'boolean'
            }
          },
          observacoes_adicionais: {
            type: 'textarea',
            label: 'Observações adicionais',
            required: false,
            colSpan: 2,
            rows: 2,
            placeholder: 'Informações complementares relevantes para a análise do caso',
            validation: {
              type: 'string',
              maxLength: 500
            }
          }
        },
      },
      CESTA_BASICA: {
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
              integer: true
            }
          },
          periodo_concessao: {
            type: 'select',
            label: 'Período de concessão',
            required: true,
            colSpan: 1,
            placeholder: 'Selecione a periodicidade da entrega',
            options: [
              { label: 'Único', value: 'UNICO' },
              { label: 'Mensal', value: 'MENSAL' },
              { label: 'Bimestral', value: 'BIMESTRAL' },
              { label: 'Trimestral', value: 'TRIMESTRAL' },
              { label: 'Semestral', value: 'SEMESTRAL' }
            ],
            validation: {
              type: 'enum',
              enum: ['UNICO', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL']
            }
          },
          origem_atendimento: {
            type: 'select',
            label: 'Origem do atendimento',
            required: true,
            colSpan: 1,
            placeholder: 'Selecione a origem do atendimento',
            options: [
              { label: 'CRAS', value: 'CRAS' },
              { label: 'CREAS', value: 'CREAS' },
              { label: 'Busca ativa', value: 'BUSCA_ATIVA' },
              { label: 'Encaminhamento externo', value: 'ENCAMINHAMENTO_EXTERNO' },
              { label: 'Unidade básica', value: 'UNIDADE_BASICA' },
              { label: 'Demanda espontânea', value: 'DEMANDA_ESPONTANEA' }
            ],
            validation: {
              type: 'enum',
              enum: ['CRAS', 'CREAS', 'BUSCA_ATIVA', 'ENCAMINHAMENTO_EXTERNO', 'UNIDADE_BASICA', 'DEMANDA_ESPONTANEA']
            }
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
              integer: true
            }
          },
          justificativa_quantidade: {
            type: 'textarea',
            label: 'Justificativa da quantidade',
            required: false,
            colSpan: 2,
            rows: 3,
            placeholder: 'Justifique a quantidade solicitada, especialmente se for acima do recomendado',
            validation: {
              type: 'string',
              minLength: 10,
              maxLength: 500
            }
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
              maxLength: 500
            }
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
              pattern: '^[A-Za-zÀ-ÿ\\s]+$'
            }
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
              maxLength: 100
            }
          }
        },
      },
      BENEFICIO_FUNERAL: {
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
              pattern: '^[A-Za-zÀ-ÿ\\s]+$'
            }
          },
          data_obito: {
            type: 'date',
            label: 'Data do óbito',
            required: true,
            colSpan: 1,
            placeholder: 'Data conforme certidão de óbito',
            validation: {
              type: 'date',
              maxDate: 'today'
            }
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
              maxLength: 100
            }
          },
          data_autorizacao: {
            type: 'date',
            label: 'Data da autorização',
            required: false,
            colSpan: 1,
            placeholder: 'Data da autorização do sepultamento',
            validation: {
              type: 'date',
              maxDate: 'today'
            }
          },
          grau_parentesco_requerente: {
            type: 'select',
            label: 'Grau de parentesco do requerente',
            required: true,
            colSpan: 1,
            placeholder: 'Selecione o grau de parentesco',
            options: [
              { label: 'Cônjuge', value: 'CONJUGE' },
              { label: 'Filho(a)', value: 'FILHO' },
              { label: 'Pai', value: 'PAI' },
              { label: 'Mãe', value: 'MAE' },
              { label: 'Irmão/Irmã', value: 'IRMAO' },
              { label: 'Avô/Avó', value: 'AVO' },
              { label: 'Neto(a)', value: 'NETO' },
              { label: 'Outro', value: 'OUTRO' }
            ],
            validation: {
              type: 'enum',
              enum: ['CONJUGE', 'FILHO', 'PAI', 'MAE', 'IRMAO', 'AVO', 'NETO', 'OUTRO']
            }
          },
          tipo_urna_necessaria: {
            type: 'select',
            label: 'Tipo de urna necessária',
            required: true,
            colSpan: 1,
            placeholder: 'Selecione o tipo de urna',
            options: [
              { label: 'Padrão', value: 'PADRAO' },
              { label: 'Infantil', value: 'INFANTIL' },
              { label: 'Especial', value: 'ESPECIAL' },
              { label: 'Para obeso', value: 'OBESO' }
            ],
            validation: {
              type: 'enum',
              enum: ['PADRAO', 'INFANTIL', 'ESPECIAL', 'OBESO']
            }
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
              maxLength: 1000
            }
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
              pattern: '^[A-Za-z0-9\\-\\/\\s]+$'
            }
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
              maxLength: 150
            }
          }
        },
      },
    };
  }
}