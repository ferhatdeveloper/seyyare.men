FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm install tsx typescript --save
EXPOSE 5000
CMD ["npx", "tsx", "src/index.ts"]
