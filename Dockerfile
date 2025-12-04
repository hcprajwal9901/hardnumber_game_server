FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy compiled dist files after build
COPY dist ./dist

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
