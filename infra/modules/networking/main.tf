resource "google_compute_network" "main" {
  name                    = "${var.name_prefix}-vpc"
  project                 = var.project_id
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  mtu                     = 1460
}

resource "google_compute_subnetwork" "private_app" {
  name                     = "${var.name_prefix}-private-app-subnet"
  project                  = var.project_id
  region                   = var.region
  network                  = google_compute_network.main.id
  ip_cidr_range            = var.private_app_subnet_cidr
  private_ip_google_access = true
  stack_type               = "IPV4_ONLY"
  purpose                  = "PRIVATE"
}

resource "google_compute_firewall" "allow_app_ingress_internal" {
  name      = "${var.name_prefix}-allow-app-ingress-internal"
  project   = var.project_id
  network   = google_compute_network.main.name
  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
    ports    = [tostring(var.app_port)]
  }

  source_ranges = [var.private_app_subnet_cidr]
  target_tags   = var.app_target_tags
}

resource "google_compute_firewall" "allow_internal_vpc" {
  name      = "${var.name_prefix}-allow-internal-vpc"
  project   = var.project_id
  network   = google_compute_network.main.name
  direction = "INGRESS"
  priority  = 1001

  allow {
    protocol = "all"
  }

  source_ranges = [var.private_app_subnet_cidr]
}

resource "google_compute_firewall" "allow_ssh_from_iap" {
  name      = "${var.name_prefix}-allow-ssh-from-iap"
  project   = var.project_id
  network   = google_compute_network.main.name
  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]
  target_tags   = var.app_target_tags
}

resource "google_compute_address" "nat_ip" {
  name         = "${var.name_prefix}-nat-ip"
  project      = var.project_id
  region       = var.region
  address_type = "EXTERNAL"
  network_tier = "PREMIUM"
}

resource "google_compute_router" "main" {
  name    = "${var.name_prefix}-router"
  project = var.project_id
  region  = var.region
  network = google_compute_network.main.id
}

resource "google_compute_router_nat" "main" {
  name                                = "${var.name_prefix}-nat"
  project                             = var.project_id
  region                              = var.region
  router                              = google_compute_router.main.name
  nat_ip_allocate_option              = "MANUAL_ONLY"
  nat_ips                             = [google_compute_address.nat_ip.self_link]
  source_subnetwork_ip_ranges_to_nat  = "LIST_OF_SUBNETWORKS"
  enable_dynamic_port_allocation      = false
  enable_endpoint_independent_mapping = false

  subnetwork {
    name                    = google_compute_subnetwork.private_app.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  log_config {
    enable = false
    filter = "ALL"
  }
}
