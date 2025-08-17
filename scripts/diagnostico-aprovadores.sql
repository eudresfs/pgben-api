-- Script de diagnóstico para verificar a configuração de aprovadores
-- Identifica problemas relacionados ao erro "Aprovador não encontrado"

-- 1. Verificar ações de aprovação ativas
SELECT 
    'AÇÕES DE APROVAÇÃO ATIVAS' as categoria,
    COUNT(*) as quantidade
FROM acoes_aprovacao 
WHERE ativo = true;

-- 2. Listar ações de aprovação e seus aprovadores
SELECT 
    aa.nome as acao_nome,
    aa.tipo_acao,
    aa.estrategia,
    COUNT(a.id) as total_aprovadores_ativos
FROM acoes_aprovacao aa
LEFT JOIN aprovadores a ON aa.id = a.acao_aprovacao_id AND a.ativo = true
WHERE aa.ativo = true
GROUP BY aa.id, aa.nome, aa.tipo_acao, aa.estrategia
ORDER BY total_aprovadores_ativos ASC;

-- 3. Identificar ações sem aprovadores (PROBLEMA PRINCIPAL)
SELECT 
    'AÇÕES SEM APROVADORES' as problema,
    aa.id as acao_id,
    aa.nome as acao_nome,
    aa.tipo_acao,
    aa.estrategia
FROM acoes_aprovacao aa
LEFT JOIN aprovadores a ON aa.id = a.acao_aprovacao_id AND a.ativo = true
WHERE aa.ativo = true
GROUP BY aa.id, aa.nome, aa.tipo_acao, aa.estrategia
HAVING COUNT(a.id) = 0;

-- 4. Verificar solicitações pendentes sem aprovadores
SELECT 
    'SOLICITAÇÕES PENDENTES SEM APROVADORES' as problema,
    s.codigo,
    s.status,
    aa.nome as acao_nome,
    aa.tipo_acao,
    s.created_at
FROM solicitacoes_aprovacao s
LEFT JOIN acoes_aprovacao aa ON s.acao_aprovacao_id = aa.id
LEFT JOIN aprovadores a ON a.solicitacao_aprovacao_id = s.id AND a.ativo = true
WHERE s.status = 'pendente'
GROUP BY s.id, s.codigo, s.status, aa.nome, aa.tipo_acao, s.created_at
HAVING COUNT(a.id) = 0
ORDER BY s.created_at DESC
LIMIT 10;

-- 5. Verificar integridade dos dados
SELECT 
    'APROVADORES ÓRFÃOS' as problema,
    COUNT(*) as quantidade
FROM aprovadores a
LEFT JOIN acoes_aprovacao aa ON a.acao_aprovacao_id = aa.id
WHERE aa.id IS NULL;

SELECT 
    'SOLICITAÇÕES SEM AÇÃO' as problema,
    COUNT(*) as quantidade
FROM solicitacoes_aprovacao s
LEFT JOIN acoes_aprovacao aa ON s.acao_aprovacao_id = aa.id
WHERE aa.id IS NULL;

-- 6. Estatísticas gerais
SELECT 
    'TOTAL AÇÕES ATIVAS' as metrica,
    COUNT(*) as valor
FROM acoes_aprovacao 
WHERE ativo = true
UNION ALL
SELECT 
    'TOTAL APROVADORES ATIVOS' as metrica,
    COUNT(*) as valor
FROM aprovadores 
WHERE ativo = true
UNION ALL
SELECT 
    'SOLICITAÇÕES PENDENTES' as metrica,
    COUNT(*) as valor
FROM solicitacoes_aprovacao 
WHERE status = 'pendente'
UNION ALL
SELECT 
    'SOLICITAÇÕES HOJE' as metrica,
    COUNT(*) as valor
FROM solicitacoes_aprovacao 
WHERE DATE(created_at) = CURRENT_DATE;

-- 7. Exemplo de correção para adicionar aprovador
/*
Para corrigir o erro "Aprovador não encontrado", execute:

INSERT INTO aprovadores (id, acao_aprovacao_id, usuario_id, ativo, created_at, updated_at)
VALUES (
    uuid_generate_v4(), 
    '<ID_DA_ACAO_SEM_APROVADORES>', 
    '<ID_DO_USUARIO_APROVADOR>', 
    true,
    NOW(),
    NOW()
);

Substitua:
- <ID_DA_ACAO_SEM_APROVADORES> pelo ID da ação que aparece na consulta "AÇÕES SEM APROVADORES"
- <ID_DO_USUARIO_APROVADOR> pelo ID de um usuário que deve ser aprovador
*/