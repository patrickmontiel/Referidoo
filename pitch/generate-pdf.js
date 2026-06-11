const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

async function main() {
  const executablePath =
    process.env.CHROME_PATH ||
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" ||
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1120, height: 630 });

  const htmlPath = path.resolve(__dirname, "deck.html");
  await page.goto(`file:///${htmlPath}`, { waitUntil: "networkidle0" });

  // Wait for fonts
  await new Promise(r => setTimeout(r, 2000));

  const outPath = path.resolve(__dirname, "Referidoo-Pitch-Eduardo.pdf");

  await page.pdf({
    path: outPath,
    width: "1120px",
    height: "630px",
    printBackground: true,
    pageRanges: "",
  });

  await browser.close();
  console.log(`✓ PDF generado: ${outPath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
