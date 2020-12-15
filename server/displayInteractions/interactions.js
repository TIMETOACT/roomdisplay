const request = require('request-promise');
const logger = require('../lib/logger');
const axios = require('axios').default;

const { JIRA_HOST, JIRA_USERNAME, JIRA_PASSWORD, TRIGGER_TIME } = process.env;

const jiraApi = axios.create({
  baseURL: JIRA_HOST,
  timeout: 100000,
  withCredentials: true,
  auth: {
    username: JIRA_USERNAME,
    password: JIRA_PASSWORD,
  },
});

let pxInd = 0;
let stInd = 0;

async function initializeDisplay(room) {
  var batteryLife = 0;
  const ip = room.ip;
  const poe = room.poe;
  const getOptions = {
    url: `http://${ip}/EPD`,
    method: 'GET',
    resolveWithFullResponse: true,
  };
  if (!poe) {
    try {
      const {
        headers: { battery },
      } = await request(getOptions);
      // Get information if ticket is already
      let createdTicket = await getJiraTicket(room.name);
      //Get Battery from header
      batteryLife = battery;
      logger.info('Battery Level: ' + batteryLife);

      if (parseInt(batteryLife) <= 15 && !createdTicket) {
        //create ticket in JIRA
        try {
          logger.info('Creating ticket in JIRA due to low battery life.');
          await jiraApi.post('/rest/servicedeskapi/request', {
            serviceDeskId: '7',
            requestTypeId: '242',
            requestFieldValues: {
              summary: `Türschild-Akku muss getauscht werden: ${room.name}`,
              description: 'Change battery of the display in room ' + room.name,
            },
          });
          createdTicket = true;
          logger.info('Init display successful!');
        } catch (err) {
          logger.error(`Failed to create a jira ticket
			${err.message}
			${err.stack}`);
        }
      } else if (createdTicket && parseInt(batteryLife) > 15) {
        createdTicket = false;
      }
    } catch (err) {
      logger.error(`Init display failed.
        ${err.message}
		Response Message: ${
      err.response
        ? err.response.data
          ? err.response.data.errorMessage
          : ''
        : ''
    }
		${err.stack}`);
    }
  }
}

function uploadToDisplay(pictureData, i, newArray, length, room) {
  const ip = room.ip;
  /*let bodyTest = "ffffffffffbaffaefffaeffaaaaeffnaaahaefbafffbaaaeamfbafffbaffnaaamfffbaaamffffffbaaaaaamffffbaaamffbafffaeffbafffaaaaffffffffffffffffffaaaaaaffffdaambaffaefffaefnaaebafffbafffaaaahffaefffffffaefffffffffaaaahffaebaaaaaaeffaaaahffaefffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffbaffaefffaeffnaamffffnaefaefbaffffdamfbafbafffbafffnamfffffnamfffffffbaaaaapffffffnamfffbafffaeffbafffnaaffffffffffffffffffffpaapffffffdafbaffaefffaeffdaebafffbaffffdahfffaefffffffaeffffffffffdahfffaebaaaaaaefffdahfffaefffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff".replace(
    /[a-z]/gi,
    "f"
  );*/
  let bodyData = u_data(pictureData);
  const postOptions = {
    url: `http://${ip}/LOAD`,
    method: 'POST',
    body: `${bodyData}${wordToStr(bodyData.length)}LOAD`,
    //body: "ffffffffffbaffaefffaeffaaaaeffnaaahaefbafffbaaaeamfbafffbaffnaaamfffbaaamffffffbaaaaaamffffbaaamffbafffaeffbafffaaaaffffffffffffffffffaaaaaaffffdaambaffaefffaefnaaebafffbafffaaaahffaefffffffaefffffffffaaaahffaebaaaaaaeffaaaahffaefffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffbaffaefffaeffnaamffffnaefaefbaffffdamfbafbafffbafffnamfffffnamfffffffbaaaaapffffffnamfffbafffaeffbafffnaaffffffffffffffffffffpaapffffffdafbaffaefffaeffdaebafffbaffffdahfffaefffffffaeffffffffffdahfffaebaaaaaaefffdahfffaefffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffmnfaLOAD",
    //body: `${bodyTest}${wordToStr(bodyTest.length)}LOAD`,
    headers: { 'content-type': 'text/plain', connection: 'keep-alive' },
  };
  try {
    return request(postOptions).then(function() {
      if (i === 17) {
        show(room);
        logger.info('Bild ausgegeben');
      } else {
        uploadToDisplay(
          newArray.slice(length * (i - 1), length * i),
          i + 1,
          newArray,
          length,
          room,
        );
      }
    });
  } catch (err) {
    logger.error(`Upload image failed.
	${err.message}
	${err.stack}`);
  }
}

function upload(pictureData, room) {
  let newArray = [];
  for (let j = 0; j < pictureData.length; j += 4) {
    if (
      pictureData[j + 1] >= 128 &&
      pictureData[j + 2] >= 128 &&
      pictureData[j + 3] >= 128
    ) {
      newArray[j / 4] = 1; //Weiß
    } else if (
      pictureData[j + 1] <= 127 &&
      pictureData[j + 2] <= 127 &&
      pictureData[j + 3] <= 127
    ) {
      newArray[j / 4] = 0; //Schwarz
    } else if (
      pictureData[j + 1] <= 200 &&
      pictureData[j + 2] <= 200 &&
      pictureData[j + 3] > 200
    ) {
      newArray[j / 4] = 3; //Rot
    } else {
      logger.error('Invalid color');
      throw 'Invalid Color: ' +
        pictureData[j] +
        ' ' +
        pictureData[j + 1] +
        ' ' +
        pictureData[j + 2] +
        ' ' +
        pictureData[j + 3] +
        '\n Room: ' +
        room.name;
    }
  }
  const length = 16000;
  uploadToDisplay(newArray.slice(0, length), 2, newArray, length, room);
}

//calculate time to next wakeup
function getSleeptime() {
  const TRIGGER_MILLISEC = 60000 * TRIGGER_TIME; //time between two picture pushes in milliseconds
  const now = Date.now(); //unix time
  const lastTrigger = now - (now % TRIGGER_MILLISEC); //unix time for last trigger
  const nextTrigger = lastTrigger + TRIGGER_MILLISEC; //unix time for next trigger
  return (nextTrigger - now - 10000) * 1000; //return 10 seconds less than the time until the next push in microseconds
}

function show(room) {
  const ip = room.ip;
  try {
    return request({
      url: `http://${ip}/SHOW`,
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: `${getSleeptime()}`, //sleep until 10 seconds before next rendering
    });
  } catch (err) {
    logger.error(err);
  }
}

function byteToStr(v) {
  return String.fromCharCode((v & 0xf) + 97, ((v >> 4) & 0xf) + 97);
}

function wordToStr(v) {
  return byteToStr(v & 0xff) + byteToStr((v >> 8) & 0xff);
}

function u_data(a) {
  rqMsg = '';
  svPrv();
  pxInd = 0;
  while (pxInd < a.length && rqMsg.length < 8000) {
    var v = 0;
    for (var i = 0; i < 16; i += 2) {
      if (pxInd < a.length) v |= a[pxInd] << i;
      pxInd++;
    }
    rqMsg += wordToStr(v);
  }

  return rqMsg;
}

function svPrv() {
  prvPx = pxInd;
  prvSt = stInd;
}

async function getJiraTicket(roomname) {
  try {
    const data = (
      await jiraApi.get('/rest/servicedeskapi/request', {
        serviceDeskId: '7',
        requestTypeId: '242',
        searchTerm: `Türschild-Akku muss getauscht werden: ${roomname}`,
      })
    ).data;
    let ticketExists = false;
    data.values.forEach(ticket => {
      if (ticket.currentStatus.status !== 'Closed') {
        ticketExists = true;
      }
    });
    return ticketExists;
  } catch (err) {
    logger.error(err);
  }
}

module.exports = { upload, initializeDisplay, show };
