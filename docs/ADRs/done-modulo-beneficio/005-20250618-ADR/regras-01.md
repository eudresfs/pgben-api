# 📝 Especificação Funcional — Regras de Concessão de Benefícios

## Visão Geral

Este documento descreve os comportamentos esperados dos serviços relacionados à concessão de benefícios, com ênfase nas regras específicas do benefício **"Aluguel Social"**, bem como os fluxos de aprovação, pagamentos e encerramento de concessões.

---

## 1. Aprovação de Solicitação

### Descrição

Ao aprovar uma solicitação, o sistema deve gerar uma concessão vinculada e retornar seus dados completos.

### Requisito Funcional

* **RF-001**: O endpoint de aprovação de solicitação deve retornar:

  * Identificador da concessão
  * Status da concessão
  * Dados do beneficiário
  * Dados dos pagamentos gerados (quando aplicável)
  * Outras informações pertinentes à concessão

---

## 2. Consulta de Concessão por ID

### Descrição

O serviço de consulta de concessão deve fornecer informações detalhadas, incluindo os pagamentos vinculados.

### Requisito Funcional

* **RF-002**: O retorno da consulta por ID da concessão deve conter:

  * Dados cadastrais da concessão
  * Lista completa dos pagamentos vinculados, com:

    * ID do pagamento
    * Status
    * Valor
    * Data prevista de liberação
    * Observações, se houver
    * Documento de referência (quando aplicável)

---

## 3. Regras Específicas — Benefício "Aluguel Social"

### 3.1. Data de Liberação da Primeira Parcela

#### Regra de Negócio

* A primeira parcela terá como **data de liberação o primeiro dia do mês subsequente** à aprovação da solicitação.
* **Exceção:** Se a solicitação for aprovada **após o dia 25 do mês**, a data de liberação será no **primeiro dia do segundo mês subsequente**.

#### Exemplos:

| Data de Aprovação | Data de Liberação da 1ª Parcela |
| ----------------- | ------------------------------- |
| 10/06/2025        | 01/07/2025                      |
| 26/06/2025        | 01/08/2025                      |

---

### 3.2. Apresentação do Recibo

#### Regras

* O recibo de aluguel deve ser enviado até o **10º dia útil do mês vigente** para liberar o pagamento daquele mês.
* Caso o recibo **não seja enviado até essa data**, o pagamento é considerado:

  * **"Vencido por falta de documentação"**
  * Não será liberado no ciclo atual.
* **Pagamentos futuros seguem normalmente**, desde que os recibos sejam apresentados dentro do prazo.

#### Regularização Retroativa

* Pagamentos vencidos podem ser regularizados se o recibo for enviado em até **30 dias após a data prevista de liberação**.
* Se o recibo não for apresentado até esse prazo, o pagamento é **definitivamente cancelado**, sem possibilidade de liberação.

#### Exemplos:

| Data Prevista de Liberação | Limite de Recibo (10º útil) | Data Limite Retroativa (30 dias) | Status Caso Não Apresente |
| -------------------------- | --------------------------- | -------------------------------- | ------------------------- |
| 01/07/2025                 | 12/07/2025                  | 31/07/2025                       | Cancelado após 31/07      |

---

## 4. Encerramento da Concessão

### Descrição

A concessão será automaticamente encerrada após a liberação de todos os pagamentos previstos.

### Requisito Funcional

* **RF-003**: Quando todos os pagamentos vinculados estiverem com status **"liberado"**, o status da concessão deverá ser atualizado para **"encerrado"**.

---

## 5. Novos Estados dos Pagamentos

| Status    | Descrição                                              |
| --------- | ------------------------------------------------------ |
| Vencido   | Não liberado por falta de documentação no prazo        |

---

## 6. Considerações Técnicas

* As regras descritas se aplicam exclusivamente ao benefício com código **"aluguel-social"**.
* Outros benefícios podem seguir regras diferentes.
* As regras de datas e prazos devem considerar calendários de feriados para o cálculo do **10º dia útil**.

---