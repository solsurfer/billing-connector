'use strict';

var url = require('url');

var GeographicSubAddress = require('../service/GeographicSubAddressService');

module.exports.listGeographicSubAddress = function listGeographicSubAddress (req, res, next) {
  GeographicSubAddress.listGeographicSubAddress(req, res, next);
};

module.exports.retrieveGeographicSubAddress = function retrieveGeographicSubAddress (req, res, next) {
  GeographicSubAddress.retrieveGeographicSubAddress(req, res, next);
};
