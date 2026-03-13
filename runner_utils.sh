#!/bin/bash

# Common Docker utilities used by the Docker Compose workflow

CONFIG_FILE="${CONFIG_FILE:-services.config.json}"
DOCKER_DEV_REGISTRY="${DOCKER_DEV_REGISTRY:-docker.io}"

function rebuild_images() {
  echo "🔄 Rebuilding Docker images..."

  jq -c '.services[]' $CONFIG_FILE | while read -r svc; do
    NAME=$(echo $svc | jq -r '.name')
    FOLDER=$(echo $svc | jq -r '.folder')
    IMAGE=$(echo $svc | jq -r '.dockerImage')
    REGISTRY_IMAGE="$DOCKER_DEV_REGISTRY/$IMAGE"

    echo "→ Building image for $NAME..."
    docker build -t "$IMAGE" "$FOLDER"

    echo "→ Tagging image as $REGISTRY_IMAGE"
    docker tag "$IMAGE" "$REGISTRY_IMAGE"

    echo "→ Pushing image to $DOCKER_DEV_REGISTRY registry"
    docker push "$REGISTRY_IMAGE" || echo "⚠️ Warning: Failed to push image $REGISTRY_IMAGE, continuing..."
  done

  echo "✅ Docker images built and pushed to $DOCKER_DEV_REGISTRY registry"
}

