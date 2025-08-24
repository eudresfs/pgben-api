## Aluguel Social

```json
{
  "secoes": [
    {
      "nome": "detalhes_solicitacao",
      "titulo": "Detalhes da solicitação",
      "descricao": "Informações específicas sobre o benefício solicitado",
      "ordem": 1,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": true,
            "readonly": true,
            "placeholder": "Valor não alterável",
            "showValidationIcon": true
          },
          "nome": "valor",
          "tipo": "currency",
          "label": "Valor",
          "descricao": "Valor do benefício (não alterável)",
          "valorPadrao": "R$ 500,00",
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Digite a quantidade de parcelas",
            "showValidationIcon": true
          },
          "nome": "quantidade_parcelas",
          "tipo": "number",
          "label": "Quantidade de parcelas",
          "descricao": "Informe o número de parcelas",
          "validacoes": {
            "min": 1,
            "max": 12
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Digite a quantidade de cestas (se aplicável)",
            "showValidationIcon": true
          },
          "nome": "quantidade_cestas",
          "tipo": "number",
          "label": "Quantidade de cestas",
          "descricao": "Informe a quantidade de cestas básicas (quando aplicável)",
          "validacoes": {
            "min": 0,
            "max": 10
          },
          "obrigatorio": false
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Marque se há determinação judicial",
            "showValidationIcon": true
          },
          "nome": "determinacao_judicial",
          "tipo": "checkbox",
          "label": "Determinação judicial",
          "descricao": "Marque se existe determinação judicial para o benefício",
          "obrigatorio": false
        }
      ]
    },
    {
      "nome": "caracterizacao_publico",
      "titulo": "Caracterização do público",
      "descricao": "Identificação do público prioritário e suas especificações",
      "ordem": 2,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Selecione o tipo de público prioritário",
            "showValidationIcon": true
          },
          "nome": "publico_prioritario",
          "tipo": "select",
          "label": "Público prioritário",
          "opcoes": [
            {
              "label": "Famílias/indivíduos com Crianças e/ou Adolescentes",
              "value": "familias_criancas_adolescentes",
              "disabled": false
            },
            {
              "label": "Famílias/indivíduos com Gestantes e/ou Nutrizes",
              "value": "familias_gestantes_nutrizes",
              "disabled": false
            },
            {
              "label": "Famílias/indivíduos com Idosos",
              "value": "familias_idosos",
              "disabled": false
            },
            {
              "label": "Mulheres vítimas de violência doméstica ou familiar",
              "value": "mulheres_vitimas_violencia_domestica",
              "disabled": false
            },
            {
              "label": "Famílias/indivíduos com pessoas com deficiência",
              "value": "familias_pessoas_deficiencia",
              "disabled": false
            },
            {
              "label": "Famílias/indivíduos atingidos por calamidade pública",
              "value": "familias_atingidas_calamidade_publica",
              "disabled": false
            },
            {
              "label": "Famílias/indivíduos em situação de risco ou vulnerabilidade",
              "value": "familias_situacao_risco_vulnerabilidade",
              "disabled": false
            }
          ],
          "descricao": "Selecione o tipo de público prioritário",
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Selecione as especificações que se aplicam",
            "showValidationIcon": true
          },
          "nome": "especificacoes",
          "tipo": "multiselect",
          "label": "Especificações",
          "opcoes": [
            {
              "label": "Trabalho infantil",
              "value": "trabalho_infantil",
              "disabled": false
            },
            {
              "label": "Exploração sexual",
              "value": "exploracao_sexual",
              "disabled": false
            },
            {
              "label": "Vítima de violência",
              "value": "vitima_violencia",
              "disabled": false
            },
            {
              "label": "LGBTQIA+",
              "value": "lgbtqia_plus",
              "disabled": false
            },
            {
              "label": "Em conflito com a lei",
              "value": "conflito_lei",
              "disabled": false
            },
            {
              "label": "Situação de drogadição",
              "value": "situacao_drogadicao",
              "disabled": false
            },
            {
              "label": "Em situação de rua",
              "value": "situacao_rua",
              "disabled": false
            },
            {
              "label": "Gravidez na adolescência",
              "value": "gravidez_adolescencia",
              "disabled": false
            },
            {
              "label": "Egresso do acolhimento institucional",
              "value": "egresso_acolhimento_institucional",
              "disabled": false
            },
            {
              "label": "Ausência de renda",
              "value": "ausencia_renda",
              "disabled": false
            },
            {
              "label": "Ausência de moradia",
              "value": "ausencia_moradia",
              "disabled": false
            },
            {
              "label": "Incapacitante para atividade laboral",
              "value": "incapacitante_laboral",
              "disabled": false
            },
            {
              "label": "Desemprego",
              "value": "desemprego",
              "disabled": false
            },
            {
              "label": "Situação de Migração ou Refúgio",
              "value": "migracao_refugio",
              "disabled": false
            },
            {
              "label": "Desastre ambiental",
              "value": "desastre_ambiental",
              "disabled": false
            },
            {
              "label": "Enchente",
              "value": "enchente",
              "disabled": false
            },
            {
              "label": "Desapropriação",
              "value": "desapropriacao",
              "disabled": false
            },
            {
              "label": "Outros",
              "value": "outros",
              "disabled": false
            }
          ],
          "descricao": "Selecione as especificações que se aplicam",
          "validacoes": {
            "items": {
              "enum": [
                "trabalho_infantil",
                "exploracao_sexual",
                "vitima_violencia",
                "lgbtqia_plus",
                "conflito_lei",
                "situacao_drogadicao",
                "situacao_rua",
                "gravidez_adolescencia",
                "egresso_acolhimento_institucional",
                "ausencia_renda",
                "ausencia_moradia",
                "incapacitante_laboral",
                "desemprego",
                "migracao_refugio",
                "desastre_ambiental",
                "enchente",
                "desapropriacao",
                "outros"
              ],
              "type": "enum"
            },
            "maxItems": 2
          },
          "obrigatorio": true
        }
      ]
    },
    {
      "nome": "situacao_moradia",
      "titulo": "Situação de moradia",
      "descricao": "Informações sobre a situação habitacional atual",
      "ordem": 3,
      "campos": [
        {
          "ui": {
            "rows": 3,
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Descreva detalhadamente a situação atual da moradia da família",
            "showValidationIcon": true
          },
          "nome": "situacao_moradia_atual",
          "tipo": "textarea",
          "label": "Situação da moradia atual",
          "descricao": "Descreva detalhadamente a situação atual da moradia da família",
          "validacoes": {
            "maxLength": 1000,
            "minLength": 10
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Marque se possui imóvel que foi interditado",
            "showValidationIcon": true
          },
          "nome": "possui_imovel_interditado",
          "tipo": "checkbox",
          "label": "Possui imóvel interditado",
          "descricao": "Marque se possui imóvel que foi interditado",
          "obrigatorio": false
        }
      ]
    },
    {
      "nome": "aspectos_juridicos",
      "titulo": "Aspectos jurídicos",
      "descricao": "Informações sobre processos judiciais relacionados",
      "ordem": 4,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Selecione uma opção apenas se necessário",
            "showValidationIcon": true
          },
          "nome": "processo_judicializado",
          "tipo": "select",
          "label": "Processo Judicializado",
          "opcoes": [
            {
              "label": "2024",
              "value": "2024",
              "disabled": false
            },
            {
              "label": "2025",
              "value": "2025",
              "disabled": false
            },
            {
              "label": "Lei Maria da Penha",
              "value": "maria_da_penha",
              "disabled": false
            }
          ],
          "descricao": "Selecione uma opção apenas se necessário",
          "validacoes": {
            "items": {
              "enum": [
                "2024",
                "2025",
                "maria_da_penha",
                "nenhum"
              ],
              "type": "enum"
            }
          },
          "obrigatorio": false
        },
        {
          "ui": {
            "rows": 1,
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Informe apenas se selecionou algum processo na pergunta anterior",
            "showValidationIcon": true
          },
          "nome": "numero_processo",
          "tipo": "text",
          "label": "Número do Processo",
          "descricao": "Informe apenas se selecionou algum processo na pergunta anterior",
          "validacoes": {
            "maxLength": 50
          },
          "obrigatorio": false
        }
      ]
    },
    {
      "nome": "informacoes_complementares",
      "titulo": "Informações complementares",
      "descricao": "Dados adicionais relevantes para análise",
      "ordem": 5,
      "campos": [
        {
          "ui": {
            "rows": 2,
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Informações complementares relevantes para a análise do caso",
            "showValidationIcon": true
          },
          "nome": "observacoes",
          "tipo": "textarea",
          "label": "Observações adicionais",
          "descricao": "Informações complementares relevantes para a análise do caso",
          "validacoes": {
            "maxLength": 500
          },
          "obrigatorio": false
        }
      ]
    }
  ],
  "metadados": {
    "tags": [
      "aluguel_social"
    ],
    "versao": "1.0.0",
    "categoria": "beneficio_eventual",
    "descricao": "Schema para Aluguel Social organizado em seções"
  }
}
```

## Natalidade

```json
{
  "secoes": [
    {
      "nome": "detalhes_solicitacao",
      "titulo": "Detalhes da solicitação",
      "descricao": "Informações específicas sobre o benefício solicitado",
      "ordem": 1,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": true,
            "readonly": true,
            "placeholder": "Valor fixo do benefício",
            "showValidationIcon": true
          },
          "nome": "valor",
          "tipo": "currency",
          "label": "Valor",
          "descricao": "Valor do benefício (não alterável)",
          "valorPadrao": "R$ 750,00",
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Número de parcelas",
            "showValidationIcon": true
          },
          "nome": "quantidade_parcelas",
          "tipo": "number",
          "label": "Quantidade de parcelas",
          "descricao": "Informe o número de parcelas",
          "validacoes": {
            "min": 1,
            "max": 3
          },
          "valorPadrao": 1,
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Quantidade de cestas (quando aplicável)",
            "showValidationIcon": true
          },
          "nome": "quantidade_cestas",
          "tipo": "number",
          "label": "Quantidade de cestas",
          "descricao": "Informe a quantidade de cestas básicas (quando aplicável)",
          "validacoes": {
            "min": 0,
            "max": 10
          },
          "obrigatorio": false
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Marque se há determinação judicial",
            "showValidationIcon": true
          },
          "nome": "determinacao_judicial",
          "tipo": "checkbox",
          "label": "Determinação judicial",
          "descricao": "Marque se existe determinação judicial para o benefício",
          "obrigatorio": false
        }
      ]
    },
    {
      "nome": "dados_contexto",
      "titulo": "Contexto do benefício",
      "descricao": "Informações sobre o contexto pré ou pós-natal",
      "ordem": 2,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Selecione o tipo de contexto do benefício de natalidade",
            "readonly": false,
            "placeholder": "Selecione o contexto",
            "showValidationIcon": true
          },
          "nome": "tipo_contexto",
          "tipo": "select",
          "label": "Tipo de contexto",
          "opcoes": [
            {
              "label": "Pré-natal",
              "value": "pre_natal"
            },
            {
              "label": "Pós-natal",
              "value": "pos_natal"
            }
          ],
          "descricao": "Selecione se é pré-natal ou pós-natal",
          "obrigatorio": false,
          "valorPadrao": "pre_natal"
        }
      ]
    },
    {
      "nome": "dados_gestacao",
      "titulo": "Dados da gestação",
      "descricao": "Informações específicas sobre a gestação (pré-natal)",
      "ordem": 3,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Indique se a gestante está fazendo acompanhamento médico regular",
            "readonly": false,
            "placeholder": "Marque se a gestante realiza acompanhamento pré-natal",
            "showValidationIcon": true
          },
          "nome": "realiza_pre_natal",
          "tipo": "checkbox",
          "label": "Realiza pré-natal",
          "descricao": "Marque se a gestante realiza acompanhamento pré-natal",
          "validacoes": {
            "obrigatorioSe": {
              "campo": "tipo_contexto",
              "valor": "pre_natal"
            }
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Indique se é atendida pelo Programa Saúde da Família ou Unidade Básica de Saúde",
            "readonly": false,
            "placeholder": "Marque se é atendida pelo Programa Saúde da Família ou Unidade Básica de Saúde",
            "showValidationIcon": true
          },
          "nome": "atendida_psf_ubs",
          "tipo": "checkbox",
          "label": "Atendida pelo PSF/UBS",
          "descricao": "Marque se é atendida pelo Programa Saúde da Família ou Unidade Básica de Saúde",
          "validacoes": {
            "obrigatorioSe": {
              "campo": "tipo_contexto",
              "valor": "pre_natal"
            }
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Indique se a gravidez foi classificada como de risco",
            "readonly": false,
            "placeholder": "Marque se a gravidez foi classificada como de risco",
            "showValidationIcon": true
          },
          "nome": "gravidez_risco",
          "tipo": "checkbox",
          "label": "Gravidez de risco",
          "descricao": "Marque se a gravidez foi classificada como de risco",
          "validacoes": {
            "obrigatorioSe": {
              "campo": "tipo_contexto",
              "valor": "pre_natal"
            }
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "mask": "00/00/0000",
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Data estimada pelo médico para o nascimento do bebê",
            "readonly": false,
            "placeholder": "Informe a data prevista para o nascimento",
            "showValidationIcon": true
          },
          "nome": "data_provavel_parto",
          "tipo": "date",
          "label": "Data provável do parto",
          "descricao": "Informe a data prevista para o nascimento",
          "validacoes": {
            "maxDate": "+12months",
            "minDate": "today",
            "obrigatorioSe": {
              "campo": "tipo_contexto",
              "valor": "pre_natal"
            }
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Indique se é uma gestação múltipla (gêmeos/trigêmeos)",
            "readonly": false,
            "placeholder": "Marque se é uma gestação múltipla",
            "showValidationIcon": true
          },
          "nome": "gemeos_trigemeos",
          "tipo": "checkbox",
          "label": "Gêmeos/Trigêmeos",
          "descricao": "Marque se é uma gestação múltipla",
          "validacoes": {
            "obrigatorioSe": {
              "campo": "tipo_contexto",
              "valor": "pre_natal"
            }
          },
          "obrigatorio": true
        }
      ]
    },
    {
      "nome": "dados_familiares",
      "titulo": "Dados familiares",
      "descricao": "Informações sobre a composição familiar",
      "ordem": 4,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Indique se a gestante já possui outros filhos",
            "readonly": false,
            "placeholder": "Marque se a gestante já possui outros filhos",
            "showValidationIcon": true
          },
          "nome": "ja_tem_filhos",
          "tipo": "checkbox",
          "label": "Já tem filhos",
          "descricao": "Marque se a gestante já possui outros filhos",
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Número de filhos que a gestante já possui",
            "readonly": false,
            "condicional": {
              "campo": "ja_tem_filhos",
              "valor": true
            },
            "placeholder": "Selecione a quantidade de filhos",
            "showValidationIcon": true
          },
          "nome": "quantidade_filhos",
          "tipo": "number",
          "label": "Quantidade de filhos",
          "descricao": "Informe a quantidade de filhos",
          "validacoes": {
            "max": 20,
            "min": 1,
            "integer": true,
            "obrigatorioSe": {
              "campo": "ja_tem_filhos",
              "valor": true
            }
          },
          "obrigatorio": false
        }
      ]
    },
    {
      "nome": "dados_contato",
      "titulo": "Dados de contato",
      "descricao": "Informações de contato da beneficiária",
      "ordem": 5,
      "campos": [
        {
          "ui": {
            "mask": "(00) 00000-0000",
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Telefone cadastrado no CPF da gestante",
            "readonly": false,
            "placeholder": "Ex: (11) 99999-9999",
            "showValidationIcon": true
          },
          "nome": "telefone_cadastrado_cpf",
          "tipo": "text",
          "label": "Telefone cadastrado no CPF",
          "descricao": "Ex: (11) 99999-9999",
          "validacoes": {
            "pattern": "^\\(?\\d{2}\\)?[\\s-]?\\d{4,5}[\\s-]?\\d{4}$",
            "maxLength": 15,
            "minLength": 10
          },
          "obrigatorio": false
        }
      ]
    },
    {
      "nome": "dados_pagamento",
      "titulo": "Dados de pagamento",
      "descricao": "Informações para recebimento do benefício",
      "ordem": 6,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Chave PIX para recebimento do benefício (deve ser igual ao CPF)",
            "readonly": false,
            "placeholder": "Informe a chave PIX para recebimento do benefício",
            "showValidationIcon": true
          },
          "nome": "chave_pix",
          "tipo": "text",
          "label": "Chave PIX",
          "descricao": "Informe a chave PIX para recebimento do benefício",
          "validacoes": {
            "pattern": "^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$|^\\d{11}$",
            "maxLength": 14,
            "minLength": 11
          },
          "obrigatorio": true
        }
      ]
    },
    {
      "nome": "dados_pos_natal",
      "titulo": "Dados pós-natal",
      "descricao": "Informações sobre o recém-nascido (pós-natal)",
      "ordem": 7,
      "campos": [
        {
          "ui": {
            "mask": "00/00/0000",
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Data de nascimento do recém-nascido",
            "readonly": false,
            "condicional": {
              "campo": "tipo_contexto",
              "valor": "pos_natal"
            },
            "placeholder": "Informe a data de nascimento",
            "showValidationIcon": true
          },
          "nome": "data_nascimento",
          "tipo": "date",
          "label": "Data de nascimento",
          "descricao": "Informe a data de nascimento do recém-nascido",
          "validacoes": {
            "maxDate": "today",
            "minDate": "-1year",
            "obrigatorioSe": {
              "campo": "tipo_contexto",
              "valor": "pos_natal"
            }
          },
          "obrigatorio": false
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Peso do recém-nascido em gramas",
            "readonly": false,
            "condicional": {
              "campo": "tipo_contexto",
              "valor": "pos_natal"
            },
            "placeholder": "Digite o peso em gramas",
            "showValidationIcon": true
          },
          "nome": "peso_nascimento",
          "tipo": "number",
          "label": "Peso do nascimento (gramas)",
          "descricao": "Peso do recém-nascido em gramas",
          "validacoes": {
            "max": 8000,
            "integer": true
          },
          "obrigatorio": false
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Nome completo do recém-nascido",
            "readonly": false,
            "condicional": {
              "campo": "tipo_contexto",
              "valor": "pos_natal"
            },
            "placeholder": "Digite o nome completo do recém-nascido",
            "showValidationIcon": true
          },
          "nome": "nome_recem_nascido",
          "tipo": "text",
          "label": "Nome do recém-nascido",
          "descricao": "Nome completo do recém-nascido",
          "validacoes": {
            "maxLength": 100,
            "minLength": 2,
            "obrigatorioSe": {
              "campo": "tipo_contexto",
              "valor": "pos_natal"
            }
          },
          "obrigatorio": false
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Número da certidão de nascimento do recém-nascido",
            "readonly": false,
            "condicional": {
              "campo": "tipo_contexto",
              "valor": "pos_natal"
            },
            "placeholder": "Digite o número da certidão de nascimento",
            "showValidationIcon": true
          },
          "nome": "numero_certidao_nascimento",
          "tipo": "text",
          "label": "Número da certidão de nascimento",
          "descricao": "Número da certidão de nascimento",
          "validacoes": {
            "maxLength": 50,
            "minLength": 10,
            "obrigatorioSe": {
              "campo": "tipo_contexto",
              "valor": "pos_natal"
            }
          },
          "obrigatorio": false
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Nome do cartório onde foi registrado o nascimento",
            "readonly": false,
            "condicional": {
              "campo": "tipo_contexto",
              "valor": "pos_natal"
            },
            "placeholder": "Digite o nome do cartório de registro",
            "showValidationIcon": true
          },
          "nome": "cartorio_registro",
          "tipo": "text",
          "label": "Cartório de registro",
          "descricao": "Cartório onde foi registrado o nascimento",
          "validacoes": {
            "maxLength": 200,
            "minLength": 5
          },
          "obrigatorio": false
        }
      ]
    },
    {
      "nome": "observacoes",
      "titulo": "Observações",
      "descricao": "Informações complementares",
      "ordem": 8,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "helpText": "Observações adicionais sobre o caso",
            "readonly": false,
            "placeholder": "Digite observações sobre o caso (máximo 1000 caracteres)",
            "showValidationIcon": true
          },
          "nome": "observacoes",
          "tipo": "textarea",
          "label": "Observações",
          "descricao": "Observações adicionais sobre o caso",
          "validacoes": {
            "maxLength": 1000
          },
          "obrigatorio": false
        }
      ]
    }
  ],
  "metadados": {
    "tags": [
      "beneficio_natalidade",
      "pre_natal",
      "pos_natal"
    ],
    "versao": "2.0.0",
    "categoria": "beneficio_eventual",
    "descricao": "Schema completo para Benefício Natalidade - incluindo campos pré-natal e pós-natal"
  }
}
```

## Benefício por Morte

```json
{
  "secoes": [
    {
      "nome": "detalhes_solicitacao",
      "titulo": "Detalhes da solicitação",
      "descricao": "Informações específicas sobre o benefício solicitado",
      "ordem": 1,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": true,
            "readonly": true,
            "placeholder": "Valor fixo do benefício",
            "showValidationIcon": true
          },
          "nome": "valor",
          "tipo": "currency",
          "label": "Valor",
          "descricao": "Valor do benefício (não alterável)",
          "valorPadrao": "R$ 1.500,00",
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Número de parcelas",
            "showValidationIcon": true
          },
          "nome": "quantidade_parcelas",
          "tipo": "number",
          "label": "Quantidade de parcelas",
          "descricao": "Informe o número de parcelas",
          "validacoes": {
            "min": 1,
            "max": 1
          },
          "valorPadrao": 1,
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Quantidade de cestas (quando aplicável)",
            "showValidationIcon": true
          },
          "nome": "quantidade_cestas",
          "tipo": "number",
          "label": "Quantidade de cestas",
          "descricao": "Informe a quantidade de cestas básicas (quando aplicável)",
          "validacoes": {
            "min": 0,
            "max": 10
          },
          "obrigatorio": false
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Marque se há determinação judicial",
            "showValidationIcon": true
          },
          "nome": "determinacao_judicial",
          "tipo": "checkbox",
          "label": "Determinação judicial",
          "descricao": "Marque se existe determinação judicial para o benefício",
          "obrigatorio": false
        }
      ]
    },
    {
      "nome": "dados_obito",
      "titulo": "Dados do óbito",
      "descricao": "Informações sobre o falecido e o óbito",
      "ordem": 2,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Informe o nome completo conforme certidão de óbito",
            "showValidationIcon": true
          },
          "nome": "nome_completo_falecido",
          "tipo": "text",
          "label": "Nome completo do falecido",
          "descricao": "Informe o nome completo conforme certidão de óbito",
          "validacoes": {
            "pattern": "^[A-Za-zÀ-ÿ\\s]+$",
            "maxLength": 150,
            "minLength": 2
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Ex: Hospital Municipal, Residência, etc.",
            "showValidationIcon": true
          },
          "nome": "local_obito",
          "tipo": "text",
          "label": "Local do óbito",
          "descricao": "Ex: Hospital Municipal, Residência, etc.",
          "validacoes": {
            "maxLength": 100,
            "minLength": 2
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "mask": "00/00/0000",
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Data conforme certidão de óbito",
            "showValidationIcon": true
          },
          "nome": "data_obito",
          "tipo": "date",
          "label": "Data do óbito",
          "descricao": "Data conforme certidão de óbito",
          "validacoes": {
            "maxDate": "today"
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "mask": "00/00/0000",
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Data da autorização do sepultamento",
            "showValidationIcon": true
          },
          "nome": "data_autorizacao",
          "tipo": "date",
          "label": "Data da autorização",
          "descricao": "Data da autorização do sepultamento",
          "validacoes": {
            "maxDate": "today"
          },
          "obrigatorio": false
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Número ou código da declaração de óbito",
            "showValidationIcon": true
          },
          "nome": "declaracao_obito",
          "tipo": "text",
          "label": "Declaração de óbito",
          "descricao": "Número ou código da declaração de óbito",
          "validacoes": {
            "pattern": "^[A-Za-z0-9\\-\\/\\s]+$",
            "maxLength": 50,
            "minLength": 5
          },
          "obrigatorio": false
        }
      ]
    },
    {
      "nome": "dados_requerente",
      "titulo": "Dados do requerente",
      "descricao": "Informações sobre quem está solicitando o benefício",
      "ordem": 3,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Selecione o grau de parentesco",
            "showValidationIcon": true
          },
          "nome": "grau_parentesco_requerente",
          "tipo": "select",
          "label": "Grau de parentesco do requerente",
          "opcoes": [
            {
              "label": "Cônjuge",
              "value": "conjuge",
              "disabled": false
            },
            {
              "label": "Filho(a)",
              "value": "filho",
              "disabled": false
            },
            {
              "label": "Pai",
              "value": "pai",
              "disabled": false
            },
            {
              "label": "Mãe",
              "value": "mae",
              "disabled": false
            },
            {
              "label": "Irmão/Irmã",
              "value": "irmao",
              "disabled": false
            },
            {
              "label": "Avô/Avó",
              "value": "avo",
              "disabled": false
            },
            {
              "label": "Neto(a)",
              "value": "neto",
              "disabled": false
            },
            {
              "label": "Outro",
              "value": "outro",
              "disabled": false
            }
          ],
          "descricao": "Selecione o grau de parentesco",
          "obrigatorio": true
        }
      ]
    },
    {
      "nome": "servicos_funerarios",
      "titulo": "Serviços funerários",
      "descricao": "Informações sobre os serviços funerários necessários",
      "ordem": 4,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Selecione o tipo de urna",
            "showValidationIcon": true
          },
          "nome": "tipo_urna_necessaria",
          "tipo": "select",
          "label": "Tipo de urna necessária",
          "opcoes": [
            {
              "label": "Padrão",
              "value": "padrao",
              "disabled": false
            },
            {
              "label": "Infantil",
              "value": "infantil",
              "disabled": false
            },
            {
              "label": "Especial",
              "value": "especial",
              "disabled": false
            },
            {
              "label": "Para obeso",
              "value": "obeso",
              "disabled": false
            }
          ],
          "descricao": "Selecione o tipo de urna",
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Selecione se há necessidade de translado",
            "showValidationIcon": true
          },
          "nome": "translado",
          "tipo": "select",
          "label": "Translado",
          "opcoes": [
            {
              "label": "SVO",
              "value": "svo",
              "disabled": false
            },
            {
              "label": "ITEP",
              "value": "itep",
              "disabled": false
            }
          ],
          "descricao": "Indica se há necessidade de translado do corpo",
          "obrigatorio": false
        }
      ]
    },
    {
      "nome": "endereco_velorio",
      "titulo": "Endereço do velório",
      "descricao": "Local onde será realizado o velório",
      "ordem": 5,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Logradouro do velório",
            "showValidationIcon": true
          },
          "nome": "endereco_velorio_logradouro",
          "tipo": "text",
          "label": "Logradouro do velório",
          "descricao": "Rua, avenida, etc. do local do velório",
          "validacoes": {
            "pattern": "^[A-Za-zÀ-ÿ0-9\\s\\.,\\-]+$",
            "maxLength": 200,
            "minLength": 5
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Número",
            "showValidationIcon": true
          },
          "nome": "endereco_velorio_numero",
          "tipo": "text",
          "label": "Número do velório",
          "descricao": "Número do endereço do velório",
          "validacoes": {
            "pattern": "^[0-9A-Za-z\\s\\-]+$",
            "maxLength": 10
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Complemento (opcional)",
            "showValidationIcon": true
          },
          "nome": "endereco_velorio_complemento",
          "tipo": "text",
          "label": "Complemento do velório",
          "descricao": "Apartamento, sala, etc. (opcional)",
          "validacoes": {
            "maxLength": 50
          },
          "obrigatorio": false
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Bairro do velório",
            "showValidationIcon": true
          },
          "nome": "endereco_velorio_bairro",
          "tipo": "text",
          "label": "Bairro do velório",
          "descricao": "Bairro onde está localizado o velório",
          "validacoes": {
            "pattern": "^[A-Za-zÀ-ÿ\\s\\.,\\-]+$",
            "maxLength": 100,
            "minLength": 2
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Cidade do velório",
            "showValidationIcon": true
          },
          "nome": "endereco_velorio_cidade",
          "tipo": "text",
          "label": "Cidade do velório",
          "descricao": "Cidade onde está localizado o velório",
          "validacoes": {
            "pattern": "^[A-Za-zÀ-ÿ\\s\\.,\\-]+$",
            "maxLength": 100,
            "minLength": 2
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "UF",
            "showValidationIcon": true
          },
          "nome": "endereco_velorio_estado",
          "tipo": "select",
          "label": "Estado do velório",
          "opcoes": [
            {"label": "Acre", "value": "AC", "disabled": false},
            {"label": "Alagoas", "value": "AL", "disabled": false},
            {"label": "Amapá", "value": "AP", "disabled": false},
            {"label": "Amazonas", "value": "AM", "disabled": false},
            {"label": "Bahia", "value": "BA", "disabled": false},
            {"label": "Ceará", "value": "CE", "disabled": false},
            {"label": "Distrito Federal", "value": "DF", "disabled": false},
            {"label": "Espírito Santo", "value": "ES", "disabled": false},
            {"label": "Goiás", "value": "GO", "disabled": false},
            {"label": "Maranhão", "value": "MA", "disabled": false},
            {"label": "Mato Grosso", "value": "MT", "disabled": false},
            {"label": "Mato Grosso do Sul", "value": "MS", "disabled": false},
            {"label": "Minas Gerais", "value": "MG", "disabled": false},
            {"label": "Pará", "value": "PA", "disabled": false},
            {"label": "Paraíba", "value": "PB", "disabled": false},
            {"label": "Paraná", "value": "PR", "disabled": false},
            {"label": "Pernambuco", "value": "PE", "disabled": false},
            {"label": "Piauí", "value": "PI", "disabled": false},
            {"label": "Rio de Janeiro", "value": "RJ", "disabled": false},
            {"label": "Rio Grande do Norte", "value": "RN", "disabled": false},
            {"label": "Rio Grande do Sul", "value": "RS", "disabled": false},
            {"label": "Rondônia", "value": "RO", "disabled": false},
            {"label": "Roraima", "value": "RR", "disabled": false},
            {"label": "Santa Catarina", "value": "SC", "disabled": false},
            {"label": "São Paulo", "value": "SP", "disabled": false},
            {"label": "Sergipe", "value": "SE", "disabled": false},
            {"label": "Tocantins", "value": "TO", "disabled": false}
          ],
          "descricao": "Estado onde está localizado o velório",
          "obrigatorio": true
        },
        {
          "ui": {
            "mask": "00000-000",
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "CEP do velório",
            "showValidationIcon": true
          },
          "nome": "endereco_velorio_cep",
          "tipo": "text",
          "label": "CEP do velório",
          "descricao": "Código postal do endereço do velório",
          "validacoes": {
            "pattern": "^[0-9]{5}-?[0-9]{3}$",
            "maxLength": 9,
            "minLength": 8
          },
          "obrigatorio": true
        }
      ]
    },
    {
      "nome": "endereco_cemiterio",
      "titulo": "Endereço do cemitério",
      "descricao": "Local onde será realizado o sepultamento",
      "ordem": 6,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Logradouro do cemitério",
            "showValidationIcon": true
          },
          "nome": "endereco_cemiterio_logradouro",
          "tipo": "text",
          "label": "Logradouro do cemitério",
          "descricao": "Rua, avenida, etc. do cemitério",
          "validacoes": {
            "pattern": "^[A-Za-zÀ-ÿ0-9\\s\\.,\\-]+$",
            "maxLength": 200,
            "minLength": 5
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Número",
            "showValidationIcon": true
          },
          "nome": "endereco_cemiterio_numero",
          "tipo": "text",
          "label": "Número do cemitério",
          "descricao": "Número do endereço do cemitério",
          "validacoes": {
            "pattern": "^[0-9A-Za-z\\s\\-]+$",
            "maxLength": 10
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Complemento (opcional)",
            "showValidationIcon": true
          },
          "nome": "endereco_cemiterio_complemento",
          "tipo": "text",
          "label": "Complemento do cemitério",
          "descricao": "Quadra, setor, etc. (opcional)",
          "validacoes": {
            "maxLength": 50
          },
          "obrigatorio": false
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Bairro do cemitério",
            "showValidationIcon": true
          },
          "nome": "endereco_cemiterio_bairro",
          "tipo": "text",
          "label": "Bairro do cemitério",
          "descricao": "Bairro onde está localizado o cemitério",
          "validacoes": {
            "pattern": "^[A-Za-zÀ-ÿ\\s\\.,\\-]+$",
            "maxLength": 100,
            "minLength": 2
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Cidade do cemitério",
            "showValidationIcon": true
          },
          "nome": "endereco_cemiterio_cidade",
          "tipo": "text",
          "label": "Cidade do cemitério",
          "descricao": "Cidade onde está localizado o cemitério",
          "validacoes": {
            "pattern": "^[A-Za-zÀ-ÿ\\s\\.,\\-]+$",
            "maxLength": 100,
            "minLength": 2
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "UF",
            "showValidationIcon": true
          },
          "nome": "endereco_cemiterio_estado",
          "tipo": "select",
          "label": "Estado do cemitério",
          "opcoes": [
            {"label": "Acre", "value": "AC", "disabled": false},
            {"label": "Alagoas", "value": "AL", "disabled": false},
            {"label": "Amapá", "value": "AP", "disabled": false},
            {"label": "Amazonas", "value": "AM", "disabled": false},
            {"label": "Bahia", "value": "BA", "disabled": false},
            {"label": "Ceará", "value": "CE", "disabled": false},
            {"label": "Distrito Federal", "value": "DF", "disabled": false},
            {"label": "Espírito Santo", "value": "ES", "disabled": false},
            {"label": "Goiás", "value": "GO", "disabled": false},
            {"label": "Maranhão", "value": "MA", "disabled": false},
            {"label": "Mato Grosso", "value": "MT", "disabled": false},
            {"label": "Mato Grosso do Sul", "value": "MS", "disabled": false},
            {"label": "Minas Gerais", "value": "MG", "disabled": false},
            {"label": "Pará", "value": "PA", "disabled": false},
            {"label": "Paraíba", "value": "PB", "disabled": false},
            {"label": "Paraná", "value": "PR", "disabled": false},
            {"label": "Pernambuco", "value": "PE", "disabled": false},
            {"label": "Piauí", "value": "PI", "disabled": false},
            {"label": "Rio de Janeiro", "value": "RJ", "disabled": false},
            {"label": "Rio Grande do Norte", "value": "RN", "disabled": false},
            {"label": "Rio Grande do Sul", "value": "RS", "disabled": false},
            {"label": "Rondônia", "value": "RO", "disabled": false},
            {"label": "Roraima", "value": "RR", "disabled": false},
            {"label": "Santa Catarina", "value": "SC", "disabled": false},
            {"label": "São Paulo", "value": "SP", "disabled": false},
            {"label": "Sergipe", "value": "SE", "disabled": false},
            {"label": "Tocantins", "value": "TO", "disabled": false}
          ],
          "descricao": "Estado onde está localizado o cemitério",
          "obrigatorio": true
        },
        {
          "ui": {
            "mask": "00000-000",
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "CEP do cemitério",
            "showValidationIcon": true
          },
          "nome": "endereco_cemiterio_cep",
          "tipo": "text",
          "label": "CEP do cemitério",
          "descricao": "Código postal do endereço do cemitério",
          "validacoes": {
            "pattern": "^[0-9]{5}-?[0-9]{3}$",
            "maxLength": 9,
            "minLength": 8
          },
          "obrigatorio": true
        }
      ]
    },
    {
      "nome": "observacoes",
      "titulo": "Observações",
      "descricao": "Informações complementares",
      "ordem": 7,
      "campos": [
        {
          "ui": {
            "rows": 2,
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Informações adicionais relevantes",
            "showValidationIcon": true
          },
          "nome": "observacoes",
          "tipo": "textarea",
          "label": "Observações",
          "descricao": "Informações adicionais relevantes",
          "validacoes": {
            "maxLength": 1000
          },
          "obrigatorio": false
        }
      ]
    }
  ],
  "metadados": {
    "tags": [
      "beneficio_funeral"
    ],
    "versao": "2.0.0",
    "categoria": "beneficio_eventual",
    "descricao": "Schema para Benefício por Morte - Versão 2.0 com campos de translado e endereços"
  }
}
```


## Cesta Básica

```json
{
  "secoes": [
    {
      "nome": "detalhes_solicitacao",
      "titulo": "Detalhes da solicitação",
      "descricao": "Informações específicas sobre o benefício solicitado",
      "ordem": 1,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": true,
            "readonly": true,
            "placeholder": "Valor unitário da cesta",
            "showValidationIcon": true
          },
          "nome": "valor",
          "tipo": "currency",
          "label": "Valor",
          "descricao": "Valor unitário da cesta básica (não alterável)",
          "valorPadrao": "R$ 80,00",
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Selecione a quantidade de parcelas",
            "showValidationIcon": true
          },
          "nome": "quantidade_parcelas",
          "tipo": "select",
          "label": "Quantidade parcelas",
          "opcoes": [
            {
              "label": "1 parcela",
              "value": 1,
              "disabled": false
            },
            {
              "label": "2 parcelas",
              "value": 2,
              "disabled": false
            },
            {
              "label": "3 parcelas",
              "value": 3,
              "disabled": false
            }
          ],
          "descricao": "Selecione a quantidade de parcelas",
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Informe a quantidade de cestas necessárias (1-12)",
            "showValidationIcon": true
          },
          "nome": "quantidade_cestas",
          "tipo": "number",
          "label": "Quantidade de cestas",
          "descricao": "Informe a quantidade de cestas necessárias (1-12)",
          "validacoes": {
            "max": 12,
            "min": 1,
            "integer": true
          },
          "obrigatorio": true
        },
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 1,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Marque se há determinação judicial",
            "showValidationIcon": true
          },
          "nome": "determinacao_judicial",
          "tipo": "checkbox",
          "label": "Determinação judicial",
          "descricao": "Marque se existe determinação judicial para o benefício",
          "obrigatorio": false
        }
      ]
    },
    {
      "nome": "origem_atendimento",
      "titulo": "Origem do atendimento",
      "descricao": "Informações sobre como chegou ao serviço",
      "ordem": 2,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Selecione a origem do atendimento",
            "showValidationIcon": true
          },
          "nome": "origem_atendimento",
          "tipo": "select",
          "label": "Origem do atendimento",
          "opcoes": [
            {
              "label": "CRAS",
              "value": "cras",
              "disabled": false
            },
            {
              "label": "CREAS",
              "value": "creas",
              "disabled": false
            },
            {
              "label": "Busca ativa",
              "value": "busca_ativa",
              "disabled": false
            },
            {
              "label": "Encaminhamento externo",
              "value": "encaminhamento_externo",
              "disabled": false
            },
            {
              "label": "Unidade básica",
              "value": "unidade_basica",
              "disabled": false
            },
            {
              "label": "Demanda espontânea",
              "value": "demanda_espontanea",
              "disabled": false
            }
          ],
          "descricao": "Selecione a origem do atendimento",
          "obrigatorio": true
        }
      ]
    },
    {
      "nome": "composicao_familiar",
      "titulo": "Composição familiar",
      "descricao": "Informações sobre a família beneficiária",
      "ordem": 3,
      "campos": [
        {
          "ui": {
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Informe o total de pessoas que compõem a família",
            "showValidationIcon": true
          },
          "nome": "numero_pessoas_familia",
          "tipo": "number",
          "label": "Número de pessoas na família",
          "descricao": "Informe o total de pessoas que compõem a família",
          "validacoes": {
            "max": 30,
            "min": 1,
            "integer": true
          },
          "obrigatorio": false
        }
      ]
    },
    {
      "nome": "justificativas",
      "titulo": "Justificativas",
      "descricao": "Justificativa da solicitação",
      "ordem": 4,
      "campos": [
        {
          "ui": {
            "rows": 3,
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Justifique a quantidade solicitada, especialmente se for acima do recomendado",
            "showValidationIcon": true
          },
          "nome": "justificativa_quantidade",
          "tipo": "textarea",
          "label": "Justificativa da quantidade",
          "descricao": "Justifique a quantidade solicitada, especialmente se for acima do recomendado",
          "validacoes": {
            "maxLength": 500,
            "minLength": 10
          },
          "obrigatorio": true
        }
      ]
    },
    {
      "nome": "observacoes",
      "titulo": "Observações",
      "descricao": "Informações complementares",
      "ordem": 5,
      "campos": [
        {
          "ui": {
            "rows": 2,
            "size": "medium",
            "color": "primary",
            "hidden": false,
            "colSpan": 2,
            "variant": "outlined",
            "disabled": false,
            "readonly": false,
            "placeholder": "Informações adicionais relevantes para a análise",
            "showValidationIcon": true
          },
          "nome": "observacoes",
          "tipo": "textarea",
          "label": "Observações",
          "descricao": "Informações adicionais relevantes para a análise",
          "validacoes": {
            "maxLength": 500
          },
          "obrigatorio": false
        }
      ]
    }
  ],
  "metadados": {
    "tags": [
      "cesta_basica"
    ],
    "versao": "1.0.0",
    "categoria": "beneficio_eventual",
    "descricao": "Schema para Cesta Básica organizado em seções"
  }
}
```