FROM node:22-bookworm-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --include=optional --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    BODY_SIZE_LIMIT=256M \
    DATA_DIR=/app/data

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --include=optional --no-audit --no-fund
COPY --from=builder /app/build ./build
COPY --from=builder /app/bot ./bot
COPY --from=builder /app/scripts ./scripts
RUN mkdir -p /app/data && chown -R node:node /app

USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
