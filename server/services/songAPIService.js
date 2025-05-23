const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');
const { chromium } = require('playwright');
const { OpenAI } = require('openai');
require('dotenv').config();

class SongAPIService {
  constructor() {
    this.baseUrl = 'https://www.tab4u.com';
    this.searchUrl = `${this.baseUrl}/last100`;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Get song details from a screenshot using GPT
   * @param {string} songUrl - The URL of the song to get details from
   * @returns {Promise<Object>} The song details
   */
  async getSongFromScreenshotViaGPT(songUrl) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(songUrl, { waitUntil: 'networkidle', timeout: 60000 });
  
    // Take screenshot
    const screenshotPath = path.join(__dirname, '../temp/song.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await browser.close();
  
    const imageBuffer = await fs.readFile(screenshotPath);
  
    // Ask GPT to extract structured lyrics/chords
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that extracts structured song content from screenshots. Given an image of a song page, extract the lyrics and chords line-by-line. Output an array where each item is an object with this shape:
          {
            lyrics: string,
            chords: Array<{ text: string, position: number }>
          }
          The position refers to the character index in the lyrics line where the chord appears above.`,
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBuffer.toString('base64')}` } }
          ]
        }
      ],
      max_tokens: 2000,
    });
  
    let content = response.choices[0].message.content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    }
    const parsedRaw = JSON.parse(content);
    // logger.info(`=== In songAPIService.js, getSongFromScreenshotViaGPT ===`, parsedRaw)
    const linesFormatted = [];
    for (const item of Object.values(parsedRaw)) {
      linesFormatted.push(
        { type: 'chords', content: '', positions: item.chords },
        { type: 'lyrics', content: item.lyrics }
      );
    }
    logger.info(`=== In songAPIService.js, getSongFromScreenshotViaGPT ===`, linesFormatted)
  
    return {
      title: '',
      artist: '',
      lines: linesFormatted,
      hasChords: linesFormatted.some(line => line.type === 'chords' && line.positions?.length),
      source: 'Chordie.com',
      url: songUrl,
    };
  }

  /**
   * Scrapes Chordie.com for a song
   * @param {string} songName - The name of the song to search for
   * @param {number} maxPages - The maximum number of pages to scrape
   * @returns {Promise<Array>} An array of song details
   */
  async scrapeChordie(songName, maxPages = 3) {
    const results = [];
    const pageSize = 5;
    const processedUrls = new Set();
  
    for (let page = 0; page < maxPages; page++) {
      const from = page * pageSize;
      const searchUrl = `https://www.chordie.com/result.php?q=${encodeURIComponent(songName)}&from=${from}&size=${pageSize}&mode=song`;
  
      const { data } = await axios.get(searchUrl);
      const $ = cheerio.load(data);
  
      const songLinks = $('div.songListContent a').map((i, el) => $(el).attr('href')).get();
  
      if (songLinks.length === 0) break;
      
      for (const relativeLink of songLinks) {
        try {
          const fullUrl = `https://www.chordie.com${relativeLink}`;
          
          // Skip if we've already processed this URL
          if (processedUrls.has(fullUrl)) continue;
          processedUrls.add(fullUrl);
          
          const songPage = await axios.get(fullUrl);
          const $$ = cheerio.load(songPage.data);
  
          const title = $$('h1').first().text().trim();
          const artist = $$('h2').first().text().trim();

          // Extract all lines from the song
          const contentLines = [];
          $$('.chordline').each((i, el) => {
            const line = $$(el).text().trim();
            contentLines.push(line);
          });

          const content = contentLines.join('\n');
          results.push({ 
            title, 
            artist, 
            content,
            source: 'Chordie',
            url: fullUrl
          });
        } catch (err) {
          logger.warn(`Failed to fetch song page: ${relativeLink}`, err.message);
        }
      }
    }
  
    return results;
  }

  /**
   * Scrapes Tab4U.com for a song
   * @param {string} query - The query to search for
   * @returns {Promise<Array>} An array of song details
   */
  async scrapeTab4U(query) {
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: '/opt/render/project/.cache/puppeteer/chrome/linux-136.0.7103.92/chrome-linux64/chrome',
    })
    
    let page;

    try {
      page = await browser.newPage();
      const searchUrl = `https://www.tab4u.com/search.php?type=songs&search=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      const results = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table.results_table tr'));
        return rows.map(row => {
          const titleLink = row.querySelector('td:nth-child(1) a');
          const artistCell = row.querySelector('td:nth-child(2)');

          if (titleLink && artistCell) {
            return {
              title: titleLink.textContent.trim(),
              artist: artistCell.textContent.trim(),
              source: 'Tab4U',
              url: `https://www.tab4u.com${titleLink.getAttribute('href')}`,
            };
          }

          return null;
        }).filter(Boolean);
      });

      return results;
    } catch (err) {
      logger.error(`❌ Failed to scrape Tab4U: ${err.message}`, { stack: err.stack });
      throw new Error(`Tab4U scraping failed: ${err.message}`);
    } finally {
      if (browser) await browser.close();
    }
  }  

  /**
   * Get song details either from local JSON or remote URL
   * @param {string} songIdentifier - Either a songId for local files or URL for remote songs
   * @param {string} source - Either 'local' or 'remote'
   */
  async getSongDetails(songIdentifier, source = 'remote') {
    try {
      if (source === 'local') {
        return await this.getLocalSongDetails(songIdentifier);
      } else {
        return await this.getRemoteSongDetailsWithPuppeteer(songIdentifier);
      }
    } catch (error) {
      logger.error('Error in getSongDetails:', error);
      throw error;
    }
  }

  /**
   * Get song details from local JSON file
   * @param {string} songId - The song ID corresponding to the JSON file
   */
  async getLocalSongDetails(songId) {
    try {
      const filePath = path.join(__dirname, '..', `${songId}.json`);
      const songData = await fs.readFile(filePath, 'utf-8');
      const rawSongData = JSON.parse(songData);

      // Process the raw song data
      const lines = rawSongData.map(line => {
        // Calculate positions for lyrics and chords
        const chords = [];
        let currentPosition = 0;
        
        // First build the lyrics line
        const lyrics = line.map(word => word.lyrics).join(' ');
        
        // Then collect chords with their positions
        line.forEach((word, index) => {
          if (word.chords) {
            const wordStart = index === 0 ? 0 : lyrics.indexOf(word.lyrics, currentPosition);
            chords.push({
              text: word.chords,
              position: wordStart
            });
          }
          currentPosition = lyrics.indexOf(word.lyrics, currentPosition) + word.lyrics.length;
        });
        
        return { lyrics, chords };
      });

      return {
        title: songId === 'hey_jude' ? 'Hey Jude' : 'ואיך שלא',
        artist: songId === 'hey_jude' ? 'The Beatles' : 'אביתר בנאי',
        lines,
        hasChords: lines.some(line => line.chords.length > 0),
        source: 'local',
        url: songId
      };
    } catch (error) {
      logger.error('Error reading local song file:', error);
      throw new Error('Failed to load local song details');
    }
  }

  /**
   * Get song details from remote URL
   * @param {string} url - The URL to fetch the song from
   */
  async getRemoteSongDetailsWithCheerio(url) {
    try {
      if (!url) {
        throw new Error('URL is required');
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);

      // Find the song container and content
      const songContent = $('.chordContent');
      if (!songContent.length) {
        throw new Error('Could not find song content');
      }

      // Extract title and artist from the textlines
      let title = '';
      let artist = '';
      $('.textline').each((i, el) => {
        const text = $(el).text().trim();
        if (text.startsWith('Song Title:')) {
          title = text.replace('Song Title:', '').trim();
        } else if (text.startsWith('Band Name:')) {
          artist = text.replace('Band Name:', '').trim();
        }
      });

      // Initialize lines array
      const lines = [];
      let currentLine = { lyrics: '', chords: [] };

      // Process each element in the song content
      songContent.find('div').each((i, el) => {
        const element = $(el);
        const text = element.text().trim();

        // Skip empty lines and certain metadata
        if (!text || text.match(/^(googletag|Tweet|PRINT|Normal|Lyrics|Tabs|Small|Medium|Large|Pause|Start|\d+|Text color:|Save settings|Print Preview|Transpose|\+|\-|Rate #|guitartabs\.cc|azchords\.com|guitaretab\.com|Jango Player|Login)/)) {
          return;
        }

        // Handle section markers
        if (text.match(/^(Verse:|Chorus:|Bridge:|Intro:|Refrain:)/)) {
          if (currentLine.lyrics || currentLine.chords.length) {
            lines.push(currentLine);
            currentLine = { lyrics: '', chords: [] };
          }
          lines.push({ lyrics: text, chords: [] });
          return;
        }

        // Handle chord lines
        if (element.hasClass('chordline')) {
          const chords = [];
          let position = 0;

          element.find('span').each((j, span) => {
            const $span = $(span);
            if ($span.hasClass('relc')) {
              const chordText = $span.find('.absc').text().trim();
              if (chordText) {
                // Calculate position by counting text length before this chord
                const prevText = $span.prevAll('text').text();
                position += prevText.length;
                chords.push({
                  text: chordText,
                  position: position
                });
                position += chordText.length;
              }
            }
          });

          if (chords.length > 0) {
            currentLine.chords = chords;
          }
          return;
        }

        // Handle lyrics lines
        if (element.hasClass('textline') && !text.match(/^(Song Title:|Band Name:|Tabbed by)/)) {
          // If we have a previous line, save it
          if (currentLine.lyrics || currentLine.chords.length) {
            lines.push(currentLine);
            currentLine = { lyrics: '', chords: [] };
          }
          currentLine.lyrics = text;
        }
      });

      // Add the last line if not empty
      if (currentLine.lyrics || currentLine.chords.length) {
        lines.push(currentLine);
      }

      // Filter out empty lines and cleanup
      const filteredLines = lines.filter(line => {
        return (line.lyrics && line.lyrics.trim()) || line.chords.length > 0;
      });

      logger.info(`=== Extracted ${filteredLines.length} lines of content ===`);
      logger.info(`First few lines: ${JSON.stringify(filteredLines.slice(0, 3))}`);

      return {
        title,
        artist,
        lines: filteredLines,
        hasChords: filteredLines.some(line => line.chords.length > 0),
        source: new URL(url).hostname,
        url
      };
    } catch (error) {
      logger.error('Error fetching remote song details:', error);
      throw error;
    }
  }

  /**
   * Get song details from remote URL using Puppeteer
   * @param {string} url - The URL to fetch the song from
   * @returns {Promise<Object>} The song details
   */
  async getRemoteSongDetailsWithPuppeteer(url) {
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: '/opt/render/project/.cache/puppeteer/chrome/linux-136.0.7103.92/chrome-linux64/chrome',
    })
    
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const result = await page.evaluate(() => {
      const title = document.querySelector('h1')?.innerText.trim() || 'Unknown Title';
      const artist = document.querySelector('h2')?.innerText.trim() || 'Unknown Artist';

      const lines = [];

      const chordlineDivs = Array.from(document.querySelectorAll('div.chordline'));
      chordlineDivs.forEach(div => {
        const chords = [];
        let lyrics = '';
        let cursor = 0;

        div.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            // Add plain text to lyrics
            lyrics += node.textContent;
            cursor = lyrics.length;
          } else if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.classList.contains('relc') || node.classList.contains('inlc')
          ) {
            const chordText = node.textContent.trim();
            if (chordText) {
              chords.push({
                text: chordText,
                position: cursor
              });
            }
          }
        });

        if (lyrics.trim() || chords.length > 0) {
          lines.push({ lyrics: lyrics.trim(), chords });
        }
      });

      return {
        title,
        artist,
        lines,
        hasChords: lines.some(l => l.chords?.length),
        source: 'Chordie.com',
        url: window.location.href
      };
  });

  await browser.close();
  return result;
}

  /**
   * Get song details from Tab4U.com
   * @param {string} url - The URL to fetch the song from
   * @returns {Promise<Object>} The song details
   */
  async getTab4USong(url) {
    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
  
      const title = $('h1').first().text().trim();
      const artist = $('h2').first().text().trim();
  
      const lines = [];
  
      $('.song_line').each((i, el) => {
        const lyrics = $(el).find('.lyrics').text().trim();
        const chords = [];
        
        $(el).find('.chord').each((j, ch) => {
          chords.push({
            text: $(ch).text().trim(),
            position: j * 5 
          });
        });
  
        lines.push({ lyrics, chords });
      });
  
      return {
        title,
        artist,
        lines,
        hasChords: lines.some(l => l.chords.length),
        source: 'Tab4U',
        url
      };
    } catch (err) {
      logger.error('Failed to fetch Tab4U song:', err);
      throw new Error('Could not retrieve Tab4U song');
    }
  }  
}

module.exports = new SongAPIService(); 