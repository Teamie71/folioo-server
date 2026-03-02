variable "project_id" {
  description = "GCP project ID"
  type        = string
  sensitive   = true
}

variable "zone" {
  description = "GCP zone"
  type        = string
}

variable "name_prefix" {
  description = "Resource name prefix"
  type        = string
}

variable "network_id" {
  description = "VPC network ID"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID"
  type        = string
}

variable "instance_tags" {
  description = "Network tags applied to VM instances"
  type        = list(string)
  default     = ["api-server"]
}

variable "machine_type" {
  description = "Machine type for VM instances"
  type        = string
  default     = "e2-medium"
}

variable "boot_image" {
  description = "Boot disk image for VM instances"
  type        = string
  default     = "ubuntu-os-cloud/ubuntu-2204-lts"
}

variable "boot_disk_size_gb" {
  description = "Boot disk size in GB"
  type        = number
  default     = 30
}

variable "boot_disk_type" {
  description = "Boot disk type"
  type        = string
  default     = "pd-balanced"
}

variable "dev_internal_ip" {
  description = "Internal IP address for dev VM"
  type        = string
  default     = "10.30.0.10"
}

variable "prod_internal_ip" {
  description = "Internal IP address for prod VM"
  type        = string
  default     = "10.30.0.11"
}

variable "app_port" {
  description = "Folioo app port"
  type        = number
  default     = 3000
}

variable "health_check_path" {
  description = "Health endpoint path"
  type        = string
  default     = "/health"
}
