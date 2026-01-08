# PII (Personally Identifiable Information) Policy

## Overview

This document outlines the policies and procedures for handling Personally Identifiable Information (PII) in the Tofaş Fen Webapp system.

## Scope

This policy applies to all PII collected, stored, processed, or transmitted by the Tofaş Fen Webapp, including:

- Student information (names, IDs, TCKN, grades, attendance)
- Teacher information (names, IDs, contact details)
- Parent information (names, IDs, contact details)
- Administrative staff information
- Any other personal data collected through the system

## Data Classification

### High Sensitivity PII
- TCKN (Turkish National ID numbers)
- Passwords (hashed)
- Financial information
- Health records
- Disciplinary records

### Medium Sensitivity PII
- Student grades and academic records
- Contact information (email, phone)
- Address information
- Attendance records

### Low Sensitivity PII
- Public announcements
- General academic information (without personal identifiers)
- System usage statistics (anonymized)

## Data Collection

### Principles
1. **Minimal Collection**: Only collect PII that is necessary for system functionality
2. **Purpose Limitation**: Collect PII only for specified, explicit purposes
3. **Consent**: Obtain appropriate consent before collecting PII
4. **Transparency**: Inform users about what data is collected and how it's used

### Collection Methods
- User registration and profile creation
- Academic record entry (grades, attendance)
- Communication logs
- System usage analytics (anonymized)

## Data Storage

### Encryption
- **At Rest**: All PII stored in the database must be encrypted
  - Use MongoDB encryption at rest
  - Encrypt sensitive fields (TCKN, passwords) before storage
  - Use strong encryption algorithms (AES-256)

- **In Transit**: All PII transmitted over networks must be encrypted
  - Use TLS 1.2+ for all API communications
  - Use HTTPS for all web traffic
  - Encrypt database connections

### Access Controls
- Implement role-based access control (RBAC)
- Enforce principle of least privilege
- Require authentication for all PII access
- Log all access to PII

### Storage Locations
- Primary database: MongoDB (encrypted at rest)
- Backup storage: Encrypted backups only
- Log files: Sanitized (no PII in logs)
- Cache: No PII in cache (use tokens/IDs only)

## Data Retention

### Retention Periods
- **Active Student Records**: Retained while student is enrolled + 5 years
- **Graduated Student Records**: Retained for 10 years after graduation
- **Teacher Records**: Retained while employed + 7 years
- **Parent Records**: Retained while child is enrolled + 2 years
- **System Logs**: Retained for 90 days (sanitized)
- **Audit Logs**: Retained for 7 years

### Deletion Procedures
1. **Automated Deletion**: Implement scheduled jobs to delete expired data
2. **Manual Deletion**: Provide admin interface for manual deletion requests
3. **Secure Deletion**: Use secure deletion methods (overwrite, not just delete)
4. **Backup Cleanup**: Remove PII from backups after retention period

## Data Access

### Access Rights
- **Students**: Can access their own records only
- **Teachers**: Can access records of students in their classes
- **Parents**: Can access records of their children only
- **Administrators**: Can access all records (with audit logging)

### Access Logging
- Log all access to PII (who, what, when, why)
- Review access logs regularly
- Alert on suspicious access patterns
- Retain access logs for 7 years

## Data Sharing

### Internal Sharing
- Share PII only with authorized personnel
- Use secure communication channels
- Document all sharing activities

### External Sharing
- **Prohibited**: Do not share PII with external parties without explicit consent
- **Exceptions**: Legal requirements, emergency situations
- **Process**: Require written approval from data protection officer
- **Documentation**: Document all external sharing

## Data Export

### Export Controls
- Limit export functionality to authorized users only
- Encrypt exported files
- Include data classification labels
- Set expiration dates on exported files
- Log all export activities

### Excel/CSV Exports
- Anonymize PII where possible
- Use pseudonyms for sensitive data
- Include only necessary fields
- Encrypt exported files
- Set access controls on exported files

## Security Measures

### Technical Safeguards
- Encryption (at rest and in transit)
- Access controls (RBAC, authentication)
- Audit logging
- Regular security assessments
- Vulnerability scanning
- Penetration testing

### Administrative Safeguards
- Staff training on PII handling
- Regular policy reviews
- Incident response procedures
- Data breach notification procedures

### Physical Safeguards
- Secure server rooms
- Access controls for physical infrastructure
- Secure disposal of hardware containing PII

## Incident Response

### Data Breach Procedures
1. **Detection**: Monitor for unauthorized access
2. **Containment**: Immediately contain the breach
3. **Assessment**: Assess the scope and impact
4. **Notification**: Notify affected users and authorities (within 72 hours)
5. **Remediation**: Fix vulnerabilities and prevent future breaches
6. **Documentation**: Document the incident and response

### Reporting
- Report all PII incidents to data protection officer
- Maintain incident log
- Conduct post-incident reviews

## User Rights

### Right to Access
- Users can request access to their PII
- Provide access within 30 days
- Provide data in machine-readable format

### Right to Rectification
- Users can request correction of inaccurate PII
- Process requests within 30 days
- Verify identity before making changes

### Right to Erasure
- Users can request deletion of their PII
- Process requests within 30 days (subject to retention requirements)
- Verify identity before deletion

### Right to Portability
- Users can request their data in portable format
- Provide data in JSON/CSV format
- Include all user data (subject to access controls)

## Compliance

### Regulations
- Turkish Personal Data Protection Law (KVKK)
- GDPR (for EU users, if applicable)
- Educational data protection regulations

### Audits
- Conduct regular compliance audits
- Document audit findings
- Implement corrective actions
- Review and update policies annually

## Contact

For questions or concerns about PII handling:
- **Data Protection Officer**: [Contact Information]
- **Security Team**: [Contact Information]
- **Privacy Policy**: [Link to Privacy Policy]

## Revision History

- **2024-01-15**: Initial policy document created
- **2024-03-20**: Updated retention periods and encryption requirements

