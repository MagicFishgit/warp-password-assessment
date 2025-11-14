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
RUN echo "Next.js App Router solution." > README.md # This is a placeholder

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

# Create the folder structure for zipping
RUN mkdir -p /app/source-for-zip/frontend/app/api
RUN mkdir -p /app/source-for-zip/mock-api

# Copy frontend source files into the zip folder
COPY --from=builder /app/package.json /app/source-for-zip/frontend/
COPY --from=builder /app/next.config.js /app/source-for-zip/frontend/
COPY --from=builder /app/tailwind.config.js /app/source-for-zip/frontend/
COPY --from=builder /app/app/page.js /app/source-for-zip/frontend/app/
COPY --from=builder /app/app/layout.js /app/source-for-zip/frontend/app/
COPY --from=builder /app/app/globals.css /app/source-for-zip/frontend/app/
COPY --from=builder /app/app/api/attack/route.js /app/source-for-zip/frontend/app/api/
COPY --from=builder /app/app/api/submit/route.js /app/source-for-zip/frontend/app/api/
COPY --from=builder /app/app/api/generate-zip/route.js /app/source-for-zip/frontend/app/api/

CMD ["node", "server.js"]