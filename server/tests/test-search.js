const tab4uService = require('./services/tab4uService');

async function testSearch() {
  try {
    console.log('Testing Tab4U search...');
    const results = await tab4uService.searchSongs('rockstar');
    console.log('Search results:', results);
  } catch (error) {
    console.error('Search error:', error);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testSearch(); 