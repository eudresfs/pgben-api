import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { faker } from '@faker-js/faker/locale/pt_BR';

export default class SolicitacaoSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const solicitacaoRepository = dataSource.getRepository('solicitacao');
    const dadosBeneficiosRepository = dataSource.getRepository('dados_beneficios');
    const historicoSolicitacaoRepository = dataSource.getRepository('historico_solicitacao');
    const documentosEnviadosRepository = dataSource.getRepository('documentos_enviados');
    const requisitosBeneficioRepository = dataSource.getRepository('requisitos_beneficio');
    const pendenciaRepository = dataSource.getRepository('pendencia');
    const ocorrenciaRepository = dataSource.getRepository('ocorrencia');
    
    const cidadaoRepository = dataSource.getRepository('cidadao');
    const tipoBeneficioRepository = dataSource.getRepository('tipos_beneficio');
    const unidadeRepository = dataSource.getRepository('unidade');
    const usuarioRepository = dataSource.getRepository('usuario');
    const requisitoDocumentoRepository = dataSource.getRepository('requisito_documento');

    // Verificar se já existem solicitações no sistema
    const existingSolicitacoes = await solicitacaoRepository.count();
    if (existingSolicitacoes > 0) {
      console.log('Solicitações já existem no sistema. Pulando seed de solicitações.');
      return;
    }

    // Buscar cidadãos para associar às solicitações
    const cidadaos = await cidadaoRepository.find();
    if (cidadaos.length === 0) {
      console.log('Nenhum cidadão encontrado. Não é possível criar solicitações.');
      return;
    }

    // Buscar tipos de benefício para associar às solicitações
    const tiposBeneficio = await tipoBeneficioRepository.find();
    if (tiposBeneficio.length === 0) {
      console.log('Nenhum tipo de benefício encontrado. Não é possível criar solicitações.');
      return;
    }

    // Buscar unidades para associar às solicitações
    const unidades = await unidadeRepository.find();
    if (unidades.length === 0) {
      console.log('Nenhuma unidade encontrada. Não é possível criar solicitações.');
      return;
    }

    // Buscar usuários para associar às solicitações
    const usuarios = await usuarioRepository.find();
    if (usuarios.length === 0) {
      console.log('Nenhum usuário encontrado. Não é possível criar solicitações.');
      return;
    }

    // Filtrar usuários por papel
    const tecnicosSemtas = usuarios.filter(u => u.role === 'tecnico_semtas' || u.role === 'tecnico_unidade');
    const gestoresSemtas = usuarios.filter(u => u.role === 'gestor_semtas' || u.role === 'coordenador_unidade');
    
    if (tecnicosSemtas.length === 0 || gestoresSemtas.length === 0) {
      console.log('Não há técnicos ou gestores suficientes. Não é possível criar solicitações.');
      return;
    }

    // Gerar 100 solicitações de exemplo
    const solicitacoes = [];
    for (let i = 0; i < 100; i++) {
      // Selecionar cidadãos aleatórios para beneficiário e solicitante
      const beneficiario = faker.helpers.arrayElement(cidadaos);
      let solicitante = beneficiario;
      
      // Em 30% dos casos, o solicitante é diferente do beneficiário
      if (Math.random() <= 0.3) {
        do {
          solicitante = faker.helpers.arrayElement(cidadaos);
        } while (solicitante.id === beneficiario.id);
      }
      
      // Selecionar tipo de benefício aleatório
      const tipoBeneficio = faker.helpers.arrayElement(tiposBeneficio);
      
      // Selecionar unidade aleatória
      const unidade = faker.helpers.arrayElement(unidades);
      
      // Selecionar técnico aleatório
      const tecnico = faker.helpers.arrayElement(tecnicosSemtas);
      
      // Gerar status aleatório com distribuição ponderada
      const statusProbability = Math.random();
      let status;
      
      if (statusProbability < 0.15) {
        status = 'rascunho';
      } else if (statusProbability < 0.30) {
        status = 'aberta';
      } else if (statusProbability < 0.45) {
        status = 'em_analise';
      } else if (statusProbability < 0.55) {
        status = 'pendente';
      } else if (statusProbability < 0.70) {
        status = 'aprovada';
      } else if (statusProbability < 0.80) {
        status = 'liberada';
      } else if (statusProbability < 0.90) {
        status = 'concluida';
      } else if (statusProbability < 0.95) {
        status = 'indeferida';
      } else {
        status = 'cancelada';
      }
      
      // Gerar tipo de solicitação aleatório
      const tipoSolicitacao = faker.helpers.arrayElement(['novo', 'renovacao', 'prorrogacao']);
      
      // Gerar origem aleatória
      const origem = faker.helpers.arrayElement(['presencial', 'whatsapp']);
      
      // Gerar data de abertura (entre 1 ano atrás e hoje)
      const dataAbertura = faker.date.between({
        from: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        to: new Date()
      });
      
      // Gerar número de parcelas (1 a 6)
      const quantidadeParcelas = faker.number.int({ min: 1, max: 6 });
      
      // Gerar aprovador e data de aprovação se o status for 'aprovada' ou posterior
      let aprovador: any = null;
      let dataAprovacao: Date | null = null;
      
      if (['aprovada', 'liberada', 'concluida'].includes(status)) {
        aprovador = faker.helpers.arrayElement(gestoresSemtas);
        dataAprovacao = new Date(dataAbertura.getTime() + faker.number.int({ min: 2, max: 10 }) * 24 * 60 * 60 * 1000);
      }
      
      // Gerar liberador e data de liberação se o status for 'liberada' ou posterior
      let liberador: any = null;
      let dataLiberacao: Date | null = null;
      
      if (['liberada', 'concluida'].includes(status)) {
        liberador = faker.helpers.arrayElement(gestoresSemtas);
        dataLiberacao = dataAprovacao ? new Date(dataAprovacao.getTime() + faker.number.int({ min: 1, max: 5 }) * 24 * 60 * 60 * 1000) : new Date(dataAbertura.getTime() + faker.number.int({ min: 3, max: 15 }) * 24 * 60 * 60 * 1000);
      }
      
      // Gerar destinatário de pagamento (em 90% dos casos é o próprio beneficiário)
      let destinatarioPagamento = beneficiario;
      
      if (Math.random() <= 0.1) {
        do {
          destinatarioPagamento = faker.helpers.arrayElement(cidadaos);
        } while (destinatarioPagamento.id === beneficiario.id);
      }
      
      // Gerar valor pago (entre 80% e 100% do valor máximo do benefício)
      const valorPago = tipoBeneficio.valor_maximo 
        ? parseFloat((tipoBeneficio.valor_maximo * faker.number.float({ min: 0.8, max: 1, precision: 0.01 })).toFixed(2))
        : null;
      
      // Gerar pareceres técnicos se o status for 'em_analise' ou posterior
      const parecerTecnico = ['em_analise', 'pendente', 'aprovada', 'liberada', 'concluida', 'indeferida'].includes(status)
        ? faker.lorem.paragraph()
        : null;
      
      // Gerar parecer SEMTAS se o status for 'aprovada' ou posterior
      const parecerSemtas = ['aprovada', 'liberada', 'concluida'].includes(status)
        ? faker.lorem.paragraph()
        : null;
      
      // Gerar observações em 50% dos casos
      const observacoes = Math.random() <= 0.5 ? faker.lorem.paragraph() : null;
      
      // Gerar parentesco se o solicitante for diferente do beneficiário
      const parentesco = solicitante.id !== beneficiario.id 
        ? faker.helpers.arrayElement(['pai', 'mãe', 'filho', 'filha', 'irmão', 'irmã', 'avô', 'avó', 'tio', 'tia', 'outro'])
        : null;
      
      // Gerar protocolo único (ANO + SEQUENCIAL DE 6 DÍGITOS)
      const ano = dataAbertura.getFullYear();
      const sequencial = (i + 1).toString().padStart(6, '0');
      const protocolo = `${ano}${sequencial}`;
      
      // Criar solicitação
      const solicitacao = solicitacaoRepository.create({
        protocolo,
        beneficiario_id: beneficiario.id,
        solicitante_id: solicitante.id,
        tipo_beneficio_id: tipoBeneficio.id,
        unidade_id: unidade.id,
        tecnico_id: tecnico.id,
        tipo_solicitacao: tipoSolicitacao as any,
        quantidade_parcelas: quantidadeParcelas,
        data_abertura: dataAbertura,
        status: status as any,
        origem: origem as any,
        parecer_tecnico: parecerTecnico,
        parecer_semtas: parecerSemtas,
        aprovador_id: aprovador?.id || null,
        data_aprovacao: dataAprovacao,
        data_liberacao: dataLiberacao,
        liberador_id: liberador?.id || null,
        destinatario_pagamento_id: destinatarioPagamento.id,
        valor_pago: valorPago,
        observacoes,
        parentesco,
      });
      
      const solicitacaoSalva = await solicitacaoRepository.save(solicitacao as any);
      solicitacoes.push(solicitacaoSalva);
      console.log(`Solicitação ${protocolo} criada com sucesso.`);
      
      // Criar dados específicos do benefício
      if (tipoBeneficio.nome === 'Auxílio Natalidade') {
        await dadosBeneficiosRepository.save({
          solicitacao_id: solicitacaoSalva.id,
          tipo_beneficio: 'auxilio_natalidade' as any,
          valor_solicitado: tipoBeneficio.valor,
          data_prevista_parto: Math.random() <= 0.5 ? faker.date.recent(30) : null,
          data_nascimento: Math.random() > 0.5 ? faker.date.recent(30) : null,
          pre_natal: faker.datatype.boolean(),
          psf_ubs: faker.datatype.boolean(),
          gravidez_risco: faker.datatype.boolean(),
          gravidez_gemelar: Math.random() <= 0.1, // 10% de chance de gravidez gemelar
        });
      } else if (tipoBeneficio.nome === 'Aluguel Social') {
        await dadosBeneficiosRepository.save({
          solicitacao_id: solicitacaoSalva.id,
          tipo_beneficio: 'aluguel_social' as any,
          valor_solicitado: tipoBeneficio.valor,
          periodo_meses: quantidadeParcelas,
          motivo: faker.helpers.arrayElement([
            'Desabamento parcial da residência',
            'Incêndio',
            'Alagamento',
            'Risco de desabamento',
            'Despejo',
            'Violência doméstica',
            'Situação de rua'
          ]),
          valor_aluguel: parseFloat(faker.finance.amount(400, 800, 2)),
          endereco_aluguel: faker.location.streetAddress(),
          bairro_aluguel: faker.helpers.arrayElement([
            'Alecrim', 'Tirol', 'Petrópolis', 'Candelária', 'Capim Macio',
            'Ponta Negra', 'Lagoa Nova', 'Nova Descoberta', 'Cidade Alta', 'Ribeira'
          ]),
          cep_aluguel: faker.location.zipCode('########'),
          nome_proprietario: faker.person.fullName(),
          cpf_proprietario: faker.string.numeric(11),
          telefone_proprietario: faker.string.numeric(11),
          banco_proprietario: faker.helpers.arrayElement([
            'Banco do Brasil', 'Caixa Econômica Federal', 'Bradesco', 'Itaú', 'Santander', 'Nubank', 'Inter'
          ]),
          agencia_proprietario: faker.string.numeric(4),
          conta_proprietario: faker.string.numeric(8),
        });
      }
      
      // Criar histórico de solicitação
      // Sempre tem um registro de criação
      await historicoSolicitacaoRepository.save({
        solicitacao_id: solicitacaoSalva.id,
        status_anterior: null,
        status_novo: 'rascunho',
        usuario_id: tecnico.id,
        observacao: 'Solicitação criada',
        data_alteracao: dataAbertura,
      });
      
      // Se o status for diferente de rascunho, adicionar transição para 'aberta'
      if (status !== 'rascunho') {
        const dataAberturaSolicitacao = new Date(dataAbertura.getTime() + 1 * 60 * 60 * 1000); // 1 hora depois
        await historicoSolicitacaoRepository.save({
          solicitacao_id: solicitacaoSalva.id,
          status_anterior: 'rascunho',
          status_novo: 'aberta',
          usuario_id: tecnico.id,
          observacao: 'Solicitação aberta para análise',
          data_alteracao: dataAberturaSolicitacao,
        });
      }
      
      // Se o status for 'em_analise' ou posterior, adicionar transição
      if (['em_analise', 'pendente', 'aprovada', 'liberada', 'concluida', 'indeferida', 'cancelada'].includes(status)) {
        const dataAnalise = new Date(dataAbertura.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 dias depois
        await historicoSolicitacaoRepository.save({
          solicitacao_id: solicitacaoSalva.id,
          status_anterior: 'aberta',
          status_novo: 'em_analise',
          usuario_id: tecnico.id,
          observacao: 'Análise técnica iniciada',
          data_alteracao: dataAnalise,
        });
      }
      
      // Se o status for 'pendente', adicionar transição
      if (status === 'pendente') {
        const dataPendencia = new Date(dataAbertura.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 dias depois
        await historicoSolicitacaoRepository.save({
          solicitacao_id: solicitacaoSalva.id,
          status_anterior: 'em_analise',
          status_novo: 'pendente',
          usuario_id: tecnico.id,
          observacao: 'Documentação pendente solicitada ao beneficiário',
          data_alteracao: dataPendencia,
        });
      }
      
      // Se o status for 'aprovada' ou posterior, adicionar transição
      if (['aprovada', 'liberada', 'concluida'].includes(status) && aprovador) {
        await historicoSolicitacaoRepository.save({
          solicitacao_id: solicitacaoSalva.id,
          status_anterior: 'em_analise',
          status_novo: 'aprovada',
          usuario_id: aprovador.id,
          observacao: 'Benefício aprovado',
          data_alteracao: dataAprovacao,
        });
      }
      
      // Se o status for 'liberada' ou posterior, adicionar transição
      if (['liberada', 'concluida'].includes(status) && liberador && dataLiberacao) {
        await historicoSolicitacaoRepository.save({
          solicitacao_id: solicitacaoSalva.id,
          status_anterior: 'aprovada',
          status_novo: 'liberada',
          usuario_id: liberador.id,
          observacao: 'Benefício liberado para pagamento',
          data_alteracao: dataLiberacao,
        });
      }
      
      // Se o status for 'concluida', adicionar transição
      if (status === 'concluida' && liberador && dataLiberacao) {
        const dataConclusao = new Date(dataLiberacao.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 dias depois
        await historicoSolicitacaoRepository.save({
          solicitacao_id: solicitacaoSalva.id,
          status_anterior: 'liberada',
          status_novo: 'concluida',
          usuario_id: liberador.id,
          observacao: 'Benefício concedido e processo concluído',
          data_alteracao: dataConclusao,
        });
      }
      
      // Se o status for 'indeferida', adicionar transição
      if (status === 'indeferida') {
        const dataIndeferimento = new Date(dataAbertura.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 dias depois
        await historicoSolicitacaoRepository.save({
          solicitacao_id: solicitacaoSalva.id,
          status_anterior: 'em_analise',
          status_novo: 'indeferida',
          usuario_id: faker.helpers.arrayElement(gestoresSemtas).id,
          observacao: faker.helpers.arrayElement([
            'Não atende aos critérios de elegibilidade',
            'Documentação incompleta mesmo após notificação',
            'Renda familiar acima do limite permitido',
            'Benefício já concedido no período',
            'Informações inconsistentes'
          ]),
          data_alteracao: dataIndeferimento,
        });
      }
      
      // Se o status for 'cancelada', adicionar transição
      if (status === 'cancelada') {
        const dataCancelamento = new Date(dataAbertura.getTime() + faker.number.int({ min: 1, max: 10 }) * 24 * 60 * 60 * 1000);
        await historicoSolicitacaoRepository.save({
          solicitacao_id: solicitacaoSalva.id,
          status_anterior: faker.helpers.arrayElement(['rascunho', 'aberta', 'em_analise', 'pendente']),
          status_novo: 'cancelada',
          usuario_id: faker.helpers.arrayElement([...tecnicosSemtas, ...gestoresSemtas]).id,
          observacao: faker.helpers.arrayElement([
            'Cancelado a pedido do solicitante',
            'Duplicidade de solicitação',
            'Beneficiário não compareceu para complementar documentação',
            'Dados incorretos na solicitação'
          ]),
          data_alteracao: dataCancelamento,
        });
      }
      
      // Criar requisitos de benefício
      // Buscar requisitos documentais para o tipo de benefício
      const requisitosDocumento = await requisitoDocumentoRepository.find({
        where: { tipo_beneficio_id: tipoBeneficio.id }
      });
      
      if (requisitosDocumento.length > 0) {
        for (const requisito of requisitosDocumento) {
          // Determinar se o requisito foi atendido com base no status da solicitação
          let atendido = false;
          
          if (status === 'rascunho') {
            atendido = Math.random() <= 0.3; // 30% de chance
          } else if (status === 'aberta') {
            atendido = Math.random() <= 0.6; // 60% de chance
          } else if (status === 'em_analise') {
            atendido = Math.random() <= 0.7; // 70% de chance
          } else if (status === 'pendente') {
            atendido = Math.random() <= 0.5; // 50% de chance
          } else if (['aprovada', 'liberada', 'concluida'].includes(status)) {
            atendido = Math.random() <= 0.95; // 95% de chance
          } else if (status === 'indeferida') {
            atendido = Math.random() <= 0.4; // 40% de chance
          } else if (status === 'cancelada') {
            atendido = Math.random() <= 0.3; // 30% de chance
          }
          
          await requisitosBeneficioRepository.save({
            solicitacao_id: solicitacaoSalva.id,
            requisito_id: requisito.id,
            atendido,
            observacoes: atendido ? null : faker.helpers.arrayElement([
              'Documento não apresentado',
              'Documento ilegível',
              'Documento vencido',
              'Documento incompleto',
              'Documento não confere com as informações declaradas'
            ]),
            usuario_id: tecnico.id,
            data_verificacao: ['em_analise', 'pendente', 'aprovada', 'liberada', 'concluida', 'indeferida'].includes(status)
              ? new Date(dataAbertura.getTime() + faker.number.int({ min: 1, max: 5 }) * 24 * 60 * 60 * 1000)
              : null,
          });
          
          // Se o requisito foi atendido, criar um documento enviado
          if (atendido && ['aberta', 'em_analise', 'pendente', 'aprovada', 'liberada', 'concluida'].includes(status)) {
            await documentosEnviadosRepository.save({
              solicitacao_id: solicitacaoSalva.id,
              requisito_id: requisito.id,
              nome_arquivo: `${requisito.nome.toLowerCase().replace(/\s+/g, '_')}_${beneficiario.cpf}.pdf`,
              caminho_arquivo: `/uploads/documentos/${solicitacaoSalva.id}/${requisito.id}/${faker.string.uuid()}.pdf`,
              tamanho_bytes: faker.number.int({ min: 100000, max: 5000000 }),
              tipo_arquivo: 'application/pdf',
              fase: requisito.fase,
              observacoes: Math.random() <= 0.2 ? faker.lorem.sentence() : null,
              usuario_id: tecnico.id,
              data_upload: new Date(dataAbertura.getTime() + faker.number.int({ min: 1, max: 3 }) * 24 * 60 * 60 * 1000),
            });
          }
        }
      }
      
      // Criar pendências para solicitações com status 'pendente'
      if (status === 'pendente') {
        const numPendencias = faker.number.int({ min: 1, max: 3 });
        
        for (let j = 0; j < numPendencias; j++) {
          const tipoPendencia = faker.helpers.arrayElement(['documento', 'informacao', 'outro']);
          const dataLimite = new Date(dataAbertura.getTime() + faker.number.int({ min: 5, max: 15 }) * 24 * 60 * 60 * 1000);
          
          await pendenciaRepository.save({
            solicitacao_id: solicitacaoSalva.id,
            tipo: tipoPendencia,
            descricao: tipoPendencia === 'documento'
              ? faker.helpers.arrayElement([
                  'Apresentar comprovante de residência atualizado',
                  'Apresentar declaração de composição familiar',
                  'Apresentar laudo médico atualizado',
                  'Apresentar comprovante de renda de todos os membros da família',
                  'Apresentar documento de identidade legível'
                ])
              : tipoPendencia === 'informacao'
                ? faker.helpers.arrayElement([
                    'Informar dados bancários corretos',
                    'Esclarecer divergência de informações sobre renda',
                    'Confirmar endereço atual',
                    'Informar contato atualizado',
                    'Esclarecer situação de moradia'
                  ])
                : faker.helpers.arrayElement([
                    'Comparecer à unidade para entrevista',
                    'Assinar termo de compromisso',
                    'Realizar cadastro no CadÚnico',
                    'Atualizar cadastro no CadÚnico'
                  ]),
            status: faker.helpers.arrayElement(['aberta', 'em_analise', 'resolvida']),
            data_limite: dataLimite,
            data_resolucao: Math.random() <= 0.4 ? new Date(dataLimite.getTime() - faker.number.int({ min: 1, max: 5 }) * 24 * 60 * 60 * 1000) : null,
            usuario_criacao_id: tecnico.id,
            usuario_resolucao_id: Math.random() <= 0.4 ? tecnico.id : null,
            observacao: Math.random() <= 0.5 ? faker.lorem.sentence() : null,
          });
        }
      }
      
      // Criar ocorrências para algumas solicitações (30% de chance)
      if (Math.random() <= 0.3) {
        const numOcorrencias = faker.number.int({ min: 1, max: 3 });
        
        for (let j = 0; j < numOcorrencias; j++) {
          const tipoOcorrencia = faker.helpers.arrayElement(['observacao', 'alteracao', 'irregularidade', 'outro']);
          
          await ocorrenciaRepository.save({
            solicitacao_id: solicitacaoSalva.id,
            tipo: tipoOcorrencia,
            descricao: tipoOcorrencia === 'observacao'
              ? faker.helpers.arrayElement([
                  'Beneficiário demonstrou dificuldade de compreensão',
                  'Beneficiário em situação de extrema vulnerabilidade',
                  'Família com crianças em situação de risco',
                  'Idoso sem rede de apoio familiar',
                  'Caso requer acompanhamento do CREAS'
                ])
              : tipoOcorrencia === 'alteracao'
                ? faker.helpers.arrayElement([
                    'Alteração de endereço durante o processo',
                    'Alteração na composição familiar',
                    'Alteração na situação de renda',
                    'Alteração no valor solicitado',
                    'Alteração no tipo de benefício solicitado'
                  ])
                : tipoOcorrencia === 'irregularidade'
                  ? faker.helpers.arrayElement([
                      'Suspeita de informações falsas',
                      'Documentação com indícios de adulteração',
                      'Beneficiário já recebeu o mesmo benefício em outro município',
                      'Divergência entre declaração e verificação in loco',
                      'Denúncia de terceiros sobre situação do beneficiário'
                    ])
                  : faker.helpers.arrayElement([
                      'Caso encaminhado para acompanhamento psicossocial',
                      'Necessidade de visita domiciliar',
                      'Caso discutido em reunião de equipe',
                      'Beneficiário solicitou urgência na análise'
                    ]),
            usuario_id: faker.helpers.arrayElement([...tecnicosSemtas, ...gestoresSemtas]).id,
            data_ocorrencia: new Date(dataAbertura.getTime() + faker.number.int({ min: 1, max: 30 }) * 24 * 60 * 60 * 1000),
          });
        }
      }
    }

    console.log('Seed de solicitações concluído com sucesso!');
  }
}
