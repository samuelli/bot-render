## Rendertron API Reference

### HTTP API endpoints

`/render`

Fetch and serialize a URL in headless Chrome.

| param        | type     | description                                                                                                                                                                                                            |
| ------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`        | `String` | a valid URL to fetch                                                                                                                                                                                                   |
| `opts`       | `Object` | `Renderer` config class options                                                                                                                                                                                        |
| `timezoneId` | `String` | specify timezoneId from [list](https://source.chromium.org/chromium/chromium/deps/icu.git/+/faee8bc70570192d82d2978a71e2a615788597d1:source/data/misc/metaZones.txt) with a querystring appended to the requested URL. |

`/screenshot`

Return a screenshot of the requested URL

```javascript
async screenshot(
    url: string,
    isMobile: boolean,
    dimensions: ViewportDimensions,
    options?: object,
    timezoneId?: string): Promise<Buffer>
}
```

| param        | type                                        | description                                                                                                                                                         |
| ------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`        | `String`                                    | A valid URL to fetch                                                                                                                                                |
| `isMobile`   | `Bool`                                      | Specify a mobile layout with a querystring automatically appended to the requested URL.                                                                             |
| `dimensions` | [`ViewportDimensions`](viewport-dimensions) | `height` and `width` specifications for the rendered page                                                                                                           |
| `options`    | `Object`                                    | define screenshot params                                                                                                                                            |
| `timezoneId` | `String`                                    | define timezoneId from [list](https://source.chromium.org/chromium/chromium/deps/icu.git/+/faee8bc70570192d82d2978a71e2a615788597d1:source/data/misc/metaZones.txt) |  |

`/invalidate/`

Removes the cached response for a given URL from the cache.

| param | type     | description                          |
| ----- | -------- | ------------------------------------ |
| `url` | `String` | A valid URL to remove from the cache |

`/invalidate`

Removes all cached responses from the cache.


`/_ah/health`

Returns HTTP 200 and text "OK", if the Rendertron server is healthy.

### Rendertron internal API

#### `Renderer`

Create a `puppeteer` instance to render the requested URL. Uses default `Config`
class or a user-defined `Config` file.

```javascript
export class Renderer {
    private browser: puppeteer.Browser;
    private config: Config;

    constructor(browser: puppeteer.Browser, config: Config) {
    this.browser = browser;
    this.config = config;
}
```

#### `Config`

The `Config` class defaults can be overridden with your own settings.
[More details](https://github.com/GoogleChrome/rendertron/blob/master/docs/configure.md)

```javascript
public static config: Config = {
    cache: null,
    timeout: 10000,
    port: '3000',
    host: '0.0.0.0',
    width: 1000,
    height: 1000,
    headers: {}
};
```

#### `ViewportDimensions`

An Object setting the width and height of the requested resource.

```javascript
type ViewportDimensions = {
  width: number,
  height: number,
};
```

#### `Options`

Specify the screenshot file type.

```javascript
const screenshotOptions = Object.assign({}, options, {
  type: 'jpeg',
  encoding: 'binary',
});
```

`/invalidate`

Invalidate all cache entries present in the configured cache (memory, filesystem or cloud datastore).  
(Only available if cache is configured)

`/invalidate`

Invalidate a cache entry from memory, filesystem or cloud datastore.  
(Only available if cache is configured)

| param | type     | description                |
| ----- | -------- | -------------------------- |
| `url` | `String` | URL to invalidate in cache |

###
