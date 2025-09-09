const axios = require('axios');

// Test the duplicate detection functionality
async function testDuplicateDetection() {
  const baseURL = 'http://localhost:4000/api';
  
  try {
    console.log('Testing duplicate detection...');
    
    // First, let's try to add a beat to a playlist (this should work if the beat doesn't exist)
    console.log('\n1. Testing first addition (should succeed):');
    try {
      const response1 = await axios.post(`${baseURL}/playlists/1/beats`, {
        beatIds: [1],
        allowDuplicates: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          // Note: This will fail due to authentication, but we can see the request structure
        }
      });
      console.log('First addition response:', response1.data);
    } catch (error) {
      console.log('First addition error (expected due to auth):', error.response?.status, error.response?.data);
    }
    
    // Now let's try to add the same beat again (this should trigger duplicate detection)
    console.log('\n2. Testing duplicate addition (should trigger 409):');
    try {
      const response2 = await axios.post(`${baseURL}/playlists/1/beats`, {
        beatIds: [1],
        allowDuplicates: false
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('Duplicate addition response:', response2.data);
    } catch (error) {
      console.log('Duplicate addition error:', error.response?.status, error.response?.data);
      if (error.response?.status === 409) {
        console.log('✅ Duplicate detection is working!');
      } else {
        console.log('❌ Duplicate detection not working as expected');
      }
    }
    
    // Test with allowDuplicates: true (should succeed)
    console.log('\n3. Testing with allowDuplicates: true (should succeed):');
    try {
      const response3 = await axios.post(`${baseURL}/playlists/1/beats`, {
        beatIds: [1],
        allowDuplicates: true
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('Allow duplicates response:', response3.data);
    } catch (error) {
      console.log('Allow duplicates error:', error.response?.status, error.response?.data);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testDuplicateDetection();
