FROM python:3.12-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY main.py .

# Expose port
EXPOSE 8000

# Run - Railway assigns PORT env var automatically
CMD python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
