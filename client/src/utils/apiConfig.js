// Dynamically determine API base URL based on current host
const getAPIBaseURL = () => {
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    return 'https://www.lyrikalempire.com/api';
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;

  // Check if hostname is an IP address (IPv4)
  const isIPAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

  // If accessing via IP address, use the same origin
  if (isIPAddress) {
    const serverPort = port || (protocol === 'https:' ? '443' : '4000');
    return `${protocol}//${hostname}:${serverPort}/api`;
  }

  // If localhost, use localhost API
  /* if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000/api';
  } */

  // Otherwise, use production API
  return 'https://www.lyrikalempire.com/api';
};

const API_BASE_URL = getAPIBaseURL();
export default API_BASE_URL;