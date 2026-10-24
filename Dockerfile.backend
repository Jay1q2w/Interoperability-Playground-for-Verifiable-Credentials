FROM node:18-alpine

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

CMD ["npm", "start"]
