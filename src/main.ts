import * as compression from 'compression';
import * as express from 'express';
import * as puppeteer from 'puppeteer';

export class Rendertron {
  app = express();
  private renderer: Renderer|undefined;
  private port = process.env.PORT || '3000';

  constructor() {
    this.app.use(compression());

    this.app.get(
        '/_ah/health',
        (_request: express.Request, response: express.Response) =>
            response.send('OK'));
    this.app.get('/render/:url(*)', this.handleRenderRequest.bind(this));
    this.app.get(
        '/screenshot/:url(*)', this.handleScreenshotRequest.bind(this));
  }

  async initialize(startServer = true) {
    const browser = await puppeteer.launch({headless: false});
    this.renderer = new Renderer(browser);

    if (startServer) {
      this.app.listen(this.port, () => {
        console.log(`Listening on port ${this.port}`);
      });
    }
  }

  async handleRenderRequest(
      request: express.Request,
      response: express.Response) {
    if (!this.renderer) {
      console.error(`No renderer yet`);
      return;
    }
    console.log(`Rendering ${request.params.url}`);
    const serialized = await this.renderer.serialize(request.params.url);
    // Mark the response as coming from Rendertron.
    response.set('x-renderer', 'rendertron');
    response.status(serialized.status).send(serialized.content);
  }

  async handleScreenshotRequest(
      request: express.Request,
      response: express.Response) {
    if (!this.renderer) {
      console.error(`No renderer yet`);
      return;
    }

    const img = await this.renderer.screenshot(request.params.url);
    response.set({'Content-Type': 'image/jpeg', 'Content-Length': img.length});
    response.end(img);
  }
}

type SerializedResponse = {
  status: number; content: string;
}

class Renderer {
  private browser: puppeteer.Browser;

  constructor(browser: puppeteer.Browser) {
    this.browser = browser;
  }

  async serialize(url: string): Promise<SerializedResponse> {
    const page = await this.browser.newPage();

    const response = await page.goto(url, {waitUntil: 'networkidle0'});
    if (!response) {
      // This should only occur when the page is about:blank. See
      // https://github.com/GoogleChrome/puppeteer/blob/v1.5.0/docs/api.md#pagegotourl-options.
      return {status: 200, content: ''};
    }

    const result = await page.evaluate('document.firstElementChild.outerHTML');

    await page.close();
    console.log(`response status is ${response.status()}`);
    return {status: response.status(), content: result};
  }

  async screenshot(url: string): Promise<Buffer> {
    const page = await this.browser.newPage();

    await page.goto(url, {waitUntil: 'networkidle0'});

    // Typings are out of date.
    const buffer =
        await page.screenshot({type: 'jpeg', encoding: 'base64'} as any);
    return buffer;
  }
}

if (!module.parent) {
  const rendertron = new Rendertron();
  rendertron.initialize();
}

async function logUncaughtError(error: Error) {
  console.error('Uncaught exception');
  console.error(error);
  // exceptionCount++;
  // // Restart instance due to several failures.
  // if (exceptionCount > 5) {
  //   console.log(`Detected ${exceptionCount} errors, shutting instance down`);
  //   if (config && config.chrome)
  //     await app.stop();
  process.exit(1);
  // }exceptionCount++;
  // // Restart instance due to several failures.
  // if (exceptionCount > 5) {
  //   console.log(`Detected ${exceptionCount} errors, shutting instance down`);
  //   if (config && config.chrome)
  //     await app.stop();
}

if (!module.parent) {
  process.on('uncaughtException', logUncaughtError);
  process.on('unhandledRejection', logUncaughtError);
}
