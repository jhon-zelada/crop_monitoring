
# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy the requirements file from the backend build context
COPY requirements.txt /app/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the rest of the backend app files (build context is ./backend)
COPY . /app

# Expose and run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
