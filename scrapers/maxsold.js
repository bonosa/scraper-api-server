import puppeteer from "puppeteer";
import { pool } from "../db.js";

export async function scrape() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  const url = "https://maxsold.com/usa/washington/seattle";
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const events = await page.$$eval(".auction-card", (cards) =>
    cards.map((card) => {
      const title = card.querySelector(".card-title")?.textContent?.trim();
      const location = card.querySelector(".location")?.textContent?.trim();
      const date = card.querySelector(".auction-date")?.textContent?.trim();
      const image = card.querySelector("img")?.src;
      const sourceLink = card.querySelector("a")?.href;

      return {
        title,
        location,
        startDate: date || null,
        endDate: null,
        image,
        sponsor: "MaxSold",
        description: "",
        sourceLink,
        site: "maxsold",
      };
    })
  );

  await browser.close();

  for (const event of events) {
    try {
      await pool.query(
        `INSERT INTO aggregated_events 
         (title, location, startDate, endDate, image, sponsor, description, sourceLink, site)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE sourceLink = VALUES(sourceLink)`,
        [
          event.title,
          event.location,
          event.startDate,
          event.endDate,
          event.image,
          event.sponsor,
          event.description,
          event.sourceLink,
          event.site,
        ]
      );
    } catch (err) {
      console.error("Insert failed:", err.message);
    }
  }

  return events;
}
