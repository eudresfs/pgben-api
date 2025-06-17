---
slug: ably-frontend
sidebar_position: 1
title: Guia de Integração Ably Realtime no Frontend
---

# Ably Realtime – Integração Frontend

Este guia descreve como **obter um token de autenticação**, **conectar-se ao Ably Realtime**, **inscrever-se em canais** (por unidade, usuário ou role) e **manter a conexão saudável** através de reconexão automática e renovação de token.

> **Stack de referência**: exemplos em _TypeScript_ usando **React** + **Ably JS SDK** v1.2. Para outras bibliotecas (Vue, Angular, Vanilla), a lógica permanece a mesma.

---

## 1. Obter token JWT

1. Envie **POST** para `POST /api/v1/notifications/ably/auth/token`.
2. **Headers**: envie o seu JWT de aplicação (ex: `Authorization: Bearer <accessToken>`).
3. **Response 200**:

```jsonc
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires": 1718913362000,
  "clientId": "user-123",
  "capability": {
    "*.broadcast-unit-*": ["subscribe"],
    "user-123-*": ["publish", "subscribe"]
  }
}
```

* **token** – JWT assinado pelo backend.
* **expires** – _Epoch millis_ de expiração.
* **clientId** – identificador do usuário.
* **capability** – capacidades Ably (escopos + permissões).

> Salve `expires` para saber quando renovar o token; recomendamos renovar com 1 minuto de antecedência.

---

## 2. Conectar ao Ably Realtime

```ts
import * as Ably from 'ably';

export const connectAbly = (tokenDetails: TokenDetails) => {
  return new Ably.Realtime.Promise({
    authUrl: '/api/v1/notifications/ably/auth/token', // fallback quando usar authUrl
    tokenDetails,                                     // token inicial
    transports: ['web_socket'],
    clientId: tokenDetails.clientId,
    closeOnUnload: true,
  });
};
```

* `authUrl` permite ao SDK renovar o token automaticamente se retornar **401/403**.
* Use `transports` = `web_socket`; o long-polling é fallback do Ably.

---

## 3. Inscrever-se em canais

```ts
const subscribeBroadcastUnit = (
  ably: Ably.Realtime,
  unitId: string,
  onMessage: (msg: Ably.Types.Message) => void,
) => {
  const channelName = `broadcast-unit-${unitId}`;
  const channel = ably.channels.get(channelName);
  channel.subscribe('notification', onMessage);
  return () => channel.unsubscribe('notification', onMessage); // unlisten helper
};
```

Tipos de canal disponíveis:

| Tipo                | Nome (padrão)                | Observações                     |
| ------------------- | ---------------------------- | ------------------------------- |
| **Unidade (unit)**  | `broadcast-unit-{unitId}`    | Notificações por unidade        |
| **Role**            | `broadcast-role-{roleId}`    | Notificações por papel/role      |
| **Região**          | `broadcast-region-{regionId}`| Notificações por região         |
| **Usuário**         | `user-{userId}-notifications`| Notificações individuais        |

---

## 4. Estratégia de reconexão & renovação de token

```ts
// Detecta expiração localmente e renova
const scheduleRenewal = (
  ably: Ably.Realtime,
  expires: number,
  refreshToken: () => Promise<TokenDetails>,
) => {
  const now = Date.now();
  const msUntilRenew = Math.max(expires - now - 60_000, 5_000); // 1 min antes
  setTimeout(async () => {
    try {
      const newToken = await refreshToken();
      await ably.auth.authorise({ tokenDetails: newToken }, undefined);
      scheduleRenewal(ably, newToken.expires, refreshToken);
    } catch (err) {
      console.error('Falha ao renovar token Ably', err);
    }
  }, msUntilRenew);
};
```

* Sempre reautorize o cliente antes de `expires`.
* O SDK também tentará renovar com `authUrl` quando tomar **401** do servidor.
* Combine ambas abordagens para maior resiliência.

---

## 5. Exemplo completo

```tsx
import React, { useEffect, useRef } from 'react';
import * as Ably from 'ably';
import { connectAbly } from './ably';

export const AblyProvider: React.FC = ({ children }) => {
  const ablyRef = useRef<Ably.Realtime | null>(null);

  useEffect(() => {
    const init = async () => {
      const tokenDetails = await fetch('/api/v1/notifications/ably/auth/token', { method: 'POST' }).then(r => r.json());
      const client = await connectAbly(tokenDetails);
      ablyRef.current = client;

      scheduleRenewal(client, tokenDetails.expires, async () => {
        return await fetch('/api/v1/notifications/ably/auth/token', { method: 'POST' }).then(r => r.json());
      });
    };
    init();

    return () => ablyRef.current?.close();
  }, []);

  return <AblyContext.Provider value={ablyRef.current}>{children}</AblyContext.Provider>;
};
```

---

## 6. Boas práticas

1. **Desinscrever-se** de canais em `componentWillUnmount` / cleanup.
2. **Agrupar** múltiplas mensagens e tratar _batching_ no backend, se necessário.
3. **Tratar rate limiting** (consulte `ABLY_MAX_MESSAGES_PER_SECOND`).
4. Usar **Presence** para status online / offline quando aplicável.

---

## 7. FAQ

**Quais browsers são suportados?** 
Todos os _modern browsers_ com WebSocket. O Ably faz fallback automático se necessário.

**Como diferencio mensagens?** 
Cada payload inclui `id`, `type`, `timestamp`. Use-os para _deduplicar_ ou ordenar.

**SSE vs Ably?** 
O sistema utiliza Ably por padrão; SSE é somente fallback em ambiente de desenvolvimento simplificado.

---

> Última atualização: 17/06/2025
