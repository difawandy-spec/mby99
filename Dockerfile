# syntax=docker/dockerfile:1

# 1) Install deps (prod only)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-save

# 2) Build (opsional jika ada langkah build)
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build || echo "no build step"

# 3) Runtime ringan
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app ./

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
