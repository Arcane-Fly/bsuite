> **ARCHIVED** — Pre-BSuite donor document (2024-02-20). Requirements have been superseded by `docs/00-master-roadmap.md` and `docs/20260301-crm7-rbac-matrix-v1.00W.md`. Do not treat as authoritative.

# Requirements Traceability Matrix

_Last Modified: 2024-02-20_
_Version: 1.0.0_

## Core Requirements

| ID      | Requirement                   | Priority | Status      | Dependencies     | Verification     | Target Date |
| ------- | ----------------------------- | -------- | ----------- | ---------------- | ---------------- | ----------- |
| REQ-001 | Apprentice profile management | High     | In Progress | None             | System Test      | 2024-Q2     |
| REQ-002 | Host employer management      | High     | In Progress | None             | System Test      | 2024-Q2     |
| REQ-003 | Training contract tracking    | High     | Not Started | REQ-001          | Integration Test | 2024-Q2     |
| REQ-004 | Timesheet processing          | High     | Not Started | REQ-001, REQ-002 | User Test        | 2024-Q2     |
| REQ-005 | Compliance monitoring         | High     | Not Started | REQ-001, REQ-002 | Audit            | 2024-Q3     |

## Financial Requirements

| ID      | Requirement                 | Priority | Status      | Dependencies     | Verification     | Target Date |
| ------- | --------------------------- | -------- | ----------- | ---------------- | ---------------- | ----------- |
| FIN-001 | Payroll integration         | High     | Not Started | REQ-004          | Integration Test | 2024-Q2     |
| FIN-002 | Host billing                | High     | Not Started | REQ-004          | System Test      | 2024-Q2     |
| FIN-003 | Government funding tracking | Medium   | Not Started | REQ-001          | Audit            | 2024-Q3     |
| FIN-004 | Financial reporting         | Medium   | Not Started | FIN-001, FIN-002 | User Test        | 2024-Q3     |

## Technical Requirements

| ID       | Requirement               | Priority | Status      | Dependencies | Verification     | Target Date |
| -------- | ------------------------- | -------- | ----------- | ------------ | ---------------- | ----------- |
| TECH-001 | User authentication       | High     | In Progress | None         | Security Audit   | 2024-Q2     |
| TECH-002 | Role-based access control | High     | Not Started | TECH-001     | Security Audit   | 2024-Q2     |
| TECH-003 | Data encryption           | High     | Not Started | None         | Security Audit   | 2024-Q2     |
| TECH-004 | API integration           | Medium   | Not Started | None         | Integration Test | 2024-Q3     |

## Compliance Requirements

| ID       | Requirement          | Priority | Status      | Dependencies | Verification   | Target Date |
| -------- | -------------------- | -------- | ----------- | ------------ | -------------- | ----------- |
| COMP-001 | Document management  | High     | Not Started | REQ-001      | Audit          | 2024-Q2     |
| COMP-002 | Audit logging        | High     | Not Started | None         | System Test    | 2024-Q2     |
| COMP-003 | Compliance reporting | High     | Not Started | COMP-001     | Audit          | 2024-Q3     |
| COMP-004 | Privacy compliance   | High     | Not Started | TECH-003     | Security Audit | 2024-Q2     |

## UI Requirements

| ID     | Requirement              | Priority | Status      | Dependencies | Verification        | Target Date |
| ------ | ------------------------ | -------- | ----------- | ------------ | ------------------- | ----------- |
| UI-001 | Responsive design        | High     | In Progress | None         | User Test           | 2024-Q2     |
| UI-002 | Mobile compatibility     | High     | Not Started | UI-001       | User Test           | 2024-Q2     |
| UI-003 | Accessibility compliance | High     | Not Started | UI-001       | Accessibility Audit | 2024-Q2     |
| UI-004 | Performance optimization | Medium   | Not Started | None         | Performance Test    | 2024-Q3     |

## Integration Requirements

| ID      | Requirement                   | Priority | Status      | Dependencies | Verification     | Target Date |
| ------- | ----------------------------- | -------- | ----------- | ------------ | ---------------- | ----------- |
| INT-001 | Payroll system integration    | High     | Not Started | FIN-001      | Integration Test | 2024-Q2     |
| INT-002 | Government portal integration | Medium   | Not Started | TECH-004     | Integration Test | 2024-Q3     |
| INT-003 | RTO system integration        | Medium   | Not Started | TECH-004     | Integration Test | 2024-Q3     |
| INT-004 | Banking integration           | Low      | Not Started | FIN-001      | Integration Test | 2024-Q4     |

## Verification Methods

- **System Test**: Functional testing of system components
- **Integration Test**: Testing of system integrations
- **User Test**: User acceptance testing
- **Security Audit**: Security testing and compliance verification
- **Performance Test**: Load and performance testing
- **Accessibility Audit**: WCAG compliance testing
- **Audit**: Compliance and regulatory audit

## Status Definitions

- **Not Started**: Requirement not yet implemented
- **In Progress**: Currently being implemented
- **Completed**: Implementation finished and verified
- **On Hold**: Implementation paused
- **Blocked**: Cannot proceed due to dependencies

## Priority Levels

- **High**: Critical for system operation
- **Medium**: Important but not critical
- **Low**: Desirable but can be deferred
