FROM node:18
WORKDIR /app
COPY frontend/package*.json /app/
RUN npm install
COPY frontend /app
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]