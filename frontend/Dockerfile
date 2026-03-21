FROM node:20-alpine

WORKDIR /app

# Копирование package files
COPY package*.json ./

# Установка зависимостей
RUN npm install

# Копирование кода
COPY . .

# Build для production
RUN npm run build

# Expose port
EXPOSE 3000

# Запуск dev server (для production нужен nginx)
CMD ["npm", "run", "dev"]
