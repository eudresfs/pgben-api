import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export default class RequisitosBeneficioSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const requisitoDocumentoRepository = dataSource.getRepository('requisito_documento');
    const tipoBeneficioRepository = dataSource.getRepository('tipos_beneficio');

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

    // Mapear tipos de benefício por nome para facilitar a busca
    const beneficiosPorNome = {};
    tiposBeneficio.forEach(ben => {
      beneficiosPorNome[ben.nome] = ben;
    });

    // Definir requisitos de documento para cada tipo de benefício
    const requisitosPorBeneficio = {
      'Auxílio Funeral': [
        {
          nome: 'Certidão de Óbito',
          descricao: 'Certidão de óbito emitida pelo cartório',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 1
        },
        {
          nome: 'RG do Falecido',
          descricao: 'Documento de identidade do falecido',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 2
        },
        {
          nome: 'CPF do Falecido',
          descricao: 'CPF do falecido',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 3
        },
        {
          nome: 'RG do Requerente',
          descricao: 'Documento de identidade do requerente',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 4
        },
        {
          nome: 'CPF do Requerente',
          descricao: 'CPF do requerente',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 5
        },
        {
          nome: 'Comprovante de Residência',
          descricao: 'Comprovante de residência atualizado (até 3 meses)',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 6
        },
        {
          nome: 'Comprovante de Renda Familiar',
          descricao: 'Comprovante de renda de todos os membros da família',
          fase: 'analise',
          obrigatorio: true,
          ordem: 7
        },
        {
          nome: 'Declaração de Parentesco',
          descricao: 'Declaração de parentesco com o falecido',
          fase: 'analise',
          obrigatorio: true,
          ordem: 8
        },
        {
          nome: 'Nota Fiscal da Funerária',
          descricao: 'Nota fiscal dos serviços funerários',
          fase: 'liberacao',
          obrigatorio: true,
          ordem: 9
        }
      ],
      'Auxílio Natalidade': [
        {
          nome: 'Certidão de Nascimento',
          descricao: 'Certidão de nascimento da criança',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 1
        },
        {
          nome: 'RG da Mãe/Responsável',
          descricao: 'Documento de identidade da mãe ou responsável',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 2
        },
        {
          nome: 'CPF da Mãe/Responsável',
          descricao: 'CPF da mãe ou responsável',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 3
        },
        {
          nome: 'Comprovante de Residência',
          descricao: 'Comprovante de residência atualizado (até 3 meses)',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 4
        },
        {
          nome: 'Cartão de Pré-Natal',
          descricao: 'Cartão de acompanhamento pré-natal',
          fase: 'analise',
          obrigatorio: false,
          ordem: 5
        },
        {
          nome: 'Declaração de Nascido Vivo',
          descricao: 'Declaração de nascido vivo emitida pelo hospital',
          fase: 'analise',
          obrigatorio: true,
          ordem: 6
        },
        {
          nome: 'Comprovante de Renda Familiar',
          descricao: 'Comprovante de renda de todos os membros da família',
          fase: 'analise',
          obrigatorio: true,
          ordem: 7
        },
        {
          nome: 'Cartão do NIS',
          descricao: 'Número de Identificação Social (se houver)',
          fase: 'analise',
          obrigatorio: false,
          ordem: 8
        }
      ],
      'Aluguel Social': [
        {
          nome: 'RG do Requerente',
          descricao: 'Documento de identidade do requerente',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 1
        },
        {
          nome: 'CPF do Requerente',
          descricao: 'CPF do requerente',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 2
        },
        {
          nome: 'Comprovante de Residência Atual',
          descricao: 'Comprovante de residência atual ou do local onde residia',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 3
        },
        {
          nome: 'Laudo da Defesa Civil',
          descricao: 'Laudo técnico da Defesa Civil (em caso de desastre)',
          fase: 'analise',
          obrigatorio: false,
          ordem: 4
        },
        {
          nome: 'Contrato de Aluguel',
          descricao: 'Contrato de aluguel do imóvel pretendido',
          fase: 'analise',
          obrigatorio: true,
          ordem: 5
        },
        {
          nome: 'Documentos do Proprietário',
          descricao: 'RG, CPF e comprovante de conta bancária do proprietário',
          fase: 'analise',
          obrigatorio: true,
          ordem: 6
        },
        {
          nome: 'Comprovante de Renda Familiar',
          descricao: 'Comprovante de renda de todos os membros da família',
          fase: 'analise',
          obrigatorio: true,
          ordem: 7
        },
        {
          nome: 'Relatório Social',
          descricao: 'Relatório social emitido por assistente social',
          fase: 'analise',
          obrigatorio: true,
          ordem: 8
        },
        {
          nome: 'Termo de Compromisso',
          descricao: 'Termo de compromisso assinado pelo beneficiário',
          fase: 'liberacao',
          obrigatorio: true,
          ordem: 9
        }
      ],
      'Cesta Básica Emergencial': [
        {
          nome: 'RG do Requerente',
          descricao: 'Documento de identidade do requerente',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 1
        },
        {
          nome: 'CPF do Requerente',
          descricao: 'CPF do requerente',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 2
        },
        {
          nome: 'Comprovante de Residência',
          descricao: 'Comprovante de residência atualizado (até 3 meses)',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 3
        },
        {
          nome: 'Comprovante de Renda Familiar',
          descricao: 'Comprovante de renda de todos os membros da família',
          fase: 'analise',
          obrigatorio: true,
          ordem: 4
        },
        {
          nome: 'Cartão do NIS',
          descricao: 'Número de Identificação Social (se houver)',
          fase: 'analise',
          obrigatorio: false,
          ordem: 5
        },
        {
          nome: 'Relatório Social',
          descricao: 'Relatório social emitido por assistente social',
          fase: 'analise',
          obrigatorio: true,
          ordem: 6
        },
        {
          nome: 'Termo de Recebimento',
          descricao: 'Termo de recebimento do benefício',
          fase: 'liberacao',
          obrigatorio: true,
          ordem: 7
        }
      ],
      'Auxílio Passagem Interestadual': [
        {
          nome: 'RG do Requerente',
          descricao: 'Documento de identidade do requerente',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 1
        },
        {
          nome: 'CPF do Requerente',
          descricao: 'CPF do requerente',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 2
        },
        {
          nome: 'Comprovante de Endereço de Destino',
          descricao: 'Comprovante de endereço do local de destino',
          fase: 'analise',
          obrigatorio: true,
          ordem: 3
        },
        {
          nome: 'Declaração de Acolhimento',
          descricao: 'Declaração de acolhimento no destino (familiar ou instituição)',
          fase: 'analise',
          obrigatorio: true,
          ordem: 4
        },
        {
          nome: 'Relatório Social',
          descricao: 'Relatório social emitido por assistente social',
          fase: 'analise',
          obrigatorio: true,
          ordem: 5
        },
        {
          nome: 'Orçamento da Passagem',
          descricao: 'Orçamento da passagem interestadual',
          fase: 'liberacao',
          obrigatorio: true,
          ordem: 6
        },
        {
          nome: 'Termo de Compromisso',
          descricao: 'Termo de compromisso assinado pelo beneficiário',
          fase: 'liberacao',
          obrigatorio: true,
          ordem: 7
        }
      ],
      'Auxílio Documentação Civil': [
        {
          nome: 'Declaração de Hipossuficiência',
          descricao: 'Declaração de hipossuficiência econômica',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 1
        },
        {
          nome: 'Boletim de Ocorrência',
          descricao: 'Boletim de ocorrência em caso de perda ou roubo de documentos',
          fase: 'solicitacao',
          obrigatorio: false,
          ordem: 2
        },
        {
          nome: 'Comprovante de Residência',
          descricao: 'Comprovante de residência atualizado (até 3 meses)',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 3
        },
        {
          nome: 'Relatório Social',
          descricao: 'Relatório social emitido por assistente social',
          fase: 'analise',
          obrigatorio: true,
          ordem: 4
        },
        {
          nome: 'Comprovante de Agendamento',
          descricao: 'Comprovante de agendamento para emissão de documentos',
          fase: 'liberacao',
          obrigatorio: true,
          ordem: 5
        }
      ],
      'Auxílio Calamidade': [
        {
          nome: 'RG do Requerente',
          descricao: 'Documento de identidade do requerente',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 1
        },
        {
          nome: 'CPF do Requerente',
          descricao: 'CPF do requerente',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 2
        },
        {
          nome: 'Comprovante de Residência',
          descricao: 'Comprovante de residência do local atingido',
          fase: 'solicitacao',
          obrigatorio: true,
          ordem: 3
        },
        {
          nome: 'Laudo da Defesa Civil',
          descricao: 'Laudo técnico da Defesa Civil',
          fase: 'analise',
          obrigatorio: true,
          ordem: 4
        },
        {
          nome: 'Fotos do Local',
          descricao: 'Fotos do local atingido pela calamidade',
          fase: 'analise',
          obrigatorio: true,
          ordem: 5
        },
        {
          nome: 'Relatório Social',
          descricao: 'Relatório social emitido por assistente social',
          fase: 'analise',
          obrigatorio: true,
          ordem: 6
        },
        {
          nome: 'Termo de Recebimento',
          descricao: 'Termo de recebimento do benefício',
          fase: 'liberacao',
          obrigatorio: true,
          ordem: 7
        }
      ]
    };

    // Criar requisitos de documento para cada tipo de benefício
    for (const [beneficioNome, requisitos] of Object.entries(requisitosPorBeneficio)) {
      const tipoBeneficio = beneficiosPorNome[beneficioNome];
      if (!tipoBeneficio) {
        console.log(`Tipo de benefício ${beneficioNome} não encontrado. Pulando requisitos.`);
        continue;
      }

      for (const requisito of requisitos) {
        const requisitoDocumento = requisitoDocumentoRepository.create({
          tipo_beneficio_id: tipoBeneficio.id,
          nome: requisito.nome,
          descricao: requisito.descricao,
          fase: requisito.fase,
          obrigatorio: requisito.obrigatorio,
          ordem: requisito.ordem
        });

        await requisitoDocumentoRepository.save(requisitoDocumento);
        console.log(`Requisito de documento ${requisito.nome} para ${beneficioNome} criado com sucesso.`);
      }
    }

    console.log('Seed de requisitos de documento concluído com sucesso!');
  }
}
