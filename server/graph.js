const request = require('request-promise');
const date = require('dayjs');
const logger = require('./server/lib/logger.js');

module.exports = {
  /*getUserDetails: async function(accessToken) {
    const client = getAuthenticatedClient(accessToken);

    const user = await client.api("/me").get();
    return user;
  },*/
  getEvents: async function(accessToken, room) {
    const id = room.email;
    const params = {
      startDateTime: date().toISOString(),
      endDateTime: date()
        .add(3, 'day')
        .toISOString(),
    };

    const options = {
      url: `https://graph.microsoft.com/v1.0/users/${id}/calendar/calendarView`,
      qs: params,
      method: 'GET',
      headers: {
        Authorization: 'bearer ' + JSON.parse(accessToken).access_token,
      },
    };

    try {
      const resp = await request(options);
      return JSON.parse(resp);
    } catch (err) {
      logger.error(err.stack);
      return null;
    }
  },
};
