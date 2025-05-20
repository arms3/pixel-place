# Pixel Place

An interactive collaborative canvas where users can place pixels that automatically disappear after a configurable time period.

## Features

- Interactive pixel canvas
- Real-time collaboration
- Automatic pixel cleanup

## Development Setup

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/)
- [SpacetimeDB CLI](https://docs.clockworklabs.xyz/docs/guides/installation)
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Local Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd pixel-place
```

2. Start the SpacetimeDB server:
```bash
docker compose up -d frontend
```

3. In a new terminal, publish the module:
```bash
cd pixel-place-module
spacetime publish --project-path . pixel-place
```

4. Start the frontend development server:
```bash
cd pixel-place-frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` and will connect to the SpacetimeDB server at `http://localhost:3000`.

## Production Deployment

### Using Docker Compose

1. Create a `data` directory:
```bash
mkdir data
```

2. (Optional) Configure ports using environment variables:
```bash
export SPACETIME_PORT=3000  # Port for SpacetimeDB server
export FRONTEND_PORT=80     # Port for frontend
```

3. Build and publish the module:
```bash
docker compose run --rm module-builder
```

4. Start the frontend:
```bash
docker compose up -d frontend
```

The frontend will be available at `http://localhost:${FRONTEND_PORT:-80}` and will connect to the SpacetimeDB server through a proxy at `/spacetime/`.

### Updating the Application

To update the application with new changes:

1. Pull the latest changes:
```bash
git pull
```

2. Rebuild and update the module:
```bash
# Rebuild the module-builder image
docker compose build module-builder

# Run the module-builder to publish updates
docker compose run --rm module-builder
```

3. Update the frontend:
```bash
# Rebuild the frontend image
docker compose build frontend

# Restart the frontend service
docker compose up -d --no-deps frontend
```

4. (Optional) Update the SpacetimeDB server:
```bash
# Pull the latest SpacetimeDB image
docker compose pull spacetimedb

# Restart the SpacetimeDB service
docker compose up -d --no-deps spacetimedb
```

Note: The `--no-deps` flag ensures that only the specified service is restarted, without affecting dependent services.

### Manual Deployment

1. Create a `data` directory:
```bash
mkdir data
```

2. Start the SpacetimeDB server:
This is just to make sure the databse is up and running by the time we run the next command. Thew module-builder service will auto start the database if not running.
```bash
docker compose run spacetimedb
```

3. Build and publish the module:
```bash
docker compose run --rm module-builder
"
```

4. Build and serve the frontend:
```bash
cd pixel-place-frontend
npm install
npm run build
npm run preview
```

## Monitoring

The SpacetimeDB service includes a health check endpoint at `http://localhost:3000/health`. You can monitor the logs using:

```bash
docker compose logs -f
```

## Backup

The database is stored in the `data` directory. To backup:

1. Stop the service:
```bash
docker compose down
```

2. Copy the data directory:
```bash
cp -r data data-backup
```

3. Restart the service:
```bash
docker compose up -d
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the `data` directory has the correct permissions:
```bash
chmod -R 777 data
```

2. **Module Update Failed**: If you need to update the module, you may need to:
   - Stop the service
   - Remove the data directory
   - Start fresh with a new database

3. **Connection Issues**: Check if the services are running:
```bash
docker compose ps
```

4. **Frontend Build Issues**: If you encounter build issues:
   - Clear the node_modules: `rm -rf node_modules`
   - Clear npm cache: `npm cache clean --force`
   - Reinstall dependencies: `npm install`

5. **CORS Issues**: If you encounter CORS errors:
   - Ensure the `SPACETIME_CORS_ORIGINS` environment variable is set correctly
   - Check that the frontend is using the correct proxy path (`/spacetime/`)
   - Verify that the Nginx configuration is properly loaded

6. **Module Build Issues**: If you encounter issues building the module:
   - Check the module-builder logs: `docker compose logs module-builder`
   - Ensure the SpacetimeDB server is running before the module build starts
   - Verify the module name matches in both the build script and docker-compose.yml

## Troubleshooting: Logging in with Existing Credentials

If you need to log in to the local SpacetimeDB using the same credentials as an existing database, follow these steps:

1. **Read the Token from the .env File:**

   In PowerShell, use the following command to read the token from the `.env` file located in the `identity` folder at the project root:

   ```powershell
   $token = (Get-Content -Path "identity\.env" -Raw) -replace '^LOGIN_TOKEN=', ''
   ```

2. **Log in to SpacetimeDB:**

   Use the token to log in via the local Spacetime CLI:

   ```powershell
   spacetime login --token $token
   ```

   This will authenticate you with the same credentials as the existing database.

## License

[Your License Here]

## Generating TypeScript Bindings

To regenerate the TypeScript bindings for the frontend, run the following command from the `pixel-place-module` directory:

```bash
spacetime generate --lang typescript --out-dir ../pixel-place-frontend/src/spacetime --project-path .
``` 