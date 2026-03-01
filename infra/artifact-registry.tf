# Artifact Registry for Folioo Docker images
# Single repository for the NestJS API server.

resource "google_artifact_registry_repository" "api_docker" {
  project       = var.project_id
  location      = var.region
  repository_id = "folioo-docker"
  format        = "DOCKER"
  description   = "Folioo API Docker images"
  mode          = "STANDARD_REPOSITORY"

  lifecycle {
    prevent_destroy = true
  }
}
