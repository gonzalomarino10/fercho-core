# Fercho Core — imagen para correr en el VPS junto a n8n y Postgres
FROM node:22-bookworm-slim

WORKDIR /app

# Instalar dependencias primero (mejor cache)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copiar el resto del código
COPY . .

EXPOSE 8787

# Corre con tsx (sin build). Para producción real más adelante se puede compilar.
CMD ["npm", "run", "start"]
