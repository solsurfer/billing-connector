# TMF673 GeographicAddress - ODA Component Deployment Guide

## Summary

Successfully converted TMF673 Geographic Address Management API to an ODA Component Helm chart following the [TM Forum ODA Component Tutorial](https://tmforum-oda.github.io/oda-ca-docs/docs/ODAComponentTutorial/README.html).

## What Was Done

### 1. Source Code Modifications (Cloud-Native)

Modified the following files in `TMF673_GeographicAddress/`:

#### `utils/mongoUtils.js`
- Added support for `RELEASE_NAME` environment variable
- Updated MongoDB connection to use Kubernetes service naming: `{releaseName}-mongodb`
- Added `DB_HOST` environment variable support
- Added connection logging for debugging

#### `index.js`
- Added entrypoint resource at API root (`/`) for Kubernetes ingress compatibility
- Entrypoint returns component status including name, version, and basePath
- Supports `COMPONENT_NAME` and `RELEASE_NAME` environment variables

#### `Dockerfile`
- Updated from Alpine Linux to Node.js 16 base image (as per tutorial recommendation)
- Removed hardcoded `MONGO_URL` (now set via Kubernetes deployment)
- Added `COMPONENT_NAME` and `RELEASE_NAME` environment variables with defaults

#### `.dockerignore` (New)
- Excludes node_modules, .git, and other unnecessary files from Docker build

### 2. Helm Chart Structure Created

Created complete Helm chart at `helm-charts/tmf673-geographicaddress/`:

```
helm-charts/tmf673-geographicaddress/
├── Chart.yaml                          # Chart metadata
├── values.yaml                         # Configuration parameters
├── README.md                           # Complete documentation
└── templates/
    ├── NOTES.txt                       # Post-installation notes
    ├── component-geographicaddress.yaml  # ODA Component CRD
    ├── deployment-geographicaddress.yaml # API deployment
    ├── service-geographicaddress.yaml    # API service
    ├── deployment-mongodb.yaml           # MongoDB deployment
    ├── service-mongodb.yaml              # MongoDB service
    └── persistentvolumeclaim-mongodb.yaml # MongoDB storage
```

### 3. Key Features Implemented

#### ODA Component Compliance
- ✅ Component CRD with proper metadata (ID: TMFC023)
- ✅ Exposed APIs definition (TMF673 v4)
- ✅ Event notification specification
- ✅ Management function (metrics endpoint)
- ✅ Security function with canvas system role
- ✅ Proper ODA labels on all resources

#### Kubernetes Resources
- ✅ Geographic Address API Deployment with health checks
- ✅ MongoDB Deployment with startup probes
- ✅ Service definitions (NodePort for API, ClusterIP for MongoDB)
- ✅ PersistentVolumeClaim for MongoDB (5Gi default)
- ✅ Resource limits and requests
- ✅ Environment variable injection

#### Cloud-Native Patterns
- ✅ Release name in MongoDB service naming
- ✅ Entrypoint resource at API root
- ✅ Liveness and readiness probes
- ✅ Configurable via values.yaml
- ✅ Multiple instance support through release names

## Next Steps

### Step 1: Build Docker Image

```bash
cd /Users/kirkleibert/Projects/billing-connector/TMF673_GeographicAddress

# Build the image (replace <your-registry> with your actual registry)
docker build -t <your-registry>/tmf673-geographicaddress:4.0.1 .

# Example with Docker Hub
docker build -t yourusername/tmf673-geographicaddress:4.0.1 .

# Example with Azure Container Registry
docker build -t myregistry.azurecr.io/tmf673-geographicaddress:4.0.1 .
```

### Step 2: Push to Container Registry

```bash
# Push the image
docker push <your-registry>/tmf673-geographicaddress:4.0.1

# For Docker Hub, login first if needed
docker login
docker push yourusername/tmf673-geographicaddress:4.0.1

# For Azure Container Registry
az acr login --name myregistry
docker push myregistry.azurecr.io/tmf673-geographicaddress:4.0.1
```

### Step 3: Update Helm Chart Values

Edit `helm-charts/tmf673-geographicaddress/values.yaml`:

```yaml
geographicaddress:
  image:
    repository: <your-registry>/tmf673-geographicaddress  # Update this
    tag: "4.0.1"
```

### Step 4: Install Helm Chart

```bash
cd /Users/kirkleibert/Projects/billing-connector/helm-charts

# Install the chart
helm install tmf673-ga tmf673-geographicaddress/

# Or install in a specific namespace
helm install tmf673-ga tmf673-geographicaddress/ -n oda-components --create-namespace
```

### Step 5: Verify Deployment

```bash
# Check component status
kubectl get components

# Check exposed APIs
kubectl get exposedapis

# Check pods
kubectl get pods -l oda.tmforum.org/componentName=geographicaddress

# Check services
kubectl get svc
```

### Step 6: Access the API

```bash
# Port forward to access locally
kubectl port-forward svc/tmf673-ga-geographicaddress 8080:8080

# Test the entrypoint
curl http://localhost:8080/

# Access Swagger UI in browser
open http://localhost:8080/tmf-api/geographicAddressManagement/v4/docs
```

## File Changes Summary

### Modified Files
- `TMF673_GeographicAddress/utils/mongoUtils.js` - MongoDB connection for Kubernetes
- `TMF673_GeographicAddress/index.js` - Added entrypoint resource
- `TMF673_GeographicAddress/Dockerfile` - Updated to Node 16 base image

### New Files
- `TMF673_GeographicAddress/.dockerignore` - Docker build exclusions
- `helm-charts/tmf673-geographicaddress/Chart.yaml` - Chart metadata
- `helm-charts/tmf673-geographicaddress/values.yaml` - Configuration
- `helm-charts/tmf673-geographicaddress/README.md` - Documentation
- `helm-charts/tmf673-geographicaddress/templates/NOTES.txt` - Post-install notes
- `helm-charts/tmf673-geographicaddress/templates/component-geographicaddress.yaml` - ODA Component CRD
- `helm-charts/tmf673-geographicaddress/templates/deployment-geographicaddress.yaml` - API deployment
- `helm-charts/tmf673-geographicaddress/templates/service-geographicaddress.yaml` - API service
- `helm-charts/tmf673-geographicaddress/templates/deployment-mongodb.yaml` - MongoDB deployment
- `helm-charts/tmf673-geographicaddress/templates/service-mongodb.yaml` - MongoDB service
- `helm-charts/tmf673-geographicaddress/templates/persistentvolumeclaim-mongodb.yaml` - MongoDB PVC

## Configuration Options

### Key Parameters in values.yaml

```yaml
# Component identity
component:
  id: "TMFC023"
  name: "geographicaddress"
  version: "4.0.1"

# API configuration
geographicaddress:
  image:
    repository: your-registry/tmf673-geographicaddress
    tag: "4.0.1"
  service:
    type: NodePort    # or LoadBalancer, ClusterIP
    port: 8080
  replicas: 1
  resources:
    limits:
      cpu: 500m
      memory: 512Mi

# MongoDB configuration
mongodb:
  persistence:
    enabled: true
    size: 5Gi
    storageClass: ""  # Use default or specify
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
```

## Troubleshooting

### Image Pull Errors
- Verify the image repository and tag in values.yaml
- Ensure you've pushed the image to the registry
- Check if the cluster has access to your registry
- Add image pull secrets if using a private registry

### MongoDB Connection Issues
```bash
# Check MongoDB pod status
kubectl get pods -l app=tmf673-ga-mongodb

# View MongoDB logs
kubectl logs -l app=tmf673-ga-mongodb

# Check if MongoDB service is accessible
kubectl get svc tmf673-ga-mongodb
kubectl get endpoints tmf673-ga-mongodb
```

### API Not Responding
```bash
# Check API pod status
kubectl get pods -l app=tmf673-ga-geographicaddress

# View API logs
kubectl logs -l app=tmf673-ga-geographicaddress --tail=100 -f

# Check if probes are passing
kubectl describe pod -l app=tmf673-ga-geographicaddress
```

### PVC Pending
```bash
# Check storage classes available
kubectl get storageclass

# If no default storage class, specify one in values.yaml:
mongodb:
  persistence:
    storageClass: "standard"  # or your storage class name
```

## Testing the Deployment

Once deployed, test the API:

```bash
# 1. Port forward
kubectl port-forward svc/tmf673-ga-geographicaddress 8080:8080

# 2. Test entrypoint (should return component info)
curl http://localhost:8080/

# 3. Test API endpoint (list geographic addresses)
curl http://localhost:8080/tmf-api/geographicAddressManagement/v4/geographicAddress

# 4. Access Swagger UI
open http://localhost:8080/tmf-api/geographicAddressManagement/v4/docs
```

## Additional Resources

- **Helm Chart Documentation**: `helm-charts/tmf673-geographicaddress/README.md`
- **ODA Component Tutorial**: https://tmforum-oda.github.io/oda-ca-docs/docs/ODAComponentTutorial/README.html
- **TMF673 API Specification**: https://www.tmforum.org/resources/specification/tmf673-geographic-address-api-rest-specification-r19-5-0/

## Notes

- The component is configured for development/testing with NodePort service type
- For production, consider using LoadBalancer or Ingress
- MongoDB data is persisted by default (5Gi PVC)
- All environment variables can be overridden in the deployment
- The component follows ODA v1beta3 specification
