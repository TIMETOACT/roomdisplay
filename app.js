const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('./lib/logger.js');
require('dotenv').config();

const indexRouter = require(path.join(__dirname, 'routes', 'index'));
const session = require('express-session');
const flash = require('connect-flash');

const app = express();

app.locals.roomData = require('./rooms.json');

// Session middleware
// NOTE: Uses default in-memory session store, which is not
// suitable for production
app.use(
  session({
    secret: 'your_secret_value_here',
    resave: false,
    saveUninitialized: false,
    unset: 'destroy',
  }),
);

// Flash middleware
app.use(flash());

// Set up local vars for template layout
app.use(function(req, res, next) {
  // Read any flashed errors and save
  // in the response locals
  res.locals.error = req.flash('error_msg');

  // Check for simple error string and
  // convert to layout's expected format
  var errs = req.flash('error');
  for (let i in errs) {
    res.locals.error.push({ message: 'An error occurred', debug: errs[i] });
  }

  next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

const hbs = require('hbs');
const date = require('dayjs');
// Helper to format date/time sent by Graph
hbs.registerHelper('eventDateTime', function(dateTime) {
  return date(dateTime).format('M/D/YY h:mm A');
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter.router);

app.get('/test', (req, res) => res.send('ok'));

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(3000, function() {
  logger.info('Example app listening on port 3000!');
  app.locals.roomData.forEach(room => {
    if (room.Activated) {
      indexRouter.init(null, room, app.locals.roomData);
    }
  });
});

module.exports = app;
