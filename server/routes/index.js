const express = require('express');
const router = express.Router();
const tokens = require('../tokens.js');
const graph = require('../graph.js');
const path = require('path');
const timeZone = require('dayjs-ext/plugin/timeZone');
const date = require('dayjs');
const logger = require(path.join('..', 'lib', 'logger.js'));
const utc = require('dayjs/plugin/utc')
date.extend(utc)
require('dayjs/locale/de');
date.extend(timeZone); // use plugin
const { buildImage } = require(path.join('..', 'imageGenerator', 'image'));
const cron = require('node-cron');
const { TRIGGER_TIME } = process.env;

/* GET home page. */
router.get('/', async function(req, res) {
  const reqs = [];
  var roomParam = req.query.room;
  if (!roomParam) {
    //Return Error if Room was not defined as param
    res.status(404).send('Room not defined as param.');
    return;
  }
  req.app.locals.roomData.forEach(room => {
    if (roomParam == room.name) {
      reqs.push(
        (async () => {
          await init(
            function(params) {
              res.render('calendar', params);
            },
            room,
            req.app.locals.roomData,
          );
        })(),
      );
    }
  });
  //Return error if Room was defined, but not found in Roomlist
  if (roomParam && typeof reqs !== 'undefined' && reqs.length === 0) {
    res.status(404).send('Room not found in the room list.');
  }
  await Promise.all(reqs);
});

async function init(callback, room, rooms) {
  let params = {
    active: { home: true },
  };

  let accessToken;

  function getCompanyName(value) {
    const company = value.organizer.emailAddress.address
      .replace(/.*@/, '')
      .split('.')[0];
    const mapping = {
      'x-integrate': 'X-Integrate',
      timetoact: 'TIMETOACT',
      synaigy: 'Synaigy',
      edcom: 'Edcom',
      gish: 'GIS',
      novacapta: 'novaCapta',
      cloudpilots: 'Cloudpilots',
      ars: 'ARS',
    };

    return mapping[company] ? mapping[company] : 'Extern';
  }

  function generateObject(index) {
    const value = params.events[index];
    if (value) {
      const startTime = date.utc(value.start.dateTime + "Z");
      const endTime = date.utc(value.end.dateTime + "Z");
      const currentDate = startTime.format('DD.MM.YYYY');
      const todayDate = date().format('DD.MM.YYYY');
      const currentTime = date();

      return {
        today: todayDate === currentDate,
        now: currentTime >= startTime,
        title: value.subject,
        author: value.organizer.emailAddress.name,
        company: getCompanyName(value),
        time: `${startTime.format('HH:mm', { timeZone: 'Europe/Berlin' })} - ${endTime.format('HH:mm', { timeZone: 'Europe/Berlin' })}`,
        date: currentDate,
      };
    }
  }

  await getParams();

  async function getParams() {
    // Get the access token

    try {
      accessToken = await tokens.getAccessToken();
    } catch (err) {
      logger.error(
        `Could not get access token. Try signing out and signing in again.
		${err.message}
		${err.stack}`,
      );
    }

    if (accessToken && accessToken.length > 0) {
      try {
        // Get the events
        var events = await graph.getEvents(accessToken, room);
        params.events = events.value.sort((a, b) => {
          return date(a.start.dateTime) - date(b.start.dateTime);
        });
      } catch (err) {
        logger.error(
          `Could not fetch events
			${err.message}
			${err.stack}`,
        );
      }
    }

    //check if events are cancelled and delete them from array
    params.events.forEach((value, i) => {
      if (value.isCancelled) {
        params.events.splice(i, 1);
      }
    });
  }

  async function createImage() {
    const d = new Date();
    logger.info(`Every ${TRIGGER_TIME} minutes:`, new Date(d.getTime()));
    await getParams();
    rooms.forEach(room => {
      const currentTimeSlot = generateObject(0);
      const nextTimeSlot = generateObject(1);
      buildImage(currentTimeSlot, nextTimeSlot, room);
    });
  }

  //get information about next two meetings every 15 minutes
  let job = cron.schedule(`0 */${TRIGGER_TIME} * * * *`, await createImage);
  job.start();
  await createImage();

  if (callback) {
    callback(params);
  }
}

module.exports = { router, init };
