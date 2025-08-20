### Nova funcionalidade — Geração de comprovantes pré-preenchidos em PDF

**Objetivo**
No módulo de pagamento, implementar a geração automática de comprovantes em PDF, usando **pdfmake** e templates específicos para **cesta básica** e **aluguel social**.

---

### Regras do sistema

1. O técnico acessa a opção de gerar comprovante dentro do fluxo do pagamento.
2. A chamada recebe apenas o parâmetro `pagamentoId`.
3. A partir desse identificador, o sistema recupera todas as informações necessárias através dos relacionamentos existentes (beneficiário, benefício, valores, endereços, etc.).
4. O `documentDefinition` do pdfmake correspondente ao tipo de benefício é selecionado.
5. Os campos conhecidos são preenchidos automaticamente.
6. Os campos de assinatura permanecem em branco.
7. O PDF final é disponibilizado para download ou impressão.

---

### Processo sugerido

1. **Análise de requisitos**

   * Confirmar as informações mínimas necessárias para cada recibo.
   * Validar se todos os dados podem ser obtidos a partir de `pagamentoId`.

2. **Definição de templates**

   * Criar os `documentDefinition` em pdfmake para:

     * Recibo de entrega de cesta básica.
     * Recibo de pagamento de aluguel social.
   * Definir placeholders nos campos que receberão dados dinâmicos.

3. **Camada de serviço (TypeScript)**

   * Método `gerarComprovante(pagamentoId: string): Buffer`.
   * Obter informações do pagamento e seus relacionamentos.
   * Resolver o template correspondente.
   * Preencher dados dinâmicos no `documentDefinition`.
   * Gerar o PDF via pdfmake e devolver em memória (Buffer) para ser enviado na resposta.

4. **Camada de controle**

   * Endpoint `GET /pagamentos/:pagamentoId/gerar-comprovante`.
   * Validar permissões de acesso.
   * Invocar o service.
   * Retornar o PDF no response (download).

5. **Testes**

   * Gerar recibo para cesta básica e aluguel social.
   * Validar PDFs com dados completos e cenários com campos opcionais ausentes.
   * Conferir compatibilidade de visualização/impressão.
        
---

## Recibo cesta básica

```javascript
var dd = {
  pageSize: "A4",
  pageMargins: [50, 60, 50, 60],
  images: {
    logo: "data:image/png;base64,iVBORw0KGgoAAAANS..." // aqui vai o base64 do logo
  },
  content: [
    {
      stack: [
        { image: "logo", width: 300, alignment: "center", margin: [0, 0, 0, 20] },
        
        { text: "DEPARTAMENTO DE PROTEÇÃO SOCIAL BÁSICA - DPSB", style: "title" },
        { text: "SETOR DE GESTÃO DE BENEFÍCIOS", style: "title", margin: [0, 0, 0, 20] },

        { text: "RECIBO DE ENTREGA DE CESTA(S) BÁSICA(S)", style: "title", margin: [0, 0, 0, 30] },
        
        {
          table: {
            widths: ["*", "*"], // duas colunas de largura flexível
            body: [
              [
                { text: "Nome do Beneficiário: ${nomeCompleto.toUpperCase()}", colSpan: 2, border: [true, true, true, true], margin: [5, 5] },
                {} // célula vazia porque o colSpan ocupa as duas colunas
              ],
              [
                { text: "CPF: ${cpfFormatado}", border: [true, true, false, true], margin: [5, 5] },
                { text: "RG: ${rg}", border: [false, true, true, true], margin: [5, 5] }
              ],
              [
                { text: "Concessão: ${concessao}", border: [true, true, false, true], margin: [5, 5] },
                { text: "Nº do Memorando: ${protocolo}", border: [false, true, true, true], margin: [5, 5] }
              ]
            ]
          },
          layout: {
            hLineWidth: function (i, node) { return 1; },
            vLineWidth: function (i, node) { return 1; },
            hLineColor: function (i, node) { return "black"; },
            vLineColor: function (i, node) { return "black"; }
          }
        },
        {
          text: "Atesto ter recebido da Secretaria Municipal do Trabalho e Assistência Social (SEMTAS), por meio do ${nomeUnidade}, ${quantidadeParcelas} (${quantidadeParcelasNominal}) cesta(s) básica(s), ofertada enquanto benefício eventual da assistência social.",
          margin: [0, 30, 0, 20]
        },

        { 
            text: "Assinatura legível do recebedor: ________________________________________", 
            margin: [0, 10, 0, 10],
            alignment: "justify" 
        },
        
        { 
            text: "CPF ou RG: _______________________________________________________", 
            margin: [0, 0, 0, 20],
            alignment: "justify"
            
        },
        
        { text: "Foi o próprio beneficiário a quem foi entregue o benefício: (   ) Sim      (   ) Não", margin: [0, 10, 0, 10] },
        { text: "Se não, qual o grau de parentesco a quem foi entregue: ___________________________", margin: [0, 0, 0, 30] },

        { 
            text: "Natal, ${data} de ${mes} de ${ano}", 
            margin: [0, 0, 0, 40], 
            alignment: "right"
        },

        { 
            text: "________________________________________________", 
            margin: [0, 0, 0, 10],
            alignment: "center" 
        },
        { 
            text: "Assinatura do Técnico Responsável pela entrega", 
            margin: [0, 0, 0, 10],
            alignment: "center" 
        },
        { 
            text: "(carimbo)", 
            margin: [0, 0, 0, 30], 
            alignment: "center" 
        }
      ]
    }
  ],
  styles: {
    header: { fontSize: 11, bold: true, alignment: "center" },
    title: { fontSize: 13, bold: true, alignment: "center" },
    footnote: { fontSize: 8, italics: true, margin: [0, 2, 0, 0] }
  }
};

```

## Recibo aluguel social

```javascript
var dd = {
  pageSize:"A4",
  pageMargins:[50,60,50,60],
  content:[
    { text:"RECIBO DE PAGAMENTO DO ALUGUEL SOCIAL", style:"title", margin:[0,0,0,30] },
    { 
        text:"Eu ${nomeCompletoLocador} CPF ${cpfFormatadoLocador} recebi do(da) Sr.(a) ${nomeCompletoBeneficiario} CPF ${cpfFormatadoBeneficiario} a importância de R$: ${valorParcela} como forma de pagamento do Aluguel, localizado no endereço ${endereco} referente ao mês de ${mesNominal} de ${ano}, dando plena, total e irrevogável quitação.", 
        alignment:"justify", 
        margin:[0,0,0,50] 
    },
    {
      table: {
        widths: ["*", "*"], // duas colunas de largura flexível
        body: [
          [
            { text: "ASSINATURA DO LOCADOR:", colSpan: 2, border: [true, true, true, true], margin: [3, 3] },
            {} // célula vazia porque o colSpan ocupa as duas colunas
          ],
          [
            { text: "ASSINATURA DO LOCATÁRIO:", colSpan: 2, border: [true, true, true, true], margin: [3, 3] },
            {} 
          ]
        ]
      },
      layout: {
        hLineWidth: function (i, node) { return 1; },
        vLineWidth: function (i, node) { return 1; },
        hLineColor: function (i, node) { return "black"; },
        vLineColor: function (i, node) { return "black"; }
      }
    },
    { 
        text:"Natal, ${data} de ${mes} de ${ano}", alignment:"right", 
        margin: [3, 50]
    }
  ],
  styles:{
    title:{ fontSize:13, bold:true, alignment:"center" }
  }
};
```