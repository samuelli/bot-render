# Config

When deploying the service, set configuration variables by including a `config.json` in the
root. Available configuration options:

- `timeout` _default `10000`_ - set the timeout used to render the target page.
- `port` _default `3000`_ - set the port to use for running and listening the rendertron service. Note if process.env.PORT is set, it will be used instead.
- `host` _default `0.0.0.0`_ - set the hostname to use for running and listening the rendertron service. Note if process.env.HOST is set, it will be used instead.
- `width` _default `1000`_ - set the width (resolution) to be used for rendering the page.
- `height` _default `1000`_ - set the height (resolution) to be used for rendering the page.
- `cache` _default `null`_
  - set to `datastore` to enable caching on Google Cloud using datastore _only use if deploying to google cloud_
  - `memory` to enable in-memory caching 
  - `filesystem` to enable disk based caching
  - `mongodb` to enable MongoDB caching
- `cacheConfig` - an object array to specify caching options
- `renderOnly` - restrict the endpoint to only service requests for certain domains. Specified as an array of strings. eg. `['http://render.only.this.domain']`. This is a strict prefix match, so ensure you specify the exact protocols that will be used (eg. http, https).
- `closeBrowser`_default `false`_ - `true` forces the browser to close and reopen between each page render, some sites might need this to prevent URLs past the first one rendered returning null responses.

## cacheConfig

- `cacheDurationMinutes` _default `1440`_ - set an expiry time in minues, defaults to 24 hours. Set to -1 to disable cache Expiration
- `cacheMaxEntries` _default `100`_ - set the maximum number of entries stored in the selected cache method. Set to `-1` to allow unlimited caching. If using the datastore caching method, setting this value over `1000` may lead to degraded performance as the query to determine the size of the cache may be too slow. If you want to allow a larger cache in `datastore` consider setting this to `-1` and managing the the size of your datastore using a method like this [Deleting Entries in Bulk](https://cloud.google.com/datastore/docs/bulk-delete)
- `snapshotDir` _default `<your os's default tmp dir>/renderton`_ - **filesystem only** the directory the rendertron caches will be stored in
- `mongoURI` - (**For mongodb only**) Connection string/URI for your MongoDB instance.

### Example

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
