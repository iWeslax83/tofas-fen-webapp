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
# Args in any order: a bare hostname sets the domain, --force regenerates.
DOMAIN="localhost"
FORCE=0
for arg in "$@"; do
    case "$arg" in
        --force) FORCE=1 ;;
        *) DOMAIN="$arg" ;;
    esac
done

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

# Generate self-signed certificate directly from the key.
# One-shot `req -x509` (no separate CSR) so we can attach a subjectAltName in a
# single command that works on OpenSSL 1.1.1+ — browsers and many clients reject
# a cert whose hostname is only in the CN with no SAN.
generate_certificate() {
    log_info "Generating self-signed certificate..."
    # Always cover localhost + loopback; add the requested domain only when it
    # is something else, so the SAN has no duplicate entry.
    local san="DNS:localhost,IP:127.0.0.1"
    if [ "$DOMAIN" != "localhost" ]; then
        san="DNS:$DOMAIN,$san"
    fi
    openssl req -x509 -new -key "$SSL_DIR/key.pem" -days 365 \
        -out "$SSL_DIR/cert.pem" \
        -subj "/C=TR/ST=Istanbul/L=Istanbul/O=TOFAS FEN LISESI/OU=IT Department/CN=$DOMAIN" \
        -addext "subjectAltName=$san"
    log_success "Self-signed certificate generated"
}

# Generate Diffie-Hellman parameters. nginx.conf references ssl_dhparam and will
# refuse to start without this file, so it must be produced alongside the cert.
generate_dhparam() {
    log_info "Generating DH parameters (2048-bit; this can take a minute)..."
    openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048
    log_success "DH parameters generated"
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
    check_openssl
    create_ssl_directory

    # Idempotent: these files are gitignored and generated locally, so a plain
    # re-run (e.g. from a setup step) must not clobber a cert you're already
    # serving. Pass --force to regenerate.
    if [ "$FORCE" -eq 0 ] &&
       [ -f "$SSL_DIR/key.pem" ] && [ -f "$SSL_DIR/cert.pem" ] && [ -f "$SSL_DIR/dhparam.pem" ]; then
        log_success "SSL material already present in $SSL_DIR (pass --force to regenerate)"
        return 0
    fi

    log_info "Generating SSL certificates for domain: $DOMAIN"
    echo ""

    generate_private_key
    generate_certificate
    generate_dhparam
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
