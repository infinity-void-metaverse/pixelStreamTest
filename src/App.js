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

// Form-mode values auto-detect booleans, null, numbers and JSON.
// Wrap in double quotes to force a literal string.
const parseFieldValue = (raw) => {
  const t = raw.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (t[0] === '{' || t[0] === '[' || t[0] === '"') {
    try {
      return JSON.parse(t);
    } catch {
      return raw;
    }
  }
  return raw;
};

// Turn a parsed value back into form-input text so the field round-trips.
const fieldValueToText = (value) => {
  if (typeof value === 'string') {
    return parseFieldValue(value) === value ? value : JSON.stringify(value);
  }
  return JSON.stringify(value);
};

let nextLogId = 1;
let nextFieldId = 3;

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
  const [copied, setCopied] = useState(false);

  const [composerMode, setComposerMode] = useState('form');
  const [formFields, setFormFields] = useState([
    { id: 1, name: 'type', value: 'setResolution' },
    { id: 2, name: 'value', value: '720p (1280x720)' },
  ]);
  const [composerText, setComposerText] = useState('');

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

  // The object built from the form rows (before optional wrapping).
  const formObject = useMemo(() => {
    const obj = {};
    formFields.forEach((f) => {
      if (f.name.trim()) obj[f.name.trim()] = parseFieldValue(f.value);
    });
    return obj;
  }, [formFields]);

  const jsonStatus = useMemo(() => {
    const text = composerText.trim();
    if (!text) return { kind: 'empty', label: 'Type a JSON payload or plain string' };
    try {
      JSON.parse(text);
      return { kind: 'json', label: 'Valid JSON — sent as an object' };
    } catch {
      return { kind: 'string', label: 'Not valid JSON — sent as a plain string' };
    }
  }, [composerText]);

  // Exactly what Send will post. Form mode always wraps the fields in the
  // { message: … } envelope; JSON mode sends the text verbatim.
  const currentPayload = useMemo(() => {
    if (composerMode === 'form') {
      return { message: formObject };
    }
    const text = composerText.trim();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }, [composerMode, formObject, composerText]);

  const canSend =
    composerMode === 'form'
      ? formFields.some((f) => f.name.trim() !== '')
      : composerText.trim() !== '';

  const previewText = useMemo(() => {
    if (!canSend || currentPayload === null) return 'Nothing to send yet';
    return typeof currentPayload === 'string'
      ? currentPayload
      : JSON.stringify(currentPayload, null, 2);
  }, [canSend, currentPayload]);

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
    setComposerMode('json');
    setActiveTab('composer');
  };

  const switchToJson = () => {
    if (composerMode === 'json') return;
    if (formFields.some((f) => f.name.trim())) {
      setComposerText(JSON.stringify({ message: formObject }, null, 2));
    }
    setComposerMode('json');
  };

  const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

  const switchToForm = () => {
    if (composerMode === 'form') return;
    try {
      const parsed = JSON.parse(composerText);
      // Fields represent the object inside the { message: … } envelope.
      const inner =
        isPlainObject(parsed) && Object.keys(parsed).length === 1 && isPlainObject(parsed.message)
          ? parsed.message
          : parsed;
      if (isPlainObject(inner)) {
        setFormFields(
          Object.entries(inner).map(([name, value]) => ({
            id: nextFieldId++,
            name,
            value: fieldValueToText(value),
          }))
        );
      }
    } catch {
      // Text isn't a JSON object — keep the existing form fields.
    }
    setComposerMode('form');
  };

  const handleFieldChange = (id, key, text) => {
    setFormFields((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: text } : f)));
  };

  const handleFieldRemove = (id) => {
    setFormFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleFieldAdd = () => {
    setFormFields((prev) => [...prev, { id: nextFieldId++, name: '', value: '' }]);
  };

  const handleComposerSend = () => {
    if (canSend && currentPayload !== null) postToIframe(currentPayload);
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
          <h1>Streampixel Embed Tester</h1>
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
        <span className="brand">Streampixel Embed Tester</span>
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
                <div className="segmented">
                  <button
                    className={composerMode === 'form' ? 'active' : ''}
                    onClick={switchToForm}
                  >
                    Form
                  </button>
                  <button
                    className={composerMode === 'json' ? 'active' : ''}
                    onClick={switchToJson}
                  >
                    Advanced (JSON)
                  </button>
                </div>

                {composerMode === 'form' ? (
                  <>
                    <div className="form-fields">
                      <div className="form-fields-head">
                        <span>Field</span>
                        <span>Value</span>
                        <span />
                      </div>
                      {formFields.map((field) => (
                        <div key={field.id} className="field-row">
                          <input
                            type="text"
                            value={field.name}
                            placeholder="name"
                            onChange={(e) => handleFieldChange(field.id, 'name', e.target.value)}
                            onKeyDown={handleComposerKeyDown}
                          />
                          <input
                            type="text"
                            className="field-value"
                            value={field.value}
                            placeholder="value"
                            onChange={(e) => handleFieldChange(field.id, 'value', e.target.value)}
                            onKeyDown={handleComposerKeyDown}
                          />
                          <button
                            className="field-remove"
                            title="Remove field"
                            onClick={() => handleFieldRemove(field.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button className="add-field" onClick={handleFieldAdd}>
                        + Add Field
                      </button>
                    </div>
                    <p className="composer-note">
                      Values auto-detect numbers, booleans and JSON — use{' '}
                      <code>"quotes"</code> to force text.
                    </p>
                  </>
                ) : (
                  <>
                    <textarea
                      id="composer-input"
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder='{ "message": { "type": "…", "value": "…" } }'
                      spellCheck={false}
                    />
                    <div className={`composer-status ${jsonStatus.kind}`}>
                      {jsonStatus.label}
                    </div>
                  </>
                )}

                <div className="payload-preview">
                  <div className="preview-label">Will send</div>
                  <pre>{previewText}</pre>
                </div>

                <button className="send-button" onClick={handleComposerSend} disabled={!canSend}>
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
