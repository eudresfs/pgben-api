import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateDadosBeneficios1704067227000 implements MigrationInterface {
    name = 'CreateDadosBeneficios1704067227000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Criar ENUM para público prioritário do Aluguel Social
        await queryRunner.query(`
            CREATE TYPE "publico_prioritario_aluguel_enum" AS ENUM (
                'IDOSO_ACIMA_60',
                'PESSOA_DEFICIENCIA',
                'FAMILIA_CRIANCA_0_6',
                'GESTANTE',
                'NUTRIZ',
                'FAMILIA_ADOLESCENTE',
                'SITUACAO_RUA',
                'CATADOR_RECICLAVEL',
                'FAMILIA_INDIGENA',
                'FAMILIA_QUILOMBOLA',
                'FAMILIA_CIGANA',
                'FAMILIA_RIBEIRINHA',
                'FAMILIA_EXTRATIVISTA',
                'FAMILIA_PESCADOR',
                'FAMILIA_PERTENCENTE_COMUNIDADE_TRADICIONAL',
                'FAMILIA_ASSENTADA_REFORMA_AGRARIA',
                'FAMILIA_ACAMPADA',
                'FAMILIA_ATINGIDA_EMPREENDIMENTOS_INFRAESTRUTURA',
                'FAMILIA_PRISIONAL',
                'FAMILIA_MEDIDAS_SOCIOEDUCATIVAS'
            )
        `);

        // Criar ENUM para especificação do Aluguel Social
        await queryRunner.query(`
            CREATE TYPE "especificacao_aluguel_enum" AS ENUM (
                'SITUACAO_EMERGENCIAL',
                'VULNERABILIDADE_TEMPORARIA',
                'PROCESSO_REASSENTAMENTO',
                'VIOLENCIA_DOMESTICA',
                'CALAMIDADE_PUBLICA',
                'DESPEJO_JUDICIAL',
                'CONDICOES_INSALUBRES_MORADIA'
            )
        `);

        // Criar ENUM para tipo de urna (Auxílio Funeral)
        await queryRunner.query(`
            CREATE TYPE "tipo_urna_enum" AS ENUM (
                'PADRAO',
                'ESPECIAL',
                'INFANTIL',
                'OBESO'
            )
        `);

        // Criar ENUM para origem do atendimento (Cesta Básica)
        await queryRunner.query(`
            CREATE TYPE "origem_atendimento_enum" AS ENUM (
                'CRAS',
                'CREAS',
                'CENTRO_POP',
                'UNIDADE_ACOLHIMENTO',
                'CONSELHO_TUTELAR',
                'MINISTERIO_PUBLICO',
                'DEFENSORIA_PUBLICA',
                'PODER_JUDICIARIO',
                'ENCAMINHAMENTO_EXTERNO',
                'DEMANDA_ESPONTANEA'
            )
        `);

        // Criar tabela de dados específicos para Auxílio Natalidade
        await queryRunner.query(`
            CREATE TABLE "dados_natalidade" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "solicitacao_id" uuid NOT NULL,
                "realiza_pre_natal" boolean NOT NULL,
                "atendida_psf_ubs" boolean NOT NULL DEFAULT false,
                "gravidez_risco" boolean NOT NULL DEFAULT false,
                "data_provavel_parto" date,
                "gemeos_trigemeos" boolean NOT NULL DEFAULT false,
                "ja_tem_filhos" boolean NOT NULL DEFAULT false,
                "quantidade_filhos" integer DEFAULT 0,
                "telefone_cadastrado_cpf" character varying,
                "chave_pix" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_dados_natalidade" PRIMARY KEY ("id"),
                CONSTRAINT "FK_dados_natalidade_solicitacao" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao"("id") ON DELETE CASCADE,
                CONSTRAINT "UQ_dados_natalidade_solicitacao" UNIQUE ("solicitacao_id")
            )
        `);

        // Criar tabela de dados específicos para Aluguel Social
        await queryRunner.query(`
            CREATE TABLE "dados_aluguel_social" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "solicitacao_id" uuid NOT NULL,
                "publico_prioritario" "publico_prioritario_aluguel_enum" NOT NULL,
                "especificacoes" "especificacao_aluguel_enum"[] NOT NULL,
                "situacao_moradia_atual" character varying NOT NULL,
                "possui_imovel_interditado" boolean NOT NULL DEFAULT false,
                "caso_judicializado_maria_penha" boolean NOT NULL DEFAULT false,
                "valor_aluguel_pretendido" decimal(10,2),
                "endereco_imovel_pretendido" character varying,
                "nome_locador" character varying,
                "cpf_locador" character varying,
                "telefone_locador" character varying,
                "dados_bancarios_locador" character varying,
                "observacoes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_dados_aluguel_social" PRIMARY KEY ("id"),
                CONSTRAINT "FK_dados_aluguel_social_solicitacao" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao"("id") ON DELETE CASCADE,
                CONSTRAINT "UQ_dados_aluguel_social_solicitacao" UNIQUE ("solicitacao_id")
            )
        `);

        // Criar tabela de dados específicos para Auxílio Funeral
        await queryRunner.query(`
            CREATE TABLE "dados_funeral" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "solicitacao_id" uuid NOT NULL,
                "nome_completo_falecido" character varying NOT NULL,
                "data_obito" date NOT NULL,
                "local_obito" character varying NOT NULL,
                "data_autorizacao" date,
                "grau_parentesco_requerente" "parentesco_enum" NOT NULL,
                "tipo_urna_necessaria" "tipo_urna_enum" NOT NULL DEFAULT 'PADRAO',
                "valor_solicitado" decimal(10,2),
                "declaracao_custos_funeral" text,
                "observacoes" text,
                "inclui_despesas_sepultamento" boolean NOT NULL DEFAULT true,
                "servico_sobreaviso" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_dados_funeral" PRIMARY KEY ("id"),
                CONSTRAINT "FK_dados_funeral_solicitacao" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao"("id") ON DELETE CASCADE,
                CONSTRAINT "UQ_dados_funeral_solicitacao" UNIQUE ("solicitacao_id")
            )
        `);

        // Criar tabela de dados específicos para Cesta Básica
        await queryRunner.query(`
            CREATE TABLE "dados_cesta_basica" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "solicitacao_id" uuid NOT NULL,
                "quantidade_cestas_solicitadas" integer NOT NULL,
                "periodo_concessao" "periodicidade_enum" NOT NULL DEFAULT 'UNICA',
                "origem_atendimento" "origem_atendimento_enum" NOT NULL,
                "numero_pessoas_familia" integer NOT NULL,
                "justificativa_quantidade" text,
                "observacoes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_dados_cesta_basica" PRIMARY KEY ("id"),
                CONSTRAINT "FK_dados_cesta_basica_solicitacao" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao"("id") ON DELETE CASCADE,
                CONSTRAINT "UQ_dados_cesta_basica_solicitacao" UNIQUE ("solicitacao_id")
            )
        `);

        // Criar índices para as tabelas de dados específicos
        await queryRunner.query(`
            CREATE INDEX "IDX_dados_natalidade_solicitacao" ON "dados_natalidade" ("solicitacao_id")
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_dados_aluguel_social_solicitacao" ON "dados_aluguel_social" ("solicitacao_id")
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_dados_funeral_solicitacao" ON "dados_funeral" ("solicitacao_id")
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_dados_cesta_basica_solicitacao" ON "dados_cesta_basica" ("solicitacao_id")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dados_natalidade_solicitacao"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dados_aluguel_social_solicitacao"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dados_funeral_solicitacao"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dados_cesta_basica_solicitacao"`);

    // Remover tabelas de dados específicos
    await queryRunner.query(`DROP TABLE IF EXISTS "dados_natalidade"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dados_aluguel_social"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dados_funeral"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dados_cesta_basica"`);

    // Remover ENUMs
    await queryRunner.query(`DROP TYPE IF EXISTS "origem_atendimento_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "periodicidade_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_urna_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "especificacao_aluguel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "publico_prioritario_aluguel_enum"`);
  }
}
