const express = require('express');
require('dotenv').config({ path: 'variables.env' });
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const validator = require('express-validator');
const ejs = require('ejs');
const engine = require('ejs-mate');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const flash = require('connect-flash');
const _ = require('underscore');
const moment = require('moment');
const promisify = require('es6-promisify');
const expressValidator = require('express-validator');
const routes = require('./routes/index');
const helpers = require('./helpers');
const errorHandlers = require('./handlers/errorHandlers');
require('./handlers/passport');



mongoose.connect(process.env.DATABASE);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    // we're connected!
    console.log("Connected correctly to server");
});

const gallerypath = __dirname + '\\public\\gallery\\';
const app = express();



app.use(express.static('public'));
app.engine('ejs', engine);
app.set('view engine', 'ejs');

app.use(cookieParser());


app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(validator());

app.use(session({
    secret: process.env.SECRET,
    key: process.env.KEY,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({mongooseConnection: mongoose.connection})
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());


app.use((req, res, next) => {
  res.locals.gpath = gallerypath;
  res.locals.h = helpers;
  res.locals.flashes = req.flash();
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

// promisify some callback based APIs
app.use((req, res, next) => {
  req.login = promisify(req.login, req);
  next();
});


app.use('/', routes);

app.use(errorHandlers.notFound);


app.use(errorHandlers.flashValidationErrors);


if (app.get('env') === 'development') {
  /* Development Error Handler - Prints stack trace */
  app.use(errorHandlers.developmentErrors);
}



app.set('port', process.env.PORT || 7777);
const server = app.listen(app.get('port'), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});