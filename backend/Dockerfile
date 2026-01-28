FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Rust for building the extension
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy Rust reader
COPY rust_reader ./rust_reader

# Build Rust extension
WORKDIR /app/rust_reader
RUN maturin build --release
RUN pip install target/wheels/*.whl

# Back to app directory
WORKDIR /app

# Copy application code
COPY app ./app

# Create uploads directory
RUN mkdir -p /app/uploads /app/models

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
