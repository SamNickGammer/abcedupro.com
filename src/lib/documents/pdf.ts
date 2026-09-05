import "server-only";
import puppeteer, { type Browser } from "puppeteer-core";

/**
 * Renders an app page to a PDF with headless Chromium.
 *
 * Same-page rendering is the whole point: the browser prints exactly the markup
 * you see at `/print/…`, so what a branch previews on screen and what lands in
 * the PDF cannot drift apart.
 *
 * On Vercel the binary comes from `@sparticuz/chromium` (a Lambda-sized build).
 * Locally it uses whatever Chrome is already installed — set
 * `CHROME_EXECUTABLE_PATH` if it lives somewhere unusual.
 */

const LOCAL_CHROME_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean) as string[];

function isServerless() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

async function launch(): Promise<Browser> {
  if (isServerless()) {
    const chromium = (await import("@sparticuz/chromium")).default;

    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1600, height: 1131 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const { existsSync } = await import("node:fs");
  const executablePath = LOCAL_CHROME_CANDIDATES.find((path) => existsSync(path));

  if (!executablePath) {
    throw new Error(
      "No local Chrome found for PDF rendering. Install Google Chrome, or set CHROME_EXECUTABLE_PATH in .env. " +
        "You can always use the browser's own Print → Save as PDF on the /print page instead.",
    );
  }

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1600, height: 1131 },
  });
}

export type RenderOptions = {
  /** Absolute URL of the page to print. */
  url: string;
  /** Forwarded so the print page sees the same signed-in session. */
  cookieHeader?: string | null;
};

export async function renderPdf({ url, cookieHeader }: RenderOptions): Promise<Uint8Array> {
  const browser = await launch();

  try {
    const page = await browser.newPage();

    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    }

    const response = await page.goto(url, { waitUntil: "networkidle0", timeout: 30_000 });

    if (!response || !response.ok()) {
      throw new Error(`Print page returned ${response?.status() ?? "no response"} for ${url}`);
    }

    // Web fonts and the background artwork must be decoded before printing, or
    // the first render can come out with fallback type or a blank sheet.
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images)
          .filter((image) => !image.complete)
          .map(
            (image) =>
              new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              }),
          ),
      );
    });

    return await page.pdf({
      format: "a4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await browser.close();
  }
}
