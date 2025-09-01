
# frontend/Dockerfile
FROM node:18
WORKDIR /app

# Copy package files from the frontend build context
COPY package*.json /app/

# Install node dependencies
RUN npm install

# Copy the rest of the frontend code (build context is ./frontend)
COPY . /app

# Start dev server (exposed via docker-compose)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
