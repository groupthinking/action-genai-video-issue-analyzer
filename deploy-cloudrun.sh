#!/bin/bash
# Cloud Run Deployment Script
# Usage: ./deploy-cloudrun.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-uvai-730bb}
REGION=${CLOUD_RUN_REGION:-us-central1}
SERVICE_NAME="video-analyzer"

echo "🚀 Deploying to Cloud Run ($ENVIRONMENT)"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service: $SERVICE_NAME"

# Validate environment
if [ -z "$GOOGLE_API_KEY" ]; then
  echo "❌ Error: GOOGLE_API_KEY environment variable is required"
  exit 1
fi

# Build the container
echo "📦 Building container..."
docker build -f Dockerfile.cloudrun -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$ENVIRONMENT .

# Push to Container Registry
echo "📤 Pushing to Container Registry..."
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$ENVIRONMENT

# Deploy to Cloud Run
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --project $PROJECT_ID \
  --region $REGION \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$ENVIRONMENT \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 600s \
  --concurrency 10 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "GOOGLE_API_KEY=$GOOGLE_API_KEY,NODE_ENV=production,GOOGLE_CLOUD_PROJECT=$PROJECT_ID"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --project $PROJECT_ID \
  --region $REGION \
  --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo "   Service URL: $SERVICE_URL"
echo ""
echo "📋 Available endpoints:"
echo "   - GET  $SERVICE_URL/api/pipeline     - Pipeline status"
echo "   - POST $SERVICE_URL/api/jobs         - Submit job"
echo "   - GET  $SERVICE_URL/api/jobs         - List jobs"
echo "   - GET  $SERVICE_URL/api/jobs/{id}    - Get job status"
echo "   - POST $SERVICE_URL/api/worker       - Pub/Sub worker (internal)"
