import { useRef, useEffect, useState } from 'react';
import './App.css';

function App() {
  const iframeRef = useRef(null);
  const [iframeUrl, setIframeUrl] = useState('');
  const [urlSubmitted, setUrlSubmitted] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  // Unified function to post messages to the iframe
  const postToIframe = (payload) => {
    console.log('Posting to iframe:', payload);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      window.focus(iframeRef.current);
      iframeRef.current.contentWindow.postMessage(payload, '*');
      setTimeout(() => iframeRef.current.focus(), 100);
    } else {
      console.warn('Iframe not ready for postMessage');
    }
  };

  const handleSendCommand480 = () => {
    postToIframe({ message: { value: '480p (854x480)', type: 'setResolution' } });

  
  };

  const handleSendChatStart = () => {
  postToIframe(    {
  message: {
    type: "comms",
    value: {
      name: "User" + Math.floor(Math.random() * 10000),
      pfpUrl: "https://iaa.edu.in/public/uploads/admin/faculty/unr_test_161024_0535_9lih90[1]1564210749.png",
      roomId: "room-123"
    }
  }
});
    
  };


    const handleDisconnectChat = () => {
  postToIframe(    {
  message: {
    type: "comms",
    value: 'disconnect'
  }
});
    
  };

  const handleSendCommand720 = () => {
    postToIframe({ message: { value: '720p (1280x720)', type: 'setResolution' } });
  };

  const handleMute = () => postToIframe({ message: 'muteAudio' });
  const handleUnMute = () => postToIframe({ message: 'unMuteAudio' });
  const handleTerminateSession = () => postToIframe({ message: 'terminateSession' });



    const handlescreenshot =() =>{
      
      postToIframe({ message: 'requestScreenshot' })
    
    };


    const enableMouseHover = () =>  postToIframe({ message: { value: true, type: 'togglehoveringmouse' } });

    const disableMouseHover = () =>  postToIframe({ message: { value: false, type: 'togglehoveringmouse' } });



  const handleSendCustom = () => {
    if (customMessage.trim()) {
      postToIframe({ message: customMessage.trim() });
      setCustomMessage('');
    }
  };

  useEffect(() => {
    const heartbeat = { message: 'heartbeat' };
    const intervalId = setInterval(() => postToIframe(heartbeat), 600000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const startTimeout = setTimeout(() => postToIframe({ message: 'startApp' }), 5000);
    const handleMessage = (event) => {
      console.log('Received from iframe:', event.data);
      if (event.data === 'loadingComplete') alert('LOADING COMPLETE');
    };
    window.addEventListener('message', handleMessage);
    return () => {
      clearTimeout(startTimeout);
      window.removeEventListener('message', handleMessage);
    };
  }, [urlSubmitted]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (iframeUrl.trim()) setUrlSubmitted(true);
  };

  return (
    <div>
      {urlSubmitted ? (
        <>
          <iframe
            style={{ width: '100vw', height: '90vh' }}
            ref={iframeRef}
            src={iframeUrl}
            allow="microphone; camera"
            title="Iframe"
            tabIndex={0}
          />
          <div style={styles.controlPanel}>
          <button onClick={handleSendCommand480} >Set 480p</button>

            <button onClick={handleSendChatStart}>Chat Start</button>

          <button onClick={handleSendCommand720}>Set 720p</button>
          <button onClick={handleMute}>Mute</button>
          <button onClick={handleUnMute}>UnMute</button>

            <button onClick={enableMouseHover}>Enable Mouse Hover</button>

              <button onClick={disableMouseHover}>Disable Mouse Hover</button>


          <button onClick={handleTerminateSession}>Disconnect</button>

                    <button onClick={handlescreenshot}>Take Screenshot</button>


            <button onClick={handleDisconnectChat}>Disconnect Chat </button>

</div>
          {/* Custom message input and send button */}
          <div style={{ marginTop: '10px' }}>
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Enter message"
              style={{ marginRight: '8px' }}
            />
            <button type="button" onClick={handleSendCustom}>
              Send Message
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={iframeUrl}
            onChange={(e) => setIframeUrl(e.target.value)}
            placeholder="Iframe URL"
          />
          <button type="submit">Submit</button>
        </form>
      )}
    </div>
  );
}

export default App;


const styles = {
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    border: 'none',
    padding: '10px',
    borderRadius: '5px',
    color: 'white',
    cursor: 'pointer',
  },
  controlPanel: {
    position: 'fixed',
    bottom: '20px',
    left:'20px',
    display: 'flex',
    gap: '10px',
    zIndex:'1'
  }
};
