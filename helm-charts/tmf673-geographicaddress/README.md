# TMF673 Geographic Address Management - ODA Component Helm Chart

This Helm chart deploys the TMF673 Geographic Address Management API as an ODA (Open Digital Architecture) Component on a Kubernetes cluster with an ODA Canvas.

## Overview

**TMF673 Geographic Address Management API** provides a standardized client interface to an Address management system. It allows looking for worldwide addresses and can be used to validate geographic address data.

- **API Version**: 4.0.1
- **TM Forum API**: TMF673
- **Functional Block**: CoreCommerce

## Prerequisites

- Kubernetes cluster with ODA Canvas installed
- kubectl configured to access your cluster
- Helm 3.x installed
- Docker for building the container image
- Access to a container registry (Docker Hub, ACR, GCR, etc.)

## Building the Docker Image

Before deploying the Helm chart, you need to build and push the Docker image:

```bash
# Navigate to the TMF673 source directory
cd /Users/kirkleibert/Projects/billing-connector/TMF673_GeographicAddress

# Build the Docker image
docker build -t <your-registry>/tmf673-geographicaddress:4.0.1 .

# Push to your registry
docker push <your-registry>/tmf673-geographicaddress:4.0.1

# If pushing all tags
docker push <your-registry>/tmf673-geographicaddress --all-tags
```

## Configuration

### Update values.yaml

Before installing, update the `values.yaml` file with your container registry details:

```yaml
geographicaddress:
  image:
    repository: <your-registry>/tmf673-geographicaddress
    tag: "4.0.1"
```

### Key Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `component.name` | ODA Component name | `geographicaddress` |
| `component.version` | Component version | `4.0.1` |
| `geographicaddress.image.repository` | Container image repository | `your-registry/tmf673-geographicaddress` |
| `geographicaddress.image.tag` | Container image tag | `4.0.1` |
| `geographicaddress.service.type` | Kubernetes service type | `NodePort` |
| `geographicaddress.service.port` | Service port | `8080` |
| `geographicaddress.replicas` | Number of replicas | `1` |
| `mongodb.persistence.enabled` | Enable persistent storage for MongoDB | `true` |
| `mongodb.persistence.size` | MongoDB PVC size | `5Gi` |
| `mongodb.persistence.storageClass` | Storage class for MongoDB PVC | `""` |

## Installation

### Install the Helm Chart

```bash
# Navigate to the helm charts directory
cd /Users/kirkleibert/Projects/billing-connector/helm-charts

# Install the chart
helm install tmf673-ga tmf673-geographicaddress/

# Or install with a custom release name
helm install <release-name> tmf673-geographicaddress/

# Install in a specific namespace
helm install tmf673-ga tmf673-geographicaddress/ -n oda-components --create-namespace
```

### Verify Installation

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

## Accessing the API

### Using Port Forward

```bash
# Forward port 8080 to your local machine
kubectl port-forward svc/tmf673-ga-geographicaddress 8080:8080

# Access the API
curl http://localhost:8080/

# Access Swagger UI
open http://localhost:8080/tmf-api/geographicAddressManagement/v4/docs
```

### Using NodePort (if service type is NodePort)

```bash
# Get the NodePort
kubectl get svc tmf673-ga-geographicaddress

# Access via Node IP and NodePort
curl http://<node-ip>:<node-port>/
```

## API Endpoints

The component exposes the following main endpoints:

- **Base Path**: `/tmf-api/geographicAddressManagement/v4/`
- **Swagger UI**: `/tmf-api/geographicAddressManagement/v4/docs`
- **API Root**: `/` (returns component status)

### Key Resources

- `GET /geographicAddress` - List or find GeographicAddress objects
- `GET /geographicAddress/{id}` - Retrieve a GeographicAddress by ID
- `GET /geographicSubAddress` - List or find GeographicSubAddress objects
- `POST /geographicAddressValidation` - Create a GeographicAddressValidation
- `GET /geographicAddressValidation` - List GeographicAddressValidation objects
- `GET /geographicAddressValidation/{id}` - Retrieve a GeographicAddressValidation
- `PATCH /geographicAddressValidation/{id}` - Update a GeographicAddressValidation
- `DELETE /geographicAddressValidation/{id}` - Delete a GeographicAddressValidation

## ODA Component Details

This component follows the TM Forum ODA Component specification and includes:

### Core Function
- **Exposed APIs**: TMF673 Geographic Address Management v4
- **Dependent APIs**: None

### Event Notification
- GeographicAddressValidationCreateEvent
- GeographicAddressValidationStateChangeEvent
- GeographicAddressValidationDeleteEvent

### Management Function
- Prometheus metrics endpoint (planned)

### Security Function
- Canvas system role integration

## Upgrading

```bash
# Upgrade the release
helm upgrade tmf673-ga tmf673-geographicaddress/

# Upgrade with new values
helm upgrade tmf673-ga tmf673-geographicaddress/ -f custom-values.yaml
```

## Uninstalling

```bash
# Uninstall the release
helm uninstall tmf673-ga

# Uninstall and delete PVCs
helm uninstall tmf673-ga
kubectl delete pvc tmf673-ga-mongodb-pvc
```

## Troubleshooting

### Check Logs

```bash
# View GeographicAddress API logs
kubectl logs -l app=tmf673-ga-geographicaddress --tail=100 -f

# View MongoDB logs
kubectl logs -l app=tmf673-ga-mongodb --tail=100 -f
```

### Common Issues

1. **Image Pull Errors**: Ensure the image repository and tag are correct in `values.yaml`
2. **MongoDB Connection Issues**: Check that the MongoDB pod is running and ready
3. **PVC Pending**: Verify that your cluster has a default storage class or specify one in `values.yaml`

### Debug Commands

```bash
# Describe the component
kubectl describe component tmf673-ga-geographicaddress

# Check pod status
kubectl describe pod -l app=tmf673-ga-geographicaddress

# Check service endpoints
kubectl get endpoints tmf673-ga-geographicaddress
```

## Development

### Source Code Modifications

The source code has been modified for cloud-native deployment:

1. **MongoDB Connection**: Updated to use Kubernetes service naming with release name
2. **Environment Variables**: Added support for `COMPONENT_NAME` and `RELEASE_NAME`
3. **Entrypoint Resource**: Added root path endpoint for Kubernetes ingress compatibility

### Dockerfile

The Dockerfile has been updated to:
- Use Node.js 16 base image
- Set default environment variables for local testing
- Expose port 8080

## Resources

- [TM Forum ODA Component Tutorial](https://tmforum-oda.github.io/oda-ca-docs/docs/ODAComponentTutorial/README.html)
- [TMF673 API Specification](https://www.tmforum.org/resources/specification/tmf673-geographic-address-api-rest-specification-r19-5-0/)
- [ODA Canvas Documentation](https://tmforum-oda.github.io/oda-ca-docs/)

## License

This implementation follows the TM Forum licensing guidelines.

## Support

For issues and questions:
- Review the [ODA Canvas documentation](https://tmforum-oda.github.io/oda-ca-docs/)
- Check the [TM Forum community forums](https://www.tmforum.org/)
