locals {
  instances = {
    dev = {
      name        = "${var.name_prefix}-dev-server"
      internal_ip = var.dev_internal_ip
      env         = "dev"
    }
    prod = {
      name        = "${var.name_prefix}-prod-server"
      internal_ip = var.prod_internal_ip
      env         = "prod"
    }
  }
}

resource "google_service_account" "vm_runtime" {
  account_id   = "${var.name_prefix}-vm-runtime-sa"
  project      = var.project_id
  display_name = "${title(var.name_prefix)} VM runtime service account"
}

resource "google_project_iam_member" "vm_runtime_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.vm_runtime.email}"
}

resource "google_project_iam_member" "vm_runtime_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.vm_runtime.email}"
}

resource "google_project_iam_member" "vm_runtime_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.vm_runtime.email}"
}

resource "google_project_iam_member" "vm_runtime_ar_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.vm_runtime.email}"
}

resource "google_compute_instance" "server" {
  for_each = local.instances

  name                = each.value.name
  project             = var.project_id
  zone                = var.zone
  machine_type        = var.machine_type
  can_ip_forward      = false
  deletion_protection = true
  enable_display      = false
  tags                = concat(var.instance_tags, ["${var.name_prefix}-${each.key}"])

  metadata = {
    enable-oslogin = "TRUE"
  }

  boot_disk {
    auto_delete = true

    initialize_params {
      image = var.boot_image
      size  = var.boot_disk_size_gb
      type  = var.boot_disk_type
    }
  }

  network_interface {
    network    = var.network_id
    subnetwork = var.subnet_id
    network_ip = each.value.internal_ip
    stack_type = "IPV4_ONLY"
  }

  scheduling {
    automatic_restart   = true
    on_host_maintenance = "MIGRATE"
    preemptible         = false
    provisioning_model  = "STANDARD"
  }

  service_account {
    email  = google_service_account.vm_runtime.email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    set -euxo pipefail

    apt-get update -y
    apt-get install -y ca-certificates curl gnupg lsb-release jq python3

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    systemctl enable docker
    systemctl restart docker

    # 배포 디렉토리 생성 (CD 워크플로우에서 사용)
    mkdir -p /home/folioo

    touch /var/run/folioo-startup-complete
  EOF

  shielded_instance_config {
    enable_integrity_monitoring = true
    enable_secure_boot          = false
    enable_vtpm                 = true
  }

  lifecycle {
    ignore_changes = [metadata_startup_script]
  }

  depends_on = [
    google_project_iam_member.vm_runtime_log_writer,
    google_project_iam_member.vm_runtime_metric_writer,
    google_project_iam_member.vm_runtime_secret_accessor,
    google_project_iam_member.vm_runtime_ar_reader,
  ]
}
