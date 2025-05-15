const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');

class SongAPIService {
  constructor() {
    this.baseUrl = 'https://www.tab4u.com';
    this.searchUrl = `${this.baseUrl}/last100`;
  }

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

  // async scrapeTab4U(query) {
  //   try {
  //     logger.info(`Searching Tab4U for: ${query}`);
      
  //     const searchParams = {
  //       search: query,
  //       type: 'song'
  //     };
      
  //     logger.info('Making request to Tab4U with params:', searchParams);
      
  //     const searchResponse = await axios.get(this.searchUrl, {
  //       params: searchParams,
  //       headers: {
  //         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  //         'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  //         'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
  //         'Referer': this.baseUrl
  //       }
  //     });
      
  //     logger.info(searchResponse.data);
  //     const $ = cheerio.load(searchResponse.data);
  //     const songs = [];

  //     $('.song_list_item').each((i, element) => {
  //       const $element = $(element);
  //       const songLink = $element.find('a.song_name');
  //       const artistLink = $element.find('a.artist_name');
        
  //       const title = songLink.text().trim();
  //       const href = songLink.attr('href');
  //       const artist = artistLink.text().trim();
        
  //       logger.info('Processing song:', {
  //         index: i,
  //         title,
  //         artist,
  //         href
  //       });
        
  //       if (title && href) {
  //         const song = {
  //           title,
  //           artist: artist || 'Unknown Artist',
  //           url: href.startsWith('http') ? href : `${this.baseUrl}${href}`
  //         };
  //         logger.info('Found song:', song);
  //         songs.push(song);
  //       }
  //     });

  //     logger.info(`Found ${songs.length} songs on Tab4U`);
  //     return songs;
  //   } catch (error) {
  //     logger.error('Error searching Tab4U:', error.message);
  //     if (error.response) {
  //       logger.error('Response status:', error.response.status);
  //       logger.error('Response data:', error.response.data);
  //     }
  //     throw error;
  //   }
  // }

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
        return await this.getRemoteSongDetails(songIdentifier);
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
  async getRemoteSongDetails(url) {
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

  async getChordieSongWithPuppeteer(url) {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const result = await page.evaluate(() => {
      const title = document.querySelector('h1')?.innerText.trim() || 'Unknown Title';
      const artist = document.querySelector('h2')?.innerText.trim() || 'Unknown Artist';

      const lines = [];
      const chordlineDivs = document.querySelectorAll('div.chordline');

      chordlineDivs.forEach(div => {
        const chordSpans = Array.from(div.querySelectorAll('span'));
        const chordLine = [];
        let position = 0;

        let currentPos = 0;

        chordSpans.forEach(span => {
          const chord = span.textContent?.trim();

          // Only keep valid chords
          const isValidChord = /^[A-G][#b]?m?(add\d?|sus\d?|dim|aug)?(\/[A-G][#b]?)?$/.test(chord);

          if (isValidChord) {
            // Avoid pushing duplicate chords
            if (!chordLine.find(c => c.text === chord && c.position === currentPos)) {
              chordLine.push({ text: chord, position: currentPos });
            }
            currentPos += chord.length + 1;
          } else {
            currentPos += (chord?.length || 1);
          }
        });

        lines.push({ lyrics: '', chords: chordLine });
      });

      const textlines = Array.from(document.querySelectorAll('div.textline'));
      textlines.forEach((div, i) => {
        const text = div.innerText.trim();
        if (text && !text.match(/^Song Title:|Band Name:/)) {
          lines[i] = lines[i] || { lyrics: '', chords: [] };
          lines[i].lyrics = text;
        }
      });

      return {
        title,
        artist,
        lines,
        hasChords: lines.some(l => l.chords?.length),
        source: 'chordie.com',
        url: window.location.href
      };
    });

    await browser.close();
    return result;
  }
}

module.exports = new SongAPIService(); 