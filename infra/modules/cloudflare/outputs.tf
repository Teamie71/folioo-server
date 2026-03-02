output "dev_tunnel_id" {
  description = "Dev tunnel ID"
  value       = cloudflare_zero_trust_tunnel_cloudflared.dev.id
}

output "dev_tunnel_token" {
  description = "Dev tunnel token for cloudflared"
  value       = data.cloudflare_zero_trust_tunnel_cloudflared_token.dev.token
  sensitive   = true
}

output "prod_tunnel_id" {
  description = "Prod tunnel ID"
  value       = cloudflare_zero_trust_tunnel_cloudflared.prod.id
}

output "prod_tunnel_token" {
  description = "Prod tunnel token for cloudflared"
  value       = data.cloudflare_zero_trust_tunnel_cloudflared_token.prod.token
  sensitive   = true
}
