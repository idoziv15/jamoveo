const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class Tab4UService {
  constructor() {
    this.baseUrl = 'https://www.tab4u.com';
    this.searchUrl = `${this.baseUrl}/search.php`;
  }

  async searchSongs(query) {
    try {
      logger.info(`Searching Tab4U for: ${query}`);
      
      // Search for songs with the correct parameters
      const searchResponse = await axios.get(this.searchUrl, {
        params: {
          q: query,
          t: 'songs'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': this.baseUrl,
          'Connection': 'keep-alive'
        }
      });

      logger.info('Got response from Tab4U');
      const $ = cheerio.load(searchResponse.data);
      const songs = [];

      // Log the HTML for debugging
      logger.debug('Response HTML:', $.html());

      // Updated selectors based on actual Tab4U HTML structure
      $('.search_results .song_result').each((i, element) => {
        const $element = $(element);
        const songLink = $element.find('a').first();
        const title = songLink.text().trim();
        const href = songLink.attr('href');
        const artistElement = $element.find('.artist_name');
        const artist = artistElement.length ? artistElement.text().trim() : 'Unknown Artist';

        if (title && href) {
          const song = {
            title,
            artist,
            url: href.startsWith('http') ? href : this.baseUrl + href
          };
          logger.info('Found song:', song);
          songs.push(song);
        }
      });

      logger.info(`Found ${songs.length} songs on Tab4U`);
      return songs;
    } catch (error) {
      logger.error('Error searching Tab4U:', error.message);
      logger.error('Full error:', error);
      throw new Error('Failed to search Tab4U');
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