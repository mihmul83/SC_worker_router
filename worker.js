'use strict';
var fs = require('fs');
var express = require('express');
var engine = require('ejs-mate');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var healthChecker = require('sc-framework-health-check');

let orderDAO = require('./app/models/dao/orderDAO.js');
let paymentDAO = require('./app/models/dao/paymentDAO.js');
let dataManager = require('./app/dataManager');
let auth = require('./app/auth.js');
const config = require('./config.js');
let pool = require('./app/config/dbconnection');
pool.connect(config.dboption);

module.exports.run = function (worker) {
  console.log('   >> Worker PID:', process.pid);

  var environment = worker.options.environment;

  var app = express();

  var httpServer = worker.getHTTPServer();

  var scServer = worker.getSCServer();

  app.engine('ejs', engine);
  app.set('view engine', 'ejs');

  app.use(serveStatic(path.resolve(__dirname, 'public')));
  
  app.get('/', function (req, res) {
    res.render('index.ejs');
  });


  healthChecker.attach(worker, app);

  httpServer.on('request', app);


  scServer.addMiddleware(scServer.MIDDLEWARE_PUBLISH_IN, function (req, next) {
    var authToken = req.socket.authToken;
    if (authToken) {
      next();
    } else {
      next('You are not authorized to publish');
    }
  });

  scServer.on('connection', function (socket) {
    socket.on('login', function (credentials, respond) {
      auth.authenticate(credentials, socket, function (err, user) {
        if(err) { respond(err);}
        else {
          respond(null, {settings: user.settings});
        }
      });
    });
  });
};