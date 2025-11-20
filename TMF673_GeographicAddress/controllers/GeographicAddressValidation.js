'use strict';

var url = require('url');

var GeographicAddressValidation = require('../service/GeographicAddressValidationService');

module.exports.createGeographicAddressValidation = function createGeographicAddressValidation (req, res, next) {
  GeographicAddressValidation.createGeographicAddressValidation(req, res, next);
};

module.exports.listGeographicAddressValidation = function listGeographicAddressValidation (req, res, next) {
  GeographicAddressValidation.listGeographicAddressValidation(req, res, next);
};

module.exports.patchGeographicAddressValidation = function patchGeographicAddressValidation (req, res, next) {
  GeographicAddressValidation.patchGeographicAddressValidation(req, res, next);
};

module.exports.retrieveGeographicAddressValidation = function retrieveGeographicAddressValidation (req, res, next) {
  GeographicAddressValidation.retrieveGeographicAddressValidation(req, res, next);
};
