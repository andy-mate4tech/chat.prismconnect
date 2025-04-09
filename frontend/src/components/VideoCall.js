import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import './VideoCall.css';

const VideoCall = () => {
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [translation, setTranslation] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [language, setLanguage] = useState('en-US'); // Default language

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const socketRef = useRef();

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io('http://localhost:3000');

    // Get media stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      })
      .catch(error => {
        console.error("Error accessing media devices:", error);
        alert("Could not access camera or microphone. Please check permissions.");
      });

    // Socket event listeners
    socketRef.current.on('roomCreated', (roomId) => {
      setRoomId(roomId);
      setInRoom(true);
    });

    socketRef.current.on('userJoined', (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });

    socketRef.current.on('callEnded', () => {
      endCall();
    });

    socketRef.current.on('translationReceived', (data) => {
      setTranslation(prev => [...prev, { text: data.text, isIncoming: true }]);
    });

    // Clean up on component unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isTranslating || !callAccepted) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = language;

    recognitionInstance.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');

      if (event.results[0].isFinal) {
        // Send for translation
        translateText(transcript);
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error', event.error);
    };

    setRecognition(recognitionInstance);
    recognitionInstance.start();

    return () => {
      recognitionInstance.stop();
    };
  }, [isTranslating, callAccepted, language]);

  const createRoom = () => {
    if (!name) {
      alert("Please enter your name");
      return;
    }

    const roomId = Math.floor(100000 + Math.random() * 900000).toString();
    socketRef.current.emit('createRoom', { roomId, name });
  };

  const joinRoom = () => {
    if (!name || !roomId) {
      alert("Please enter your name and room ID");
      return;
    }

    setInRoom(true);

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    });

    peer.on('signal', (data) => {
      socketRef.current.emit('joinRoom', {
        roomId,
        signalData: data,
        from: name
      });
    });

    peer.on('stream', (currentStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }
    });

    socketRef.current.on('roomJoined', (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    });

    peer.on('signal', (data) => {
      socketRef.current.emit('answerCall', { signal: data, to: caller, roomId });
    });

    peer.on('stream', (currentStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const endCall = () => {
    setCallEnded(true);
    setCallAccepted(false);
    setInRoom(false);
    setReceivingCall(false);
    
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    
    if (recognition) {
      recognition.stop();
    }
    
    setIsTranslating(false);
    
    socketRef.current.emit('endCall', { roomId });
    
    // Reset state
    setRoomId('');
    setTranslation([]);
    
    // Redirect to home screen
    window.location.reload();
  };

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleTranslation = () => {
    setIsTranslating(!isTranslating);
    
    if (!isTranslating) {
      // Starting translation
      setTranslation(prev => [...prev, { text: "Translation enabled", isSystem: true }]);
    } else {
      // Stopping translation
      if (recognition) {
        recognition.stop();
      }
      setTranslation(prev => [...prev, { text: "Translation disabled", isSystem: true }]);
    }
  };

  const translateText = async (text) => {
    try {
      // Add original text to translation panel
      setTranslation(prev => [...prev, { text, isOutgoing: true }]);
      
      // In a real implementation, this would call the translation service
      // For now, we'll simulate translation with a placeholder
      const targetLang = language === 'en-US' ? 'vi' : 'en';
      
      // Simulate API call to translation service
      socketRef.current.emit('translateText', {
        text,
        from: language === 'en-US' ? 'en' : 'vi',
        to: targetLang,
        roomId
      });
      
      // In a real implementation, the translated text would come back from the server
      // For now, we'll just add a placeholder
      setTimeout(() => {
        const placeholderTranslation = `[Translation of: ${text}]`;
        setTranslation(prev => [...prev, { text: placeholderTranslation, isOutgoing: true, isTranslated: true }]);
      }, 500);
      
    } catch (error) {
      console.error('Translation error:', error);
    }
  };

  const switchLanguage = () => {
    const newLanguage = language === 'en-US' ? 'vi-VN' : 'en-US';
    setLanguage(newLanguage);
    
    if (recognition) {
      recognition.stop();
      recognition.lang = newLanguage;
      if (isTranslating) {
        recognition.start();
      }
    }
    
    setTranslation(prev => [...prev, { 
      text: `Switched to ${newLanguage === 'en-US' ? 'English' : 'Vietnamese'}`, 
      isSystem: true 
    }]);
  };

  // Home screen
  if (!inRoom) {
    return (
      <div className="home-screen">
        <h1>PrismConnect</h1>
        <p>Video calling with real-time translation</p>
        
        <div className="input-group">
          <input 
            type="text" 
            placeholder="Enter your name" 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        
        <div className="button-group">
          <button onClick={createRoom}>Create Room</button>
          
          <div className="divider">OR</div>
          
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Enter Room ID" 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
          </div>
          
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    );
  }

  // Call screen
  return (
    <div className="call-screen">
      <div className="room-info">
        Room ID: <span>{roomId}</span>
      </div>
      
      <div className="video-container">
        <div className="video-grid">
          {/* My video */}
          <div className="video-item">
            <video playsInline muted ref={myVideo} autoPlay className="my-video" />
            <div className="name-tag">{name} (You)</div>
          </div>
          
          {/* Remote video */}
          {callAccepted && !callEnded && (
            <div className="video-item">
              <video playsInline ref={userVideo} autoPlay className="remote-video" />
              <div className="name-tag">{caller}</div>
            </div>
          )}
        </div>
        
        {/* Incoming call notification */}
        {receivingCall && !callAccepted && (
          <div className="incoming-call">
            <h3>{caller} is calling...</h3>
            <button onClick={answerCall}>Answer</button>
            <button onClick={endCall} className="end-call">Decline</button>
          </div>
        )}
        
        {/* Translation panel */}
        {callAccepted && isTranslating && (
          <div className="translation-panel">
            <div className="translation-header">
              <h3>Translation</h3>
              <button onClick={switchLanguage} className="language-switch">
                {language === 'en-US' ? 'EN → VI' : 'VI → EN'}
              </button>
            </div>
            <div className="translation-content">
              {translation.map((item, index) => (
                <div 
                  key={index} 
                  className={`message ${item.isIncoming ? 'incoming' : item.isOutgoing ? 'outgoing' : 'system'} ${item.isTranslated ? 'translated' : ''}`}
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Call controls */}
        <div className="controls">
          <button 
            onClick={toggleMic} 
            className={`control-btn ${isMuted ? 'muted' : ''}`}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>
          
          <button 
            onClick={toggleVideo} 
            className={`control-btn ${isVideoOff ? 'video-off' : ''}`}
          >
            {isVideoOff ? '🚫' : '📹'}
          </button>
          
          <button 
            onClick={toggleTranslation} 
            className={`control-btn ${isTranslating ? 'active' : ''}`}
          >
            🌐
          </button>
          
          <button onClick={endCall} className="control-btn end-call">
            📞
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
