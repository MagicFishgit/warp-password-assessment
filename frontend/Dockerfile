# Dependency
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

#Builde
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

COPY dict.txt ./dict.txt 
# Add a simple README for the submission zip
RUN echo "Next.js App Router solution." > README.md

RUN npm run build

#Stage 3: Runner
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy assets needed by the API routes
COPY --from=builder /app/dict.txt ./dict.txt
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/README.md ./README.md

CMD ["node", "server.js"]