> [IMPORTED FROM CRM13] -- Reference only, not canonical

# Section Layouts Implementation

This document outlines the implementation of consistent section layouts across the CRM13 application.

## Overview

Each major section of the application should have a consistent layout with:

- A section header with title, description, and icon
- Tab navigation for subsections
- A consistent content area for displaying the active page

## Implemented Layouts

### 1. Training & Development Layout

**File**: `src/layouts/TrainingLayout.tsx`

The Training Layout provides a consistent structure for the Training & Development section:

- Tab-based navigation between Qualifications, Competency Units, Assessments, and Training Reviews
- Visual indication of the current active tab
- Consistent header with section title and description
- Card-wrapped content area for the active page

This layout serves as the template for other section layouts, ensuring consistency across the application.

### 2. Safety & WHS Layout

**File**: `src/layouts/SafetyLayout.tsx`

The Safety Layout provides a consistent structure for the Safety & WHS section:

- Tab-based navigation between Incident Reports, Compliance Records, and WHS Inspections
- Visual indication of the current active tab
- Consistent header with section title and description
- Card-wrapped content area for the active page

### 3. Payroll & Finance Layout

**File**: `src/layouts/PayrollLayout.tsx`

The Payroll Layout provides a consistent structure for the Payroll & Finance section:

- Tab-based navigation between Rate Management, Funding Claims, and Contract Finances
- Visual indication of the current active tab
- Consistent header with section title and description
- Card-wrapped content area for the active page

### 4. Compliance & Quality Layout

**File**: `src/layouts/ComplianceLayout.tsx`

The Compliance Layout provides a consistent structure for the Compliance & Quality section:

- Tab-based navigation between Audits, Documents, and Qualification Compliance
- Visual indication of the current active tab
- Consistent header with section title and description
- Card-wrapped content area for the active page

## Implementation Details

### Common Features

Each section layout includes the following common features:

1. **Page Header**:
   - Section title (e.g., "Training & Development")
   - Section description
   - Section icon

2. **Tab Navigation**:
   - Horizontal tab bar for navigating between subsections
   - Visual indication of the active tab with blue underline and text
   - Consistent spacing and styling

3. **Content Area**:
   - Card-wrapped content for consistent styling
   - Padding for proper content spacing
   - React Router `<Outlet />` component to render the active route

### Technical Implementation

Each layout follows the same technical pattern:

1. Import necessary components and hooks:
   ```typescript
   import { Outlet, useLocation, Link } from 'react-router-dom';
   import { PageHeader } from '@/components/common/PageHeader';
   import { Card } from '@/components/common/Card';
   ```

2. Define tabs configuration with path, name, and icon:
   ```typescript
   const tabs = [
     {
       name: 'Tab Name',
       path: '/section/path',
       icon: <Icon />,
     },
     // Additional tabs...
   ];
   ```

3. Use `useLocation` hook to determine active tab:
   ```typescript
   const location = useLocation();
   const currentPath = location.pathname;
   ```

4. Render the header, tabs, and content area:
   ```typescript
   return (
     <div className="space-y-6">
       <PageHeader title="Section Title" description="Section description" icon={<Icon />} />
       <div className="border-b border-gray-200">
         <nav className="-mb-px flex space-x-6">
           {tabs.map((tab) => {
             const isActive = currentPath === tab.path;
             return (
               <Link key={tab.name} to={tab.path} className={isActive ? 'active-tab-style' : 'inactive-tab-style'}>
                 {tab.icon}
                 {tab.name}
               </Link>
             );
           })}
         </nav>
       </div>
       <Card><div className="p-6"><Outlet /></div></Card>
     </div>
   );
   ```

## Route Configuration

Each section layout is configured in the router (`src/routes/config.tsx`) with a wildcard path to capture all subsection routes:

```typescript
{
  path: '/section/*',
  element: <SectionLayout />,
  icon: <Icon />,
  label: 'Section Name',
  showInNav: true,
},
```

Individual subsection routes are then defined to render their respective components when activated:

```typescript
{
  path: '/section/subsection',
  element: <SubsectionComponent />,
  showInNav: false,
},
```

## Accessibility Considerations

All section layouts incorporate accessibility features:

- Proper ARIA labels for navigation components
- Visual indicators that also work for keyboard navigation
- Semantic HTML structure for screen readers
- Proper tab order for keyboard users

## Future Work

1. **Create Additional Layouts**:
   - Calendar Layout
   - Reports & Analytics Layout
   - Consider creating a layout for Apprentices & Trainees section

2. **Enhance Existing Layouts**:
   - Add breadcrumb navigation
   - Support for actions in the header
   - Mobile responsive adjustments for smaller screens

3. **Layout Customization**:
   - User preferences for layout density
   - Color theme support
   - Layout size preferences
