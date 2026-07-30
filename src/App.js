import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import './App.css';

const HEARTBEAT_INTERVAL_MS = 600000;
const START_APP_DELAY_MS = 5000;
const MAX_LOG_ENTRIES = 300;

// Preset payloads. `payload` can be an object (sent as-is) or a function
// (called on each click, for payloads that need fresh values).
const PRESET_GROUPS = [
  {
    title: 'App',
    presets: [
      { label: 'Start App', payload: { message: 'startApp' } },
      { label: 'Heartbeat', payload: { message: 'heartbeat' } },
    ],
  },
  {
    title: 'Resolution',
    presets: [
      { label: '480p', payload: { message: { type: 'setResolution', value: '480p (854x480)' } } },
      { label: '720p', payload: { message: { type: 'setResolution', value: '720p (1280x720)' } } },
      { label: '1080p', payload: { message: { type: 'setResolution', value: '1080p (1920x1080)' } } },
    ],
  },
  {
    title: 'Audio',
    presets: [
      { label: 'Mute', payload: { message: 'muteAudio' } },
      { label: 'Unmute', payload: { message: 'unMuteAudio' } },
    ],
  },
  {
    title: 'Mouse',
    presets: [
      { label: 'Enable Hover', payload: { message: { type: 'togglehoveringmouse', value: true } } },
      { label: 'Disable Hover', payload: { message: { type: 'togglehoveringmouse', value: false } } },
    ],
  },
  {
    title: 'Chat',
    presets: [
      {
        label: 'Chat Start',
        payload: () => ({
          message: {
            type: 'comms',
            value: {
              name: 'User' + Math.floor(Math.random() * 10000),
              pfpUrl: 'https://iaa.edu.in/public/uploads/admin/faculty/unr_test_161024_0535_9lih90[1]1564210749.png',
              roomId: 'room-123',
            },
          },
        }),
      },
      { label: 'Disconnect Chat', payload: { message: { type: 'comms', value: 'disconnect' } } },
    ],
  },
  {
    title: 'Session',
    presets: [
      { label: 'Take Screenshot', payload: { message: 'requestScreenshot' } },
      { label: 'Terminate Session', payload: { message: 'terminateSession' }, danger: true },
    ],
  },
];

const DEFAULT_COMPOSER_TEXT = JSON.stringify(
  { message: { type: 'setResolution', value: '720p (1280x720)' } },
  null,
  2
);

const resolvePayload = (preset) =>
  typeof preset.payload === 'function' ? preset.payload() : preset.payload;

const formatData = (data) => {
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

let nextLogId = 1;

function App() {
  const iframeRef = useRef(null);
  const logContainerRef = useRef(null);

  const [iframeUrl, setIframeUrl] = useState(
    () => new URLSearchParams(window.location.search).get('url') || ''
  );
  const [urlSubmitted, setUrlSubmitted] = useState(
    () => Boolean(new URLSearchParams(window.location.search).get('url'))
  );
  const [streamStatus, setStreamStatus] = useState('connecting');

  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('presets');
  const [log, setLog] = useState([]);
  const [seenLogCount, setSeenLogCount] = useState(0);
  const [composerText, setComposerText] = useState(DEFAULT_COMPOSER_TEXT);
  const [wrapInMessage, setWrapInMessage] = useState(false);
  const [copied, setCopied] = useState(false);

  const addLog = useCallback((dir, data, note) => {
    setLog((prev) => [
      ...prev.slice(-(MAX_LOG_ENTRIES - 1)),
      { id: nextLogId++, dir, data, note, time: new Date() },
    ]);
  }, []);

  const postToIframe = useCallback(
    (payload, { silent } = {}) => {
      console.log('Posting to iframe:', payload);
      const frame = iframeRef.current;
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage(payload, '*');
        setTimeout(() => frame.focus(), 100);
        if (!silent) addLog('sent', payload);
      } else {
        console.warn('Iframe not ready for postMessage');
        if (!silent) addLog('error', payload, 'Iframe not ready — message not sent');
      }
    },
    [addLog]
  );

  // Periodic heartbeat to keep the session alive.
  useEffect(() => {
    if (!urlSubmitted) return;
    const intervalId = setInterval(
      () => postToIframe({ message: 'heartbeat' }, { silent: true }),
      HEARTBEAT_INTERVAL_MS
    );
    return () => clearInterval(intervalId);
  }, [urlSubmitted, postToIframe]);

  // Auto-start the app shortly after the iframe is embedded.
  useEffect(() => {
    if (!urlSubmitted) return;
    const startTimeout = setTimeout(
      () => postToIframe({ message: 'startApp' }),
      START_APP_DELAY_MS
    );
    return () => clearTimeout(startTimeout);
  }, [urlSubmitted, postToIframe]);

  // Log every message coming back from the embedded stream.
  useEffect(() => {
    const handleMessage = (event) => {
      const frameWindow = iframeRef.current && iframeRef.current.contentWindow;
      if (!frameWindow || event.source !== frameWindow) return;
      console.log('Received from iframe:', event.data);
      addLog('received', event.data);
      const value =
        typeof event.data === 'string'
          ? event.data
          : event.data && (event.data.value || event.data.message);
      if (value === 'loadingComplete') setStreamStatus('loaded');
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addLog]);

  // Keep the log scrolled to the newest entry while it is visible.
  useEffect(() => {
    if (activeTab === 'log' && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log, activeTab]);

  useEffect(() => {
    if (activeTab === 'log') setSeenLogCount(log.length);
  }, [activeTab, log.length]);

  const unreadCount = activeTab === 'log' ? 0 : log.length - seenLogCount;

  const composerStatus = useMemo(() => {
    const text = composerText.trim();
    if (!text) return { kind: 'empty', label: 'Type a JSON payload or plain string' };
    try {
      JSON.parse(text);
      return { kind: 'json', label: 'Valid JSON — sent as an object' };
    } catch {
      return { kind: 'string', label: 'Not valid JSON — sent as a plain string' };
    }
  }, [composerText]);

  const loadUrl = (url) => {
    setIframeUrl(url);
    setUrlSubmitted(true);
    setStreamStatus('connecting');
    const params = new URLSearchParams(window.location.search);
    params.set('url', url);
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const url = iframeUrl.trim();
    if (url) loadUrl(url);
  };

  const handleChangeUrl = () => {
    setUrlSubmitted(false);
    setStreamStatus('connecting');
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?url=${encodeURIComponent(iframeUrl)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handlePresetSend = (preset) => postToIframe(resolvePayload(preset));

  const handlePresetEdit = (preset) => {
    setComposerText(JSON.stringify(resolvePayload(preset), null, 2));
    setActiveTab('composer');
  };

  const handleComposerSend = () => {
    const text = composerText.trim();
    if (!text) return;
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
    if (wrapInMessage) payload = { message: payload };
    postToIframe(payload);
  };

  const handleComposerKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleComposerSend();
    }
  };

  const handleCopyEntry = (entry) => {
    navigator.clipboard.writeText(formatData(entry.data));
  };

  if (!urlSubmitted) {
    return (
      <div className="landing">
        <div className="landing-card">
          <h1>StreamPixel Embed Tester</h1>
          <p>
            Paste a stream URL to embed it in an iframe. Then send any postMessage
            payload to it — presets, or your own JSON — and watch every message it
            sends back.
          </p>
          <form onSubmit={handleSubmit} className="landing-form">
            <input
              type="text"
              value={iframeUrl}
              onChange={(e) => setIframeUrl(e.target.value)}
              placeholder="https://stream.streampixel.io/…"
              autoFocus
            />
            <button type="submit">Load Stream</button>
          </form>
          <button className="landing-echo" onClick={() => loadUrl('echo.html')}>
            No stream handy? Try the built-in echo test page
          </button>
          <p className="landing-hint">
            Tip: share a prefilled link with <code>?url=&lt;stream-url&gt;</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">StreamPixel Embed Tester</span>
        <span className={`status status-${streamStatus}`}>
          {streamStatus === 'loaded' ? 'Loaded' : 'Connecting…'}
        </span>
        <span className="topbar-url" title={iframeUrl}>{iframeUrl}</span>
        <div className="topbar-actions">
          <button onClick={handleCopyShareLink}>{copied ? 'Copied!' : 'Copy Share Link'}</button>
          <button onClick={handleChangeUrl}>Change URL</button>
          <button onClick={() => setPanelOpen((open) => !open)}>
            {panelOpen ? 'Hide Panel' : 'Show Panel'}
          </button>
        </div>
      </header>

      <div className="main">
        <iframe
          className="stream-frame"
          ref={iframeRef}
          src={iframeUrl}
          allow="autoplay; microphone; camera"
          title="Embedded stream"
          tabIndex={0}
          onLoad={() => addLog('info', 'Iframe document loaded')}
        />

        {panelOpen && (
          <aside className="panel">
            <nav className="tabs">
              <button
                className={activeTab === 'presets' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('presets')}
              >
                Presets
              </button>
              <button
                className={activeTab === 'composer' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('composer')}
              >
                Composer
              </button>
              <button
                className={activeTab === 'log' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('log')}
              >
                Log{unreadCount > 0 && <span className="badge">{unreadCount}</span>}
              </button>
            </nav>

            {activeTab === 'presets' && (
              <div className="tab-content">
                {PRESET_GROUPS.map((group) => (
                  <section key={group.title} className="preset-group">
                    <h3>{group.title}</h3>
                    <div className="preset-buttons">
                      {group.presets.map((preset) => (
                        <div key={preset.label} className="preset-row">
                          <button
                            className={preset.danger ? 'preset danger' : 'preset'}
                            onClick={() => handlePresetSend(preset)}
                          >
                            {preset.label}
                          </button>
                          <button
                            className="preset-edit"
                            title="Open payload in composer"
                            onClick={() => handlePresetEdit(preset)}
                          >
                            ✎
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {activeTab === 'composer' && (
              <div className="tab-content composer">
                <label className="composer-label" htmlFor="composer-input">
                  Payload (any JSON, or a plain string)
                </label>
                <textarea
                  id="composer-input"
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  spellCheck={false}
                />
                <div className={`composer-status ${composerStatus.kind}`}>
                  {composerStatus.label}
                </div>
                <label className="composer-wrap">
                  <input
                    type="checkbox"
                    checked={wrapInMessage}
                    onChange={(e) => setWrapInMessage(e.target.checked)}
                  />
                  Wrap payload in <code>{'{ "message": … }'}</code>
                </label>
                <button
                  className="send-button"
                  onClick={handleComposerSend}
                  disabled={composerStatus.kind === 'empty'}
                >
                  Send Message
                </button>
                <p className="composer-hint">Ctrl/Cmd + Enter to send</p>
              </div>
            )}

            {activeTab === 'log' && (
              <div className="tab-content log-tab">
                <div className="log-header">
                  <span>{log.length} entries</span>
                  <button onClick={() => setLog([])}>Clear</button>
                </div>
                <div className="log" ref={logContainerRef}>
                  {log.length === 0 && (
                    <p className="log-empty">
                      No messages yet. Sent and received messages appear here.
                    </p>
                  )}
                  {log.map((entry) => (
                    <div key={entry.id} className={`log-entry ${entry.dir}`}>
                      <div className="log-meta">
                        <span className="log-dir">
                          {entry.dir === 'sent' && '↑ sent'}
                          {entry.dir === 'received' && '↓ received'}
                          {entry.dir === 'error' && '⚠ error'}
                          {entry.dir === 'info' && 'ℹ info'}
                        </span>
                        <span className="log-time">{entry.time.toLocaleTimeString()}</span>
                        <span className="log-actions">
                          <button title="Copy payload" onClick={() => handleCopyEntry(entry)}>
                            ⧉
                          </button>
                          {(entry.dir === 'sent' || entry.dir === 'error') && (
                            <button title="Send again" onClick={() => postToIframe(entry.data)}>
                              ↻
                            </button>
                          )}
                        </span>
                      </div>
                      {entry.note && <div className="log-note">{entry.note}</div>}
                      <pre>{formatData(entry.data)}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;
