

### RELAÇÃO NOMINAL DA CONCESSÃO DE ALUGUEL SOCIAL

```typescript
// PDF: RELAÇÃO NOMINAL DA CONCESSÃO DE ALUGUEL SOCIAL PAGO EM MAIO – JULHO 2025
// Fonte: :contentReference[oaicite:7]{index=7}

var aluguelRows = [
  // [Nº, CPF, NOME, PARCELA, RENOVAÇÃO, UNIDADE DESCENTRALIZADA, AGÊNCIA]
  ['1','056.135.954-70','ADELMA MÔNICA DA SILVA BRITO','1/6','NÃO','CREAS LESTE','AG. RIBEIRA'],
  ['2','058.942.424-60','ALCIVÂNIA MIGUEL DELMIRO','4/6','NÃO','CREN','AG. CÂMARA CASCUDO'],
  ['3','066.194.204-00','ANA JACINTA DE LIMA FREIRE','1/6','NÃO','CREN','AG. CÂMARA CASCUDO'],
  ['4','129.531.574-25','ANA KATARINA FRANCISCO DA SILVA','1/6','NÃO','CRAS N.S.A.','AG. RIBEIRA'],
  ['5','966.609.614.53','ANA PAULA DE ARAÚJO CAMPOS','1/6','NÃO','CRAS FELIPE CAMARÃO','AG. CÂMARA CASCUDO'],
  ['6','071.074.004-28','ANDERSON PEREIRA DE AQUINO PAIVA','1/6','NÃO','CENTRO POP','AG. RIBEIRA'],
  ['7','074.768.484-70','ANGÉLICA KLÉBIA MARIA SILVA','1/6','NÃO','CRAS PASSO DA PÁTRIA','AG. CÂMARA CASCUDO'],
  ['8','067.269.374-74','CLAUDIA NOBREGA DE LIMA','1/6','NÃO','CREN','AG. RIBEIRA'],
  ['9','020.213.943-36','CRISTIANA ALCANTARA BELO','1/6','NÃO','CRAS FELIPE CAMARÃO','AG. CÂMARA CASCUDO'],
  ['10','124.570.314-51','DAYANE BEATRIZ DE BARROS DANTAS','1/6','NÃO','CRAS LAGOA AZUL','AG. RIBEIRA'],
  // ... (cole o restante conforme o PDF se desejar)
];

var dd = {
  pageMargins:[50,60,50,60],
  content:[
    {text:'DEPARTAMENTO DE PROTEÇÃO SOCIAL BÁSICA – DPSB', style:'header'},
    {text:'SETOR DE BENEFÍCIOS', style:'subheader'},
    {text:'RELAÇÃO NOMINAL DA CONCESSÃO DE ALUGUEL SOCIAL PAGO EM MAIO – JULHO 2025', style:'title', margin:[0,8,0,8]},

    {
      table: {
        headerRows:1,
        widths: [20, 65, '*', '*', '*', '*', '*'],
        body: (function(){
          var body = [];
          body.push([
            {text:'Nº', style:'tableHeader'},
            {text:'CPF', style:'tableHeader'},
            {text:'NOME', style:'tableHeader'},
            {text:'PARCELA', style:'tableHeader'},
            {text:'RENOVAÇÃO', style:'tableHeader'},
            {text:'UNIDADE DESCENTRALIZADA', style:'tableHeader'},
            {text:'AGÊNCIA', style:'tableHeader'}
          ]);
          aluguelRows.forEach(function(r){ body.push(r); });
          return body;
        })()
      },
      layout:{fillColor:function(i){return i===0? '#F2F2F2': null;}}
    },

    { text: '\nObservações: Beneficiários que receberam 02 parcelas receberam por atraso no envio de recibo do mês anterior. Ver documento para detalhes legais e notes.', margin:[0,8,0,0]}
  ],
  styles:{ 
      header: {
          fontSize:10,
          bold:true,
          alignment:'center'
      }, 
      subheader: {
          fontSize:9,
          alignment:'center'
      }, 
      title:{ 
          fontSize:11,
          bold:true,
          alignment:'center'
      }, 
      tableHeader: {
          bold: true, 
          fontSize: 8,
          alignment: 'center'
      }
  },
  defaultStyle:{fontSize:9}
};

// pdfMake.createPdf(dd).open();
```

### RELAÇÃO NOMINAL DA CONCESSÃO DE ATAÚDES

```typescript
// PDF corrigido: RELAÇÃO NOMINAL DA CONCESSÃO DE ATAÚDES – JULHO – ANO 2025
// Fonte: arquivo enviado. :contentReference[oaicite:1]{index=1}

var ataudesRows = [
  ['01','337/24','ANTONIO MARCOS DE LIMA','OBESA'],
  ['02','338/24','CÍCERO GOMES TINDO','PADRÃO'],
  ['03','339/24','BENEDITO FIRMANO MONTEIRO','OBESA'],
  ['04','340/24','DOMINGA XAVIER DO NASCIMENTO','OBESA'],
  ['05','341/24','JOSÉ MARIA OLIVEIRA DE FREITAS','PADRÃO'],
  ['06','342/24','LUIZ SOLON DE OLIVEIRA','PADRÃO'],
  ['07','343/24','MATILDE COELHO DA SILVA','PADRÃO'],
  ['08','344/24','NILTON CAMILO DOS SANTOS','PADRÃO'],
  ['09','345/24','RAIMUNDA PEREIRA','PADRÃO'],
  ['10','346/24','ROZIMAR VIEIRA DE MELO','PADRÃO'],
  ['11','347/24','TEREZINHA SILVA DE LIMA','PADRÃO'],
  ['12','348/24','VANDA FERREIRA DO NASCIMENTO','PADRÃO'],
  ['13','349/24','PEDRO SILVINO DA SILVA','PADRÃO'],
  ['14','350/24','ANDRÉ LUIZ ARAÚJO DA SILVA','PADRÃO'],
  ['15','351/24','SHIRLEY DANIELE ROCHA SILVA','PADRÃO'],
  ['16','352/24','BRUNO DAS NEVES OLIVEIRA','PADRÃO'],
  ['17','353/24','ANTONIO ROBERTO JESUINO DA SILVA','PADRÃO'],
  ['18','354/24','UELSON SALUSTIANO DA SILVA','PADRÃO'],
  ['19','355/24','VILANILSON SALES DE LIMA','PADRÃO'],
  ['20','356/24','CLÁUDIO LOPES DA SILVA','PADRÃO'],
  ['21','357/24','JOANA DARC GOMES DA SILVA','OBESA'],
  ['22','358/24','GEVANILDO NASCIMENTO DE ARAÚJO','OBESA'],
  ['23','359/24','JOSÉ FRANCISCO REBOUÇAS','PADRÃO'],
  ['24','360/24','GERALDO PAULINO DE MELO','PADRÃO'],
  ['25','361/24','FRANCISCO REGINALDO DA SILVA','PADRÃO'],
  ['26','362/24','RAIMUNDO NONATO FELIX','PADRÃO'],
  ['27','363/24','MARIA LUCIA DE MEDEIROS','PADRÃO'],
  ['28','364/24','JANDERSON DA SILVA NUNES','PADRÃO'],
  ['29','365/24','ARTHUR LUCENA DANTAS','PADRÃO'],
  ['30','366/24','JACKSON MATEUS SOARES DE ANDRADE','PADRÃO'],
  ['31','367/24','ALLYSON LUTHYANO SILVA DE LIMA','PADRÃO'],
  ['32','368/24','LARISSA FRANCA ALVES FAGUNDES','OBESA'],
  ['33','369/24','ANTONIO HOLANDA SOBRINHO','PADRÃO'],
  ['34','370/24','EMILLY NAYARA PAZ','PADRÃO'],
  ['35','371/24','MACIO PINTO DO NASCIMENTO','PADRÃO'],
  ['36','372/24','PEDRO FRANCISCO DE LIMA','PADRÃO'],
  ['37','373/24','ESDRAS RODRIGUES GURGEL','OBESA'],
  ['38','374/24','FRANCISCO LAERCIO SOUZA DA SILVA','PADRÃO'],
  ['39','375/24','LUCIVALDO DANTAS','OBESA'],
  ['40','376/24','MARIA DE LOURDES SOARES DA SILVA','PADRÃO'],
  ['41','377/24','FRANCISCO SEVERO DE MELO','PADRÃO'],
  ['42','378/24','MARIA DA CONCEIÇAO MIRANDA DE OLIVEIRA','PADRÃO'],
  ['43','379/24','MARIA DA SOLIDADE CUNHA DE LIMA','OBESA'],
  ['44','380/24','VERA LUCIA BATISTA DE ASSIS MAGALHAES','PADRÃO'],
  ['45','381/24','LIDIANE HORACIO DE MELO','OBESA'],
  ['46','382/24','MARIA DA CONCEIÇAO BORGES DOS SANTOS','PADRÃO'],
  ['47','383/24','JOAQUIM FRANCISCO DE ARAUJO NETO','PADRÃO'],
  ['48','384/24','SIRIUS VINICIUS SOARES DA SILVA','PADRÃO']
];

var dd = {
  pageSize: 'A4',
  pageOrientation: 'portrait',
  pageMargins: [40, 60, 40, 60],
  content: [
    { text: 'DEPARTAMENTO DE PROTEÇÃO SOCIAL BÁSICA – DPSB', style: 'header' },
    { text: 'SETOR DE GESTÃO DE BENEFÍCIOS', style: 'subheader' },
    { text: 'RELAÇÃO NOMINAL DA CONCESSÃO DE ATAÚDES – JULHO – ANO 2025', style: 'title', margin: [0, 8, 0, 12] },

    {
      table: {
        headerRows: 1,
        widths: [28, 110, '*', 80],
        body: (function(){
          var body = [];
          body.push([
            { text: 'Nº', style: 'tableHeader' },
            { text: 'NÚMERO DA AUTORIZAÇÃO', style: 'tableHeader' },
            { text: 'NOME(S) DO(S) BENEFICIÁRIO(S)/FALECIDO(S)', style: 'tableHeader' },
            { text: 'TIPO DA URNA', style: 'tableHeader' }
          ]);
          ataudesRows.forEach(function(r){ body.push(r); });
          return body;
        })()
      },
      layout: {
        fillColor: function (rowIndex){ return rowIndex === 0 ? '#EEEEEE' : null; },
        hLineColor: function(i, node) { return '#CCCCCC'; },
        vLineColor: function(i, node) { return '#CCCCCC'; }
      }
    },

    { text: '\nNo mês de julho/2025 foram concedidos 48 (quarenta e oito) ataúdes, sendo 38 (trinta e oito) padrão e 10 (dez) obeso.', margin:[0,10,0,0] },

    { text: '\n\nNatal, 05 de agosto de 2025\n\nCarla Maria de Araújo Ferreira Santos\nDiretora do Departamento de Proteção Social Básica – DPSB/SEMTAS\nMatrícula: 73.605-5', margin:[0,16,0,0] }
  ],
  styles: {
    header: { fontSize: 10, bold: true, alignment: 'center' },
    subheader: { fontSize: 9, alignment: 'center' },
    title: { fontSize: 12, bold: true, alignment: 'center' },
    tableHeader: { bold: true, fontSize: 9, margin: [0, 4, 0, 4] }
  },
  // use the built-in Roboto (default) and set default font size
  defaultStyle: { fontSize: 9 }
};

// gerar PDF no Playground
// pdfMake.createPdf(dd).open();

```


### MEMORANDO Nº 244/2019 - Entrega de Cesta Básica

```typescript
// PDF: MEMORANDO Nº 244/2019 - Entrega de Cesta Básica
// Documento extenso (muitos registros). Fonte: :contentReference[oaicite:5]{index=5}

var memo244Data = [
  // format: [Nº, NOME, RG/CPF, PERÍODO DE ACOMPANHAMENTO, UNIDADE]
  ['1','Adeline do Nascimento Teixeira','058.045.104-60','1ª/3ª','África'],
  ['2','Albani Ferreira da Silva','037.130.574-86','1ª/3ª','África'],
  ['3','Aline Cláudia Andrade da Silva','083.236.884-94','1ª/3ª','África'],
  ['4','Alzenir Santos Rodrigues','008.325.624-59','1ª/3ª','África'],
  ['5','Ana Lucia de Brito Silva','079.265.714-40','1ª/3ª','África'],
  ['6','Andrea Salvador dos Santos','043.460.034-27','1ª/3ª','África'],
  ['7','Claudete Maria Pereira da Silva','063.504.424-23','1ª/3ª','África'],
  ['8','Cláudia Martins Nunes','063.053.634-12','1ª/6ª','África'],
  ['9','Claudia Nis de Andrade','061.166.234-50','1ª/3ª','África'],
  ['10','Daniela Rabelo da Silva','084.271.544-45','1ª/3ª','África'],
  // ... (o arquivo tem muitos registros; cole todos aqui seguindo o formato)
];

var buildBody = function(data){
  var body = [];
  body.push([
    {text:'Nº', style:'tableHeader'},
    {text:'NOME', style:'tableHeader'},
    {text:'RG / CPF', style:'tableHeader'},
    {text:'PERÍODO DE ACOMPANHAMENTO', style:'tableHeader'},
    {text:'UNIDADE', style:'tableHeader'}
  ]);
  data.forEach(function(r){ body.push(r); });
  return body;
};

var dd = {
  pageMargins:[36,60,36,60],
  content:[
    { text:'DEPARTAMENTO DE PROTEÇÃO SOCIAL BÁSICA – DPSB', style:'header'},
    { text:'SETOR DE BENEFÍCIOS', style:'subheader'},
    { text:'MEMORANDO Nº 244/2019', style:'title', margin:[0,8,0,8] },
    { text:'Ref.: Entrega de Cesta Básica\nData: 12/12/19\n', margin:[0,0,0,8] },

    {
      table: {
        headerRows: 1,
        widths: [30, '*', 110, 120, 80],
        body: buildBody(memo244Data)
      },
      layout: { fillColor: function(i){ return i===0? '#EFEFEF': null; } }
    },

    { text: '\nAV. Bernardo Vieira, 2180 – Dix-sept Rosado\nCEP: 59054-000               Fone: 3232-9278', margin:[0,12,0,0] }
  ],
  styles:{
    header:{fontSize:10, bold:true, alignment:'center'},
    subheader:{fontSize:9, alignment:'center'},
    title:{fontSize:11, bold:true, alignment:'center'},
    tableHeader:{bold:true, fontSize:9}
  },
  defaultStyle:{fontSize:9}
};

// pdfMake.createPdf(dd).open();

```


### MEMORANDO Nº 195/2024 - Benefício Natalidade

```typescript
// PDF: MEMORANDO Nº 195/2024 - Benefício Natalidade
// Fonte: documento enviado. :contentReference[oaicite:3]{index=3}

var kits = [
  // [Nº, NOME, CPF/NIS, CRAS]
  ['1','GISELIA CARRILHO DA SILVA','091.284.774-30','África'],
  ['2','MARIA CLARA DA SILVA','127.827.974-17','África'],
  ['3','MARIA CONCEIÇAO DA COSTA FERREIRA','705.172.114-32','Felipe Camarão'],
  ['4','ALINE GOMES BATISTA','107.359.434-35','Guarapes'],
  ['5','ANA FLAVIA PEREIRA DOS SANTOS','707.573.184-01','Guarapes'],
  ['6','ERIKA LETICIA CIPRIANO DA SILVA','125.142.854-10','Guarapes'],
  ['7','MARIA ANTONIA BEZERRA DA SILVA','708.580.834-93','Guarapes'],
  ['8','SAMARA BEATRIZ BEZERRA PEREIRA','710.843.434-28','Guarapes'],
  ['9','TAMIRES FERNANDES DA SILVA','710.886.834-28','Guarapes'],
  ['10','CLAUDIA CARINA SANTOS DE OLIVEIRA','124.532.174-96','Lagoa Azul'],
  ['11','ANA BEATRIZ SOUSA DA SILVA','706.894.014-50','Mãe Luíza'],
  ['12','EDILEUZA FABRICIO GINO','705.088.204-32','Mãe Luíza'],
  ['13','ANNA BEATRIZ DO NASCIMENTO BEZERRA','703.397.254-78','Nordelândia'],
  ['14','WURTZITA DA COSTA BARBOSA','104.281.204-74','Nordelândia'],
  ['15','AMANDA PRISSILA CARDOSO DA SILVA','703.029.124-79','NSA'],
  ['16','JESSICA KAROLAYNE PEREIRA DA SILVA','017.449.664-86','NSA'],
  ['17','LUANA BEZERRA BRASIL COSTA','046.187.524-16','NSA'],
  ['18','LUCIANA LOPES','077.081.764-50','NSA'],
  ['19','MARIA DE FATIMA RIBEIRO DA SILVA','064.892.894-23','NSA'],
  ['20','SAIONARA TAVARES DA COSTA','127.802.424-77','NSA'],
  ['21','DEBORA AMANDA DA SILVA','117.942.904-43','Pajuçara'],
  ['22','ELAYNE BEATRIZ FERREIRA DA SILVA','018.274.954-13','Pajuçara'],
  ['23','MARIA JOSENILCE SANTOS DA CRUZ OLIVEIRA','065.288.754-64','Pajuçara'],
  ['24','ANA BEATRIZ LIMA DA SILVA','702.185.494-31','Passo da Pátria'],
  ['25','JANEIDE COSTA DA SILVA','065.867.974-03','Passo da Pátria'],
  ['26','LISIANE DAYANE DA CRUZ FRANÇA','100.838.484-44','Passo da Pátria'],
  ['27','CAMILA STEFANE DE ARAUJO CALDAS','095.409.224-45','Planalto'],
  ['28','EMANOELLA FREITAS DE LIMA ARAUJO LAURENTINO','076.767.474-06','Planalto'],
  ['29','LETICIA GEOVANA DE BRITO FIGUEIROA','102.557.394-35','Planalto'],
  ['30','JORDANIA KELLY AGUSTINHO FAGUNDES DA CRUZ','701.203.024-03','Ponta Negra'],
  ['31','LIVIA NAYARA LAUREANO AMORIM','095.085.904-40','Ponta Negra'],
  ['32','JOICE TAVARES DOS SANTOS','107.939.614-40','Salinas'],
  ['33','JULIANA BATISTA DA SILVA','092.352.264-65','Salinas'],
  ['34','KAILANE RAQUEL DA SILVA MATIAS','706.870.574-00','Salinas']
];

var dd = {
  pageMargins:[40,60,40,60],
  content:[
    { text: 'DEPARTAMENTO DE PROTEÇÃO SOCIAL BÁSICA - DPSB', style:'header'},
    { text: 'SETOR DE GESTÃO DE BENEFÍCIOS', style:'subheader'},
    { text: 'MEMORANDO Nº 195/2024', style:'title', margin:[0,8,0,8]},
    { text: 'De: DPSB / SETOR DE GESTÃO DE BENEFÍCIOS\nPara: DPSB / SERVIÇO DE PROTEÇÃO SOCIAL BÁSICA (SPSBAS)\nData: 19/12/2024\nRef.: Benefício Natalidade\n', margin:[0,0,0,8] },

    {
      table: {
        headerRows:1,
        widths: [30, '*', 110, 90],
        body: (function(){
          var b = [];
          b.push([
            {text:'Nº', style:'tableHeader'},
            {text:'NOME', style:'tableHeader'},
            {text:'CPF/NIS', style:'tableHeader'},
            {text:'CRAS', style:'tableHeader'}
          ]);
          kits.forEach(function(r){ b.push(r); });
          return b;
        })()
      },
      layout: { fillColor: function(i){ return i===0? '#F3F3F3' : null; } }
    },

    { text: '\nAtenciosamente,\n\n(Assinatura / setor)\nAV. Bernardo Vieira, 2180 – Dix-Sept - Rosado\nCEP: 59054-000               Fone: 3232-9278', margin:[0,12,0,0] }
  ],
  styles: {
    header:{fontSize:10, bold:true, alignment:'center'},
    subheader:{fontSize:9, alignment:'center'},
    title:{fontSize:11, bold:true, alignment:'center'},
    tableHeader:{bold:true, fontSize:9}
  },
  defaultStyle:{fontSize:9}
};

// pdfMake.createPdf(dd).open();

```