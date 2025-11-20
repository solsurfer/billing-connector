
'use strict';

const util = require('util')
const assert = require('assert');

const queryToMongo = require('query-to-mongo');
const querystring = require('querystring');

const MongoClient = require('mongodb').MongoClient;

const {getResponseType, getPayloadType, getTypeDefinition} = require('./swaggerUtils');
const logger = require('../logger');

var mongodb = null; 

function connectHelper(callback) {
  var config = require('../config.json');
  var argv = require('minimist')(process.argv);

  // Support Kubernetes service naming with release name
  const releaseName = process.env.RELEASE_NAME || 'tmf673';
  const defaultDbHost = `${releaseName}-mongodb`;

  // Support multiple environment variable patterns for broad compatibility
  const host = argv.dbhost
            || process.env.DB_HOST          // Generic
            || process.env.dbhost           // Legacy
            || config.db_host
            || defaultDbHost;                // Kubernetes default

  const port = process.env.DB_PORT
            || process.env.dbport
            || config.db_port
            || 27017;

  const database = process.env.DB_NAME
                || process.env.DATABASE
                || config.db_name
                || 'tmf';

  // Support full MongoDB URI from various cloud platforms
  // Priority order: MONGODB_URI > MONGO_URL > DB_URL > constructed URL
  const mongourl = process.env.MONGODB_URI      // MongoDB Atlas, Railway, Render
                || process.env.MONGO_URL        // Docker, Kubernetes (our Helm chart)
                || process.env.DB_URL           // Generic cloud platforms
                || `${process.env.dbprot || config.db_prot || 'mongodb'}://${host}:${port}`;

  logger.info('MongoDB connection details', {
    host: host,
    port: port,
    database: database,
    url: mongourl.replace(/\/\/([^:]+):([^@]+)@/, '//<credentials>@') // Hide credentials in logs
  });

  MongoClient.connect(mongourl, { useNewUrlParser: true, useUnifiedTopology: true }, function (err, client) {
    if (err) {
      logger.error('MongoDB connection error', {
        error: err.message,
        stack: err.stack
      });
      mongodb = null;
      callback(err, null);
    } else {
      mongodb = client.db(database);
      logger.info('MongoDB connected successfully', { database: database });
      callback(null, mongodb);
    }
  });
};


function getMongoQuery(req) {
  var res;
  if(req instanceof Object) {
    res = queryToMongo(req._parsedUrl.query);
  } else {
    res = queryToMongo(querystring.parse(req));
  }

  if(res!==undefined && res.options!==undefined && res.options.fields!==undefined) {
    res.options.fields.href = true;
    res.options.fields.id = true;
  }

  //
  // test for date-time in query and allow partial equality matching, e.g. ="2018-08-21"
  //
  try {
    const requestType = getPayloadType(req);
    const properties = Object.keys(res.criteria);

    var typeDefinition = getTypeDefinition(requestType);
    if(typeDefinition.properties!==undefined) {
      typeDefinition = typeDefinition.properties;
    }

    properties.forEach(prop => {
      var paramDef = typeDefinition[prop];
      if(paramDef!==undefined && paramDef.type === "string" && paramDef.format === "date-time") {
        const propVal = res.criteria[prop];
        // equality test if not the value is an object
        if(!(propVal instanceof Object)) {
          if(!isNaN(Date.parse(propVal))) {
            res.criteria[prop] = {$regex: '^' + propVal + '.*' };
          }
        }
      }
    });
  }
  catch(err) {
    // ignore for now
  }

  res.options.projection = res.options.fields;
  delete res.options.fields;

  return(res);

};

function quotedString(s) {
  return s;
};

function connectDb(callback) {
  if(mongodb) {
      mongodb.stats(function(err, stats) {
        if(stats != null) {
          callback(null,mongodb);
        } else {
          connectHelper(callback);
        }
      });
  } else {
    connectHelper(callback);
  }
};

function connect() {
  return new Promise(function(resolve,reject) {
      connectDb(function(err,db) {
        if(err!=null || db==null) {
          reject(err);
        } else {
          resolve(db);
        };
      });
    });
};

function sendDoc(res,code,doc) {
  // delete internal mongo _id from all documents
  if(Array.isArray(doc)) {
    // remove _id from all documents
    doc.forEach(x => {
      delete x._id;
    });
  } else {
    delete doc._id;
  }

  if(doc.href) {
    res.setHeader('Location',  doc.href);
  }

  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(doc));
}

async function addAddressCollections(){
  let testGeoAddressDoc = {
    id: "9090",
    href: "https://host:port/location/geographicAddress/9090",
    streetNr: "225",
    streetName: "strathmore",
    streetType: "terrace",
    postcode: "5004",
    locality: "Brighton",
    city: "Brighton",
    stateOrProvince: "SA",
    country: "Australia",
    geographicSubAddress: []
  }

  let testGeoSubAddressDoc = {
    id: "1090",
    href: "https://host:port/location/geographicAddress/9090/geographicSubAddress...",
    levelNumber: "20",
    levelType: "Ground",
    privateStreetNumber: "267",
    privateStreetName: "street",
    subAddressType: "subunit"
  }

  try{
    let mongoConnection = await connect()
    let geoAddress = mongoConnection.collection("GeographicAddress")
    let geoSubAddress = mongoConnection.collection("GeographicSubAddress")

    let geoAddresses = await geoAddress.countDocuments({})
    let geoSubAddresses = await geoSubAddress.countDocuments({})

    logger.info('Initializing address collections', {
      geoAddressCount: geoAddresses,
      geoSubAddressCount: geoSubAddresses
    });

    if (geoAddresses < 1){
      await geoAddress.insertOne(testGeoAddressDoc)
      logger.info('Inserted test GeographicAddress document', { id: testGeoAddressDoc.id });
    }

    if (geoSubAddresses < 1){
      await geoSubAddress.insertOne(testGeoSubAddressDoc)
      logger.info('Inserted test GeographicSubAddress document', { id: testGeoSubAddressDoc.id });
    }
  }
  catch(error) {
      logger.error('Error initializing address collections', {
        error: error.message,
        stack: error.stack
      });
  }
}



module.exports = { connect, connectDb, getMongoQuery, sendDoc, addAddressCollections };


