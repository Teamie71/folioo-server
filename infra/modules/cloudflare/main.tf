# =============================================================================
# Cloudflare Tunnel – Dev
# =============================================================================

resource "cloudflare_zero_trust_tunnel_cloudflared" "dev" {
  account_id = var.cloudflare_account_id
  name       = "${var.name_prefix}-dev-api"
  config_src = "cloudflare"
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "dev" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.dev.id

  config = {
    ingress = [
      {
        hostname = var.dev_hostname
        service  = var.dev_tunnel_service
      },
      {
        service = "http_status:404"
      }
    ]
  }
}

# =============================================================================
# Cloudflare Tunnel – Prod
# =============================================================================

resource "cloudflare_zero_trust_tunnel_cloudflared" "prod" {
  account_id = var.cloudflare_account_id
  name       = "${var.name_prefix}-prod-api"
  config_src = "cloudflare"
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "prod" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.prod.id

  config = {
    ingress = [
      {
        hostname = var.prod_hostname
        service  = var.prod_tunnel_service
      },
      {
        service = "http_status:404"
      }
    ]
  }
}

# =============================================================================
# Tunnel Tokens (for cloudflared --token on VMs)
# =============================================================================

data "cloudflare_zero_trust_tunnel_cloudflared_token" "dev" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.dev.id
}

data "cloudflare_zero_trust_tunnel_cloudflared_token" "prod" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.prod.id
}

# =============================================================================
# DNS Records (CNAME → Tunnel)
# =============================================================================

resource "cloudflare_dns_record" "dev_api" {
  zone_id = var.cloudflare_zone_id
  name    = var.dev_hostname
  type    = "CNAME"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.dev.id}.cfargotunnel.com"
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "prod_api" {
  zone_id = var.cloudflare_zone_id
  name    = var.prod_hostname
  type    = "CNAME"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.prod.id}.cfargotunnel.com"
  proxied = true
  ttl     = 1
}

# =============================================================================
# Zero Trust Access – Dev & Prod APIs
# Only created when allowed_email_domains is configured.
# =============================================================================

resource "cloudflare_zero_trust_access_policy" "dev_allow_team" {
  count = length(var.allowed_email_domains) > 0 ? 1 : 0

  account_id = var.cloudflare_account_id
  name       = "${var.name_prefix}-dev-allow-team"
  decision   = "allow"

  include = [for domain in var.allowed_email_domains : {
    email_domain = { domain = domain }
  }]
}

resource "cloudflare_zero_trust_access_application" "dev_api" {
  count = length(var.allowed_email_domains) > 0 ? 1 : 0

  account_id       = var.cloudflare_account_id
  name             = "${var.name_prefix}-dev-api"
  domain           = var.dev_hostname
  type             = "self_hosted"
  session_duration = "24h"

  policies = [
    {
      id         = cloudflare_zero_trust_access_policy.dev_allow_team[0].id
      precedence = 1
    }
  ]
}

resource "cloudflare_zero_trust_access_policy" "prod_allow_team" {
  count = length(var.allowed_email_domains) > 0 ? 1 : 0

  account_id = var.cloudflare_account_id
  name       = "${var.name_prefix}-prod-allow-team"
  decision   = "allow"

  include = [for domain in var.allowed_email_domains : {
    email_domain = { domain = domain }
  }]
}

resource "cloudflare_zero_trust_access_application" "prod_api" {
  count = length(var.allowed_email_domains) > 0 ? 1 : 0

  account_id       = var.cloudflare_account_id
  name             = "${var.name_prefix}-prod-api"
  domain           = var.prod_hostname
  type             = "self_hosted"
  session_duration = "24h"

  policies = [
    {
      id         = cloudflare_zero_trust_access_policy.prod_allow_team[0].id
      precedence = 1
    }
  ]
}
