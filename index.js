// scraper_api_server/index.js
import express from 'express';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/scrape-auctions', async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    await page.goto('https://maxsold.com/auctions/near/98134', {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    await page.waitForSelector('.auction-list-item', { timeout: 5000 }).catch(() => null);
    const content = await page.content();
    const $ = cheerio.load(content);

    const events = $('.auction-list-item').map((_, el) => {
      const $el = $(el);
      return {
        title: $el.find('.auction-title').text().trim() || 'Auction Event',
        location: {
          zipCode: '98134',
          city: 'Seattle',
          state: 'WA',
        },
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        imageUrl: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0',
        sponsor: 'MaxSold',
        sourceUrl: 'https://maxsold.com',
        source: 'maxsold',
      };
    }).get();

    res.json({ total: events.length, events });
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Scraper server running on http://localhost:${PORT}`);
});
