//  OpenShift sample Node application
var express = require('express'),
    fs      = require('fs'),
    app     = express(),
    eps     = require('ejs').renderFile,
    morgan  = require('morgan');

const bodyParser= require('body-parser');

app.engine('html', eps);
app.use(morgan('combined'))
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
})
app.use(bodyParser.urlencoded({extended: true}))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || process.env.RIZKIPORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || process.env.RIZKIIP || '0.0.0.0',
    mongoHost =  '127.0.0.1',
    mongoPort =  27017,
    mongoDatabase = 'user',
    mongoUser, mongoPassword,
    mongoURL = 'mongodb://' + mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    if(process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL){
       mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL;
      } else if (process.env.DATABASE_SERVICE_NAME) {
      var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
          mongoHost = process.env[mongoServiceName + '_SERVICE_HOST']
          mongoPort = process.env[mongoServiceName + '_SERVICE_PORT']
          mongoDatabase = process.env[mongoServiceName + '_DATABASE']
          mongoPassword = process.env[mongoServiceName + '_PASSWORD']
          mongoUser = process.env[mongoServiceName + '_USER'];

      if (mongoHost && mongoPort && mongoDatabase) {
          mongoURL = 'mongodb://';
        if (mongoUser && mongoPassword) {
          mongoURL += mongoUser + ':' + mongoPassword + '@';
        }
          mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
      }
    }
var db = null;

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

app.get('/post', function (req, res) {
  //res.status('200').send('used for api only')
   res.sendFile("./views/inputguest.html", {root:__dirname})
});

app.post('/sendguest', function (req, res) {
  var name = req.body.name || "unknown",
      phone = req.body.phone || '(empty)',
      comment = req.body.comment || 'none';
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){console.log('error connectiong to mongodb ' + err)});
  }
  if (db) {
    var g = db.collection('guest');
        g.insert({
          name: name,
          phone: phone,
          comment: comment
        }, function(err, result) {
          console.log('result:' + result);
          g.find({name:name}).toArray(function(err, r){
            console.log('r:' + r);
          })
          res.status(200).jsonp({"success": "true"});
        })
  } else {
    res.status(400).jsonp({"success": "false"});
  }
});

app.get('/env', function (req, res) {
  console.log(process.env)
  res.json(JSON.stringify(process.env))
});

app.get('/guestlist', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var g = db.collection('guest');
        g.find().toArray(function(err, doc) {
          if (err) {
            res.status(500).send('Ops did not work');
          }
          console.log(doc)
          res.send('myguest:' + JSON.stringify(doc));
        })
  } else {
    res.send('none');
  }
});

app.all('*', function(req, res) {
  res.send('Unauthorized attemp')
})

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);
console.log('Mongo server running on %s', mongoURL);
console.log(JSON.stringify(process.env));
module.exports = app ;
