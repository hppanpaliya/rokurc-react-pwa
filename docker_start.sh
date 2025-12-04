#!/bin/bash

# Path to a flag file that indicates the first run is completed
FIRST_RUN_FLAG="/.first-run-complete"


# Check if it's the first run
if [ ! -f "$FIRST_RUN_FLAG" ]; then
    # Create .env file with runtime environment variables
    echo "VITE_BACKEND_URL=$VITE_BACKEND_URL" > /app/dist/.env
    echo "PORT=$PORT" >> /app/server/.env

    # No need to stop pm2-runtime or yarn here

    # Set environment variables in react
    cd /app/dist
    
    npx vite-inject-env set -d ./app/dist

    # Create the flag file to indicate completion of first run
    touch "$FIRST_RUN_FLAG"
fi

# Start the application
cd /app/server
PM2_HOME=/app/server pm2-runtime start index.js