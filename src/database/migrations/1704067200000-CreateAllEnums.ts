import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAllEnums1704067200000 implements MigrationInterface {
  name = 'CreateAllEnums1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar todos os enums necessários baseados nas entities
    // Usando sintaxe compatível com PostgreSQL 14

    // Enum para status de solicitação
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_solicitacao_enum" AS ENUM (
                   'rascunho', 'aberta', 'em_analise', 'pendente', 'aguardando_documentos',
                   'aprovada', 'indeferida', 'liberada', 'em_processamento',
                   'arquivada', 'rejeitada', 'cancelada', 'concluida'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para estado civil
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "estado_civil_enum" AS ENUM (
                    'solteiro', 'casado', 'divorciado', 'viuvo'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipos de benefício
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_beneficio_enum" AS ENUM (
                    'natalidade', 'funeral', 'aluguel_social', 'cesta_basica'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipos de unidade
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_unidade_enum" AS ENUM (
                    'sede', 'filial', 'regional'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para status de unidade
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_unidade_enum" AS ENUM (
                    'ativo', 'inativo', 'manutencao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para sexo
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "sexo_enum" AS ENUM (
                    'masculino', 'feminino', 'outro'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para escolaridade
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "escolaridade_enum" AS ENUM (
                    'analfabeto', 'fundamental_incompleto', 'fundamental_completo', 
                    'medio_incompleto', 'medio_completo', 'superior_incompleto', 
                    'superior_completo', 'pos_graduacao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para parentesco
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "parentesco_enum" AS ENUM (
                    'pai', 'mae', 'filho', 'conjuge', 'irmao', 'avo', 'neto', 'tio', 'sobrinho', 'outro'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para situação de trabalho
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "situacao_trabalho_enum" AS ENUM (
                    'empregado', 'desempregado', 'empregado_formal', 'empregado_informal', 'autonomo', 'aposentado', 'pensionista', 'beneficiario_bpc', 'outro', 'estudante', 'do_lar'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para periodicidade
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "periodicidade_enum" AS ENUM (
                    'unica', 'mensal', 'trimestral', 'semestral', 'anual'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para status de pendência
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_pendencia_enum" AS ENUM (
                    'aberta', 'em_resolucao', 'resolvida', 'cancelada'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para método de confirmação
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "metodo_confirmacao_enum" AS ENUM (
                    'presencial', 'telefone', 'email', 'sms'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para status de pagamento
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_pagamento_enum" AS ENUM (
                    'pendente', 'processando', 'pago', 'cancelado', 'estornado'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para método de pagamento
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "metodo_pagamento_enum" AS ENUM (
                    'pix', 'ted', 'dinheiro', 'cartao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de métrica
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_metrica_enum" AS ENUM (
                    'counter', 'gauge', 'histogram', 'summary'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para categoria de métrica
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "categoria_metrica_enum" AS ENUM (
                    'sistema', 'negocio', 'performance', 'seguranca'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para nível de alerta
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "nivel_alerta_enum" AS ENUM (
                    'info', 'warning', 'error', 'critical'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de documento
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_documento_enum" AS ENUM (
                    -- Documentos de identificação
                    'cpf', 'rg', 'cnh', 'passaporte',
                    
                    -- Certidões
                    'certidao_nascimento', 'certidao_casamento', 'certidao_obito',
                    
                    -- Comprovantes básicos
                    'comprovante_residencia', 'comprovante_renda', 'comprovante_escolaridade',
                    
                    -- Documentos médicos e de saúde
                    'declaracao_medica', 'cartao_vacina', 'cartao_sus', 'laudo_medico', 'atestado_medico', 'exame_pre_natal',
                    
                    -- Documentos habitacionais
                    'contrato_aluguel', 'escritura_imovel', 'iptu', 'conta_agua', 'conta_luz', 'conta_telefone',
                    
                    -- Documentos trabalhistas e previdenciários
                    'carteira_trabalho', 'comprovante_desemprego', 'extrato_fgts', 'comprovante_aposentadoria', 'comprovante_pensao', 'comprovante_beneficio_inss',
                    
                    -- Documentos bancários
                    'extrato_bancario', 'comprovante_pix', 'dados_bancarios',
                    
                    -- Documentos familiares e sociais
                    'declaracao_composicao_familiar', 'declaracao_uniao_estavel', 'guarda_menor', 'tutela',
                    
                    -- Documentos específicos para benefícios
                    'boletim_ocorrencia', 'medida_protetiva', 'termo_acolhimento', 'relatorio_social', 'parecer_tecnico',
                    
                    -- Documentos de programas sociais
                    'cartao_cadunico', 'folha_resumo_cadunico', 'comprovante_bolsa_familia', 'comprovante_bpc',
                    
                    -- Documentos educacionais
                    'declaracao_escolar', 'historico_escolar', 'matricula_escolar',
                    
                    -- Documentos específicos para mortalidade
                    'declaracao_obito', 'autorizacao_sepultamento', 'comprovante_parentesco',
                    
                    -- Documentos específicos para natalidade
                    'cartao_pre_natal', 'declaracao_nascido_vivo', 'comprovante_gestacao',
                    
                    -- Documentos específicos para passagens
                    'comprovante_viagem', 'autorizacao_viagem', 'bilhete_passagem',
                    
                    -- Documentos específicos para hipossuficiência
                    'declaracao_hipossuficiencia',
                    
                    -- Documentos diversos
                    'procuracao', 'termo_responsabilidade', 'foto_3x4', 'outro'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de papel
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_papel_enum" AS ENUM (
                    'beneficiario', 'requerente', 'representante_legal'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de moradia
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_moradia_enum" AS ENUM (
                    'propria', 'alugada', 'cedida', 'financiada', 'outros'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de integração
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "integracao_tipo_enum" AS ENUM (
                    'rest', 'soap', 'graphql', 'webhook'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de urna funerária
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_urna_enum" AS ENUM (
                    'padrao',
                    'especial',
                    'infantil',
                    'obeso'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para periodicidade de entrega
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "periodicidade_entrega_enum" AS ENUM (
                    'unica',
                    'semanal',
                    'quinzenal',
                    'mensal',
                    'bimestral',
                    'trimestral',
                    'semestral',
                    'anual'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de avaliação
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_avaliacao_enum" AS ENUM (
                    'social',
                    'economica',
                    'psicologica',
                    'medica',
                    'juridica',
                    'tecnica',
                    'administrativa'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para resultado de avaliação
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "resultado_avaliacao_enum" AS ENUM (
                    'aprovado',
                    'reprovado',
                    'pendente',
                    'em_analise',
                    'necessita_complementacao',
                    'cancelado'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para origem de solicitação
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "origem_solicitacao_enum" AS ENUM (
                    'presencial',
                    'online',
                    'telefone',
                    'mobile',
                    'terceiros',
                    'oficio',
                    'sistema_integrado'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de solicitação
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_solicitacao_enum" AS ENUM (
                    'beneficio_eventual',
                    'auxilio_natalidade',
                    'auxilio_funeral',
                    'auxilio_vulnerabilidade',
                    'cesta_basica',
                    'passagem',
                    'medicamento',
                    'material_construcao',
                    'outro'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para formato de relatório
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "formato_relatorio_enum" AS ENUM (
                    'pdf',
                    'excel',
                    'csv',
                    'json',
                    'xml',
                    'html'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de relatório
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_relatorio_enum" AS ENUM (
                    'beneficiarios',
                    'beneficios',
                    'solicitacoes',
                    'pagamentos',
                    'estatisticas',
                    'auditoria',
                    'financeiro',
                    'operacional',
                    'gerencial'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para status de geração
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_geracao_enum" AS ENUM (
                    'pendente',
                    'em_processamento',
                    'concluido',
                    'erro',
                    'cancelado'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para estratégia de amostragem
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "estrategia_amostragem_enum" AS ENUM (
                    'completa', 'aleatoria', 'intervalo', 'percentual'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de agendamento
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_agendamento_enum" AS ENUM (
                    'unico', 'recorrente', 'condicional'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para canal de notificação
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "canal_notificacao_enum" AS ENUM (
                    'email', 'sms', 'push', 'whatsapp', 'interno'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de escopo
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_escopo_enum" AS ENUM (
                    'global', 'unidade', 'setor', 'usuario'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de evento de integração
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_evento_integracao_enum" AS ENUM (
                    'criacao', 'atualizacao', 'exclusao', 'consulta'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para motivo de aluguel social
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "motivo_aluguel_social_enum" AS ENUM (
                    'desastre_natural', 'incendio', 'desabamento', 'risco_estrutural', 
                    'remocao_area_risco', 'violencia_domestica', 'vulnerabilidade_extrema'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de entrega de cesta básica
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_entrega_cesta_basica_enum" AS ENUM (
                    'presencial', 'domiciliar', 'ponto_coleta', 'parceiro'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para periodicidade de cesta básica
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "periodicidade_cesta_basica_enum" AS ENUM (
                    'unica', 'semanal', 'quinzenal', 'mensal'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para status de verificação de documento
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_verificacao_documento_enum" AS ENUM (
                    'pendente', 'em_analise', 'verificado', 'rejeitado'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para resultado de verificação de malware
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "resultado_verificacao_malware_enum" AS ENUM (
                    'seguro', 'suspeito', 'infectado', 'erro_verificacao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de documento enviado
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_documento_enviado_enum" AS ENUM (
                    'identificacao', 'comprovante', 'declaracao', 'laudo', 'formulario'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de configuração
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_configuracao_enum" AS ENUM (
                    'sistema', 'modulo', 'funcionalidade', 'integracao', 'notificacao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para visibilidade de configuração
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "visibilidade_configuracao_enum" AS ENUM (
                    'publica', 'privada', 'restrita', 'admin'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de trabalho
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_trabalho_enum" AS ENUM (
                    'clt', 'autonomo', 'servidor_publico', 'empresario', 'informal', 'outro'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para fase de requisito
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "fase_requisito_enum" AS ENUM (
                    'inscricao', 'analise', 'aprovacao', 'concessao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de campo
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_campo_enum" AS ENUM (
                    'texto', 'numero', 'data', 'booleano', 'selecao', 'multipla_escolha', 'arquivo'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para tipo de operação
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tipo_operacao_enum" AS ENUM (
                    'criacao', 'leitura', 'atualizacao', 'exclusao', 'autenticacao'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para status ativo
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_ativo_enum" AS ENUM (
                    'ativo', 'inativo'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para status de usuário
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_usuario_enum" AS ENUM (
                    'ativo', 'inativo', 'suspenso', 'bloqueado'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para prioridade
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "prioridade_enum" AS ENUM (
                    'baixa', 'media', 'alta', 'critica'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Enum para status de notificação
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "status_notificacao_enum" AS ENUM (
                    'pendente', 'enviada', 'entregue', 'lida', 'erro', 'cancelada'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover todos os enums
    const enumsToRemove = [
      'status_notificacao_enum',
      'prioridade_enum',
      'status_usuario_enum',
      'status_ativo_enum',
      'tipo_operacao_enum',
      'tipo_campo_enum',
      'fase_requisito_enum',
      'tipo_trabalho_enum',
      'visibilidade_configuracao_enum',
      'tipo_configuracao_enum',
      'tipo_documento_enviado_enum',
      'resultado_verificacao_malware_enum',
      'status_verificacao_documento_enum',
      'periodicidade_cesta_basica_enum',
      'tipo_entrega_cesta_basica_enum',
      'motivo_aluguel_social_enum',
      'tipo_evento_integracao_enum',
      'tipo_escopo_enum',
      'canal_notificacao_enum',
      'tipo_agendamento_enum',
      'estrategia_amostragem_enum',
      'status_geracao_enum',
      'tipo_relatorio_enum',
      'formato_relatorio_enum',
      'tipo_solicitacao_enum',
      'origem_solicitacao_enum',
      'resultado_avaliacao_enum',
      'tipo_avaliacao_enum',
      'periodicidade_entrega_enum',
      'tipo_urna_funeraria_enum',
      'integracao_tipo_enum',
      'tipo_moradia_enum',
      'tipo_papel_enum',
      'tipo_documento_enum',
      'nivel_alerta_enum',
      'categoria_metrica_enum',
      'tipo_metrica_enum',
      'metodo_pagamento_enum',
      'status_pagamento_enum',
      'metodo_confirmacao_enum',
      'status_pendencia_enum',
      'periodicidade_enum',
      'situacao_trabalho_enum',
      'parentesco_enum',
      'escolaridade_enum',
      'sexo_enum',
      'status_unidade_enum',
      'tipo_unidade_enum',
      'tipo_beneficio_enum',
      'status_solicitacao_enum',
    ];

    for (const enumName of enumsToRemove) {
      await queryRunner.query(`DROP TYPE IF EXISTS "${enumName}" CASCADE;`);
    }
  }
}
