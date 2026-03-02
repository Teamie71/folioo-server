output "network_id" {
  description = "VPC network ID"
  value       = google_compute_network.main.id
}

output "network_name" {
  description = "VPC network name"
  value       = google_compute_network.main.name
}

output "private_app_subnet_id" {
  description = "Private app subnet ID"
  value       = google_compute_subnetwork.private_app.id
}

output "private_app_subnet_name" {
  description = "Private app subnet name"
  value       = google_compute_subnetwork.private_app.name
}

output "nat_static_egress_ip" {
  description = "Reserved static egress IP used by Cloud NAT"
  value       = google_compute_address.nat_ip.address
}

output "router_name" {
  description = "Cloud Router name"
  value       = google_compute_router.main.name
}

output "nat_name" {
  description = "Cloud NAT name"
  value       = google_compute_router_nat.main.name
}
