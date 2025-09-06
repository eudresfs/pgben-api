# Feature Benefício Ataúde - Módulo de Solicitações

## 1. Visão Geral

A feature Benefício Ataúde é um componente do módulo de solicitações da SEMTAS/Natal, responsável por gerenciar pedidos de auxílio funeral através do Departamento de Proteção Social Básica (DPSB).

### Objetivo
Automatizar a geração de autorizações para serviços funerários, garantindo agilidade no atendimento e controle financeiro adequado dentro do módulo de solicitações existente.

## 2. Estrutura de Dados

### 2.1 Protocolo e Controle
```javascript
var protocolo = 'ATA-2025-8A4E1104' // Formato: ATA-YYYY-XXXXXXXX
var objeto = 'FUNERAL [TIPO]'        // Ex: FUNERAL PADRÃO
var destino = 'FUNERÁRIA PARCEIRA'   // Nome da funerária credenciada
```

### 2.2 Dados do Beneficiário (Falecido)
```javascript
var beneficiario = {
    nome: 'Nome completo',
    DO: '1235168',                    // Número do atestado de óbito
    endereco: {
        logradouro: 'Endereço completo',
        bairro: 'Nome do bairro'
    }
}
```

### 2.3 Dados do Requerente
```javascript
var requerente = {
    nome: 'Nome completo',
    rg_cpf: '0.000.000 / 000.000.000-00',
    telefone: '(84) 90000-0000',
    endereco: {
        logradouro: 'Endereço completo',
        bairro: 'Nome do bairro'
    },
    grau_parentesco: 'Relação com o falecido'
}
```

### 2.4 Tratamento de Dados Não Disponíveis

**IMPORTANTE:** Quando dados não estiverem disponíveis no sistema, os campos devem ser preenchidos com `_______________` para permitir preenchimento manual posterior.

**Exemplos de aplicação:**
```javascript
// Se data de autorização não estiver definida
var data_autorizacao = data_autorizacao || "_______________"

// Se matrícula do técnico não estiver disponível
var matricula = matricula || "_______________"

// Se telefone do requerente não foi informado
telefone: telefone || "_______________"
```

## 3. Tipos de Urnas e Especificações

### 3.1 Tabela de Valores (2025)

| Tipo     | Valor      | Capacidade | Dimensões Externas        |
|----------|------------|------------|---------------------------|
| Padrão   | R$ 2.390,00| 100 kg     | 2,00m x 61cm x 41cm      |
| Especial | R$ 2.490,00| 100 kg     | 2,00m x 61cm x 41cm      |
| Obeso    | R$ 2.690,00| 150 kg     | 2,10m x 78cm x 41cm      |
| Infantil | R$ 1.666,66| 50 kg      | 1,50m (dimensões reduzidas)|

### 3.2 Especificações Detalhadas

#### URNA PADRÃO (R$ 2.390,00)
**Composição:** Urna, edredom, higienização simples, suporte, castiçal e translado

**Especificações Técnicas:**
- Material: Pinus com tampa em Duratex e 2 sobre tampos em MDF
- Visor: ¼ da tampa
- Alças: Parreiras articuladas douradas (3 por lateral)
- Acabamento externo: Cor Imbuia com verniz brilhante
- Acabamento interno: Forrada em material biodegradável branco, babado 8cm, travesseiro solto
- Fechamento: 3 chavetas douradas no sobre tampo
- **Capacidade:** Até 100 kg
- **Medidas internas:** 1,96m x 56cm x 35cm
- **Medidas externas:** 2,00m x 61cm x 41cm

#### URNA ESPECIAL (R$ 2.490,00)
**Composição:** Urna, edredom, higienização simples, suporte, castiçal e translado

**Especificações Técnicas:**
- **Modelo:** Sextavado
- Material: Madeira de Pinus com fundo misto (madeira + chapadur)
- Tampa: Pinus com bordas laterais, encaixes e guias
- Tampo: Chapadur decorado artisticamente em silk screen dourado (sem motivos religiosos)
- Visor: ¼ da tampa
- Alças: Parreiras articuladas douradas (3 por lateral)
- Acabamento externo: Cor Castanho escuro com verniz alto brilho
- Acabamento interno: Forrada em material biodegradável branco, babado 8cm, travesseiro solto
- Fechamento: 4 chavetas na tampa + 3 chavetas douradas no sobre tampo
- **Capacidade:** Até 100 kg
- **Medidas internas:** 1,96m x 56cm x 35cm
- **Medidas externas:** 2,00m x 61cm x 41cm

#### URNA OBESO (R$ 2.690,00)
**Composição:** Urna, edredom, higienização simples, suporte, castiçal e translado

**Especificações Técnicas:**
- Material: Pinus com tampa em Duratex e 2 sobre tampos em MDF
- Visor: ¼ da tampa
- Alças: Parreiras articuladas douradas (3 por lateral)
- Acabamento externo: Cor Imbuia com verniz brilhante
- Acabamento interno: Forrada em material biodegradável branco, babado 8cm, travesseiro solto
- Fechamento: 3 chavetas douradas no sobre tampo
- **Capacidade:** Até 150 kg
- **Medidas internas:** 2,05m x 76cm x 35cm
- **Medidas externas:** 2,10m x 78cm x 41cm

#### URNA INFANTIL (R$ 1.666,66)
**Composição:** Urna, edredom, suporte, castiçal e translado

**Especificações Técnicas:**
- Material: Fundo em compensado, tampa em eucatex
- Forro interior completo na cor Imbuia
- **Capacidade:** Até 50 kg
- **Medidas:** 1,50m (dimensões proporcionais reduzidas)

### 3.3 Serviços de Translado Inclusos
**Todos os tipos incluem:**
1. Translado do local do óbito para SVO e/ou ITEP
2. Translado do SVO e/ou ITEP para local do velório
3. Translado do local do velório para cemitérios de Natal

## 4. Geração do Documento de Autorização

### 4.1 Estrutura do Documento
A feature gera automaticamente uma autorização oficial usando a biblioteca PDFMake com a seguinte estrutura:

**Cabeçalho:**
```javascript
{ image: "logo", width: 300, alignment: "center", margin: [0, 0, 0, 20] },
{ text: "DEPARTAMENTO DE PROTEÇÃO SOCIAL BÁSICA - DPSB", style:"title" },
{ text: "SETOR DE GESTÃO DE BENEFÍCIOS", style:"title", margin:[0,0,0,20] },
{ text: `AUTORIZAÇÃO Nº ${protocolo}`, style:"title", margin:[0,0,0,30] }
```

**Datas:**
```javascript
{ text: `DATA ÓBITO: ${new Date().toLocaleDateString('pt-BR')}`, alignment:"right" },
{ text: `DATA AUTORIZAÇÃO: ${data_autorizacao || "_______________"}`, alignment:"right" }
```

**Dados da Solicitação:**
```javascript
{
    text: [
        {text: 'OBJETO: ', bold: true}, `${objeto}\n`,
        {text: 'DESTINO: ', bold: true}, `${destino}\n`,
        {text: 'ENDEREÇO: ', bold: true}, `${endereco_funeraria}\n`,
        {text: 'ORIGEM: ', bold: true}, `${origem}`
    ]
}
```

**Tabela de Especificações:**
- Tabela com descrição detalhada da urna selecionada
- Quantidade (sempre 01)
- Bordas e formatação padrão

**Beneficiário:**
```javascript
{
    text: [
        `Em benefício de ${beneficiario.nome || "_______________"}`,
        ` (conforme atestado de óbito ou declaração médica),`,
        ` documento D.O. nº ${beneficiario.DO || "_______________"}.`,
        ` Residente à ${beneficiario.endereco.logradouro || "_______________"},`,
        ` bairro ${beneficiario.endereco.bairro || "_______________"} nesta cidade do Natal.`
    ],
    alignment: "justify"
}
```

**Requerente:**
```javascript
{
    text: [
        {text: 'REQUERENTE: \n\n', bold: true},
        `Nome: ${requerente.nome || "_______________"}\n`,
        `RG/CPF: ${requerente.rg_cpf || "_______________"}\n`,
        `Telefone: ${requerente.telefone || "_______________"}\n`,
        `Residente à ${requerente.endereco.logradouro || "_______________"},`,
        ` bairro ${requerente.endereco.bairro || "_______________"},`,
        ` nesta cidade do Natal.\n`,
        `Grau de parentesco: ${requerente.grau_parentesco || "_______________"}\n`
    ]
}
```

**Assinaturas:**
```javascript
{ text: "____________________________________________________________\n", alignment:"center" },
{ text: "Assinatura do responsável", alignment:"center", margin:[0,5,0,30] },
{ text: "Atenciosamente,", margin:[0,20,0,30]},
{ text: "____________________________________________________________", alignment:"center" },
{ text: "Técnico(a) responsável", alignment:"center", margin:[0,5,0,5] },
{ text: `${matricula || "_______________"}`, alignment:"center", margin:[0,0,0,30] }
```

### 4.2 Rodapé Padrão
```javascript
footer: {
    text: `Gestão de Benefícios Eventuais/ SEMTAS - Av. Nevaldo Rocha, nº 2180 – Dix-Sept Rosado CEP: 59054-000 – Natal/RN`,
    alignment: 'center',
    fontSize: 9
}
```

## 5. Integração com o Módulo de Solicitações

### 5.1 Entradas da Feature
- **Dados do formulário:** Informações coletadas na solicitação
- **Tipo de urna selecionado:** Define especificações e valor
- **Dados do usuário logado:** Matrícula do técnico responsável

### 5.2 Saídas da Feature
- **Documento PDF:** Autorização pronta para impressão
- **Dados para relatório:** Informações para controle estatístico e financeiro
- **Registro da solicitação:** Para histórico no módulo

### 5.3 Validações Implementadas
- Verificação de dados obrigatórios
- Formatação de campos (CPF, telefone, datas)
- Validação do tipo de urna selecionado
- Controle de protocolo único

## 6. Controle e Relatórios

### 6.1 Dados para Relatórios do Módulo
A feature deve fornecer ao módulo de solicitações:

- **Por tipo de urna:** Quantidades e valores separados
- **Período:** Dados organizados por data
- **Valor total:** Soma dos custos por tipo
- **Funerárias:** Distribuição por prestador de serviço

### 6.2 Estrutura de Dados para Relatório
```javascript
var dadosRelatorio = {
    protocolo: protocolo,
    data_solicitacao: new Date(),
    tipo_urna: urna.tipo,
    valor_urna: getValorPorTipo(urna.tipo),
    funeraria: destino,
    beneficiario: beneficiario.nome,
    requerente: requerente.nome,
    tecnico_responsavel: matricula
}
```

## 7. Configurações da Feature

### 7.1 Valores Atualizáveis
```javascript
var valores_urna = {
    'FUNERAL PADRÃO': 2390.00,
    'FUNERAL ESPECIAL': 2490.00,
    'FUNERAL OBESO': 2690.00,
    'FUNERAL INFANTIL': 1666.66
}
```

### 7.2 Lista de Funerárias Credenciadas
```javascript
var funerarias = [
    {
        nome: 'FUNERÁRIA PADRE CÍCERO',
        endereco: 'RUA PRESIDENTE LEÃO VELOSO, 376. ALECRIM'
    },
    // Outras funerárias...
]
```

### 7.3 Campos com Preenchimento Manual
Sempre que um campo não possuir dados, usar o padrão:
```javascript
campo_nao_disponivel = "_______________"
```

**Campos frequentemente preenchidos manualmente:**
- Data de autorização
- Número do atestado de óbito (quando não digitalizado)
- Telefone do requerente
- Detalhes específicos do endereço

## 8. Implementação Técnica

### 8.1 Dependências
- **PDFMake:** Para geração de documentos PDF
- **Módulo de solicitações:** Para integração com o sistema principal

### 8.2 Estrutura de Arquivos Sugerida
```
/beneficio-ataude/
├── ataude.js              # Lógica principal da feature
├── templates/
│   └── autorizacao.js     # Template do documento
├── config/
│   ├── urnas.js          # Especificações das urnas
│   ├── funerarias.js     # Lista de funerárias
│   └── valores.js        # Tabela de preços
└── utils/
    └── validations.js    # Funções de validação
```

### 8.3 Função Principal
```javascript
function gerarAutorizacaoAtaude(dados) {
    // Validar dados obrigatórios
    // Aplicar campos de preenchimento manual quando necessário
    // Gerar documento PDF
    // Registrar no módulo de solicitações
    // Retornar dados para relatório
}
```

---

**Versão:** 2025.1  
**Última atualização:** Janeiro 2025  
**Módulo:** Solicitações - SEMTAS Natal  
**Feature:** Benefício Ataúde