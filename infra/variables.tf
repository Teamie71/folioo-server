variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "folioo-ai"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-northeast3"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "asia-northeast3-a"
}

variable "enable_cloudflare" {
  description = "Enable Cloudflare resources"
  type        = bool
  default     = false
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for folioo.ai.kr"
  type        = string
  sensitive   = true
  default     = ""
}

variable "dev_hostname" {
  description = "Dev API hostname"
  type        = string
  default     = "dev-api.folioo.ai.kr"
}

variable "prod_hostname" {
  description = "Prod API hostname"
  type        = string
  default     = "prod-api.folioo.ai.kr"
}

variable "dev_tunnel_service" {
  description = "Dev tunnel backend service URL"
  type        = string
  default     = "http://localhost:3000"
}

variable "prod_tunnel_service" {
  description = "Prod tunnel backend service URL"
  type        = string
  default     = "http://localhost:3000"
}

variable "allowed_email_domains" {
  description = "Email domains allowed for Zero Trust Access to dev API"
  type        = list(string)
  default     = []
}

variable "github_repository" {
  description = "GitHub repository in owner/repo format"
  type        = string
  default     = ""
}

variable "private_app_subnet_cidr" {
  description = "CIDR range for app subnet"
  type        = string
  default     = "10.30.0.0/24"
}

variable "instance_tags" {
  description = "Network tags applied to app VM instances"
  type        = list(string)
  default     = ["api-server"]
}

variable "machine_type" {
  description = "Machine type for dev/prod VMs"
  type        = string
  default     = "e2-medium"
}

variable "boot_image" {
  description = "Boot image for dev/prod VMs"
  type        = string
  default     = "ubuntu-os-cloud/ubuntu-2204-lts"
}

variable "boot_disk_size_gb" {
  description = "Boot disk size in GB for dev/prod VMs"
  type        = number
  default     = 30
}

variable "boot_disk_type" {
  description = "Boot disk type for dev/prod VMs"
  type        = string
  default     = "pd-balanced"
}

variable "dev_internal_ip" {
  description = "Internal IP for folioo-dev-server"
  type        = string
  default     = "10.30.0.10"
}

variable "prod_internal_ip" {
  description = "Internal IP for folioo-prod-server"
  type        = string
  default     = "10.30.0.11"
}

variable "app_port" {
  description = "Folioo application port"
  type        = number
  default     = 3000
}

variable "health_check_path" {
  description = "Folioo health endpoint path"
  type        = string
  default     = "/health"
}
