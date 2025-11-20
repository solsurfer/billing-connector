'use strict';

var url = require('url');

var NotificationListenersClientSide = require('../service/NotificationListenersClientSideService');

module.exports.listenToGeographicAddressValidationStateChangeEvent = function listenToGeographicAddressValidationStateChangeEvent (req, res, next) {
  NotificationListenersClientSide.listenToGeographicAddressValidationStateChangeEvent(req, res, next);
};
