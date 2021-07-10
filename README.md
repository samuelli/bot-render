# Rendertron

[![CI](https://github.com/GoogleChrome/rendertron/workflows/CI/badge.svg)](https://github.com/GoogleChrome/rendertron/actions)
[![NPM package](https://img.shields.io/npm/v/rendertron.svg)](https://npmjs.org/package/rendertron)

> Rendertron is a headless Chrome rendering solution designed to render & serialise web pages on the fly.

#### :hammer: Built with [Puppeteer](https://github.com/GoogleChrome/puppeteer)

#### :cloud: Easy deployment to Google Cloud

#### :mag: Improves SEO

Rendertron is designed to enable your Progressive Web App (PWA) to serve the correct
content to any bot that doesn't render or execute JavaScript. Rendertron runs as a
standalone HTTP server. Rendertron renders requested pages using Headless Chrome,
[auto-detecting](#auto-detecting-loading-function) when your PWA has completed loading
and serializes the response back to the original request. To use Rendertron, your application
configures [middleware](#middleware) to determine whether to proxy a request to Rendertron.
Rendertron is compatible with all client side technologies, including [web components](#web-components).

**Demo endpoint**

A demo Rendertron service is available at https://render-tron.appspot.com/. It is not designed
to be used as a production endpoint. You can use it, but there are no uptime guarantees.

## Contents

- [Middleware](#middleware)
- [API](#api)
  - [Render](#render)
  - [Screenshot](#screenshot)
  - [Invalidate cache](#invalidate-cache)
- [FAQ](#faq)
  - [Query parameters](#query-parameters)
  - [Page render timing](#page-render-timing)
  - [Rendering budget timeout](#rendering-budget-timeout)
  - [Web components](#web-components)
  - [Status codes](#status-codes)
- [Installing & deploying](#installing--deploying)
  - [Building](#building)
  - [Running locally](#running-locally)
  - [Deploying to Google Cloud Platform](#deploying-to-google-cloud-platform)
  - [Deploying using Docker](#deploying-using-docker)
  - [Config](#config)
  - [Troubleshooting](#troubleshooting)

## Middleware

Once you have the service up and running, you'll need to implement the differential serving
layer. This checks the user agent to determine whether prerendering is required.

This is a list of middleware available to use with the Rendertron service:

- [Express.js middleware](/middleware)
- [Firebase functions](https://github.com/justinribeiro/pwa-firebase-functions-botrender) (Community maintained)
- [ASP.net core middleware](https://github.com/galamai/AspNetCore.Rendertron) (Community maintained)
- [Python (Django) middleware and decorator](https://github.com/frontendr/python-rendertron) (Community maintained)

Rendertron is also compatible with [prerender.io middleware](https://prerender.io/documentation/install-middleware).
Note: the user agent lists differ there.

## API

### Render

```
GET /render/<url>
```

The `render` endpoint will render your page and serialize your page. Options are
specified as query parameters:

- `mobile` defaults to `false`. Enable by passing `?mobile` to request the
  mobile version of your site.
- `refreshCache`: Pass `refreshCache=true` to ignore potentially cached render results
  and treat the request as if it is not cached yet.
  The new render result is used to replace the previous result.

### Screenshot

```
GET /screenshot/<url>
POST /screenshot/<url>
```

The `screenshot` endpoint can be used to verify that your page is rendering
correctly.

Both endpoints support the following query parameters:

- `width` defaults to `1000` - specifies viewport width.
- `height` defaults to `1000` - specifies viewport height.
- `mobile` defaults to `false`. Enable by passing `?mobile` to request the
  mobile version of your site.
- `timezoneId` - specifies rendering for timezone.

Additional options are available as a JSON string in the `POST` body. See
[Puppeteer documentation](https://github.com/GoogleChrome/puppeteer/blob/v1.6.0/docs/api.md#pagescreenshotoptions)
for available options. You cannot specify the `type` (defaults to `jpeg`) and
`encoding` (defaults to `binary`) parameters.

### Invalidate cache

```
GET /invalidate/<url>
```

The `invalidate` endpoint will remove cache entry for `<url>` from the configured cache (in-memory, filesystem or cloud datastore).

If you want to clear the entire cache, omit the `/<url>` i.e.
```
GET /invalidate
```

## FAQ

### Query parameters

When setting query parameters as part of your URL, ensure they are encoded correctly. In JS,
this would be `encodeURIComponent(myURLWithParams)`. For example to specify `page=home`:

```
https://render-tron.appspot.com/render/http://my.domain/%3Fpage%3Dhome
```

### Page render timing

The service attempts to detect when a page has loaded by looking at the page load event, ensuring there
are no outstanding network requests and that the page has had ample time to render.

### Rendering budget timeout

There is a hard limit of 10 seconds for rendering. Ensure you don't hit this budget by ensuring
your application is rendered well before the budget expires.

### Web components

Headless Chrome supports web components but shadow DOM is difficult to serialize effectively.
As such, [shady DOM](https://github.com/webcomponents/shadydom) (a lightweight shim for Shadow DOM)
is required for web components.

If you are using web components v0 (deprecated), you will need to enable Shady DOM to
render correctly. In Polymer 1.x, which uses web components v0, Shady DOM is enabled by default.
If you are using Shadow DOM, override this by setting the query parameter `dom=shady` when
directing requests to the Rendertron service.

If you are using web components v1 and either `webcomponents-lite.js` or `webcomponents-loader.js`,
set the query parameter `wc-inject-shadydom=true` when directing requests to the Rendertron
service. This renderer service will force the necessary polyfills to be loaded and enabled.

### Status codes

Status codes from the initial requested URL are preserved. If this is a 200, or 304, you can
set the HTTP status returned by the rendering service by adding a meta tag.

```html
<meta name="render:status_code" content="404" />
```

## Running locally

To install Rendertron and run it locally, first install Rendertron:

```bash
npm install -g rendertron
```

With Chrome installed on your machine run the Rendertron CLI:

```bash
rendertron
```

## Installing & deploying

### Building

Clone and install dependencies:

```bash
git clone https://github.com/GoogleChrome/rendertron.git
cd rendertron
npm install
npm run build
```

### Running locally

With a local instance of Chrome installed, you can start the server locally:

```bash
npm run start
```

### Deploying to Google Cloud Platform

```
gcloud app deploy app.yaml --project <your-project-id>
```

### Deploying using Docker

Rendertron no longer includes a Docker file. Instead, refer to
[Puppeteer documentation](https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-puppeteer-in-docker)
on how to deploy run headless Chrome in Docker.

### Config

When deploying the service, set configuration variables by including a `config.json` in the
root. Available configuration options:

- `timeout` _default `10000`_ - set the timeout used to render the target page.
- `port` _default `3000`_ - set the port to use for running and listening the rendertron service. Note if process.env.PORT is set, it will be used instead.
- `host` _default `0.0.0.0`_ - set the hostname to use for running and listening the rendertron service. Note if process.env.HOST is set, it will be used instead.
- `width` _default `1000`_ - set the width (resolution) to be used for rendering the page.
- `height` _default `1000`_ - set the height (resolution) to be used for rendering the page.
- `reqHeaders` _default `{}`_ - set the additional HTTP headers to be sent to the target page with every request.
- `cache` _default `null`_ - set to `datastore` to enable caching on Google Cloud using datastore _only use if deploying to google cloud_, `memory` to enable in-memory caching or `filesystem` to enable disk based caching
- `cacheConfig` - an object array to specify caching options
- `renderOnly` - restrict the endpoint to only service requests for certain domains. Specified as an array of strings. eg. `['http://render.only.this.domain']`. This is a strict prefix match, so ensure you specify the exact protocols that will be used (eg. http, https).
- `closeBrowser`_default `false`_ - `true` forces the browser to close and reopen between each page render, some sites might need this to prevent URLs past the first one rendered returning null responses.
- `restrictedUrlPattern`_default `null`_ - set the restrictedUrlPattern to restrict the requests matching given regex pattern.

#### cacheConfig

- `cacheDurationMinutes` _default `1440`_ - set an expiry time in minues, defaults to 24 hours. Set to -1 to disable cache Expiration
- `cacheMaxEntries` _default `100`_ - set the maximum number of entries stored in the selected cache method. Set to `-1` to allow unlimited caching. If using the datastore caching method, setting this value over `1000` may lead to degraded performance as the query to determine the size of the cache may be too slow. If you want to allow a larger cache in `datastore` consider setting this to `-1` and managing the the size of your datastore using a method like this [Deleting Entries in Bulk](https://cloud.google.com/datastore/docs/bulk-delete)
- `snapshotDir` _default `<your os's default tmp dir>/renderton`_ - **filesystem only** the directory the rendertron cache files will be stored in

##### Example

An example config file specifying a memory cache, with a 2 hour expiration, and a maximum of 50 entries

```javascript
{
    "cache": "memory",
    "cacheConfig": {
        "cacheDurationMinutes": 120,
        "cacheMaxEntries": 50
    }
}
```

### Troubleshooting

If you're having troubles with getting Headless Chrome to run in your
environment, refer to the
[troubleshooting guide](https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md)
for Puppeteer.
