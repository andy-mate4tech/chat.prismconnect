# PrismConnect: Video Calling Platform with Real-time Translation

## System Architecture

### Overview
PrismConnect is a self-hosted video calling platform with real-time Vietnamese-English translation capabilities. The system uses WebRTC for peer-to-peer video communication, Web Speech API for speech recognition, and LibreTranslate for translation services.

### Components

1. **Frontend Application**
   - React-based web application
   - WebRTC implementation for video/audio streaming
   - Web Speech API integration for speech recognition
   - User interface for video calls and translation display

2. **Signaling Server**
   - Node.js server using Socket.IO
   - Facilitates WebRTC connection establishment
   - Manages room creation and peer connections

3. **Speech Recognition Service**
   - Utilizes Web Speech API in the browser
   - Converts speech to text in real-time
   - Sends transcribed text to translation service

4. **Translation Service**
   - Self-hosted LibreTranslate instance
   - Provides Vietnamese-English and English-Vietnamese translation
   - REST API for text translation requests

### Communication Flow

1. User A creates a room and User B joins the room
2. Signaling server facilitates WebRTC connection between users
3. Direct peer-to-peer connection established for video/audio
4. When User A speaks:
   - Speech is captured and transcribed using Web Speech API
   - Transcribed text is sent to Translation Service
   - Translated text is returned and displayed to User B
5. Same process occurs when User B speaks

### Technical Stack

- **Frontend**: React.js, WebRTC, Web Speech API
- **Backend**: Node.js, Express, Socket.IO
- **Translation**: LibreTranslate (self-hosted)
- **Containerization**: Docker, Docker Compose
- **Reverse Proxy**: Nginx Proxy Manager

### Network Architecture

```
                                  ┌─────────────────┐
                                  │                 │
                                  │  Nginx Proxy    │
                                  │    Manager      │
                                  │                 │
                                  └────────┬────────┘
                                           │
                                           │ (Reverse Proxy)
                                           │
                                  ┌────────┴────────┐
                                  │                 │
┌─────────────────┐      ┌────────┴────────┐      ┌┴────────────────┐
│                 │      │                 │      │                 │
│  Frontend App   │◄────►│ Signaling Server│      │ Translation     │
│  (React)        │      │ (Node.js)       │      │ Service         │
│                 │      │                 │      │ (LibreTranslate)│
└─────────────────┘      └─────────────────┘      └─────────────────┘
        ▲                                                  ▲
        │                                                  │
        │                                                  │
        └──────────────────────────────────────────────────┘
                          (API Calls)
```

### Port Configuration

- **Frontend**: Port 80 (HTTP) / 443 (HTTPS)
- **Signaling Server**: Port 3000
- **Translation Service**: Port 5000

### Domain Structure

- **Main Application**: chat.prismconnect.app
- **Signaling Server**: signaling.prismconnect.app (internal)
- **Translation Service**: translate.prismconnect.app (internal)

## Data Flow

1. **User Registration/Authentication**
   - Simple room-based system without user accounts
   - Room creation with unique IDs
   - Optional room passwords for security

2. **Video Call Establishment**
   - WebRTC signaling through Socket.IO
   - ICE candidate exchange
   - Direct peer-to-peer connection

3. **Speech Recognition**
   - Browser-based using Web Speech API
   - Continuous recognition during call
   - Language detection based on user settings

4. **Translation Process**
   - Text sent to LibreTranslate API
   - Translation returned to frontend
   - Display in real-time caption area

5. **Data Storage**
   - No persistent storage of call content
   - Optional call statistics for monitoring

## Security Considerations

- All communications over HTTPS
- WebRTC encrypted by default
- No storage of call content
- Optional room passwords
- Self-hosted infrastructure for data sovereignty

## Scalability

- Horizontal scaling possible for signaling server
- LibreTranslate can be scaled based on demand
- WebRTC peer-to-peer architecture reduces server load

## Deployment Strategy

- Docker Compose for easy deployment
- Nginx Proxy Manager for SSL termination and routing
- Volume mounts for persistent configuration
- Health checks for service monitoring
