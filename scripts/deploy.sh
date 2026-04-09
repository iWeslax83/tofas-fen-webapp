#!/bin/bash

# TOFAS FEN Web Application Deployment Script
# Usage: ./scripts/deploy.sh [command]

# Strict mode (I-H13): fail on any error, undefined variable, or failed pipe.
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="tofas-fen-webapp"
DOCKER_COMPOSE_FILE="docker-compose.yml"
K8S_NAMESPACE="tofas-fen"
ENVIRONMENT=${2:-production}

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    log_success "All dependencies are available"
}

build_images() {
    log_info "Building Docker images..."
    
    # Build frontend
    log_info "Building frontend image..."
    docker-compose -f $DOCKER_COMPOSE_FILE build frontend
    
    # Build backend
    log_info "Building backend image..."
    docker-compose -f $DOCKER_COMPOSE_FILE build backend
    
    log_success "All images built successfully"
}

deploy_docker() {
    log_info "Deploying with Docker Compose..."
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f $DOCKER_COMPOSE_FILE down
    
    # Start services
    log_info "Starting services..."
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose -f $DOCKER_COMPOSE_FILE --profile production up -d
    else
        docker-compose -f $DOCKER_COMPOSE_FILE up -d
    fi
    
    log_success "Deployment completed successfully"
}

deploy_k8s() {
    log_info "Deploying to Kubernetes..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Apply Kubernetes manifests
    log_info "Applying Kubernetes manifests..."
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/secret.yaml
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/services.yaml
    kubectl apply -f k8s/backend-deployment.yaml
    kubectl apply -f k8s/frontend-deployment.yaml
    kubectl apply -f k8s/ingress.yaml
    kubectl apply -f k8s/hpa.yaml
    
    log_success "Kubernetes deployment completed"
}

check_health() {
    log_info "Checking application health..."
    
    # Wait for services to be ready
    sleep 30
    
    # Check frontend
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_success "Frontend is healthy"
    else
        log_warning "Frontend health check failed"
    fi
    
    # Check backend
    if curl -f http://localhost:3001/health &> /dev/null; then
        log_success "Backend is healthy"
    else
        log_warning "Backend health check failed"
    fi
    
    # Check database
    if docker-compose -f $DOCKER_COMPOSE_FILE exec -T mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        log_success "Database is healthy"
    else
        log_warning "Database health check failed"
    fi
}

show_status() {
    log_info "Application Status:"
    echo ""
    
    # Docker Compose status
    docker-compose -f $DOCKER_COMPOSE_FILE ps
    
    echo ""
    log_info "Service URLs:"
    echo "Frontend: http://localhost:3000"
    echo "Backend API: http://localhost:3001"
    echo "Database: mongodb://localhost:27017"
    echo "Redis: redis://localhost:6379"
}

show_logs() {
    log_info "Showing application logs..."
    docker-compose -f $DOCKER_COMPOSE_FILE logs -f
}

backup_data() {
    log_info "Creating database backup..."

    BACKUP_DIR="./backups"
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).tar.gz"

    mkdir -p "$BACKUP_DIR"

    # I-H15: previously this command's exit code was ignored because mongodump
    # ran inside a redirection (the redirection itself always succeeds even if
    # the command fails). Capture the pipe exit status explicitly.
    if ! docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T mongodb \
            mongodump --archive --gzip > "$BACKUP_DIR/$BACKUP_FILE"; then
        log_error "mongodump failed — backup not created"
        rm -f "$BACKUP_DIR/$BACKUP_FILE"
        exit 1
    fi

    # Refuse to treat an empty file as a valid backup.
    if [ ! -s "$BACKUP_DIR/$BACKUP_FILE" ]; then
        log_error "Backup file is empty; mongodump likely failed silently"
        rm -f "$BACKUP_DIR/$BACKUP_FILE"
        exit 1
    fi

    log_success "Backup created: $BACKUP_DIR/$BACKUP_FILE"
}

restore_data() {
    local backup_file="${2:-}"

    if [ -z "$backup_file" ]; then
        log_error "Please provide backup file path"
        exit 1
    fi

    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi

    # I-H14: destructive action — require an explicit typed confirmation before
    # overwriting the database. Skip with FORCE=1 for automation.
    if [ "${FORCE:-0}" != "1" ]; then
        log_warning "This will OVERWRITE the current database with: $backup_file"
        read -r -p "Type 'yes' to continue: " confirm
        if [ "$confirm" != "yes" ]; then
            log_info "Restore cancelled"
            exit 0
        fi
    fi

    log_info "Restoring from backup: $backup_file"

    if ! docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T mongodb \
            mongorestore --archive --gzip --drop < "$backup_file"; then
        log_error "mongorestore failed"
        exit 1
    fi

    log_success "Data restored successfully"
}

cleanup() {
    log_info "Cleaning up..."
    
    # Remove unused containers and images
    docker system prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    log_success "Cleanup completed"
}

# Main script logic (set -u requires the default branch)
case "${1:-}" in
    "build")
        check_dependencies
        build_images
        ;;
    "deploy")
        check_dependencies
        build_images
        deploy_docker
        check_health
        show_status
        ;;
    "deploy-k8s")
        deploy_k8s
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "backup")
        backup_data
        ;;
    "restore")
        restore_data "$@"
        ;;
    "cleanup")
        cleanup
        ;;
    "stop")
        log_info "Stopping application..."
        docker-compose -f $DOCKER_COMPOSE_FILE down
        log_success "Application stopped"
        ;;
    "restart")
        log_info "Restarting application..."
        docker-compose -f $DOCKER_COMPOSE_FILE restart
        log_success "Application restarted"
        ;;
    *)
        echo "Usage: $0 {build|deploy|deploy-k8s|status|logs|backup|restore|cleanup|stop|restart}"
        echo ""
        echo "Commands:"
        echo "  build       - Build Docker images"
        echo "  deploy      - Deploy application with Docker Compose"
        echo "  deploy-k8s  - Deploy application to Kubernetes"
        echo "  status      - Show application status"
        echo "  logs        - Show application logs"
        echo "  backup      - Create database backup"
        echo "  restore     - Restore from backup"
        echo "  cleanup     - Clean up unused Docker resources"
        echo "  stop        - Stop application"
        echo "  restart     - Restart application"
        exit 1
        ;;
esac
