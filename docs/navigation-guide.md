# CRM13 Navigation System Guide

## Table of Contents

1. [Overview](#overview)
2. [Navigation Structure](#navigation-structure)
3. [Components](#components)
4. [Implementation Details](#implementation-details)
5. [Accessibility Features](#accessibility-features)
6. [ARIA Implementation Best Practices](#aria-implementation-best-practices)
7. [Mobile Navigation](#mobile-navigation)
8. [Quick Access Features](#quick-access-features)
9. [Technical Reference](#technical-reference)
10. [Implementation History](#implementation-history)

## Overview

The CRM13 navigation system is built with accessibility and usability as core principles, following WCAG 2.1 guidelines. All components are keyboard navigable and screen reader friendly.

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

## Navigation Structure

### Top Navigation (Main Areas)

#### 1. Dashboard

Primary overview and quick access to key metrics

- Overview
- Quick Actions
- Recent Activities
- Notifications
- Alerts & Reminders
- Key Metrics
- Task List
- Calendar View

#### 2. Client Management

Client relationship and account management

- Client Directory
- Host Employers
- Client Contacts
- Account Management
- Service Agreements
- Client Communications
- Visit Reports
- Client Requirements
- Placement History
- Client Documents
- Feedback & Surveys
- Support Tickets
- Client Portal
- Opportunity Pipeline
- Client Analytics

#### 3. Human Resources

HR operations and employee management

- Employees
- Apprentices & Trainees
- Labour Hire Workers
- Candidates
- Job Postings
- Recruitment
- Onboarding
- Performance Reviews
- Leave Management
- Training Records
- Employee Documents
- Benefits Administration
- Disciplinary Actions
- Exit Management
- HR Reports
- Organization Chart
- Position Management
- Succession Planning

#### 4. Training & Development

Training program management and development tracking

- Apprentices
- Trainees
- Course Catalog
- Training Calendar
- Assessments
- Certifications
- Skills Matrix
- Training Records
- Learning Plans
- Training Resources
- Competency Tracking
- Qualification Framework
- Training Providers
- Workshop Schedule

#### 5. Safety & WHS

Workplace health and safety management

- Incident Reports
- Hazard Register
- Safety Audits
- Risk Assessments
- Safety Documents
- PPE Management
- Safety Training
- Emergency Procedures
- Safety Meetings
- Inspection Reports
- Safety Statistics
- Compliance Calendar
- Safety Alerts
- Return to Work

#### 6. Payroll & Finance

Financial operations and payroll management

- Payroll Processing
- Timesheets
- Award Rates
- Allowances
- Deductions
- Superannuation
- Tax Management
- Expense Claims
- Invoicing
- Payment History
- Funding Claims
- Budget Tracking
- Financial Reports
- Bank Reconciliation
- Cost Centers

#### 7. Marketing & Sales

Marketing campaigns and sales operations

- Campaigns
- Lead Management
- Sales Pipeline
- Marketing Calendar
- Email Marketing
- Social Media
- Website Analytics
- Event Management
- Marketing Materials
- Competitor Analysis
- Market Research
- ROI Tracking
- Campaign Analytics
- Brand Assets

#### 8. Compliance & Quality

Compliance monitoring and quality assurance

- Compliance Dashboard
- Audit Management
- Document Control
- Quality Metrics
- Standards & Regulations
- Compliance Training
- Corrective Actions
- Policy Management
- License Management
- Compliance Reports
- Quality Reviews
- Risk Register
- Compliance Calendar
- Regulatory Updates

#### 9. Reports & Analytics

Comprehensive reporting and data analysis

- Standard Reports
- Custom Reports
- Analytics Dashboard
- KPI Tracking
- Performance Metrics
- Financial Reports
- Training Reports
- Safety Reports
- Client Reports
- HR Reports
- Compliance Reports
- Export Center
- Report Scheduler
- Data Visualization
- Trend Analysis

## Components

### MainNavigation (`components/navigation/MainNavigation.tsx`)

The MainNavigation component implements the top-level navigation structure:

- Manages top-level navigation items
- Implements ARIA roles and labels for accessibility
- Provides keyboard navigation support
- Includes visual and screen reader feedback for active states
- Adds tooltips for additional context
- Has responsive design for all screen sizes

```tsx
// Simplified example of a main navigation item
const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Home className='w-5 h-5' />,
    ariaLabel: 'Go to Dashboard',
    path: '/dashboard',
  },
  // Other top-level items...
];
```

### SubNavigation (`components/navigation/SubNavigation.tsx`)

The SubNavigation component provides context-aware secondary navigation:

- Dynamically updates based on the current section
- Organized with hierarchical structure using accordion panels
- Includes proper ARIA landmarks and labels
- Manages keyboard focus for accessibility
- Implements motion animations with reduced motion support
- Clearly indicates current selection

```tsx
// Example of a sub-navigation configuration
const subNavItems = [
  {
    id: 'client-directory',
    label: 'Client Directory',
    path: '/clients',
  },
  {
    id: 'host-employers',
    label: 'Host Employers',
    path: '/clients/hosts',
  },
  // More sub-items...
];
```

### Sidebar (`components/navigation/Sidebar.tsx`)

The Sidebar component is the main container for navigation:

- Collapsible design that reflows content
- Smooth animation with CSS transitions
- Proper focus management when expanding/collapsing
- Screen reader announcements for state changes
- Keyboard shortcuts for toggling

### ActionPanel (`components/common/ActionPanel.tsx`)

The ActionPanel provides consistent action buttons across the application:

- Consistent API for defining actions
- Responsive design that adapts to screen size
- Proper focus management for keyboard users
- Clear visual feedback for interactive states

```tsx
// Example of ActionPanel usage with new API
<ActionPanel
  actions={[
    {
      label: 'Add Client',
      variant: 'primary',
      onClick: openAddClientModal,
      icon: <Plus className='w-4 h-4 mr-2' />,
    },
    {
      label: 'Export',
      variant: 'outline',
      onClick: handleExport,
      icon: <Download className='w-4 h-4 mr-2' />,
    },
  ]}
/>
```

### Breadcrumbs (`components/navigation/Breadcrumbs.tsx`)

The Breadcrumbs component shows the current location in the application:

- Dynamic path representation based on current route
- Interactive links to parent routes
- Clear visual indication of current location
- Screen reader optimized with proper ARIA attributes
- Entity name integration for specific contexts

## Implementation Details

### Route Configuration

Routes are configured using React Router with a nested structure to represent the hierarchy:

```tsx
// Example route configuration
const routes = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'clients/*',
        element: <ClientLayout />,
        children: [
          {
            path: '',
            element: <Clients />,
          },
          {
            path: ':id',
            element: <ClientProfile />,
          },
          // More client routes...
        ],
      },
      // More main routes...
    ],
  },
  // Auth routes...
];
```

### Context Providers

Several context providers are used to manage navigation state:

- `SidebarContext` - Manages sidebar open/closed state
- `NavigationContext` - Provides current location information to nested components
- `BreadcrumbContext` - Manages dynamic breadcrumb generation

### Data Integration

Navigation now uses real data from Supabase/Prisma:

- Direct Supabase client queries for simple data needs
- Prisma client for complex relationships
- Row-Level Security ensuring proper data access control
- Proper type definitions for all data structures

## Accessibility Features

### Keyboard Navigation

- Tab navigation for all interactive elements
- Arrow key navigation in menus (Up/Down to move, Right to expand, Left to collapse)
- Escape key for closing modals and expanded menus
- Enter/Space for activation of menu items
- Shift+Tab for reverse navigation
- Home/End keys to jump to first/last item in a list

### Screen Readers

- ARIA landmarks identify navigation regions
- Descriptive labels for all interactive elements
- Live regions announce dynamic content changes
- Status updates for loading states
- Error announcements for form validation
- Role, state, and property attributes for all components

### Visual Accessibility

- High contrast support with proper color ratios
- Scalable text that supports browser zoom up to 200%
- Clear focus indicators that are visible in all color modes
- Consistent layout with predictable component placement
- Color-independent identification (icons + text)
- Dark mode support with appropriate contrast

### Interaction Support

- Touch targets sized at least 44x44px for mobile
- Error prevention with confirmation for destructive actions
- Undo capabilities for key actions
- Timeout warnings for session expiration
- Progress indicators for long-running operations
- Reduced motion support for animations

## ARIA Implementation Best Practices

To ensure our navigation components are fully accessible, we enforce the following ARIA best practices:

### 1. Proper ARIA Boolean Attributes

ARIA boolean attributes should use actual boolean values rather than string literals:

```tsx
// Incorrect - Using string values
aria-hidden={isOpen ? 'false' : 'true'}
aria-haspopup={hasChildren ? 'true' : 'false'}

// Correct - Using boolean values
aria-hidden={!isOpen}
aria-haspopup={Boolean(hasChildren)}
```

### 2. Semantic HTML Structure

Use semantic HTML elements before adding ARIA roles:

```tsx
// Preferred - Using semantic HTML
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>

// Avoid - Using generic elements with roles
<div role="navigation" aria-label="Main navigation">
  <div role="list">
    <div role="listitem"><a href="/dashboard">Dashboard</a></div>
  </div>
</div>
```

### 3. Proper Keyboard Support Matrix

| Element Type    | Key           | Action                                       |
| --------------- | ------------- | -------------------------------------------- |
| Navigation Menu | Tab/Shift+Tab | Move focus in/out of menu                    |
| Navigation Menu | Enter/Space   | Activate current menu item                   |
| Navigation Menu | Arrow Up/Down | Navigate between menu items                  |
| Navigation Menu | Arrow Right   | Expand submenu or navigate to next level     |
| Navigation Menu | Arrow Left    | Collapse submenu or navigate to parent level |
| Navigation Menu | Home          | Move to first item in current menu level     |
| Navigation Menu | End           | Move to last item in current menu level      |
| Navigation Menu | Escape        | Close submenu or return to parent level      |

### 4. Screen Reader Announcements

Use live regions to announce important changes:

```tsx
// For navigation changes
const announceNavigation = (message) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'assertive');
  announcement.setAttribute('role', 'status');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  // Remove after announcement is read
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Usage
announceNavigation(`Navigated to ${sectionName}`);
```

### 5. Reduced Motion Support

Respect user preferences for reduced motion:

```tsx
// Detect reduced motion preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Apply appropriate transitions
const transitionClass = prefersReducedMotion
  ? 'transition-none'
  : 'transition-transform duration-300 ease-in-out';
```

### 6. Accessibility Checklist for Navigation Components

- [ ] All interactive elements are keyboard accessible with visible focus indicators
- [ ] Proper ARIA attributes are used (aria-haspopup, aria-expanded, aria-controls)
- [ ] Icons are properly labeled with aria-hidden and adjacent text labels
- [ ] Screen reader announcements for navigation state changes
- [ ] Reduced motion alternatives for animations
- [ ] Proper contrast ratios for all text elements
- [ ] Non-modal overlays don't trap keyboard focus
- [ ] Keyboard shortcuts have visible documentation
- [ ] Touch targets are at least 44x44px for mobile users
- [ ] Consistent navigation patterns across the application

## Mobile Navigation

### Responsive Design

- Collapsible sidebar converts to bottom navigation on small screens
- Touch-friendly controls with appropriate spacing
- Layout adaptation based on screen orientation
- Progressive disclosure of options to reduce clutter
- Accessible touch targets meeting WCAG requirements

### Mobile-Specific Features

- Swipe gestures for common actions
- Bottom navigation bar for primary actions
- Pull-to-refresh for content updates
- Context-based quick actions tailored to mobile use
- Hidden search activated by tap
- Single-hand operation optimization

## Quick Access Features

### Global Search

- Keyboard shortcut: Ctrl+/ (Cmd+/ on Mac)
- Voice input support where available
- Search suggestions based on history and context
- Keyboard-navigable results
- Categorized results for better organization
- Recent search history

### Recent Items

- Automatic history tracking of visited items
- Quick access list in sidebar
- Clear history option for privacy
- Synchronization across devices when logged in
- Pinning capability for important items

### Favorites

- Bookmark management for frequently accessed items
- Custom ordering via drag and drop
- Category organization for different types of favorites
- Quick access shortcuts from dashboard
- Import/export capability for backup

### Quick Create

- Context-aware action buttons
- Pre-filled form templates based on current context
- Inline validation with feedback
- Success confirmations after creation
- Recent template selection

### Notifications

- Priority levels indicated by visual design
- Read/unread status tracking
- Action buttons embedded in notifications
- Grouping of related notifications
- Global "Mark All Read" and "Clear All" options
- Filter by type, priority, or date

## Technical Reference

### Component Props

#### Sidebar Component

```tsx
interface SidebarProps {
  /** Whether the sidebar is expanded */
  expanded: boolean;
  /** Function to toggle sidebar state */
  onToggle: () => void;
  /** Navigation items to display */
  items: NavigationItem[];
  /** Current active path */
  activePath: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  ariaLabel: string;
  path?: string;
  subItems?: SubNavigationItem[];
}
```

#### ActionPanel Component

```tsx
interface ActionPanelProps {
  /** Array of action button configurations */
  actions: Action[];
  /** Optional alignment of the buttons */
  align?: 'left' | 'right' | 'between' | 'center';
  /** Optional className for styling */
  className?: string;
}

interface Action {
  /** Button label */
  label: string;
  /** Visual variant */
  variant?: 'default' | 'primary' | 'outline' | 'destructive' | 'link';
  /** Click handler */
  onClick: () => void;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional tooltip text */
  tooltip?: string;
}
```

### Context API

```tsx
// Sidebar Context
const SidebarContext = React.createContext<{
  expanded: boolean;
  toggle: () => void;
  setExpanded: (value: boolean) => void;
}>({
  expanded: true,
  toggle: () => {},
  setExpanded: () => {},
});

// Usage example
function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
```

## Implementation History

### Navigation Improvements (v2.0)

The navigation system underwent a major redesign in v2.0 to address several key issues:

1. **Accessibility Improvements**

   - Added ARIA attributes to all navigation components
   - Implemented keyboard navigation throughout
   - Added screen reader announcements
   - Fixed focus management issues

2. **Performance Optimizations**

   - Reduced rerenders in navigation components
   - Implemented React.memo for pure components
   - Added proper dependency arrays to useEffect hooks
   - Optimized state management with context

3. **Type Safety Enhancements**

   - Added comprehensive TypeScript interfaces
   - Fixed non-null assertions in components
   - Added proper type guards for conditional rendering
   - Implemented generic types for reusable components

4. **API Consistency**

   - Standardized component props across navigation
   - Implemented consistent action handling
   - Created reusable patterns for common behaviors
   - Documented component APIs

5. **Data Integration**
   - Replaced mock data with real Supabase/Prisma data
   - Implemented proper data fetching with loading states
   - Added error handling for network issues
   - Created data access patterns for navigation components

### Implementation Roadmap

1. All key routes have been implemented with proper components
2. Remaining work focuses on connecting to real data sources
3. Accessibility testing is ongoing with screen reader verification
4. Mobile optimizations are in progress
5. Performance monitoring tools have been added to track metrics

### Component Migration Status

| Component        | Status      | Version | Notes                        |
| ---------------- | ----------- | ------- | ---------------------------- |
| MainNavigation   | Complete    | 2.0     | Fully accessible             |
| Sidebar          | Complete    | 2.0     | With animation optimizations |
| SubNavigation    | Complete    | 2.0     | Context-aware navigation     |
| Breadcrumbs      | Complete    | 2.0     | Dynamic path generation      |
| ActionPanel      | Complete    | 2.0     | New API implemented          |
| QuickAccess      | In Progress | 1.5     | Search integration pending   |
| MobileNavigation | In Progress | 1.5     | Touch optimizations needed   |

## Known Accessibility Issues

See the [accessibility-next-steps.md](/home/braden/Desktop/Dev/crm13/docs/progress/accessibility-next-steps.md) document for details on remaining accessibility issues and implementation plans for:

1. Sidebar Component ARIA attribute fixes
2. Icon accessibility improvements
3. Navigation role implementations
4. Form control accessibility enhancements
5. Reduced motion preference support

## Revision History

| Version | Date       | Description                               | Author           |
| ------- | ---------- | ----------------------------------------- | ---------------- |
| 2.1.0   | 2024-05-25 | Added ARIA best practices and issue links | System Architect |
| 2.0.0   | 2024-05-18 | Major expansion                           | System Architect |
| 1.0.0   | 2024-02-20 | Initial release                           | System Architect |
