> **ARCHIVED** — Pre-BSuite donor document (2024-05-18). Navigation structure has been superseded by `docs/navigation-guide.md` and per-project routing. Do not treat as authoritative.

# Navigation Structure

## Overview

The navigation system is built with accessibility and usability as core principles, following WCAG 2.1 guidelines. All components are keyboard navigable and screen reader friendly.

> **Recent Improvements**: For details on recent navigation enhancements, see [Navigation Improvements](./progress/navigation-improvements.md)

### Content Reflow Behavior

The sidebar is designed to reflow content rather than overlay it when expanded. This ensures that users can always see the main content area, even when the navigation sidebar is open. The implementation uses:

- CSS transitions for smooth animations
- Responsive margin adjustments based on sidebar state
- Shadow effects to visually separate the sidebar from content
- Proper ARIA attributes for accessibility

### Sub-page Navigation

The navigation system supports sub-pages through query parameters. When a user clicks on a sub-item in the sidebar, the application navigates to the appropriate page with a query parameter that determines which content to display. This approach allows for:

- Consistent URL structure
- Easy bookmarking of specific sub-pages
- Smooth transitions between different content views
- Maintaining navigation state across page refreshes

### Action Buttons

Each section includes relevant action buttons (e.g., "Add Course", "Add Employee") that allow users to perform common tasks directly from the interface. These buttons:

- Use consistent styling for easy recognition
- Include clear, action-oriented labels
- Provide visual feedback on hover and focus
- Are positioned prominently for easy access
- Trigger appropriate modals or navigation to form pages

## Components

### MainNavigation (`components/navigation/MainNavigation.tsx`)

- Implements top-level navigation
- ARIA roles and labels for accessibility
- Keyboard navigation support
- Visual and screen reader feedback for active states
- Tooltips for additional context
- Responsive design for all screen sizes

### SubNavigation (`components/navigation/SubNavigation.tsx`)

- Context-aware secondary navigation
- Hierarchical structure with accordion panels
- ARIA landmarks and labels
- Keyboard focus management
- Motion animations with reduced motion support

### QuickAccess (`components/navigation/QuickAccess.tsx`)

- Global search with keyboard shortcuts
- Recent items tracking
- Favorites management
- Quick create actions
- Notification center
- Screen reader announcements for updates

## Top Navigation (Main Areas)

### 1. Dashboard

Primary overview and quick access to key metrics

- Accessible shortcuts: Alt+D
- Screen reader landmarks
- Live region updates for metrics

#### Dashboard Subcategories

- Overview
  - User-configurable widgets
  - Role-based metric visibility
  - Real-time data updates
  - Status summaries
- Quick Actions
  - Contextual action buttons
  - Most used functions
  - Recent activity shortcuts
- Recent Activities
  - Chronological activity log
  - Filterable by type/category
  - User activity tracking
  - System notifications
- Notifications
  - Priority-based notification sorting
  - Read/unread status management
  - Action-required indicators
  - Notification preferences
- Alerts & Reminders
  - Due date notifications
  - Compliance alerts
  - Document expiry warnings
  - Follow-up reminders
- Key Metrics
  - Performance indicators
  - Financial summaries
  - Compliance status
  - Utilization rates
- Task List
  - Assigned tasks
  - Due dates and priorities
  - Task completion tracking
  - Task delegation options
- Calendar View
  - Appointment scheduling
  - Training calendar integration
  - Multi-view options (day/week/month)
  - Event categorization and filtering

### 2. Client Management

Client relationship and account management

- Contact information access
- Communication logs
- Relationship tracking

#### Client Management Subcategories

- Client Directory
  - Searchable client database
  - Quick profile access
  - Active/inactive filtering
  - Bulk action capabilities
- Host Employers
  - Host employer profiles
  - Capacity management
  - Compliance tracking
  - Site visit scheduling
- Client Contacts
  - Contact role management
  - Communication preferences
  - Relationship hierarchy
  - Contact history
- Account Management
  - Service agreements
  - Account status
  - Review schedules
  - Account manager assignment
- Service Agreements
  - Agreement templates
  - Version tracking
  - Renewal management
  - Special terms tracking
- Client Communications
  - Communication history
  - Template-based messaging
  - Bulk communication tools
  - Response tracking
- Visit Reports
  - Site visit documentation
  - Follow-up action tracking
  - Photo/document attachments
  - Compliance verification
- Client Requirements
  - Specific client needs
  - Skill requirements
  - Compliance requirements
  - Special conditions
- Placement History
  - Historical placement records
  - Performance summaries
  - Placement duration metrics
  - Rotation planning
- Client Documents
  - Document repository
  - Version control
  - Access permissions
  - Expiry date tracking
- Feedback & Surveys
  - Client satisfaction tracking
  - Survey administration
  - Feedback analysis
  - Improvement action tracking
- Support Tickets
  - Issue tracking system
  - Resolution workflows
  - Priority assignment
  - SLA monitoring
- Client Portal
  - Portal access management
  - Usage analytics
  - Feature enablement
  - Self-service configuration
- Opportunity Pipeline
  - New business tracking
  - Opportunity stages
  - Win/loss analysis
  - Revenue forecasting
- Client Analytics
  - Service utilization metrics
  - Financial performance
  - Growth trends
  - Benchmark comparisons

### 3. Human Resources

HR operations and employee management

- Privacy controls
- Form validation
- Accessible data tables

#### Human Resources Subcategories

- Employees
  - Comprehensive employee profiles
  - Status management (active/inactive)
  - Employment type filtering
  - Bulk action capabilities
- Apprentices & Trainees
  - Training contract management
  - Progress tracking
  - Host placement management
  - Qualification progress
  - Training plan monitoring
  - Contract variation handling
  - Probation management
- Labour Hire Workers
  - Availability management
  - Skills matching
  - Compliance documentation
  - Placement tracking
  - Site-specific credentials
- Candidates
  - Applicant tracking
  - Assessment management
  - Interview scheduling
  - Reference checking
  - Onboarding workflow
- Job Postings
  - Vacancy creation
  - Multi-channel publishing
  - Applicant management
  - Position requirements
- Recruitment
  - Recruitment pipeline
  - Screening workflows
  - Assessment tools
  - Candidate communications
- Onboarding
  - Onboarding checklists
  - Document collection
  - Training scheduling
  - Induction management
- Performance Reviews
  - Review templates
  - Scheduling system
  - Goal setting and tracking
  - Rating frameworks
- Leave Management
  - Leave request workflow
  - Balance tracking
  - Calendar integration
  - Approval hierarchies
- Training Records
  - Training history
  - Certification tracking
  - Expiry monitoring
  - Training needs analysis
- Employee Documents
  - Document repository
  - Version control
  - Document templates
  - Electronic signing
- Benefits Administration
  - Benefits enrollment
  - Eligibility tracking
  - Cost management
  - Claims administration
- Disciplinary Actions
  - Incident recording
  - Action tracking
  - Resolution documentation
  - Appeal management
- Exit Management
  - Offboarding checklists
  - Exit interviews
  - Asset recovery
  - Knowledge transfer
- HR Reports
  - Standard HR reporting
  - Custom report builder
  - Compliance reporting
  - Workforce analytics
- Organization Chart
  - Hierarchical visualization
  - Position management
  - Reporting relationships
  - Vacancy highlighting
- Position Management
  - Job descriptions
  - Position budgeting
  - Vacancy tracking
  - Position history
- Succession Planning
  - Talent identification
  - Development planning
  - Readiness assessment
  - Risk mitigation

### 4. Training & Development

Training program management and development tracking

- Role-based access control
- Progress indicators
- Status announcements

#### Training & Development Subcategories

- Apprentices
  - Contract management
  - Qualification tracking
  - Unit enrollment
  - Progress monitoring
- Trainees
  - Trainee management
  - Progress tracking
  - Assessment scheduling
  - Completion certification
- Course Catalog
  - Available qualifications
  - Unit of competency library
  - Course details and requirements
  - Delivery modes
- Training Calendar
  - Scheduled training
  - Booking management
  - Resource allocation
  - Training notifications
- Assessments
  - Assessment scheduling
  - Results recording
  - Competency tracking
  - Assessment validation
- Certifications
  - Certification issuance
  - Verification system
  - Expiry management
  - Certification history
- Skills Matrix
  - Skill categorization
  - Proficiency levels
  - Gap analysis
  - Development planning
- Training Records
  - Historical training data
  - Attendance tracking
  - Completion status
  - Evidence management
- Learning Plans
  - Individual development plans
  - Goal setting
  - Progress monitoring
  - Review scheduling
- Training Resources
  - Learning materials management
  - Resource library
  - Access permissions
  - Usage analytics
- Competency Tracking
  - Industry standards alignment
  - Competency assessment
  - Recognition of prior learning
  - Skill validation
- Qualification Framework
  - Qualification structure management
  - Packaging rules
  - Elective options
  - Qualification pathways
- Training Providers
  - RTO management
  - Provider performance
  - Agreement management
  - Compliance verification
- Workshop Schedule
  - Workshop planning
  - Attendance management
  - Venue allocation
  - Trainer assignment

### 5. Safety & WHS

Workplace health and safety management

- Emergency access shortcuts
- High contrast mode support
- Critical information highlighting

#### Safety & WHS Subcategories

- Incident Reports
  - Incident recording
  - Investigation tracking
  - Corrective actions
  - Regulatory reporting
- Hazard Register
  - Hazard identification
  - Risk assessment
  - Control measures
  - Review scheduling
- Safety Audits
  - Audit scheduling
  - Checklist management
  - Finding documentation
  - Action tracking
- Risk Assessments
  - Risk identification
  - Risk evaluation
  - Control implementation
  - Monitoring and review
- Safety Documents
  - Policy repository
  - Procedure library
  - Safe work methods
  - Version control
- PPE Management
  - Equipment inventory
  - Issuance tracking
  - Maintenance schedules
  - Replacement forecasting
- Safety Training
  - Training requirements
  - Completion tracking
  - Refresher scheduling
  - Competency verification
- Emergency Procedures
  - Procedure documentation
  - Role assignments
  - Drill scheduling
  - Emergency contacts
- Safety Meetings
  - Meeting scheduling
  - Attendance tracking
  - Minute recording
  - Action assignment
- Inspection Reports
  - Inspection checklists
  - Finding documentation
  - Photo evidence
  - Corrective actions
- Safety Statistics
  - Incident rates
  - Injury metrics
  - Trend analysis
  - Benchmark comparisons
- Compliance Calendar
  - Regulatory deadlines
  - Audit schedules
  - Review dates
  - Certification renewals
- Safety Alerts
  - Alert creation
  - Distribution management
  - Acknowledgment tracking
  - Alert archive
- Return to Work
  - Case management
  - Treatment plans
  - Modified duties
  - Progress tracking

### 6. Payroll & Finance

Financial operations and payroll management

- Secure access controls
- Data validation feedback
- Error prevention mechanisms

#### Payroll & Finance Subcategories

- Payroll Processing
  - Pay run management
  - Processing schedules
  - Approval workflows
  - Pay slip generation
- Timesheets
  - Timesheet submission
  - Approval processes
  - Exception handling
  - Integration with awards
- Award Rates
  - Award interpretation
  - Pay level management
  - Rate progression
  - Allowance configuration
- Allowances
  - Allowance types
  - Calculation methods
  - Eligibility rules
  - Payment scheduling
- Deductions
  - Statutory deductions
  - Voluntary deductions
  - Deduction authorities
  - Pre/post-tax handling
- Superannuation
  - Fund management
  - Contribution calculation
  - Payment processing
  - Compliance reporting
- Tax Management
  - Tax scale application
  - PAYG withholding
  - Tax file declarations
  - Year-end processing
- Expense Claims
  - Claim submission
  - Receipt management
  - Approval workflows
  - Reimbursement processing
- Invoicing
  - Invoice generation
  - Delivery management
  - Payment tracking
  - Reminder system
- Payment History
  - Transaction recording
  - Payment reconciliation
  - Audit trail
  - Historical reporting
- Funding Claims
  - Eligibility assessment
  - Claim preparation
  - Submission tracking
  - Payment reconciliation
- Budget Tracking
  - Budget allocation
  - Expense monitoring
  - Variance analysis
  - Forecast updates
- Financial Reports
  - Standard financial reports
  - Custom report builder
  - Compliance reporting
  - Performance analytics
- Bank Reconciliation
  - Transaction matching
  - Exception handling
  - Reconciliation approval
  - Audit trail
- Cost Centers
  - Cost center structure
  - Allocation rules
  - Performance tracking
  - Profitability analysis

### 7. Marketing & Sales

Marketing campaigns and sales operations

- Campaign analytics
- Lead tracking
- Performance metrics

#### Marketing & Sales Subcategories

- Campaigns
  - Campaign planning
  - Execution management
  - Performance tracking
  - Budget monitoring
- Lead Management
  - Lead capture
  - Qualification process
  - Assignment rules
  - Conversion tracking
- Sales Pipeline
  - Opportunity stages
  - Probability assessment
  - Forecasting tools
  - Activity tracking
- Marketing Calendar
  - Activity scheduling
  - Resource allocation
  - Event planning
  - Deadline management
- Email Marketing
  - Template management
  - List segmentation
  - Campaign automation
  - Performance analytics
- Social Media
  - Content calendar
  - Post scheduling
  - Engagement tracking
  - Campaign integration
- Website Analytics
  - Traffic analysis
  - Conversion tracking
  - User behavior
  - Performance reporting
- Event Management
  - Event planning
  - Registration processing
  - Attendance tracking
  - Follow-up management
- Marketing Materials
  - Asset library
  - Version control
  - Usage tracking
  - Distribution management
- Competitor Analysis
  - Competitor profiles
  - Strength/weakness assessment
  - Market positioning
  - Strategy development
- Market Research
  - Research projects
  - Data collection
  - Analysis tools
  - Insight reporting
- ROI Tracking
  - Investment tracking
  - Return calculation
  - Attribution modeling
  - Performance comparison
- Campaign Analytics
  - Performance metrics
  - A/B testing
  - Conversion analysis
  - Channel effectiveness
- Brand Assets
  - Brand guidelines
  - Asset repository
  - Usage policies
  - Approval workflows

### 8. Compliance & Quality

Compliance monitoring and quality assurance

- Audit trails
- Document verification
- Status tracking

#### Compliance & Quality Subcategories

- Compliance Dashboard
  - Compliance overview
  - Risk indicators
  - Action items
  - Deadline tracking
- Audit Management
  - Audit scheduling
  - Checklist creation
  - Finding documentation
  - Corrective action tracking
- Document Control
  - Version management
  - Approval workflows
  - Distribution control
  - Access permissions
- Quality Metrics
  - Performance indicators
  - Quality scoring
  - Trend analysis
  - Benchmarking
- Standards & Regulations
  - Regulatory framework
  - Standard requirements
  - Compliance mapping
  - Updates and changes
- Compliance Training
  - Training requirements
  - Completion tracking
  - Refresher scheduling
  - Competency verification
- Corrective Actions
  - Issue tracking
  - Action assignment
  - Implementation monitoring
  - Effectiveness review
- Policy Management
  - Policy development
  - Approval workflows
  - Distribution tracking
  - Review scheduling
- License Management
  - License registry
  - Renewal tracking
  - Compliance verification
  - Holder management
- Compliance Reports
  - Regulatory reporting
  - Audit documentation
  - Status reporting
  - Non-compliance tracking
- Quality Reviews
  - Review scheduling
  - Assessment frameworks
  - Finding documentation
  - Improvement planning
- Risk Register
  - Risk identification
  - Risk assessment
  - Control monitoring
  - Review scheduling
- Compliance Calendar
  - Due dates tracking
  - Renewal reminders
  - Audit scheduling
  - Review planning
- Regulatory Updates
  - Change monitoring
  - Impact assessment
  - Implementation planning
  - Verification processes

### 9. Reports & Analytics

Comprehensive reporting and data analysis

- Data visualization
- Export options
- Screen reader compatible charts

#### Reports & Analytics Subcategories

- Standard Reports
  - Pre-configured reports
  - Parameter selection
  - Scheduling options
  - Distribution settings
- Custom Reports
  - Report builder
  - Field selection
  - Filtering options
  - Formatting controls
- Analytics Dashboard
  - Visualization widgets
  - Drill-down capabilities
  - Real-time updates
  - Mobile compatibility
- KPI Tracking
  - Key metric definition
  - Target setting
  - Performance tracking
  - Visual indicators
- Performance Metrics
  - Operational metrics
  - Quality indicators
  - Efficiency measures
  - Comparative analysis
- Financial Reports
  - P&L reporting
  - Balance sheets
  - Cash flow analysis
  - Budget vs. actual
- Training Reports
  - Completion statistics
  - Competency analysis
  - Training effectiveness
  - Cost analysis
- Safety Reports
  - Incident statistics
  - Hazard tracking
  - Compliance status
  - Risk assessment
- Client Reports
  - Service utilization
  - Satisfaction metrics
  - Placement statistics
  - Revenue analysis
- HR Reports
  - Workforce composition
  - Turnover analysis
  - Leave statistics
  - Cost per hire
- Compliance Reports
  - Regulatory compliance
  - Audit outcomes
  - Non-conformance tracking
  - Corrective actions
- Export Center
  - Export format options
  - Batch export capabilities
  - Scheduling options
  - Delivery methods
- Report Scheduler
  - Automated distribution
  - Frequency settings
  - Recipient management
  - Conditional delivery
- Data Visualization
  - Chart types
  - Interactive graphs
  - Accessible design
  - Print optimization
- Trend Analysis
  - Historical comparisons
  - Pattern identification
  - Forecasting tools
  - Seasonality analysis

## GTO-Specific Navigation

### Apprentice Management

- Dashboard
- Contract Management
- Training Progress
- Host Placements
- Performance Tracking
- Completions

### Host Employer Management

- Dashboard
- Employer Directory
- Placement Management
- Site Visits
- Capacity Management
- Compliance Tracking

### RTO Management

- Dashboard
- RTO Directory
- Training Plans
- Progress Updates
- Qualification Management
- Training Delivery

## Labour Hire-Specific Navigation

### Workforce Management

- Dashboard
- Worker Directory
- Availability Management
- Skills Matching
- Deployment Tracking
- Performance Management

### Client Services

- Dashboard
- Client Directory
- Order Management
- Fulfillment Tracking
- Billing Management
- Service Reviews

### Compliance Management

- Dashboard
- Licensing Status
- Worker Credentials
- Client Compliance
- Audit Management
- Regulatory Reporting

## Accessibility Features

### Keyboard Navigation

- Tab navigation for all interactive elements
- Arrow key navigation in menus
- Escape key for closing modals
- Enter/Space for activation
- Shift+Tab for reverse navigation

### Screen Readers

- ARIA landmarks
- Descriptive labels
- Live regions
- Status updates
- Error announcements

### Visual Accessibility

- High contrast support
- Scalable text
- Clear focus indicators
- Consistent layout
- Color-independent identification

### Interaction Support

- Touch targets >= 44px
- Error prevention
- Undo capabilities
- Timeout warnings
- Progress indicators

## Quick Access Features

### Global Search

- Keyboard shortcut: Ctrl+/
- Voice input support
- Search suggestions
- Results navigation

### Recent Items

- History tracking
- Quick access list
- Clear history option
- Sync across devices

### Favorites

- Bookmark management
- Custom ordering
- Category organization
- Quick access shortcuts

### Quick Create

- Context-aware actions
- Form templates
- Validation feedback
- Success confirmations

### Notifications

- Priority levels
- Read/unread status
- Action buttons
- Grouped notifications
- Clear all option

## User Interface Elements

### Navigation Components

- Breadcrumb Navigation
  - Path representation
  - Navigation shortcuts
  - Current location indicator
  - History integration
- Action Buttons
  - Context-aware actions
  - Permission-based visibility
  - Confirmation dialogs
  - Success feedback
- Filter Options
  - Multiple filter criteria
  - Saved filter presets
  - Clear filter options
  - Filter combinations
- Sort Controls
  - Multiple sort fields
  - Ascending/descending toggle
  - Default sort preferences
  - Sort persistence

### Data Management

- Bulk Actions
  - Selection mechanisms
  - Action menus
  - Progress indicators
  - Result summaries
- Export Options
  - Format selection (CSV, Excel, PDF)
  - Data field inclusion
  - Filter application
  - Header/footer customization
- Print Functions
  - Print formatting
  - Page setup options
  - Print preview
  - Batch printing
- View Toggles
  - List/grid/calendar views
  - Density options
  - Column visibility
  - Custom layouts

## Mobile Navigation

### Responsive Design

- Collapsible navigation
- Touch-friendly controls
- Orientation adaptation
- Progressive disclosure

### Mobile-Specific Features

- Swipe gestures
- Bottom navigation bar
- Pull-to-refresh
- Context-based quick actions

## Revision History

| Version | Date       | Description     | Author           |
| ------- | ---------- | --------------- | ---------------- |
| 2.0.0   | 2024-05-18 | Major expansion | System Architect |
| 1.0.0   | 2024-02-20 | Initial release | System Architect |
