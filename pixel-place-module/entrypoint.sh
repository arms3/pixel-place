#!/bin/bash

# Add server configuration
/root/.local/bin/spacetime server add spacetimedb:3000 --url http://spacetimedb:3000

# Check if we have a token file
if [ -f /identity/.env ]; then
    # Read token from file
    source /identity/.env
    echo "Using existing token from .env file"
    # Login with token
    /root/.local/bin/spacetime login --token "$LOGIN_TOKEN"
else
    # Login and save token
    echo "No existing token found, logging in..."
    /root/.local/bin/spacetime login --server-issued-login spacetimedb:3000
    TOKEN_OUTPUT=$(/root/.local/bin/spacetime login show --token)
    TOKEN=$(echo "$TOKEN_OUTPUT" | grep "Your auth token" | sed 's/.*is //')
    
    # Save token to .env file
    echo "LOGIN_TOKEN=$TOKEN" > /identity/.env
    echo "Saved new token to .env file"
fi

# Publish the module
/root/.local/bin/spacetime publish --project-path . pixel-place --yes -s spacetimedb:3000 