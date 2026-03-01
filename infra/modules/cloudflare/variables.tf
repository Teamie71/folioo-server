variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  type        = string
  sensitive   = true
}

variable "name_prefix" {
  description = "Resource name prefix"
  type        = string
}

variable "dev_tunnel_service" {
  description = "Dev tunnel service URL"
  type        = string
  default     = "http://localhost:3000"
}

variable "prod_tunnel_service" {
  description = "Prod tunnel service URL"
  type        = string
  default     = "http://localhost:3000"
}

variable "dev_hostname" {
  description = "Dev API hostname (e.g., dev-api.folioo.ai.kr)"
  type        = string
  default     = "dev-api.folioo.ai.kr"
}

variable "prod_hostname" {
  description = "Prod API hostname (e.g., prod-api.folioo.ai.kr)"
  type        = string
  default     = "prod-api.folioo.ai.kr"
}

variable "allowed_email_domains" {
  description = "Email domains allowed for Zero Trust Access to dev API"
  type        = list(string)
  default     = []
}
