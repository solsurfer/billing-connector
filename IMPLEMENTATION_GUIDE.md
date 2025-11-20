# TMF673 Improvement Implementation Guide

Based on the comparison analysis with TMF629, this guide provides detailed step-by-step instructions for implementing the recommended improvements.

---

## Phase 1: Quick Wins (Recommended to Start Here)

### 1. Enhanced Entrypoint Module with HATEOAS Links

**Why**: The current entrypoint is basic and doesn't provide API discoverability. TMF630 REST API Design Guidelines recommend HATEOAS-style links.

**Current State** (`TMF673_GeographicAddress/index.js`):
```javascript
// Simple inline entrypoint
app.use(function(req, res, next) {
  if (req.url === '/' || req.url === '') {
    const componentName = process.env.COMPONENT_NAME || 'geographicaddress';
    const releaseName = process.env.RELEASE_NAME || 'tmf673';
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      id: releaseName,
      name: componentName,
      status: 'running',
      version: '4.0.1',
      basePath: '/tmf-api/geographicAddressManagement/v4'
    }));
    return;
  }
  next();
});
```

**Implementation Steps**:

#### Step 1.1: Create `utils/entrypoint.js`

```javascript
'use strict';

const { getSwaggerDoc } = require('./swaggerUtils');

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
        console.error('Entrypoint error:', error.message);
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
```

#### Step 1.2: Update `index.js` to use the new entrypoint

Replace the inline entrypoint code with:

```javascript
const { entrypoint } = require('./utils/entrypoint');

// In the middleware setup section:
swaggerTools.initializeMiddleware(swaggerDoc, function (middleware) {

  // Add entrypoint resource for Kubernetes ingress (TMF630 REST API Design Guidelines)
  app.use(function(req, res, next) {
    if (req.url === '/' || req.url === '') {
      return entrypoint(req, res);
    }
    next();
  });

  // ... rest of middleware
});
```

**Benefits**:
- ✅ Full API discoverability via HATEOAS links
- ✅ TMF630-compliant entrypoint
- ✅ Cleaner, more maintainable code
- ✅ All operations dynamically listed from OpenAPI spec

---

### 2. Multi-Environment Variable MongoDB Support

**Why**: Different cloud platforms use different environment variable conventions. Supporting multiple patterns increases deployment flexibility.

**Current State** (`TMF673_GeographicAddress/utils/mongoUtils.js`):
```javascript
const releaseName = process.env.RELEASE_NAME || 'tmf673';
const defaultDbHost = `${releaseName}-mongodb`;
var dbhost = argv.dbhost ? argv.dbhost: process.env.DB_HOST || defaultDbHost;
const mongourl = process.env.MONGO_URL || (config.db_prot + "://" + dbhost + ":" + config.db_port + "/" + config.db_name);
```

**Implementation Steps**:

#### Step 2.1: Update `mongoUtils.js` connection logic

```javascript
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

  console.log('MongoDB connection details:');
  console.log('  - Host:', host);
  console.log('  - Port:', port);
  console.log('  - Database:', database);
  console.log('  - URL:', mongourl.replace(/\/\/.*@/, '//<credentials>@')); // Hide credentials

  MongoClient.connect(mongourl, { useNewUrlParser: true, useUnifiedTopology: true }, function (err, client) {
    if (err) {
      console.error('MongoDB connection error:', err.message);
      mongodb = null;
      callback(err, null);
    } else {
      mongodb = client.db(database);
      console.log('MongoDB connected successfully');
      callback(null, mongodb);
    }
  });
}
```

#### Step 2.2: Update `config.json` with cloud deployment guidance

```json
{
  "_comment": "For cloud deployment, set environment variables:",
  "_mongodb_atlas": "MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/tmf",
  "_railway_render": "MONGODB_URI or MONGO_URL or DB_URL",
  "_kubernetes": "MONGO_URL is set automatically by Helm chart",

  "db_prot": "mongodb",
  "db_user": "mongodb",
  "db_password": "mongodb",
  "db_host": "localhost",
  "db_port": 27017,
  "db_name": "tmf",

  "alarm_host": "http://localhost:10011",
  "alarm_url_hal": "/api/",

  "strict_schema": true
}
```

**Supported Platforms**:
- ✅ Kubernetes (via Helm chart - MONGO_URL)
- ✅ MongoDB Atlas (MONGODB_URI)
- ✅ Railway (MONGODB_URI or MONGO_URL)
- ✅ Render (MONGODB_URI or DB_URL)
- ✅ Heroku (MONGODB_URI)
- ✅ Docker Compose (MONGO_URL or DB_URL)
- ✅ Local development (config.json)

---

### 3. Docker Compose for Local Development

**Why**: Simplifies local development by managing MongoDB and the application together.

**Implementation Steps**:

#### Step 3.1: Create `docker-compose.yaml` in TMF673 root

```yaml
version: '3.8'

networks:
  tmf673-network:
    driver: bridge

services:
  # TMF673 Geographic Address API
  geographicaddress:
    build: .
    image: tmf673-geographicaddress:dev
    container_name: tmf673-api
    ports:
      - "8080:8080"
    environment:
      # Component identification
      COMPONENT_NAME: geographicaddress
      RELEASE_NAME: tmf673-dev

      # MongoDB connection
      MONGO_URL: mongodb://mongodb:27017
      DB_NAME: tmf

      # Optional: Enable debug logging
      NODE_ENV: development
    depends_on:
      - mongodb
    networks:
      - tmf673-network
    restart: unless-stopped

  # MongoDB Database
  mongodb:
    image: mongo:8.0
    container_name: tmf673-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: tmf
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
    networks:
      - tmf673-network
    restart: unless-stopped
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/tmf --quiet
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

volumes:
  mongodb_data:
    driver: local
  mongodb_config:
    driver: local
```

#### Step 3.2: Create `.env.example` for local configuration

```bash
# Component Configuration
COMPONENT_NAME=geographicaddress
RELEASE_NAME=tmf673-dev

# MongoDB Configuration
MONGO_URL=mongodb://mongodb:27017
DB_NAME=tmf

# Application Settings
NODE_ENV=development
PORT=8080

# For production deployments, use one of these instead of MONGO_URL:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/tmf
# DB_URL=mongodb://user:password@host:port/database
```

#### Step 3.3: Update `.dockerignore` to exclude local files

```
node_modules
npm-debug.log
.git
.gitignore
.DS_Store
*.md
.env
.env.local
.vscode
.idea
helm-charts
*.tar.gz
docker-compose.yaml
.dockerignore
combined.log
error.log
```

#### Step 3.4: Create usage documentation

Add to `TMF673_GeographicAddress/README.md`:

```markdown
## Local Development with Docker Compose

### Prerequisites
- Docker Desktop or Docker Engine + Docker Compose
- No need for local Node.js or MongoDB installation

### Quick Start

1. **Start the stack**:
   ```bash
   docker-compose up -d
   ```

2. **View logs**:
   ```bash
   # All services
   docker-compose logs -f

   # Just the API
   docker-compose logs -f geographicaddress

   # Just MongoDB
   docker-compose logs -f mongodb
   ```

3. **Access the API**:
   - API Entrypoint: http://localhost:8080/
   - Swagger UI: http://localhost:8080/docs
   - OpenAPI Spec: http://localhost:8080/api-docs

4. **Stop the stack**:
   ```bash
   docker-compose down
   ```

5. **Reset everything** (including database):
   ```bash
   docker-compose down -v
   ```

### Development Workflow

**Code changes**: Rebuild the container
```bash
docker-compose up -d --build
```

**Database access**:
```bash
# Connect to MongoDB shell
docker exec -it tmf673-mongodb mongosh tmf

# In mongosh:
db.GeographicAddress.find()
db.GeographicSubAddress.find()
```

**Environment variables**: Edit `.env` file (copy from `.env.example`)

### Troubleshooting

**Port conflicts**:
```bash
# Change ports in docker-compose.yaml
ports:
  - "8081:8080"  # Changed from 8080:8080
```

**MongoDB not ready**:
```bash
# Check MongoDB health
docker-compose ps
# Wait for mongodb to show "healthy"
```

**Clear cache**:
```bash
docker-compose down
docker system prune -a
docker-compose up -d --build
```
```

**Benefits**:
- ✅ One-command stack startup
- ✅ Consistent development environment
- ✅ No local MongoDB installation needed
- ✅ Easy database reset for testing
- ✅ Production-like container environment

---

## Phase 2: Architecture Improvements (Next Steps)

### 4. Winston Logger Integration

**Why**: Production-ready logging with levels, rotation, and structured output.

**Implementation Steps**:

#### Step 4.1: Install Winston

```bash
cd TMF673_GeographicAddress
npm install winston
```

#### Step 4.2: Create `logger.js`

```javascript
'use strict';

const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'tmf673-geographicaddress',
    component: process.env.COMPONENT_NAME || 'geographicaddress',
    release: process.env.RELEASE_NAME || 'tmf673'
  },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Combined log file
    new winston.transports.File({
      filename: 'combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'rejections.log' })
  ]
});

// Add console transport for non-production
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Helper methods for common logging patterns
logger.request = (req, meta = {}) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    ...meta
  });
};

logger.response = (res, statusCode, meta = {}) => {
  logger.info('HTTP Response', {
    statusCode,
    ...meta
  });
};

logger.dbOperation = (operation, collection, meta = {}) => {
  logger.debug('Database Operation', {
    operation,
    collection,
    ...meta
  });
};

module.exports = logger;
```

#### Step 4.3: Replace console.log throughout the codebase

**In `index.js`**:
```javascript
const logger = require('./logger');

// Replace:
console.log('Your server is listening on port %d', serverPort);
// With:
logger.info(`Server listening on port ${serverPort}`, { port: serverPort });

// Replace:
console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
// With:
logger.info(`Swagger UI available at http://localhost:${serverPort}/docs`);
```

**In `utils/mongoUtils.js`**:
```javascript
const logger = require('../logger');

// Replace:
console.log('Connecting to MongoDB at:', mongourl);
// With:
logger.info('Connecting to MongoDB', { url: mongourl.replace(/\/\/.*@/, '//<credentials>@') });

// Replace error handling:
catch(Error) {
  console.log(Error)
}
// With:
catch(error) {
  logger.error('MongoDB operation failed', {
    error: error.message,
    stack: error.stack
  });
}
```

**In `utils/entrypoint.js`**:
```javascript
const logger = require('../logger');

catch (error) {
  logger.error('Entrypoint error', { error: error.message, stack: error.stack });
  // ... rest of error handling
}
```

#### Step 4.4: Add log level configuration to values.yaml

```yaml
# helm-charts/tmf673-geographicaddress/values.yaml
geographicaddress:
  # ... existing config

  env:
    LOG_LEVEL: "info"  # debug, info, warn, error
    NODE_ENV: "production"
```

#### Step 4.5: Update deployment to include log level

```yaml
# templates/deployment-geographicaddress.yaml
env:
- name: LOG_LEVEL
  value: {{ .Values.geographicaddress.env.LOG_LEVEL | quote }}
- name: NODE_ENV
  value: {{ .Values.geographicaddress.env.NODE_ENV | quote }}
```

**Benefits**:
- ✅ Structured JSON logging for log aggregation (Elasticsearch, Splunk)
- ✅ Log levels (debug, info, warn, error)
- ✅ Automatic log rotation
- ✅ Exception and rejection handling
- ✅ Production-ready logging infrastructure

---

### 5. Express OpenAPI Validator (Modern Alternative to swagger-tools)

**Why**: `swagger-tools` is deprecated; `express-openapi-validator` is actively maintained with better OpenAPI 3.0 support.

**Note**: This is a more complex migration. Recommended for Phase 2 after completing Phase 1.

**Implementation Overview**:

```bash
npm install express-openapi-validator swagger-ui-express
npm uninstall swagger-tools
```

**Key Changes**:
- Separate Express app setup from OpenAPI validation
- Use `swagger-ui-express` for UI
- Modern middleware pattern

*Detailed implementation available upon request - this requires significant refactoring.*

---

## Summary of Quick Wins

| Improvement | Effort | Impact | Files Changed |
|-------------|--------|--------|---------------|
| Enhanced Entrypoint | Low | High | 2 files (create utils/entrypoint.js, modify index.js) |
| Multi-env MongoDB | Low | High | 2 files (mongoUtils.js, config.json) |
| Docker Compose | Low | High | 1 new file (docker-compose.yaml) |
| Winston Logger | Medium | High | 5+ files (create logger.js, update all modules) |

## Testing Plan

After implementing Phase 1 improvements:

1. **Test Entrypoint**:
   ```bash
   curl http://localhost:8080/ | jq
   # Should return _links with all operations
   ```

2. **Test MongoDB Connection**:
   ```bash
   # Test with different env vars
   MONGODB_URI=mongodb://localhost:27017/tmf npm start
   MONGO_URL=mongodb://localhost:27017/tmf npm start
   DB_URL=mongodb://localhost:27017/tmf npm start
   ```

3. **Test Docker Compose**:
   ```bash
   docker-compose up -d
   curl http://localhost:8080/
   docker-compose logs -f
   docker-compose down
   ```

4. **Test Logging**:
   ```bash
   LOG_LEVEL=debug npm start
   # Check error.log and combined.log files
   tail -f combined.log
   ```

---

## Next Steps

1. **Start with Phase 1 Quick Wins** (1-2 days)
2. **Test thoroughly** with existing functionality
3. **Update Helm charts** if environment variables change
4. **Document** any configuration changes
5. **Proceed to Phase 2** once Phase 1 is stable

Would you like me to implement any of these improvements now?
