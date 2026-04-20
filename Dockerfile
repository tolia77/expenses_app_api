FROM node:22-alpine

WORKDIR /app

# Build toolchain for native modules (bcrypt, pg) on alpine
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3004

CMD ["npm", "run", "start:dev"]
