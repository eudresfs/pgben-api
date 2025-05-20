# Estágio de construção
FROM node:20-alpine AS build

# Diretório de trabalho
WORKDIR /app

# Copia os arquivos de configuração do projeto
COPY package*.json ./
COPY tsconfig*.json ./

# Instala as dependências
RUN npm ci

# Copia o código-fonte
COPY . .

# Compila a aplicação
RUN npm run build

# Remove dependências de desenvolvimento
RUN npm prune --production

# Estágio de produção
FROM node:20-alpine AS production

# Define variáveis de ambiente
ENV NODE_ENV=production

# Diretório de trabalho
WORKDIR /app

# Instala dependências necessárias para produção
RUN apk add --no-cache curl wget netcat-openbsd

# Copia arquivos da etapa de build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Script de inicialização para verificar dependências
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Portas expostas
EXPOSE 3000

# Verificação de saúde
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q -O - http://localhost:3000/api/v1/health || exit 1

# Comando de inicialização
CMD ["/docker-entrypoint.sh"]