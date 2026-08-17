/**
 * Browser Automation Tool for Grok Build
 * 
 * Provides headless browser control for web testing, screenshots,
 * and automation workflows.
 */

import puppeteer from 'puppeteer';
import type { Browser, Page, ScreenshotOptions } from 'puppeteer';

export interface BrowserOptions {
  headless?: boolean;
  viewport?: { width: number; height: number };
  timeout?: number;
  userAgent?: string;
}

export interface NavigationResult {
  url: string;
  title: string;
  status: number;
  loadTime: number;
}

export interface ScreenshotResult {
  path: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
}

export interface ConsoleLog {
  type: 'log' | 'error' | 'warning' | 'info' | 'debug';
  text: string;
  timestamp: number;
  source: string;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  type: string;
  size: number;
  time: number;
}

/**
 * BrowserAutomation - Headless browser control for Grok agents
 */
export class BrowserAutomation {
  private browser?: Browser;
  private page?: Page;
  private options: Required<BrowserOptions>;
  private consoleLogs: ConsoleLog[] = [];
  private networkRequests: NetworkRequest[] = [];

  constructor(options: BrowserOptions = {}) {
    this.options = {
      headless: options.headless ?? true,
      viewport: options.viewport ?? { width: 1280, height: 720 },
      timeout: options.timeout ?? 30000,
      userAgent: options.userAgent ?? 'Mozilla/5.0 (compatible; GrokBot/1.0)'
    };
  }

  /**
   * Launch the browser
   */
  async launch(): Promise<void> {
    if (this.browser) {
      return;
    }

    this.browser = await puppeteer.launch({
      headless: this.options.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    this.page = await this.browser.newPage();
    
    await this.page.setViewport(this.options.viewport);
    await this.page.setUserAgent(this.options.userAgent);
    
    // Set up console logging
    this.page.on('console', (msg) => {
      this.consoleLogs.push({
        type: msg.type() as ConsoleLog['type'],
        text: msg.text(),
        timestamp: Date.now(),
        source: msg.location().url || 'unknown'
      });
    });

    // Set up network monitoring
    this.page.on('response', async (response) => {
      try {
        const request = response.request();
        const size = (await response.buffer()).length;
        
        this.networkRequests.push({
          url: response.url(),
          method: request.method(),
          status: response.status(),
          type: response.headers()['content-type'] || 'unknown',
          size,
          time: response.timing()?.receiveHeadersEnd ?? 0
        });
      } catch {
        // Ignore failed responses
      }
    });
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string): Promise<NavigationResult> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const startTime = Date.now();
    const response = await this.page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: this.options.timeout
    });

    const loadTime = Date.now() - startTime;

    return {
      url: response?.url() || url,
      title: await this.page.title(),
      status: response?.status() ?? 0,
      loadTime
    };
  }

  /**
   * Take a screenshot
   */
  async screenshot(options: {
    path?: string;
    fullPage?: boolean;
    format?: 'png' | 'jpeg';
    quality?: number;
  } = {}): Promise<ScreenshotResult> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    const screenshotOptions: ScreenshotOptions = {
      fullPage: options.fullPage ?? false,
      format: options.format ?? 'png',
      quality: options.quality ?? 80,
      path: options.path
    };

    const buffer = await this.page.screenshot(screenshotOptions);
    const viewport = this.page.viewport() ?? { width: 1280, height: 720 };

    return {
      path: options.path || 'screenshot.png',
      width: viewport.width,
      height: viewport.height,
      format: options.format ?? 'png'
    };
  }

  /**
   * Click an element
   */
  async click(selector: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.waitForSelector(selector, { timeout: this.options.timeout });
    await this.page.click(selector);
  }

  /**
   * Type text into an input
   */
  async type(selector: string, text: string, options?: { delay?: number }): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.waitForSelector(selector, { timeout: this.options.timeout });
    await this.page.type(selector, text, options);
  }

  /**
   * Fill a form field
   */
  async fill(selector: string, value: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.waitForSelector(selector, { timeout: this.options.timeout });
    await this.page.$eval(selector, (el: HTMLInputElement, value) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }

  /**
   * Evaluate JavaScript in the page context
   */
  async evaluate<R>(fn: () => R): Promise<R> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    return this.page.evaluate(fn);
  }

  /**
   * Get page content
   */
  async getContent(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    return this.page.content();
  }

  /**
   * Get all console logs
   */
  getConsoleLogs(): ConsoleLog[] {
    return [...this.consoleLogs];
  }

  /**
   * Get all network requests
   */
  getNetworkRequests(): NetworkRequest[] {
    return [...this.networkRequests];
  }

  /**
   * Wait for a selector
   */
  async waitForSelector(selector: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.waitForSelector(selector, { timeout: this.options.timeout });
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.waitForNavigation({
      waitUntil: 'networkidle2',
      timeout: this.options.timeout
    });
  }

  /**
   * Go back in history
   */
  async goBack(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.goBack({ waitUntil: 'networkidle2' });
  }

  /**
   * Go forward in history
   */
  async goForward(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.goForward({ waitUntil: 'networkidle2' });
  }

  /**
   * Reload the page
   */
  async reload(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.reload({ waitUntil: 'networkidle2' });
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
      this.page = undefined;
    }
  }

  /**
   * Create a Grok tool definition for browser automation
   */
  static createTool() {
    return {
      name: 'browser_automation',
      description: 'Control a headless browser for web testing, screenshots, and automation',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['navigate', 'screenshot', 'click', 'type', 'fill', 'evaluate', 'getContent', 'getLogs', 'getNetwork']
          },
          url: { type: 'string', description: 'URL to navigate to' },
          selector: { type: 'string', description: 'CSS selector for element actions' },
          text: { type: 'string', description: 'Text to type or fill' },
          options: { type: 'object', description: 'Additional options' }
        },
        required: ['action']
      },
      handler: async (input: Record<string, unknown>) => {
        const automation = new BrowserAutomation();
        
        try {
          await automation.launch();
          
          switch (input.action) {
            case 'navigate':
              const result = await automation.navigate(input.url as string);
              return JSON.stringify(result);
            
            case 'screenshot':
              const screenshot = await automation.screenshot(input.options as any);
              return JSON.stringify(screenshot);
            
            case 'click':
              await automation.click(input.selector as string);
              return 'Clicked successfully';
            
            case 'type':
              await automation.type(input.selector as string, input.text as string);
              return 'Typed successfully';
            
            case 'fill':
              await automation.fill(input.selector as string, input.text as string);
              return 'Filled successfully';
            
            case 'getLogs':
              return JSON.stringify(automation.getConsoleLogs());
            
            case 'getNetwork':
              return JSON.stringify(automation.getNetworkRequests());
            
            default:
              return 'Unknown action';
          }
        } finally {
          await automation.close();
        }
      }
    };
  }
}

export default BrowserAutomation;
