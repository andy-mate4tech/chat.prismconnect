FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
