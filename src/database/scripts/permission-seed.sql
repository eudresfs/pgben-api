-- Script de seed para permissões granulares do PGBen
-- Este script insere as permissões básicas necessárias para o sistema
-- Também estabelece a relação entre roles e permissões

-- Limpar dados existentes (opcional, descomente se necessário)
-- DELETE FROM usuario_permissao;
-- DELETE FROM role_permission WHERE permissao_id IN (SELECT id FROM permissao WHERE nome LIKE '%.%');
-- DELETE FROM escopo_permissao WHERE permissao_id IN (SELECT id FROM permissao WHERE nome LIKE '%.%');
-- DELETE FROM permissao WHERE nome LIKE '%.%';

-- Função auxiliar para criar permissões
CREATE OR REPLACE FUNCTION create_permission(
  p_nome VARCHAR, 
  p_descricao VARCHAR, 
  p_composta BOOLEAN, 
  p_tipo_escopo VARCHAR DEFAULT 'GLOBAL'
) RETURNS UUID AS $$
DECLARE
  v_permission_id UUID;
BEGIN
  -- Verifica se a permissão já existe
  SELECT id INTO v_permission_id FROM permissao WHERE nome = p_nome;
  
  IF v_permission_id IS NULL THEN
    -- Insere nova permissão
    INSERT INTO permissao (id, nome, descricao, composta, created_at, updated_at)
    VALUES (gen_random_uuid(), p_nome, p_descricao, p_composta, NOW(), NOW())
    RETURNING id INTO v_permission_id;
    
    -- Cria o escopo para a permissão
    INSERT INTO escopo_permissao (id, permissao_id, tipo_escopo_padrao, created_at, updated_at)
    VALUES (gen_random_uuid(), v_permission_id, p_tipo_escopo, NOW(), NOW());
    
    RAISE NOTICE 'Permissão criada: % (ID: %)', p_nome, v_permission_id;
  ELSE
    -- Atualiza permissão existente
    UPDATE permissao 
    SET descricao = p_descricao, composta = p_composta, updated_at = NOW()
    WHERE id = v_permission_id;
    
    -- Atualiza ou cria escopo
    INSERT INTO escopo_permissao (id, permissao_id, tipo_escopo_padrao, created_at, updated_at)
    VALUES (gen_random_uuid(), v_permission_id, p_tipo_escopo, NOW(), NOW())
    ON CONFLICT (permissao_id) 
    DO UPDATE SET tipo_escopo_padrao = p_tipo_escopo, updated_at = NOW();
    
    RAISE NOTICE 'Permissão atualizada: % (ID: %)', p_nome, v_permission_id;
  END IF;
  
  RETURN v_permission_id;
END;
$$ LANGUAGE plpgsql;

-- Função para associar permissão à role
CREATE OR REPLACE FUNCTION assign_permission_to_role(
  p_permission_name VARCHAR,
  p_role_name VARCHAR
) RETURNS VOID AS $$
DECLARE
  v_permission_id UUID;
  v_role_id UUID;
BEGIN
  -- Obter IDs
  SELECT id INTO v_permission_id FROM permissao WHERE nome = p_permission_name;
  SELECT id INTO v_role_id FROM role WHERE name = p_role_name;
  
  IF v_permission_id IS NULL THEN
    RAISE EXCEPTION 'Permissão não encontrada: %', p_permission_name;
  END IF;
  
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role não encontrada: %', p_role_name;
  END IF;
  
  -- Associar permissão à role
  INSERT INTO role_permission (id, role_id, permission_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_role_id, v_permission_id, NOW(), NOW())
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  RAISE NOTICE 'Permissão % associada à role %', p_permission_name, p_role_name;
END;
$$ LANGUAGE plpgsql;

-- Criar permissões raiz para cada módulo
SELECT create_permission('usuario.*', 'Todas as permissões do módulo de usuários', TRUE);
SELECT create_permission('cidadao.*', 'Todas as permissões do módulo de cidadãos', TRUE);
SELECT create_permission('beneficio.*', 'Todas as permissões do módulo de benefícios', TRUE);
SELECT create_permission('solicitacao.*', 'Todas as permissões do módulo de solicitações', TRUE);
SELECT create_permission('documento.*', 'Todas as permissões do módulo de documentos', TRUE);
SELECT create_permission('auditoria.*', 'Todas as permissões do módulo de auditoria', TRUE);
SELECT create_permission('unidade.*', 'Todas as permissões do módulo de unidades', TRUE);
SELECT create_permission('relatorio.*', 'Todas as permissões do módulo de relatórios', TRUE);
SELECT create_permission('configuracao.*', 'Todas as permissões do módulo de configurações', TRUE);

-- Criar permissões básicas do módulo de unidades
SELECT create_permission('unidade.listar', 'Listar unidades', FALSE, 'UNIDADE');
SELECT create_permission('unidade.visualizar', 'Visualizar detalhes de uma unidade', FALSE, 'UNIDADE');
SELECT create_permission('unidade.criar', 'Criar unidades', FALSE, 'GLOBAL');
SELECT create_permission('unidade.editar', 'Editar unidades', FALSE, 'GLOBAL');
SELECT create_permission('unidade.desativar', 'Desativar unidades', FALSE, 'GLOBAL');
SELECT create_permission('unidade.ativar', 'Ativar unidades', FALSE, 'GLOBAL');

-- Criar permissões detalhadas do módulo de cidadão
SELECT create_permission('cidadao.listar', 'Listar cidadãos com filtros e paginação', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.visualizar', 'Visualizar detalhes de um cidadão específico', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.criar', 'Criar um novo cidadão no sistema', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.editar', 'Editar informações de um cidadão existente', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.excluir', 'Excluir um cidadão do sistema', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.buscar_cpf', 'Buscar cidadão por CPF', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.buscar_nis', 'Buscar cidadão por NIS', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.exportar', 'Exportar lista de cidadãos em formato CSV ou Excel', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.importar', 'Importar lista de cidadãos de arquivo CSV ou Excel', FALSE, 'UNIDADE');

-- Permissões para gestão de endereços de cidadãos
SELECT create_permission('cidadao.endereco.visualizar', 'Visualizar endereços de um cidadão', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.endereco.criar', 'Adicionar um novo endereço para um cidadão', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.endereco.editar', 'Editar um endereço existente de um cidadão', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.endereco.excluir', 'Excluir um endereço de um cidadão', FALSE, 'UNIDADE');

-- Permissões para gestão de contatos de cidadãos
SELECT create_permission('cidadao.contato.visualizar', 'Visualizar contatos de um cidadão', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.contato.criar', 'Adicionar um novo contato para um cidadão', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.contato.editar', 'Editar um contato existente de um cidadão', FALSE, 'UNIDADE');
SELECT create_permission('cidadao.contato.excluir', 'Excluir um contato de um cidadão', FALSE, 'UNIDADE');

-- Mapear permissões para a role ADMIN
DO $$
DECLARE
  permission_names VARCHAR[] := ARRAY[
    'usuario.*', 'cidadao.*', 'beneficio.*', 'solicitacao.*', 
    'documento.*', 'auditoria.*', 'unidade.*', 'relatorio.*', 'configuracao.*'
  ];
  pname VARCHAR;
BEGIN
  FOREACH pname IN ARRAY permission_names LOOP
    PERFORM assign_permission_to_role(pname, 'ADMIN');
  END LOOP;
END $$;

-- Remover funções temporárias
DROP FUNCTION IF EXISTS create_permission;
DROP FUNCTION IF EXISTS assign_permission_to_role;
