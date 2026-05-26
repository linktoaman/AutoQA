// ============================================
// Postman Collection Parser Service
// ============================================
// This service reads and extracts API details from Postman collection JSON files.

/**
 * Parse Postman collection and extract all API endpoints
 * @param {Object} collection - The Postman collection JSON object
 * @returns {Array} Array of API endpoints with details
 */
function parsePostmanCollection(collection) {
  const apis = [];

  try {
    // Check if collection has items
    if (!collection.item || collection.item.length === 0) {
      throw new Error('No API items found in collection');
    }

    // Recursively walk items to support nested folders
    function walkItems(items) {
      items.forEach((item) => {
        if (item.item && Array.isArray(item.item)) {
          walkItems(item.item);
        } else {
          const api = extractApiDetails(item);
          if (api) apis.push(api);
        }
      });
    }

    walkItems(collection.item);

    console.log(`✓ Parsed ${apis.length} API endpoints from collection`);
    return apis;
  } catch (error) {
    console.error('Error parsing collection:', error.message);
    throw new Error(`Failed to parse collection: ${error.message}`);
  }
}

/**
 * Normalize URL objects from Postman into a string
 * @param {Object|string} urlValue
 * @returns {string}
 */
function resolveUrl(urlValue) {
  if (!urlValue) return '';
  if (typeof urlValue === 'string') return urlValue;
  if (typeof urlValue === 'object') {
    if (urlValue.raw) return urlValue.raw;
    const protocol = urlValue.protocol || 'https';
    const host = Array.isArray(urlValue.host) ? urlValue.host.join('.') : urlValue.host || '';
    const path = Array.isArray(urlValue.path) ? urlValue.path.join('/') : urlValue.path || '';
    const query = Array.isArray(urlValue.query)
      ? urlValue.query
          .map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value || '')}`)
          .join('&')
      : '';

    let url = `${protocol}://${host}`;
    if (path) url += `/${path}`;
    if (query) url += `?${query}`;
    return url;
  }

  return '';
}

/**
 * Extract the request body content from Postman request bodies
 * @param {Object|string} body
 * @returns {string}
 */
function resolveBody(body) {
  if (!body) return '';
  if (typeof body === 'string') return body;
  if (body.raw) return body.raw;
  if (Array.isArray(body.urlencoded)) {
    return body.urlencoded
      .map((field) => `${field.key}=${field.value}`)
      .join('&');
  }
  if (Array.isArray(body.formdata)) {
    return body.formdata
      .map((field) => `${field.key}=${field.value || ''}`)
      .join('&');
  }
  return '';
}

/**
 * Extract details from a single API request
 * @param {Object} item - A request item from Postman collection
 * @returns {Object|null} API details object or null
 */
function extractApiDetails(item) {
  try {
    if (!item || !item.request) {
      return null;
    }

    const request = item.request;
    const url = resolveUrl(request.url);
    const method = (request.method || 'GET').toUpperCase();

    const headers = {};
    if (request.header && Array.isArray(request.header)) {
      request.header.forEach((header) => {
        if (header.key) {
          headers[header.key] = header.value || '';
        }
      });
    }

    const body = resolveBody(request.body);
    const description = item.name || (request.description || 'No description');

    if (!url) {
      return null;
    }

    return {
      id: `api-${Date.now()}-${Math.random()}`,
      name: item.name || 'Unnamed API',
      description: description,
      url: url,
      method: method,
      headers: headers,
      body: body,
      auth: request.auth || null,
      originalItem: item
    };
  } catch (error) {
    console.error(`Error extracting API details from item: ${error.message}`);
    return null;
  }
}

/**
 * Validate that we can extract meaningful APIs from the collection
 * @param {Array} apis - Array of API endpoints
 * @returns {Boolean} True if valid, throws error otherwise
 */
function validateApis(apis) {
  if (!apis || apis.length === 0) {
    throw new Error('No valid APIs found in collection');
  }

  const apisWithUrls = apis.filter((api) => api.url && api.url.length > 0);
  if (apisWithUrls.length === 0) {
    throw new Error('No APIs with valid URLs found in collection');
  }

  return true;
}

// Export functions
module.exports = {
  parsePostmanCollection,
  extractApiDetails,
  validateApis
};
