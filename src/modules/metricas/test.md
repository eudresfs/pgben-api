# USUARIO COM CONTEXTO GLOBAL

### Gestão Operacional
endpoint: /dashboard/gestao-operacional/filtros-avancados

Resultado:
```json
{
    "success": true,
    "data": {
        "metricas_gerais": {
            "novos_beneficiarios": 16,
            "solicitacoes_iniciadas": 475,
            "concessoes": 4,
            "concessoes_judicializadas": 8
        },
        "solicitacoes_tramitacao": {
            "em_analise": 9,
            "pendentes": 3,
            "aprovadas": 19,
            "indeferidas": 3
        },
        "performance": {
            "tempo_medio_solicitacao": 5.2,
            "tempo_medio_analise": 3.5,
            "solicitacoes_por_dia": 45,
            "concessoes_por_dia": 38
        },
        "taxa_concessao": {
            "percentual_aprovacao": 86.4,
            "percentual_indeferimento": 13.6
        },
        "graficos": {
            "evolucao_concessoes": [
                {
                    "mes": "Jan/2024",
                    "aluguel_social": 25,
                    "cesta_basica": 18,
                    "beneficio_funeral": 3,
                    "beneficio_natalidade": 1
                },
                {
                    "mes": "Fev/2024",
                    "aluguel_social": 28,
                    "cesta_basica": 20,
                    "beneficio_funeral": 4,
                    "beneficio_natalidade": 1
                },
                {
                    "mes": "Mar/2024",
                    "aluguel_social": 30,
                    "cesta_basica": 22,
                    "beneficio_funeral": 3,
                    "beneficio_natalidade": 2
                },
                {
                    "mes": "Abr/2024",
                    "aluguel_social": 32,
                    "cesta_basica": 24,
                    "beneficio_funeral": 4,
                    "beneficio_natalidade": 1
                },
                {
                    "mes": "Mai/2024",
                    "aluguel_social": 35,
                    "cesta_basica": 26,
                    "beneficio_funeral": 3,
                    "beneficio_natalidade": 2
                },
                {
                    "mes": "Jun/2024",
                    "aluguel_social": 38,
                    "cesta_basica": 28,
                    "beneficio_funeral": 4,
                    "beneficio_natalidade": 1
                }
            ],
            "solicitacoes_dia_semana": [
                {
                    "dia": "Segunda",
                    "quantidade": 45
                },
                {
                    "dia": "Terça",
                    "quantidade": 52
                },
                {
                    "dia": "Quarta",
                    "quantidade": 48
                },
                {
                    "dia": "Quinta",
                    "quantidade": 55
                },
                {
                    "dia": "Sexta",
                    "quantidade": 50
                },
                {
                    "dia": "Sábado",
                    "quantidade": 25
                },
                {
                    "dia": "Domingo",
                    "quantidade": 12
                }
            ],
            "concessoes_tipo_beneficio": [
                {
                    "tipo": "Aluguel Social",
                    "quantidade": 449,
                    "percentual": 96.1
                },
                {
                    "tipo": "Benefício Natalidade",
                    "quantidade": 4,
                    "percentual": 0.9
                },
                {
                    "tipo": "Cesta Básica",
                    "quantidade": 7,
                    "percentual": 1.5
                },
                {
                    "tipo": "Benefício por Morte",
                    "quantidade": 7,
                    "percentual": 1.5
                }
            ],
            "solicitacoes_unidade": [
                {
                    "unidade": "Secretaria",
                    "quantidade": 438,
                    "percentual": 93.8
                },
                {
                    "unidade": "DELETAR",
                    "quantidade": 13,
                    "percentual": 2.8
                },
                {
                    "unidade": "DELETAR",
                    "quantidade": 6,
                    "percentual": 1.3
                },
                {
                    "unidade": "CRAS Guarapes",
                    "quantidade": 5,
                    "percentual": 1.1
                },
                {
                    "unidade": "DELETAR",
                    "quantidade": 2,
                    "percentual": 0.4
                },
                {
                    "unidade": "CRAS Passo da Pátria",
                    "quantidade": 1,
                    "percentual": 0.2
                },
                {
                    "unidade": "DELETAR",
                    "quantidade": 1,
                    "percentual": 0.2
                },
                {
                    "unidade": "DELETAR",
                    "quantidade": 1,
                    "percentual": 0.2
                }
            ]
        }
    },
    "message": "Dados de gestão operacional carregados com sucesso",
    "timestamp": "2025-08-30T13:40:06.446Z"
}
```

### Imapcto Social
endpoint: /dashboard/impacto-social/filtros-avancados

Resultado:
```json
{
    "success": true,
    "data": {
        "metricas": {
            "familias_beneficiadas": 467,
            "pessoas_impactadas": 1401,
            "bairros_impactados": 9,
            "investimento_total": 6400
        },
        "indicadores": {
            "valor_medio_por_familia": 13.7,
            "taxa_cobertura_social": 2.8
        },
        "graficos": {
            "evolucao_mensal": [
                {
                    "mes": "Aug/2025",
                    "familias": 454,
                    "pessoas": 1362,
                    "investimento": 0
                }
            ],
            "distribuicao_beneficios": [
                {
                    "tipo": "Aluguel Social",
                    "quantidade": 449,
                    "percentual": 96.1
                },
                {
                    "tipo": "Benefício Natalidade",
                    "quantidade": 4,
                    "percentual": 0.9
                },
                {
                    "tipo": "Cesta Básica",
                    "quantidade": 7,
                    "percentual": 1.5
                },
                {
                    "tipo": "Benefício por Morte",
                    "quantidade": 7,
                    "percentual": 1.5
                }
            ],
            "recursos_faixa_etaria": [
                {
                    "faixa_etaria": "Crianças (0-12)",
                    "recursos": 2300,
                    "percentual": 35.9
                },
                {
                    "faixa_etaria": "Adolescentes (13-17)",
                    "recursos": 0,
                    "percentual": 0
                },
                {
                    "faixa_etaria": "Jovens (18-29)",
                    "recursos": 1200,
                    "percentual": 18.8
                },
                {
                    "faixa_etaria": "Adultos (30-59)",
                    "recursos": 2300,
                    "percentual": 35.9
                },
                {
                    "faixa_etaria": "Idosos (60+)",
                    "recursos": 600,
                    "percentual": 9.4
                }
            ],
            "recursos_tipo_beneficio": [
                {
                    "tipo_beneficio": "Benefício Natalidade",
                    "recursos": 1000,
                    "percentual": 15.6
                },
                {
                    "tipo_beneficio": "Aluguel Social",
                    "recursos": 5400,
                    "percentual": 84.4
                }
            ],
            "recursos_impacto_tipo": [
                {
                    "tipo_beneficio": "Aluguel Social",
                    "recursos": 6000,
                    "familias": 6,
                    "pessoas": 4
                },
                {
                    "tipo_beneficio": "Benefício Natalidade",
                    "recursos": 1000,
                    "familias": 2,
                    "pessoas": 0
                }
            ],
            "recursos_bairros": [
                {
                    "bairro": "Ponta Negra",
                    "recursos": 1200,
                    "percentual": 29.3
                },
                {
                    "bairro": "Cajupiranga",
                    "recursos": 600,
                    "percentual": 14.6
                },
                {
                    "bairro": "Cidade da Esperança",
                    "recursos": 600,
                    "percentual": 14.6
                },
                {
                    "bairro": "Lagoa Nova",
                    "recursos": 600,
                    "percentual": 14.6
                },
                {
                    "bairro": "Planalto",
                    "recursos": 600,
                    "percentual": 14.6
                },
                {
                    "bairro": "Nossa Senhora da Apresentação",
                    "recursos": 500,
                    "percentual": 12.2
                }
            ]
        }
    },
    "message": "Dados de impacto social carregados com sucesso",
    "timestamp": "2025-08-30T13:43:10.236Z"
}
```
---

# USUARIO COM CONTEXTO UNIDADE

### Gestão Operacional
endpoint: /dashboard/gestao-operacional/filtros-avancados

Resultado: 
```json
{
    "success": true,
    "data": {
        "metricas_gerais": {
            "novos_beneficiarios": 16,
            "solicitacoes_iniciadas": 475,
            "concessoes": 4,
            "concessoes_judicializadas": 8
        },
        "solicitacoes_tramitacao": {
            "em_analise": 9,
            "pendentes": 3,
            "aprovadas": 19,
            "indeferidas": 3
        },
        "performance": {
            "tempo_medio_solicitacao": 5.2,
            "tempo_medio_analise": 3.5,
            "solicitacoes_por_dia": 45,
            "concessoes_por_dia": 38
        },
        "taxa_concessao": {
            "percentual_aprovacao": 86.4,
            "percentual_indeferimento": 13.6
        },
        "graficos": {
            "evolucao_concessoes": [
                {
                    "mes": "Jan/2024",
                    "aluguel_social": 25,
                    "cesta_basica": 18,
                    "beneficio_funeral": 3,
                    "beneficio_natalidade": 1
                },
                {
                    "mes": "Fev/2024",
                    "aluguel_social": 28,
                    "cesta_basica": 20,
                    "beneficio_funeral": 4,
                    "beneficio_natalidade": 1
                },
                {
                    "mes": "Mar/2024",
                    "aluguel_social": 30,
                    "cesta_basica": 22,
                    "beneficio_funeral": 3,
                    "beneficio_natalidade": 2
                },
                {
                    "mes": "Abr/2024",
                    "aluguel_social": 32,
                    "cesta_basica": 24,
                    "beneficio_funeral": 4,
                    "beneficio_natalidade": 1
                },
                {
                    "mes": "Mai/2024",
                    "aluguel_social": 35,
                    "cesta_basica": 26,
                    "beneficio_funeral": 3,
                    "beneficio_natalidade": 2
                },
                {
                    "mes": "Jun/2024",
                    "aluguel_social": 38,
                    "cesta_basica": 28,
                    "beneficio_funeral": 4,
                    "beneficio_natalidade": 1
                }
            ],
            "solicitacoes_dia_semana": [
                {
                    "dia": "Segunda",
                    "quantidade": 45
                },
                {
                    "dia": "Terça",
                    "quantidade": 52
                },
                {
                    "dia": "Quarta",
                    "quantidade": 48
                },
                {
                    "dia": "Quinta",
                    "quantidade": 55
                },
                {
                    "dia": "Sexta",
                    "quantidade": 50
                },
                {
                    "dia": "Sábado",
                    "quantidade": 25
                },
                {
                    "dia": "Domingo",
                    "quantidade": 12
                }
            ],
            "concessoes_tipo_beneficio": [
                {
                    "tipo": "Aluguel Social",
                    "quantidade": 449,
                    "percentual": 96.1
                },
                {
                    "tipo": "Benefício Natalidade",
                    "quantidade": 4,
                    "percentual": 0.9
                },
                {
                    "tipo": "Cesta Básica",
                    "quantidade": 7,
                    "percentual": 1.5
                },
                {
                    "tipo": "Benefício por Morte",
                    "quantidade": 7,
                    "percentual": 1.5
                }
            ],
            "solicitacoes_unidade": [
                {
                    "unidade": "Secretaria",
                    "quantidade": 438,
                    "percentual": 93.8
                },
                {
                    "unidade": "DELETAR",
                    "quantidade": 13,
                    "percentual": 2.8
                },
                {
                    "unidade": "DELETAR",
                    "quantidade": 6,
                    "percentual": 1.3
                },
                {
                    "unidade": "CRAS Guarapes",
                    "quantidade": 5,
                    "percentual": 1.1
                },
                {
                    "unidade": "DELETAR",
                    "quantidade": 2,
                    "percentual": 0.4
                },
                {
                    "unidade": "CRAS Passo da Pátria",
                    "quantidade": 1,
                    "percentual": 0.2
                },
                {
                    "unidade": "DELETAR",
                    "quantidade": 1,
                    "percentual": 0.2
                },
                {
                    "unidade": "DELETAR",
                    "quantidade": 1,
                    "percentual": 0.2
                }
            ]
        }
    },
    "message": "Dados de gestão operacional carregados com sucesso",
    "timestamp": "2025-08-30T13:43:55.914Z"
}
```

### Imapcto Social
endpoint: /dashboard/impacto-social/filtros-avancados

Resultado: 
```json
{
    "success": true,
    "data": {
        "metricas": {
            "familias_beneficiadas": 467,
            "pessoas_impactadas": 1401,
            "bairros_impactados": 9,
            "investimento_total": 6400
        },
        "indicadores": {
            "valor_medio_por_familia": 13.7,
            "taxa_cobertura_social": 2.8
        },
        "graficos": {
            "evolucao_mensal": [
                {
                    "mes": "Aug/2025",
                    "familias": 454,
                    "pessoas": 1362,
                    "investimento": 0
                }
            ],
            "distribuicao_beneficios": [
                {
                    "tipo": "Aluguel Social",
                    "quantidade": 449,
                    "percentual": 96.1
                },
                {
                    "tipo": "Benefício Natalidade",
                    "quantidade": 4,
                    "percentual": 0.9
                },
                {
                    "tipo": "Cesta Básica",
                    "quantidade": 7,
                    "percentual": 1.5
                },
                {
                    "tipo": "Benefício por Morte",
                    "quantidade": 7,
                    "percentual": 1.5
                }
            ],
            "recursos_faixa_etaria": [
                {
                    "faixa_etaria": "Crianças (0-12)",
                    "recursos": 2300,
                    "percentual": 35.9
                },
                {
                    "faixa_etaria": "Adolescentes (13-17)",
                    "recursos": 0,
                    "percentual": 0
                },
                {
                    "faixa_etaria": "Jovens (18-29)",
                    "recursos": 1200,
                    "percentual": 18.8
                },
                {
                    "faixa_etaria": "Adultos (30-59)",
                    "recursos": 2300,
                    "percentual": 35.9
                },
                {
                    "faixa_etaria": "Idosos (60+)",
                    "recursos": 600,
                    "percentual": 9.4
                }
            ],
            "recursos_tipo_beneficio": [
                {
                    "tipo_beneficio": "Benefício Natalidade",
                    "recursos": 1000,
                    "percentual": 15.6
                },
                {
                    "tipo_beneficio": "Aluguel Social",
                    "recursos": 5400,
                    "percentual": 84.4
                }
            ],
            "recursos_impacto_tipo": [
                {
                    "tipo_beneficio": "Aluguel Social",
                    "recursos": 6000,
                    "familias": 6,
                    "pessoas": 4
                },
                {
                    "tipo_beneficio": "Benefício Natalidade",
                    "recursos": 1000,
                    "familias": 2,
                    "pessoas": 0
                }
            ],
            "recursos_bairros": [
                {
                    "bairro": "Ponta Negra",
                    "recursos": 1200,
                    "percentual": 29.3
                },
                {
                    "bairro": "Cajupiranga",
                    "recursos": 600,
                    "percentual": 14.6
                },
                {
                    "bairro": "Cidade da Esperança",
                    "recursos": 600,
                    "percentual": 14.6
                },
                {
                    "bairro": "Lagoa Nova",
                    "recursos": 600,
                    "percentual": 14.6
                },
                {
                    "bairro": "Planalto",
                    "recursos": 600,
                    "percentual": 14.6
                },
                {
                    "bairro": "Nossa Senhora da Apresentação",
                    "recursos": 500,
                    "percentual": 12.2
                }
            ]
        }
    },
    "message": "Dados de impacto social carregados com sucesso",
    "timestamp": "2025-08-30T13:43:33.996Z"
}
```