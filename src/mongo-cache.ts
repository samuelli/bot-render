/*
 * Copyright 2018 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 not
 * use this file except in compliance with the License. You may obtain a copy
 of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 under
 * the License.
 */

'use strict';

import Koa from 'koa';
import { Config, ConfigManager } from './config';
import { createHash } from 'crypto';
import { MongoClient } from 'mongodb';

type CacheContent = {
  saved: Date;
  expires: Date;
  headers: string;
  response: string;
  payload: string;
};


export class MongoCache {
  private config: Config = ConfigManager.config;
  private cacheConfig: { [key: string]: string };
  private client: MongoClient;

  constructor(config: Config) {
    this.config = config;
    this.cacheConfig = this.config.cacheConfig;
    this.client = new MongoClient(this.cacheConfig.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    this.logDebug(`Using Mongodb cache with ${this.cacheConfig.mongoURI}`);
    this.ensurePagesCollectionExists();
  }

  hashCode = (s: string) => {
    const hash = 0;
    if (s.length === 0) return hash.toString();

    return createHash('md5').update(s).digest('hex');
  };

  logDebug(msg: string) {
    console.debug(`MongoCache: ${msg}`);
  }

  async ensurePagesCollectionExists() {
    const db = await this.getDatabase();
    const collections = await db.collections();
    const exists = collections.some(collection => collection.collectionName === 'Pages');
    if (exists) {
      this.logDebug('Confirmed Pages collection exists');
    } else {
      this.logDebug('Pages collection was missing, created a empty Pages collection');
      await db.createCollection('Pages');
    }
    await this.checkPagesIndexes();
  }
  async checkPagesIndexes() {
    const indexNames = ['keyIndex', 'savedIndex', 'expiresIndex'];
    const Pages = await this.getPagesCollection();
    const exists = await Pages.indexExists(indexNames);
    if (exists) {
      this.logDebug(`Confirmed [${indexNames}] on Pages collection exists`);
    } else {
      this.logDebug(`[WARNING] We recommend creating indexes [${indexNames}] on Pages collection`);
    }
  }

  async clearCache() {
    try {
      this.logDebug(`Clearing the entire cache`);
      const Pages = await this.getPagesCollection();
      const results = await Pages.deleteMany({});
      this.logDebug(`Deleted ${results.deletedCount} document(s)`);
    } catch (err) {
      console.error(`MongoCache: Error clearing the entire cache ${err}`);
    }
  }

  async getDatabase() {
    if (this.client && !this.client.isConnected()) {
      this.logDebug('getDatabase: Opening Mongo client connection');
      await this.client.connect();
    }
    const database = this.client.db();
    return database;
  }

  async getPagesCollection() {
    const database = await this.getDatabase();
    return database.collection("Pages");
  }

  async cacheContent(
    key: string,
    url: string,
    headers: Record<string, string>,
    payload: Buffer
  ) {
    this.logDebug(`cacheContent called with key=${key} for url=${url}`);
    const Pages = await this.getPagesCollection();

    try {
      const cacheMaxEntries = parseInt(this.cacheConfig.cacheMaxEntries);
      // Step 1: Make sure we within the cache quota specified by cacheConfig.cacheMaxEntries
      // Step 1a: query to see if we are over the max number of allowed entries, and max entries isn't disabled with a value of -1
      if (cacheMaxEntries !== -1) {
        const cursor = Pages.find({}).project({ 'saved': 1, _id: 0 }).sort({ saved: -1 }).skip(cacheMaxEntries - 1).limit(1);
        const lastExpired = await cursor.toArray();
        //step 1b: Remove over quota documents which are older than the last document in cacheMaxEntries 
        if (lastExpired.length > 0) {
          this.logDebug(`cacheConfig.cacheMaxEntries is set to ${cacheMaxEntries} in config. Deleting all documents with "saved" date less than ${lastExpired[0].saved}`);
          const result = await Pages.deleteMany({ saved: { $lt: lastExpired[0].saved } });
          if (result) {
            this.logDebug(`Deleted ${result.deletedCount} expired document(s) older than ${lastExpired[0].saved}`);
          }
        }
      }
    } catch (err) {
      console.error(`MongoCache: Error cleaning old cache entries ${err}`);
    }

    try {
      const now = new Date();

      //step 2: Insert the new document in cache
      const entity = {
        'key': key,
        'url': url,
        'saved': now,
        'expires': new Date(
          now.getTime() +
          parseInt(this.cacheConfig.cacheDurationMinutes) * 60 * 1000
        ),
        'headers': JSON.stringify(headers),
        'payload': JSON.stringify(payload)
      };

      this.logDebug(`Saving key=${key} for url=${url}`);
      const result = await Pages.updateOne({ 'key': key }, { $set: entity }, { upsert: true });
      this.logDebug(`Upserted ${result.upsertedCount}, Modified ${result.modifiedCount} documents`);
    } catch (err) {
      console.error(`MongoCache: Error saving cache ${err}`);
    }
  }

  async removeEntry(key: string) {
    try {
      this.logDebug(`removeEntry key=${key}`);
      const Pages = await this.getPagesCollection();
      const result = await Pages.deleteOne({ key: key });
      this.logDebug(`Deleted ${result.deletedCount} documents`);
    } catch (err) {
      console.error(`MongoCache: Error deleting cache for key=${key}. Error=${err}`);
    }
  }

  async getCachedContent(ctx: Koa.Context, key: string) {
    this.logDebug(`getCachedContent called with key=${key}`);
    try {
      if (ctx.query.refreshCache) {
        return null;
      } else {
        const Pages = await this.getPagesCollection();
        const found = await Pages.find({ key: key }).toArray();
        if (found.length > 0) {
          const saved = found[0].saved;
          const payload = found[0].payload;
          const response = found[0].response;
          const headers = found[0].headers;
          const url = found[0].url;
          //const expires = found[0].expires;
          // Rather than depending on the expires value from our database, lets calculate
          // expires based on current cacheConfig.cacheDurationMinutes and saved datetime
          // This allows changes in cacheConfig.cacheDurationMinutes to be reflected on 
          // old cache entries too
          const expires = new Date(
            saved.getTime() +
            parseInt(this.cacheConfig.cacheDurationMinutes) * 60 * 1000
          );

          this.logDebug(`Found ${found.length} documents in cache matching key=${key} with url=${url}`);
          return {
            saved,
            expires,
            payload,
            response,
            headers
          };
        } else {
          return null;
        }
      }
    } catch (err) {
      console.error(`MongoCache: Error in getCachedContent ${err}`);
      return null;
    }
  }

  /**
   * Returns middleware function.
   */
  middleware() {
    const cacheContent = this.cacheContent.bind(this);

    return async function (
      this: MongoCache,
      ctx: Koa.Context,
      next: () => Promise<unknown>
    ) {
      let sanitizedUrl = this.sanitizeURL(ctx.url);
      if (sanitizedUrl.charAt(sanitizedUrl.length - 1) === '?') {
        sanitizedUrl = sanitizedUrl.slice(0, -1);
      }
      // key is hashed crudely
      const key = this.hashCode(sanitizedUrl);

      const results = await this.getCachedContent(ctx, key);
      if (results) {
        const content = results as CacheContent;
        // Serve cached content if its not expired.
        if (
          content.expires.getTime() >= new Date().getTime() ||
          parseInt(this.cacheConfig.cacheDurationMinutes) === -1
        ) {
          const headers = JSON.parse(content.headers);
          ctx.set(headers);
          ctx.set('x-rendertron-cached', content.saved.toUTCString());
          try {
            let payload = JSON.parse(content.payload);
            if (
              payload &&
              typeof payload === 'object' &&
              payload.type === 'Buffer'
            ) {
              payload = Buffer.from(payload);
            }
            ctx.body = payload;
            this.logDebug(`Served ${sanitizedUrl} from cache`);
            return;
          } catch (error) {
            this.logDebug(
              'Erroring parsing cache contents, falling back to normal render'
            );
          }
        } else {
          this.logDebug(`Need to rerender ${sanitizedUrl}, as it has expired in cache with expires=${content.expires}`);
        }
      }

      await next();

      if (ctx.status === 200) {
        cacheContent(key, sanitizedUrl, ctx.response.headers, ctx.body);
        this.logDebug(`Served ${sanitizedUrl} by rendering it new`);
      }
    }.bind(this);
  }

  invalidateHandler() {
    return this.handleInvalidateRequest.bind(this);
  }

  sanitizeURL(key: string) {
    // Cache based on full URL. This means requests with different params are
    // cached separately (except for refreshCache parameter
    let cacheKey = key;

    if (cacheKey) {
      cacheKey = cacheKey.replace(/&?refreshCache=(?:true|false)&?/i, '');

      if (cacheKey.charAt(cacheKey.length - 1) === '?') {
        cacheKey = cacheKey.slice(0, -1);
      }

      // remove /render/ from key, only at the start
      if (cacheKey.startsWith('/render/')) {
        cacheKey = cacheKey.substring(8);
      }

      // remove trailing slash from key
      cacheKey = cacheKey.replace(/\/$/, '');
    }
    return cacheKey
  }

  private async handleInvalidateRequest(ctx: Koa.Context, url: string) {
    if (url) {
      let cacheKey = this.sanitizeURL(url);

      // remove /invalidate/ from key, only at the start
      if (cacheKey.startsWith('/invalidate/')) {
        cacheKey = cacheKey.substring(12);
      }

      // key is hashed crudely
      const key = this.hashCode(cacheKey);
      this.removeEntry(key);
    }
    ctx.status = 200;
  }

  clearAllCacheHandler() {
    return this.handleClearAllCacheRequest.bind(this);
  }

  private async handleClearAllCacheRequest(ctx: Koa.Context) {
    await this.clearCache();
    ctx.status = 200;
  }
}
