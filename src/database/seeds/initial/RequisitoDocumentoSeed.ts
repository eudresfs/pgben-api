import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { TipoBeneficio } from '../../../modules/beneficio/entities/tipo-beneficio.entity';
import { RequisitoDocumento } from '../../../modules/beneficio/entities/requisito-documento.entity';

export default class RequisitoDocumentoSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const requisitoDocumentoRepository = dataSource.getRepository(RequisitoDocumento);
    const tipoBeneficioRepository = dataSource.getRepository(TipoBeneficio);
    const tipoDocumentoRepository = dataSource.getRepository('tipo_documento');

    // Verificar se já existem requisitos de documento no sistema
    const existingRequisitos = await requisitoDocumentoRepository.count();
    if (existingRequisitos > 0) {
      console.log('Requisitos de documento já existem no sistema. Pulando seed de requisitos de documento.');
      return;
    }

    // Buscar todos os tipos de benefício
    const tiposBeneficio = await tipoBeneficioRepository.find();
    if (tiposBeneficio.length === 0) {
      console.log('Nenhum tipo de benefício encontrado. Não é possível criar requisitos de documento.');
      return;
    }

    // Buscar todos os tipos de documento
    const tiposDocumento = await tipoDocumentoRepository.find();
    if (tiposDocumento.length === 0) {
      console.log('Nenhum tipo de documento encontrado. Não é possível criar requisitos de documento.');
      return;
    }

    // Mapear tipos de documento por nome para facilitar a busca
    const documentosPorNome = {};
    tiposDocumento.forEach(doc => {
      documentosPorNome[doc.nome] = doc;
    });

    // Mapear tipos de benefício por nome para facilitar a busca
    const beneficiosPorNome = {};
    tiposBeneficio.forEach(ben => {
      beneficiosPorNome[ben.nome] = ben;
    });

    // Definir requisitos de documento para cada tipo de benefício
    const requisitosPorBeneficio = {
      'Auxílio Funeral': [
        { nome: 'Certidão de Óbito', obrigatorio: true },
        { nome: 'RG', obrigatorio: true },
        { nome: 'CPF', obrigatorio: true },
        { nome: 'Comprovante de Residência', obrigatorio: true },
        { nome: 'Comprovante de Renda', obrigatorio: true },
      ],
      'Auxílio Natalidade': [
        { nome: 'Certidão de Nascimento', obrigatorio: true },
        { nome: 'RG', obrigatorio: true },
        { nome: 'CPF', obrigatorio: true },
        { nome: 'Comprovante de Residência', obrigatorio: true },
        { nome: 'Comprovante de Renda', obrigatorio: true },
        { nome: 'Cartão do NIS', obrigatorio: false },
      ],
      'Cesta Básica Emergencial': [
        { nome: 'RG', obrigatorio: true },
        { nome: 'CPF', obrigatorio: true },
        { nome: 'Comprovante de Residência', obrigatorio: true },
        { nome: 'Comprovante de Renda', obrigatorio: true },
        { nome: 'Cartão do NIS', obrigatorio: false },
        { nome: 'Declaração Escolar', obrigatorio: false },
      ],
      'Auxílio Moradia': [
        { nome: 'RG', obrigatorio: true },
        { nome: 'CPF', obrigatorio: true },
        { nome: 'Comprovante de Residência', obrigatorio: true },
        { nome: 'Comprovante de Renda', obrigatorio: true },
        { nome: 'Laudo da Defesa Civil', obrigatorio: false },
      ],
      'Passagem Interestadual': [
        { nome: 'RG', obrigatorio: true },
        { nome: 'CPF', obrigatorio: true },
      ],
    };

    // Criar requisitos de documento para cada tipo de benefício
    for (const [beneficioNome, requisitos] of Object.entries(requisitosPorBeneficio)) {
      const tipoBeneficio = beneficiosPorNome[beneficioNome];
      if (!tipoBeneficio) {
        console.log(`Tipo de benefício ${beneficioNome} não encontrado. Pulando requisitos.`);
        continue;
      }

      for (const requisito of requisitos) {
        const tipoDocumento = documentosPorNome[requisito.nome];
        if (!tipoDocumento) {
          console.log(`Tipo de documento ${requisito.nome} não encontrado. Pulando requisito.`);
          continue;
        }

        try {
          // Criar uma nova instância de RequisitoDocumento com os campos corretos
          const requisitoDocumento = new RequisitoDocumento();
          requisitoDocumento.tipo_beneficio_id = tipoBeneficio.id;
          requisitoDocumento.tipo_documento = tipoDocumento.nome.toLowerCase();
          requisitoDocumento.obrigatorio = requisito.obrigatorio;
          
          // Salvar o requisito de documento
          await requisitoDocumentoRepository.save(requisitoDocumento);
          console.log(`Requisito de documento ${tipoDocumento.nome} para ${tipoBeneficio.nome} criado com sucesso.`);
        } catch (error) {
          console.error(`Erro ao criar requisito de documento para ${tipoBeneficio.nome}:`, error);
          continue;
        }
      }
    }

    console.log('Seed de requisitos de documento concluído com sucesso!');
  }
}