# PrismConnect Deployment Guide

This guide provides step-by-step instructions for deploying the PrismConnect video calling platform with real-time Vietnamese-English translation on a Digital Ocean Ubuntu server using Docker and Nginx Proxy Manager.

## Prerequisites

- Ubuntu server (tested on Ubuntu 22.04 LTS)
- Docker and Docker Compose installed
- Nginx Proxy Manager running in Docker
- Domain name with DNS records pointing to your server
- Basic knowledge of terminal commands and server administration

## System Architecture

PrismConnect consists of the following components:

1. **Frontend Application**: React-based web interface
2. **Signaling Server**: WebRTC signaling for peer connections
3. **Speech Recognition Service**: Processes audio for transcription
4. **Translation Service**: API for text translation
5. **LibreTranslate**: Open-source translation engine

## Step 1: Prepare Your Server

Ensure your server has Docker and Docker Compose installed:

```bash
# Update package lists
sudo apt update

# Install required packages
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# Add Docker repository
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# Update package lists again
sudo apt update

# Install Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add your user to the docker group (optional, for running Docker without sudo)
sudo usermod -aG docker $USER
```

Log out and log back in for the group changes to take effect.

## Step 2: Clone the Repository

Clone the PrismConnect repository to your server:

```bash
# Create a directory for the application
mkdir -p /opt/prismconnect

# Navigate to the directory
cd /opt/prismconnect

# Clone the repository or copy the files
# If you have the files locally, you can use SCP or SFTP to transfer them
```

## Step 3: Configure Environment Variables

Create a `.env` file in the root directory to configure environment variables:

```bash
# Create .env file
touch .env

# Edit the file
nano .env
```

Add the following content to the `.env` file:

```
# Frontend configuration
REACT_APP_SIGNALING_URL=https://signaling.prismconnect.app
REACT_APP_SPEECH_SERVICE_URL=https://speech.prismconnect.app
REACT_APP_TRANSLATION_API_URL=https://api.prismconnect.app

# Backend services configuration
NODE_ENV=production
TRANSLATION_API_URL=http://translation-service:3000/translate
LIBRETRANSLATE_URL=http://libretranslate:5000
```

## Step 4: Build and Start the Services

Use Docker Compose to build and start all services:

```bash
# Navigate to the application directory
cd /opt/prismconnect

# Build and start the services in detached mode
docker-compose up -d
```

This will build all the Docker images and start the containers as defined in the `docker-compose.yml` file.

## Step 5: Configure Nginx Proxy Manager

Now that your services are running, you need to configure Nginx Proxy Manager to route traffic to the appropriate containers.

1. **Access Nginx Proxy Manager**:
   - Open your browser and navigate to your Nginx Proxy Manager admin interface (typically at http://your-server-ip:81)
   - Log in with your credentials

2. **Create Proxy Hosts for Each Service**:

   a. **Main Application (chat.prismconnect.app)**:
   - Click "Add Proxy Host"
   - Domain Names: `chat.prismconnect.app`
   - Scheme: `http`
   - Forward Hostname/IP: `localhost`
   - Forward Port: `80`
   - Check "Block Common Exploits"
   - SSL Tab: Request a new SSL certificate with Let's Encrypt
   - Check "Force SSL" and "HTTP/2 Support"
   - Save

   b. **Signaling Server (signaling.prismconnect.app)**:
   - Click "Add Proxy Host"
   - Domain Names: `signaling.prismconnect.app`
   - Scheme: `http`
   - Forward Hostname/IP: `localhost`
   - Forward Port: `3001`
   - Check "Block Common Exploits"
   - SSL Tab: Request a new SSL certificate with Let's Encrypt
   - Check "Force SSL" and "HTTP/2 Support"
   - Advanced Tab: Add the following custom configuration:
     ```
     location / {
         proxy_pass http://localhost:3001;
         proxy_http_version 1.1;
         proxy_set_header Upgrade $http_upgrade;
         proxy_set_header Connection "upgrade";
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
         proxy_read_timeout 86400;
     }
     ```
   - Save

   c. **Speech Service (speech.prismconnect.app)**:
   - Click "Add Proxy Host"
   - Domain Names: `speech.prismconnect.app`
   - Scheme: `http`
   - Forward Hostname/IP: `localhost`
   - Forward Port: `4000`
   - Check "Block Common Exploits"
   - SSL Tab: Request a new SSL certificate with Let's Encrypt
   - Check "Force SSL" and "HTTP/2 Support"
   - Advanced Tab: Add the following custom configuration:
     ```
     location / {
         proxy_pass http://localhost:4000;
         proxy_http_version 1.1;
         proxy_set_header Upgrade $http_upgrade;
         proxy_set_header Connection "upgrade";
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
         proxy_read_timeout 86400;
     }
     ```
   - Save

   d. **Translation API (api.prismconnect.app)**:
   - Click "Add Proxy Host"
   - Domain Names: `api.prismconnect.app`
   - Scheme: `http`
   - Forward Hostname/IP: `localhost`
   - Forward Port: `3000`
   - Check "Block Common Exploits"
   - SSL Tab: Request a new SSL certificate with Let's Encrypt
   - Check "Force SSL" and "HTTP/2 Support"
   - Save

   e. **LibreTranslate (translate.prismconnect.app)**:
   - Click "Add Proxy Host"
   - Domain Names: `translate.prismconnect.app`
   - Scheme: `http`
   - Forward Hostname/IP: `localhost`
   - Forward Port: `5000`
   - Check "Block Common Exploits"
   - SSL Tab: Request a new SSL certificate with Let's Encrypt
   - Check "Force SSL" and "HTTP/2 Support"
   - Save

## Step 6: Update Frontend Configuration

If you need to update the frontend configuration to match your domain names:

1. Edit the `.env` file in the frontend directory:

```bash
# Navigate to the frontend directory
cd /opt/prismconnect/frontend

# Edit the .env file
nano .env
```

2. Update the URLs to match your domain names:

```
REACT_APP_SIGNALING_URL=https://signaling.prismconnect.app
REACT_APP_SPEECH_SERVICE_URL=https://speech.prismconnect.app
REACT_APP_TRANSLATION_API_URL=https://api.prismconnect.app
```

3. Rebuild and restart the frontend container:

```bash
# Navigate back to the root directory
cd /opt/prismconnect

# Rebuild and restart only the frontend service
docker-compose up -d --build frontend
```

## Step 7: Verify Deployment

1. **Check Container Status**:

```bash
docker-compose ps
```

All containers should be in the "Up" state.

2. **Check Logs for Errors**:

```bash
# View logs for all services
docker-compose logs

# View logs for a specific service
docker-compose logs frontend
docker-compose logs signaling-server
docker-compose logs speech-service
docker-compose logs translation-service
docker-compose logs libretranslate
```

3. **Access the Application**:

Open your browser and navigate to `https://chat.prismconnect.app`. You should see the PrismConnect video calling interface.

## Troubleshooting

### WebSocket Connection Issues

If you experience WebSocket connection issues:

1. **Check Nginx Proxy Manager Configuration**:
   - Ensure WebSocket support is properly configured in the Advanced tab
   - Verify the proxy_read_timeout setting is sufficient (86400 seconds recommended)

2. **Check Container Logs**:
   - Look for connection errors in the signaling server and speech service logs

3. **Verify Firewall Settings**:
   - Ensure ports 80, 443, and all service ports are open in your firewall

### Translation Service Issues

If translation is not working:

1. **Check LibreTranslate Status**:
   - Verify the LibreTranslate container is running
   - Check logs for any initialization errors

2. **Verify Language Models**:
   - LibreTranslate needs to download language models on first run
   - This may take some time; check logs for completion status

### Video/Audio Issues

If video or audio is not working:

1. **Check Browser Permissions**:
   - Ensure your browser has permission to access camera and microphone
   - Try using a different browser to rule out browser-specific issues

2. **Check WebRTC Connection**:
   - Look for ICE connection errors in the browser console
   - Verify STUN/TURN server configuration if needed

## Maintenance

### Updating the Application

To update the application:

```bash
# Navigate to the application directory
cd /opt/prismconnect

# Pull the latest changes
git pull

# Rebuild and restart the services
docker-compose up -d --build
```

### Backing Up Configuration

Regularly back up your configuration files:

```bash
# Create a backup directory
mkdir -p /opt/backups

# Back up the .env file and docker-compose.yml
cp /opt/prismconnect/.env /opt/backups/
cp /opt/prismconnect/docker-compose.yml /opt/backups/
```

### Monitoring

Monitor your application using Docker's built-in tools:

```bash
# Check container resource usage
docker stats

# Check container logs
docker-compose logs -f
```

## Security Considerations

1. **Restrict Access to Admin Interfaces**:
   - Limit access to Nginx Proxy Manager admin interface
   - Use strong passwords for all admin accounts

2. **Keep Software Updated**:
   - Regularly update Docker, Docker Compose, and all containers
   - Apply security patches promptly

3. **Configure Firewall**:
   - Only expose necessary ports (80, 443)
   - Use UFW or similar to restrict access

4. **Enable HTTPS**:
   - Always use SSL certificates for all services
   - Configure proper SSL settings in Nginx Proxy Manager

## Conclusion

You have successfully deployed the PrismConnect video calling platform with real-time Vietnamese-English translation on your Digital Ocean Ubuntu server. The application is now accessible at `https://chat.prismconnect.app` and ready for use.

For additional support or questions, please refer to the documentation or contact the development team.
