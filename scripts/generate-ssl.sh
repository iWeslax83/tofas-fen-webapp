#!/bin/bash

# SSL Certificate Generation Script for TOFAS FEN Web Application
# This script generates self-signed SSL certificates for development/testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SSL_DIR="./nginx/ssl"
DOMAIN=${1:-"localhost"}

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

# Check if OpenSSL is available
check_openssl() {
    if ! command -v openssl &> /dev/null; then
        log_error "OpenSSL is not installed or not in PATH"
        exit 1
    fi
    log_success "OpenSSL is available"
}

# Create SSL directory
create_ssl_directory() {
    log_info "Creating SSL directory..."
    mkdir -p "$SSL_DIR"
    log_success "SSL directory created: $SSL_DIR"
}

# Generate private key
generate_private_key() {
    log_info "Generating private key..."
    openssl genrsa -out "$SSL_DIR/key.pem" 2048
    log_success "Private key generated"
}

# Generate certificate signing request
generate_csr() {
    log_info "Generating certificate signing request..."
    openssl req -new -key "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.csr" -subj "/C=TR/ST=Istanbul/L=Istanbul/O=TOFAS FEN LISESI/OU=IT Department/CN=$DOMAIN"
    log_success "Certificate signing request generated"
}

# Generate self-signed certificate
generate_certificate() {
    log_info "Generating self-signed certificate..."
    openssl x509 -req -days 365 -in "$SSL_DIR/cert.csr" -signkey "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem"
    log_success "Self-signed certificate generated"
}

# Clean up CSR file
cleanup_csr() {
    log_info "Cleaning up temporary files..."
    rm -f "$SSL_DIR/cert.csr"
    log_success "Cleanup completed"
}

# Set proper permissions
set_permissions() {
    log_info "Setting proper permissions..."
    chmod 600 "$SSL_DIR/key.pem"
    chmod 644 "$SSL_DIR/cert.pem"
    log_success "Permissions set"
}

# Verify certificate
verify_certificate() {
    log_info "Verifying certificate..."
    if openssl x509 -in "$SSL_DIR/cert.pem" -text -noout &> /dev/null; then
        log_success "Certificate is valid"
    else
        log_error "Certificate verification failed"
        exit 1
    fi
}

# Show certificate information
show_certificate_info() {
    log_info "Certificate Information:"
    echo ""
    openssl x509 -in "$SSL_DIR/cert.pem" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:)"
    echo ""
    log_info "Certificate files:"
    echo "  Private Key: $SSL_DIR/key.pem"
    echo "  Certificate: $SSL_DIR/cert.pem"
}

# Main execution
main() {
    log_info "Generating SSL certificates for domain: $DOMAIN"
    echo ""
    
    check_openssl
    create_ssl_directory
    generate_private_key
    generate_csr
    generate_certificate
    cleanup_csr
    set_permissions
    verify_certificate
    show_certificate_info
    
    echo ""
    log_success "SSL certificate generation completed successfully!"
    log_warning "Note: This is a self-signed certificate for development/testing purposes."
    log_warning "For production use, please obtain a certificate from a trusted CA."
}

# Run main function
main "$@"
