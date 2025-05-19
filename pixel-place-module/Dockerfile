FROM rust:1.87-slim

# Install build dependencies
RUN apt-get update && \
    apt-get install -y curl build-essential && \
    rm -rf /var/lib/apt/lists/*

# Install wasm-opt
RUN curl -L https://github.com/WebAssembly/binaryen/releases/download/version_123/binaryen-version_123-x86_64-linux.tar.gz -o binaryen.tar.gz && \
    tar xzf binaryen.tar.gz && \
    cp binaryen-version_123/bin/wasm-opt /usr/local/bin/ && \
    rm -rf binaryen.tar.gz binaryen-version_123 && \
    chmod +x /usr/local/bin/wasm-opt

# Install SpacetimeDB CLI
RUN mkdir -p /root/.local/bin && \
    curl -sSf https://install.spacetimedb.com | sh -s -- -y

WORKDIR /app

# Copy the module source
COPY . .

# Make the entrypoint script executable
RUN chmod +x entrypoint.sh

# Use the entrypoint script
CMD ["./entrypoint.sh"] 