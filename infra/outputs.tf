output "project_number" {
  description = "GCP project number"
  value       = data.google_project.current.number
}

output "deploy_config" {
  description = "Deployment configuration for CD workflows (JSON format). Exported to GCS by terraform.yml after apply."
  value = jsonencode({
    dev_gce_name  = module.compute.dev_instance_name
    dev_gce_zone  = module.compute.dev_instance_zone
    prod_gce_name = module.compute.prod_instance_name
    prod_gce_zone = module.compute.prod_instance_zone
  })
}

output "wif_provider" {
  description = "Full resource name of the WIF provider (set as GitHub secret WIF_PROVIDER)"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_actions_sa_email" {
  description = "GitHub Actions service account email (set as GitHub secret WIF_SERVICE_ACCOUNT)"
  value       = google_service_account.github_actions.email
}

output "artifact_registry_url" {
  description = "Docker image URL prefix for Artifact Registry"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.api_docker.repository_id}"
}

output "dev_vm_name" {
  description = "Dev VM name"
  value       = module.compute.dev_instance_name
}

output "dev_vm_zone" {
  description = "Dev VM zone"
  value       = module.compute.dev_instance_zone
}

output "prod_vm_name" {
  description = "Prod VM name"
  value       = module.compute.prod_instance_name
}

output "prod_vm_zone" {
  description = "Prod VM zone"
  value       = module.compute.prod_instance_zone
}

output "nat_static_egress_ip" {
  description = "Static egress IP reserved for Cloud NAT"
  value       = module.networking.nat_static_egress_ip
}

output "dev_tunnel_id" {
  description = "Dev Cloudflare tunnel ID"
  value       = try(module.cloudflare[0].dev_tunnel_id, null)
}

output "dev_tunnel_token" {
  description = "Dev Cloudflare tunnel token for cloudflared"
  value       = try(module.cloudflare[0].dev_tunnel_token, null)
  sensitive   = true
}

output "prod_tunnel_id" {
  description = "Prod Cloudflare tunnel ID"
  value       = try(module.cloudflare[0].prod_tunnel_id, null)
}

output "prod_tunnel_token" {
  description = "Prod Cloudflare tunnel token for cloudflared"
  value       = try(module.cloudflare[0].prod_tunnel_token, null)
  sensitive   = true
}
