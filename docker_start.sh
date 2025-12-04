#!/bin/bash

# Path to a flag file that indicates the first run is completed
FIRST_RUN_FLAG="/.first-run-complete"


# Check if it's the first run
if [ ! -f "$FIRST_RUN_FLAG" ]; then
    # Create .env file with runtime environment variables
    echo "REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL" > /app/dist/.env
    echo "REACT_APP_DEFAULT_PORT=$REACT_APP_DEFAULT_PORT" >> /app/dist/.env
    echo "PORT=$PORT" >> /app/server/.env

    pm2-runtime stop yarn -- start

    # Set environment variables in react
    cd /app/dist
    
    npx react-inject-env set -d ./
    

    # Create the flag file to indicate completion of first run
    touch "$FIRST_RUN_FLAG"
fi

# Start the application
cd /app/server
PM2_HOME=/app/server pm2-runtime start yarn -- dev