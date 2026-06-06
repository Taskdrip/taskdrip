FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY dist ./dist
RUN mkdir -p uploads

EXPOSE 5000
CMD ["node", "dist/index.js"]
