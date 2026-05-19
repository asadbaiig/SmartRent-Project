FROM node:20-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production

# Cloud Run injects PORT automatically (default 8080)
# Do NOT hardcode it — let the app read process.env.PORT
EXPOSE 8080

CMD ["npm", "start"]
