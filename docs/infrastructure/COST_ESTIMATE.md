## Infrastructure Cost Estimate (Monthly)

Currency: USD/month
Region baseline: GCP `asia-northeast3`

### Assumptions

- Low: MVP/dev traffic
- Expected: regular production traffic
- High: higher request volume and log/egress growth
- 730 hours/month uptime

### Line Items

| Category      | Service                | Low | Expected | High | Notes                                                 |
| ------------- | ---------------------- | --: | -------: | ---: | ----------------------------------------------------- |
| Compute       | GCE VM(s)              |  30 |       60 |  140 | Depends on machine size/count                         |
| Registry      | Artifact Registry      |   1 |        3 |   10 | Image storage + pull operations                       |
| Network       | GCP egress             |   0 |        8 |   35 | Varies by traffic and cache hit                       |
| Tunnel/CDN    | Cloudflare Tunnel      |   0 |        0 |    0 | Free tier baseline                                    |
| Cache         | Upstash Redis          |   0 |       10 |   30 | Plan and command volume dependent                     |
| Database      | PostgreSQL on GCE host |   0 |        0 |   20 | Included in VM baseline; storage/backup overhead only |
| Observability | Cloud Logging, etc.    |   0 |        5 |   20 | Log ingestion/retention dependent                     |

### Total

- Low: ~31
- Expected: ~86
- High: ~255

### Cost Drivers

- Compute instance sizing/count
- Egress volume (especially cache misses)
- DB storage/backup growth
- Upstash command/data growth

### Review cadence

- Re-check monthly with billing export/dashboard
- Update this sheet when machine class, region, or plan changes
