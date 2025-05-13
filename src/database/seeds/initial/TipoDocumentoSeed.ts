import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export default class TipoDocumentoSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const tipoDocumentoRepository = dataSource.getRepository('tipo_documento');

    // Verificar se já existem tipos de documento no sistema
    const existingTiposDocumento = await tipoDocumentoRepository.count();
    if (existingTiposDocumento > 0) {
      console.log('Tipos de documento já existem no sistema. Pulando seed de tipos de documento.');
      return;
    }

    // Criar tipos de documento iniciais
    const tiposDocumento = [
      {
        nome: 'RG',
        sigla: 'RG',
        descricao: 'Registro Geral (Carteira de Identidade)',
        obrigatorio: true,
        ativo: true,
      },
      {
        nome: 'CPF',
        sigla: 'CPF',
        descricao: 'Cadastro de Pessoa Física',
        obrigatorio: true,
        ativo: true,
      },
      {
        nome: 'Comprovante de Residência',
        sigla: 'CR',
        descricao: 'Documento que comprova o endereço de residência (conta de água, luz, telefone, etc.)',
        obrigatorio: true,
        ativo: true,
      },
      {
        nome: 'Certidão de Nascimento',
        sigla: 'CN',
        descricao: 'Certidão de Nascimento para menores de idade',
        obrigatorio: false,
        ativo: true,
      },
      {
        nome: 'Certidão de Óbito',
        sigla: 'CO',
        descricao: 'Certidão de Óbito para solicitação de auxílio funeral',
        obrigatorio: false,
        ativo: true,
      },
      {
        nome: 'Comprovante de Renda',
        sigla: 'CR',
        descricao: 'Documento que comprova a renda familiar (contracheque, declaração de autônomo, etc.)',
        obrigatorio: true,
        ativo: true,
      },
      {
        nome: 'Cartão do NIS',
        sigla: 'NIS',
        descricao: 'Número de Identificação Social',
        obrigatorio: false,
        ativo: true,
      },
      {
        nome: 'Laudo Médico',
        sigla: 'LM',
        descricao: 'Laudo médico para comprovação de condição de saúde',
        obrigatorio: false,
        ativo: true,
      },
      {
        nome: 'Declaração Escolar',
        sigla: 'DE',
        descricao: 'Declaração de matrícula e frequência escolar',
        obrigatorio: false,
        ativo: true,
      },
      {
        nome: 'Laudo da Defesa Civil',
        sigla: 'LDC',
        descricao: 'Laudo da Defesa Civil para situações de calamidade',
        obrigatorio: false,
        ativo: true,
      },
    ];

    // Inserir tipos de documento no banco de dados
    for (const tipoDocumentoData of tiposDocumento) {
      const tipoDocumento = tipoDocumentoRepository.create(tipoDocumentoData);
      await tipoDocumentoRepository.save(tipoDocumento);
      console.log(`Tipo de documento ${tipoDocumentoData.nome} criado com sucesso.`);
    }

    console.log('Seed de tipos de documento concluído com sucesso!');
  }
}