# Gerador de Chaves WhatsApp

Este script gera um par de chaves RSA (pública e privada) para uso com WhatsApp Flows.

## Como usar

```bash
node scripts/generate-whatsapp-keys.js "sua-senha-segura"
```

### Exemplo:
```bash
node scripts/generate-whatsapp-keys.js "minha-senha-super-segura-123"
```

## O que o script faz

1. **Gera uma chave privada RSA** de 2048 bits criptografada com a passphrase fornecida
2. **Gera a chave pública** correspondente
3. **Exibe as instruções** de onde copiar cada chave

## Onde usar as chaves

### Chave Privada + Passphrase
Copie para o arquivo `.env`:
```env
WHATSAPP_PASSPHRASE="sua-senha-segura"
WHATSAPP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...sua chave privada aqui...
-----END RSA PRIVATE KEY-----"
```

### Chave Pública
Adicione à sua conta do WhatsApp Business conforme documentação:
https://developers.facebook.com/docs/whatsapp/flows/guides/implementingyourflowendpoint#upload_public_key

## Segurança

⚠️ **IMPORTANTE**: 
- Mantenha a passphrase e chave privada seguras
- Nunca commite essas informações no repositório
- Use uma passphrase forte e única