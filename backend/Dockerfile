FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production

EXPOSE 5000

# Init DB then start server
CMD ["sh", "-c", "node src/init-db.cjs && node src/index.js"]
