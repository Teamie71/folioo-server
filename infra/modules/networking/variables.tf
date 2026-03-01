variable "project_id" {
  description = "GCP project ID"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "name_prefix" {
  description = "Resource name prefix"
  type        = string
}

variable "private_app_subnet_cidr" {
  description = "CIDR range for app subnet"
  type        = string
  default     = "10.30.0.0/24"
}

variable "app_port" {
  description = "Application port used by Folioo API"
  type        = number
  default     = 3000
}

variable "app_target_tags" {
  description = "Network tags used by app VM instances"
  type        = list(string)
  default     = ["api-server"]
}
