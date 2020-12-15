const timeZone = require('dayjs-ext/plugin/timeZone');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const dayjs = require('dayjs');
dayjs.extend(timeZone); // use plugin
const logger = require('../lib/logger');
const { initializeDisplay } = require(`server/displayInteractions/interactions`);
const { upload } = require(path.join(
  '..',
  'displayInteractions',
  'interactions',
));

function buildImage(current, next, room) {
  const createImagePath = path.join(__dirname, `${room.name}_info.jpeg`);
  const canvas = createCanvas(640, 384);
  const ctx = canvas.getContext('2d');
  const out = fs.createWriteStream(createImagePath);
  const imagePath = path.join('imageGenerator', `${room.name}_info.jpeg`);
  const bmpPath = path.join('imageGenerator', `${room.name}_info.bmp`);

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  //set room name
  ctx.fillStyle = 'black';
  ctx.font = '30px Arial';
  ctx.fillText(room.name, 20, 50);
  //set date
  ctx.textAlign = 'right';
  ctx.font = 'bold';
  ctx.fillText(getDate(), 620, 50);
  //set border-bottom
  ctx.lineWidth = 5;
  ctx.moveTo(0, 70);
  ctx.lineTo(640, 70);
  ctx.stroke();
  //set main info current
  setCurrent(ctx, current, 130);
  //set border-bottom
  ctx.lineWidth = 3;
  ctx.moveTo(0, 230);
  ctx.lineTo(640, 230);
  ctx.stroke();
  //set main info next
  setCurrent(ctx, next, 290);

  const stream = canvas.createJPEGStream({
    quality: 0.95,
    chromaSubsampling: false,
  });

  stream.pipe(out);
  out.on('finish', () => {
    Jimp.read(imagePath, async function(err, image) {
      if (err) {
        logger.error(err);
      } else {
        try {
          image.write(bmpPath);
          await initializeDisplay(room);
          await upload(image.bitmap.data, room);
        } catch (err2) {
          logger.error(err2);
        }
      }
    });
  });
}

function getDate() {
  const date = dayjs().format('DD.MM.YYYY HH:mm', { timeZone: 'Europe/Berlin' });
  return date;
}

function setCurrent(ctx, current, y) {
  if (current) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px Arial';
    if (current.now) {
      ctx.fillStyle = 'red';
    }
    ctx.fillText(`${current.time}`, 320, y);
    ctx.fillStyle = 'black';
    //set title / author
    ctx.font = 'light 30px Arial';
    if (!current.today) {
      ctx.textAlign = 'right';
      ctx.fillText(current.date, 620, y - 20);
      ctx.textAlign = 'center';
    }
    ctx.fillText(`${current.title}`, 320, y + 40);
    ctx.font = '27px Arial';
    ctx.fillText(`${current.company}`, 320, y + 80);
  } else {
	ctx.textAlign = 'center';
	ctx.font = "27px Arial";
	ctx.fillText('Es liegen keine weiteren Buchungen vor', 320, y + 20);
  }
}

module.exports = { buildImage };
