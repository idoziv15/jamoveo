const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class Tab4UService {
  constructor() {
    this.baseUrl = 'https://www.tab4u.com';
    this.searchUrl = `${this.baseUrl}/last100`;
  }

  async scrapeChordie(songName, maxPages = 3) {
    const results = [];
    const pageSize = 5;
  
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
          const songPage = await axios.get(fullUrl);
          const $$ = cheerio.load(songPage.data);
  
          const title = $$('h1').first().text().trim();
          logger.info(`title: ${title}`); 
          const artist = $$('h2').first().text().trim();
          logger.info(`artist: ${artist}`);

          // Extract all lines from the song
          const contentLines = [];
          $$('.chordline').each((i, el) => {
            const line = $$(el).text().trim();
            contentLines.push(line);
          });

          const content = contentLines.join('\n');
          logger.info(`content: ${content}`);
  
          results.push({ title, artist, content });
        } catch (err) {
          console.warn(`Failed to fetch song page: ${relativeLink}`, err.message);
        }
      }
    }
  
    console.log(`🎵 Fetched ${results.length} songs for "${songName}"`);
    results.forEach((r, i) => {
      console.log(`\n=== [${i + 1}] ${r.title} - ${r.artist} ===\n`);
      console.log(r.content.slice(0, 500) + (r.content.length > 500 ? '...' : '')); // show preview
    });
  
    return results;
  }

  async searchSongs(query) {
    try {
      logger.info(`Searching Tab4U for: ${query}`);
      
      const searchParams = {
        search: query,
        type: 'song'
      };
      
      logger.info('Making request to Tab4U with params:', searchParams);
      
      const searchResponse = await axios.get(this.searchUrl, {
        params: searchParams,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': this.baseUrl
        }
      });
      
      logger.info(searchResponse.data);
      const $ = cheerio.load(searchResponse.data);
      const songs = [];

      $('.song_list_item').each((i, element) => {
        const $element = $(element);
        const songLink = $element.find('a.song_name');
        const artistLink = $element.find('a.artist_name');
        
        const title = songLink.text().trim();
        const href = songLink.attr('href');
        const artist = artistLink.text().trim();
        
        logger.info('Processing song:', {
          index: i,
          title,
          artist,
          href
        });
        
        if (title && href) {
          const song = {
            title,
            artist: artist || 'Unknown Artist',
            url: href.startsWith('http') ? href : `${this.baseUrl}${href}`
          };
          logger.info('Found song:', song);
          songs.push(song);
        }
      });

      logger.info(`Found ${songs.length} songs on Tab4U`);
      return songs;
    } catch (error) {
      logger.error('Error searching Tab4U:', error.message);
      if (error.response) {
        logger.error('Response status:', error.response.status);
        logger.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  async getSongDetails(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract song content
      const content = $('.song_content').html();
      const title = $('.song_title').text().trim();
      const artist = $('.song_artist').text().trim();
      
      // Determine if the song has chords
      const hasChords = $('.chord').length > 0;

      return {
        title,
        artist,
        content,
        chords: hasChords
      };
    } catch (error) {
      logger.error('Error fetching song details from Tab4U:', error);
      throw new Error('Failed to fetch song details');
    }
  }
}

module.exports = new Tab4UService(); 