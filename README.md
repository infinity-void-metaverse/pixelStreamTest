# Streampixel Embed Tester

A testing console for Streampixel iframe embeds. Paste a stream URL to embed it, then send any postMessage payload to it and watch every message it sends back.

## Features

- **Presets** — one-click buttons for the common commands (resolution, mute/unmute, mouse hover, chat/comms, screenshot, terminate). The ✎ button next to each preset opens its payload in the composer so you can tweak it before sending.
- **Composer** — send *any* payload, in two modes. **Form** mode: add field name/value rows and the JSON payload is built for you (values auto-detect numbers, booleans and JSON; quote a value to force text) — the default sends `{ "message": "test message" }`. **Advanced (JSON)** mode: write the full payload yourself — valid JSON is sent as an object, anything else as a plain string, exactly as written. Both modes share a live "Will send" preview and Ctrl/Cmd+Enter to send. Switching modes carries your payload across.
- **Log** — every sent and received message with timestamps, copy and re-send buttons.
- **Shareable links** — the stream URL is kept in `?url=…`, so you can send testers a prefilled link (there's a Copy Share Link button in the top bar).
- **Echo test page** — `public/echo.html` simulates a stream: it sends `loadingComplete` on load and echoes back everything it receives. Use it to try the tester without a live stream (button on the landing screen).

The app still auto-sends `startApp` 5 s after the iframe is embedded and a `heartbeat` every 10 minutes.

---

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
