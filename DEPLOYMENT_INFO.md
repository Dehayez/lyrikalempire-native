# DigitalOcean Droplet Deployment Information

## Server Configuration

### Droplet IP
- **IP Address**: `174.138.4.195`
- **Current Project Port**: `4000` (lyrikalempire)
- **Use a different port** for your new project (e.g., `5000`, `6000`, etc.)

### Domain Configuration
- **Current Domain**: `lyrikalempire.com` / `www.lyrikalempire.com`
- Configure your new domain or subdomain pointing to `174.138.4.195`

## Required Environment Variables (.env file)

```bash
# Server Configuration
PORT=5000  # Use a different port than 4000

# Database (if using MySQL)
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_new_project_db

# Domain Configuration
DOMAIN=yournewproject.com
NODE_ENV=production
```

## CORS Configuration

Include these origins in your server's CORS settings:
- `http://localhost:3000` (for local development)
- `http://yournewproject.com`
- `https://yournewproject.com`
- `http://174.138.4.195:PORT` (replace PORT with your new project's port)
- `http://174.138.4.195`

## Server Setup Requirements

### 1. Port Selection
- Choose a port different from `4000`
- Update your server configuration to use this port

### 2. Nginx Configuration (if using)
- Add a new server block for your domain
- Proxy to your chosen port (e.g., `proxy_pass http://localhost:5000`)
- Configure SSL certificate

### 3. Process Manager
- Use PM2 or similar to run your application
- Configure to restart on server reboot

### 4. Firewall
- Ensure your chosen port is allowed in the firewall

### 5. Database (if needed)
- Create a new database for your project
- Do NOT use the same database as lyrikalempire


