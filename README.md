# QR Code Generator

A lightweight, client-side QR code generator. Text or URL input is converted into a scannable QR code entirely in the browser, with no backend, no API calls, and no external data transmission.

## Live Demo

https://ambitious-sky-052e19810.azurestaticapps.net

## Features

- Text and URL input with a 1000 character limit and live character counter
- Instant QR code generation on the client
- Adjustable QR code size (150 to 500 pixels)
- Configurable foreground and background colors
- PNG download
- Copy QR code image to clipboard (where supported by the browser)
- Input validation with inline error messages
- Responsive layout for mobile and desktop

## Tech Stack

- HTML, CSS, JavaScript (no frontend framework)
- qrcode (MIT license) for QR code generation, bundled locally with esbuild
- Azure Static Web Apps (Free plan) for hosting and deployment
- GitHub Actions for continuous deployment

## How It Works

QR code generation runs entirely in the browser using the HTML canvas API. The qrcode library's browser entry point is bundled into a single local file (vendor/qrcode.min.js) at build time, so the deployed site has no runtime dependency on npm, a CDN, or any external service.

## Project Structure

qr-code-generator/
├── .github/workflows/          GitHub Actions deployment workflow
├── vendor/qrcode.min.js        Bundled QR generation library
├── index.html                  Application markup
├── style.css                   Application styling
├── script.js                   Application logic
├── package.json                Records the qrcode/esbuild versions used to build vendor/qrcode.min.js
└── README.md

## Local Setup

1. Clone the repository.
2. Open index.html directly in a browser, or serve the folder with any static file server.

No build step is required to run the site locally, since vendor/qrcode.min.js is already committed to the repository.

## Rebuilding the QR Library

The bundled file in vendor/ only needs to be regenerated if the qrcode dependency is updated. To rebuild it:

npm install
npm install esbuild --save-dev
npx esbuild node_modules/qrcode/lib/browser.js --bundle --minify --global-name=QRCode --outfile=vendor/qrcode.min.js --platform=browser

## Deployment

The site is deployed to Azure Static Web Apps (Free plan) via the GitHub Actions workflow in .github/workflows/. Any push to main triggers an automatic rebuild and redeploy. Since this is a static site with no build step, the workflow is configured with skip_app_build: true.

## Dependencies

| Package | Purpose | Scope |
|---|---|---|
| qrcode | QR code generation | Bundled at build time only, not a runtime dependency |
| esbuild | Bundles the qrcode library into a single browser-ready file | Development only |

## License

MIT
