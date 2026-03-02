output "dev_instance_name" {
  description = "Dev VM instance name"
  value       = google_compute_instance.server["dev"].name
}

output "dev_instance_zone" {
  description = "Dev VM zone"
  value       = google_compute_instance.server["dev"].zone
}

output "prod_instance_name" {
  description = "Prod VM instance name"
  value       = google_compute_instance.server["prod"].name
}

output "prod_instance_zone" {
  description = "Prod VM zone"
  value       = google_compute_instance.server["prod"].zone
}

output "vm_service_account_email" {
  description = "VM runtime service account email"
  value       = google_service_account.vm_runtime.email
}
