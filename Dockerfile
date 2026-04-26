FROM python:3.12-slim

WORKDIR /app

# Install system basics and compilers for C-extensions
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install statically locked dependencies perfectly matched for DoWhy/Numpy bindings
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
