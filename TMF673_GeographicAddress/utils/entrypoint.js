'use strict';

const { getSwaggerDoc } = require('./swaggerUtils');
const logger = require('../logger');

/**
 * Entrypoint handler - TMF630 REST API Design Guidelines compliant
 * Provides HATEOAS-style links to all API operations
 */
function entrypoint(req, res) {
    try {
        const swaggerDoc = getSwaggerDoc();
        const basePath = swaggerDoc?.servers?.[0]?.url
                      || swaggerDoc.basePath
                      || '/tmf-api/geographicAddressManagement/v4';

        const componentName = process.env.COMPONENT_NAME || 'geographicaddress';
        const releaseName = process.env.RELEASE_NAME || 'tmf673';

        // Clean up paths
        const cleanPath = (path) => path.replace(/\/\//g, '/');

        // Build the self link with component information
        const linksObject = {
            self: {
                href: basePath,
                id: releaseName,
                name: componentName,
                status: 'running',
                version: swaggerDoc?.info?.version || '4.0.1',
                title: swaggerDoc?.info?.title || 'Geographic Address Management API',
                description: swaggerDoc?.info?.description || '',
                "swagger-ui": cleanPath(`${basePath}/api-docs`),
                "openapi": cleanPath(`${basePath}/openapi`)
            }
        };

        // Add info fields to self link
        if (swaggerDoc?.info) {
            for (const infoKey in swaggerDoc.info) {
                if (!linksObject.self[infoKey]) {
                    linksObject.self[infoKey] = swaggerDoc.info[infoKey];
                }
            }
        }

        // Dynamically generate links for all API operations
        if (swaggerDoc?.paths) {
            for (const pathKey in swaggerDoc.paths) {
                for (const methodKey in swaggerDoc.paths[pathKey]) {
                    const operation = swaggerDoc.paths[pathKey][methodKey];
                    if (operation.operationId) {
                        linksObject[operation.operationId] = {
                            href: stripTrailingSlash(basePath) + pathKey,
                            method: methodKey.toUpperCase(),
                            description: operation.description || operation.summary || '',
                            operationId: operation.operationId
                        };

                        // Add tags if available
                        if (operation.tags && operation.tags.length > 0) {
                            linksObject[operation.operationId].tags = operation.tags;
                        }
                    }
                }
            }
        }

        // Build TMF630-compliant response
        const responseJSON = {
            _links: linksObject
        };

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(responseJSON, null, 2));

    } catch (error) {
        logger.error('Entrypoint error', {
            error: error.message,
            stack: error.stack
        });
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: 'Internal Server Error',
            message: 'Unable to generate entrypoint response'
        }));
    }
}

function stripTrailingSlash(str) {
    return str?.replace(/\/$/,'') || str;
}

module.exports = { entrypoint };
