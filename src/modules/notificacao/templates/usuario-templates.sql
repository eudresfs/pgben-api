-- Templates de email para eventos de usuário
-- Execute este script no banco de dados para criar os templates necessários

-- Template para primeiro acesso (usuário criado sem senha)
INSERT INTO notification_template (
  id,
  codigo,
  nome,
  descricao,
  tipo,
  assunto,
  corpo,
  corpo_html,
  canais_disponiveis,
  variaveis_requeridas,
  ativo,
  categoria,
  prioridade,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'USER_FIRST_ACCESS_CREDENTIALS',
  'Credenciais de Primeiro Acesso',
  'Template para envio de credenciais de primeiro acesso ao usuário',
  'sistema',
  'Bem-vindo(a) ao Sistema SEMTAS - Suas Credenciais de Acesso',
  'Olá {{nome}}, suas credenciais: Email: {{email}}, Senha: {{senha}}, Data: {{data_criacao}}. Acesse: {{url_sistema}}',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Credenciais de Acesso - SEMTAS</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin-bottom: 10px;">Bem-vindo(a) ao Sistema SEMTAS</h1>
            <p style="margin: 0; color: #666;">Sistema de Gestão de Benefícios Eventuais</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <p>Olá <strong>{{nome}}</strong>,</p>
            
            <p>Sua conta foi criada com sucesso no Sistema SEMTAS. Abaixo estão suas credenciais de acesso:</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Email:</strong> {{email}}</p>
                <p style="margin: 5px 0;"><strong>Senha temporária:</strong> <code style="background-color: #e9ecef; padding: 2px 4px; border-radius: 3px;">{{senha}}</code></p>
                <p style="margin: 5px 0;"><strong>Data de criação:</strong> {{data_criacao}}</p>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;"><strong>⚠️ Importante:</strong></p>
                <ul style="margin: 10px 0; color: #856404;">
                    <li>Esta é uma senha temporária que deve ser alterada no primeiro acesso</li>
                    <li>Por segurança, não compartilhe suas credenciais com terceiros</li>
                    <li>Acesse o sistema o quanto antes para alterar sua senha</li>
                </ul>
            </div>
            
            <p>Para acessar o sistema, clique no link abaixo:</p>
            <p style="text-align: center; margin: 20px 0;">
                <a href="{{url_sistema}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Acessar Sistema</a>
            </p>
            
            <p>Se você tiver dúvidas ou precisar de ajuda, entre em contato com o suporte técnico.</p>
            
            <p>Atenciosamente,<br>
            <strong>Equipe SEMTAS</strong></p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Este é um email automático, não responda a esta mensagem.</p>
        </div>
    </div>
</body>
</html>',
  '{"email"}',
  '["nome", "email", "senha", "data_criacao", "url_sistema"]',
  true,
  'usuario',
  'alta',
  NOW(),
  NOW()
) ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  tipo = EXCLUDED.tipo,
  assunto = EXCLUDED.assunto,
  corpo = EXCLUDED.corpo,
  corpo_html = EXCLUDED.corpo_html,
  canais_disponiveis = EXCLUDED.canais_disponiveis,
  variaveis_requeridas = EXCLUDED.variaveis_requeridas,
  ativo = EXCLUDED.ativo,
  categoria = EXCLUDED.categoria,
  prioridade = EXCLUDED.prioridade,
  updated_at = NOW();

-- Template para validação de email (usuário criado com senha)
INSERT INTO notification_template (
  id,
  codigo,
  nome,
  descricao,
  tipo,
  assunto,
  corpo,
  corpo_html,
  canais_disponiveis,
  variaveis_requeridas,
  ativo,
  categoria,
  prioridade,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'USER_EMAIL_VALIDATION',
  'Validação de Email - Cadastro Realizado',
  'Template para confirmação de cadastro e validação de email',
  'sistema',
  'Cadastro Realizado com Sucesso - Sistema SEMTAS',
  'Olá {{nome}}, seu cadastro foi realizado com sucesso! Email: {{email}}, Data: {{data_criacao}}. Acesse: {{url_sistema}}',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Cadastro Realizado - SEMTAS</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #c3e6cb;">
            <h1 style="color: #155724; margin-bottom: 10px;">✅ Cadastro Realizado com Sucesso</h1>
            <p style="margin: 0; color: #155724;">Sistema de Gestão de Benefícios Eventuais - SEMTAS</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <p>Olá <strong>{{nome}}</strong>,</p>
            
            <p>Seu cadastro foi realizado com sucesso no Sistema SEMTAS!</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Email cadastrado:</strong> {{email}}</p>
                <p style="margin: 5px 0;"><strong>Data do cadastro:</strong> {{data_criacao}}</p>
            </div>
            
            <p>Agora você pode acessar o sistema utilizando o email e senha que você definiu durante o cadastro.</p>
            
            <p style="text-align: center; margin: 20px 0;">
                <a href="{{url_sistema}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Acessar Sistema</a>
            </p>
            
            <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #0c5460;"><strong>💡 Dica:</strong> Mantenha suas credenciais em local seguro e não as compartilhe com terceiros.</p>
            </div>
            
            <p>Se você não solicitou este cadastro ou tem dúvidas, entre em contato com o suporte técnico.</p>
            
            <p>Atenciosamente,<br>
            <strong>Equipe SEMTAS</strong></p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Este é um email automático, não responda a esta mensagem.</p>
        </div>
    </div>
</body>
</html>',
  '{"email"}',
  '["nome", "email", "data_criacao", "url_sistema"]',
  true,
  'usuario',
  'normal',
  NOW(),
  NOW()
) ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  tipo = EXCLUDED.tipo,
  assunto = EXCLUDED.assunto,
  corpo = EXCLUDED.corpo,
  corpo_html = EXCLUDED.corpo_html,
  canais_disponiveis = EXCLUDED.canais_disponiveis,
  variaveis_requeridas = EXCLUDED.variaveis_requeridas,
  ativo = EXCLUDED.ativo,
  categoria = EXCLUDED.categoria,
  prioridade = EXCLUDED.prioridade,
  updated_at = NOW();

-- Template para recuperação de senha
INSERT INTO notification_template (
  id,
  codigo,
  nome,
  descricao,
  tipo,
  assunto,
  corpo,
  corpo_html,
  canais_disponiveis,
  variaveis_requeridas,
  ativo,
  categoria,
  prioridade,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'USER_PASSWORD_RESET',
  'Recuperação de Senha',
  'Template para envio de nova senha temporária na recuperação de senha',
  'sistema',
  'Recuperação de Senha - Sistema SEMTAS',
  'Olá {{nome}}, sua senha foi redefinida. Email: {{email}}, Nova senha: {{senha_temporaria}}, Solicitação: {{data_solicitacao}} às {{hora_solicitacao}}. Acesse: {{url_sistema}}',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Recuperação de Senha - SEMTAS</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ffeaa7;">
            <h1 style="color: #856404; margin-bottom: 10px;">🔐 Recuperação de Senha</h1>
            <p style="margin: 0; color: #856404;">Sistema de Gestão de Benefícios Eventuais - SEMTAS</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <p>Olá <strong>{{nome}}</strong>,</p>
            
            <p>Recebemos uma solicitação de recuperação de senha para sua conta no Sistema SEMTAS.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Email:</strong> {{email}}</p>
                <p style="margin: 5px 0;"><strong>Nova senha temporária:</strong> <code style="background-color: #e9ecef; padding: 2px 4px; border-radius: 3px;">{{senha_temporaria}}</code></p>
                <p style="margin: 5px 0;"><strong>Data da solicitação:</strong> {{data_solicitacao}} às {{hora_solicitacao}}</p>
            </div>
            
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #721c24;"><strong>🚨 Importante - Medidas de Segurança:</strong></p>
                <ul style="margin: 10px 0; color: #721c24;">
                    <li>Esta senha é temporária e deve ser alterada imediatamente após o login</li>
                    <li>Se você não solicitou esta recuperação, entre em contato conosco imediatamente</li>
                    <li>Por segurança, esta senha expirará em 24 horas</li>
                    <li>Não compartilhe esta senha com ninguém</li>
                </ul>
            </div>
            
            <p>Para acessar o sistema com sua nova senha temporária:</p>
            <p style="text-align: center; margin: 20px 0;">
                <a href="{{url_sistema}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Acessar Sistema</a>
            </p>
            
            <p><strong>Próximos passos:</strong></p>
            <ol>
                <li>Acesse o sistema com a senha temporária acima</li>
                <li>Vá para "Meu Perfil" → "Alterar Senha"</li>
                <li>Defina uma nova senha segura</li>
            </ol>
            
            <p>Se você continuar tendo problemas para acessar sua conta, entre em contato com o suporte técnico.</p>
            
            <p>Atenciosamente,<br>
            <strong>Equipe SEMTAS</strong></p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Este é um email automático, não responda a esta mensagem.</p>
            <p>Se você não solicitou esta recuperação de senha, ignore este email ou entre em contato conosco.</p>
        </div>
    </div>
</body>
</html>',
  '{"email"}',
  '["nome", "email", "senha_temporaria", "data_solicitacao", "hora_solicitacao", "url_sistema"]',
  true,
  'usuario',
  'alta',
  NOW(),
  NOW()
) ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  tipo = EXCLUDED.tipo,
  assunto = EXCLUDED.assunto,
  corpo = EXCLUDED.corpo,
  corpo_html = EXCLUDED.corpo_html,
  canais_disponiveis = EXCLUDED.canais_disponiveis,
  variaveis_requeridas = EXCLUDED.variaveis_requeridas,
  ativo = EXCLUDED.ativo,
  categoria = EXCLUDED.categoria,
  prioridade = EXCLUDED.prioridade,
  updated_at = NOW();