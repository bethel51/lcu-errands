FROM node:20-alpine
WORKDIR /app

# Install production dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY backend/src ./src

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["node", "src/index.js"]
