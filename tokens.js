const querystring = require('querystring');
const request = require('request-promise');
const logger = require('./lib/logger');

const token = {
  getAccessToken: async function() {
    const postData = {
      client_id: process.env.OAUTH_APP_ID,
      scope: 'https://graph.microsoft.com/.default',
      client_secret: process.env.OAUTH_APP_PASSWORD,
      grant_type: 'client_credentials',
    };

    var formData = querystring.stringify(postData);
    var contentLength = formData.length;

    const postOptions = {
      url: `https://login.microsoftonline.com/${process.env.OAUTH_TENANT}/oauth2/v2.0/token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': contentLength,
      },
      body: formData,
    };

    try {
      return request(postOptions);
    } catch (err) {
      logger.error(err.stack);
    }
  },
};

module.exports = token;
