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

# Gera as chaves JWT antes do build
RUN echo "🔑 Gerando chaves JWT..." && \
    node scripts/gerar-chaves-jwt.js

# Compila a aplicação
RUN npm run build

# Estágio de produção
FROM node:20-alpine AS production

# Define variáveis de ambiente
ENV NODE_ENV=production

# Diretório de trabalho
WORKDIR /app

# Instala dependências necessárias para produção
RUN apk add --no-cache curl wget

# Copia arquivos da etapa de build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Copia as chaves JWT geradas no estágio de build
COPY --from=build /app/keys ./keys

# Portas expostas
EXPOSE 3000

# Verificação de saúde
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q -O - http://localhost:3000/api/v1/health || exit 1

# Comando de inicialização direto
CMD ["node", "dist/main"]