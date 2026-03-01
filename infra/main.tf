data "google_project" "current" {
  project_id = var.project_id
}

locals {
  name_prefix = "folioo"
}

module "networking" {
  source = "./modules/networking"

  project_id              = var.project_id
  region                  = var.region
  name_prefix             = local.name_prefix
  private_app_subnet_cidr = var.private_app_subnet_cidr
  app_port                = var.app_port
  app_target_tags         = var.instance_tags
}

module "compute" {
  source = "./modules/compute"

  project_id        = var.project_id
  zone              = var.zone
  name_prefix       = local.name_prefix
  network_id        = module.networking.network_id
  subnet_id         = module.networking.private_app_subnet_id
  instance_tags     = var.instance_tags
  machine_type      = var.machine_type
  boot_image        = var.boot_image
  boot_disk_size_gb = var.boot_disk_size_gb
  boot_disk_type    = var.boot_disk_type
  dev_internal_ip   = var.dev_internal_ip
  prod_internal_ip  = var.prod_internal_ip
  app_port          = var.app_port
  health_check_path = var.health_check_path
}

module "cloudflare" {
  count  = var.enable_cloudflare ? 1 : 0
  source = "./modules/cloudflare"

  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_zone_id    = var.cloudflare_zone_id
  name_prefix           = local.name_prefix
  dev_hostname          = var.dev_hostname
  prod_hostname         = var.prod_hostname
  dev_tunnel_service    = var.dev_tunnel_service
  prod_tunnel_service   = var.prod_tunnel_service
  allowed_email_domains = var.allowed_email_domains
}
