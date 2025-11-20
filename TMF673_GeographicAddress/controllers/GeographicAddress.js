'use strict';

var url = require('url');

var GeographicAddress = require('../service/GeographicAddressService');

module.exports.listGeographicAddress = function listGeographicAddress (req, res, next) {
  GeographicAddress.listGeographicAddress(req, res, next);
};

module.exports.retrieveGeographicAddress = function retrieveGeographicAddress (req, res, next) {
  GeographicAddress.retrieveGeographicAddress(req, res, next);
};
