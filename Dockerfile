FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code and built frontend
COPY . .

# Environment configuration
ENV MPLCONFIGDIR=/tmp/matplotlib
ENV PYTHONUNBUFFERED=1

EXPOSE 8000 8501

# Default command: launch the FastAPI server serving the React frontend & REST API
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
