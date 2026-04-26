# Ansible Deployment — Node.js Order Management API

Automates the deployment of the Order Management API (Node.js + Express + PostgreSQL) to an Ubuntu VM using Ansible.

## Files

| File | Purpose |
|------|---------|
| `app.js` | Node.js Order Management REST API (Express) |
| `package.json` | Node.js dependencies |
| `deploy.yml` | Main Ansible playbook — installs Node.js, PostgreSQL, clones app, installs deps, starts via PM2 |
| `rollback.yml` | Rollback playbook — stops the app, removes files, drops DB, uninstalls packages |
| `verify.sh` | Bash + cURL smoke test to confirm the API is reachable and behaves correctly |

## Prerequisites

### Control machine (your local machine or WSL)
- Ansible 2.14+ installed
- SSH access to the target VM
- Required Ansible collections (install once):
  ```bash
  ansible-galaxy collection install community.postgresql community.general
  ```
- `sshpass` if using password-based SSH (alternative: SSH key auth):
  ```bash
  sudo apt install sshpass
  ```

### Target VM (Ubuntu 24.04 LTS)
- Reachable from the control machine via SSH
- OpenSSH server installed during Ubuntu setup
- A user with sudo privileges
- Open inbound ports 3000 (the app) and 22 (SSH)

## Deploy

Run from the control machine:

```bash
ansible-playbook -i "<VM_IP>," -u <VM_USERNAME> --ask-pass --ask-become-pass deploy.yml
```

**Example:**
```bash
ansible-playbook -i "192.168.0.63," -u klg5897 --ask-pass --ask-become-pass deploy.yml
```

You'll be prompted for the SSH password and the BECOME (sudo) password. They're typically the same.

The playbook takes ~3–5 minutes on the first run. It's idempotent — you can re-run it safely.

## Verify

```bash
chmod +x verify.sh
./verify.sh <VM_IP> 3000
```

The script runs 5 checks against the API:
- `GET /orders` returns 200
- `GET /orders/<bad-id>` returns 404
- `GET /<unknown-route>` returns 404
- `POST /orders` (valid body) returns 201
- `POST /orders` (missing fields) returns 400

You can also open `http://<VM_IP>:3000/orders` in a browser to see the live API response.

## Rollback

```bash
ansible-playbook -i "<VM_IP>," -u <VM_USERNAME> --ask-pass --ask-become-pass rollback.yml
```

This stops the app, removes `/opt/order-api`, drops the `ordersdb` database, and uninstalls Node.js + PostgreSQL, leaving the VM in a clean state.

## Variables (in `deploy.yml`)

| Variable | Default | Description |
|----------|---------|-------------|
| `app_name` | `order-api` | PM2 process name |
| `app_user` | `nodeapp` | System user that runs the app |
| `app_dir` | `/opt/order-api` | Where the code is cloned |
| `app_repo` | GitHub URL | Source repository |
| `app_port` | `3000` | App listen port |
| `node_version` | `20` | Major Node.js version |
| `db_name` | `ordersdb` | PostgreSQL database name |
| `db_user` | `orderuser` | Database user |
| `db_password` | (set in playbook) | **Change this for production!** |

## Known Issues / Limitations

- **App uses SQLite, not PostgreSQL.** The playbook installs and provisions PostgreSQL (database, user, privileges) per the assignment requirements, but the underlying `app.js` uses `better-sqlite3` for storage. Wiring the app to PostgreSQL would require swapping `better-sqlite3` for `pg` in `app.js`.
- **No PM2 systemd auto-start.** Earlier playbook iterations attempted to use `pm2 startup systemd` to make the app survive reboots, but this caused systemd protocol errors with the system app user. The PM2 daemon runs the app reliably while the VM is up; restart-on-reboot was dropped to keep the deployment clean.
- **Password-based SSH.** Used `--ask-pass` and `--ask-become-pass` instead of setting up key-based auth. For production, run `ssh-copy-id` first and drop those flags.
- **`sshpass` warning** about Ansible's tmp directory permissions appears on some npm tasks. It's harmless and the tasks complete successfully.

## Troubleshooting

- **`ssh: connect to host ... port 22: Connection refused`** — VM isn't booted or SSH isn't running. Check the VM console.
- **`Permission denied (publickey)`** — make sure you're using `--ask-pass` if you don't have key-based SSH set up, or run `ssh-copy-id <user>@<vm-ip>` first.
- **`fatal: detected dubious ownership in repository`** — the playbook adds `/opt/order-api` to git's safe directories before cloning to handle this.
- **`address already in use :::3000`** — leftover process from previous runs. The playbook now kills processes on port 3000 before deploying via the `Kill any stale processes bound to the app port` task.
