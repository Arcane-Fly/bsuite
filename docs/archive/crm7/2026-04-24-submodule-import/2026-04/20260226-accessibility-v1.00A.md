# CRM7 Accessibility Documentation

## WCAG 2.1 AA Compliance Implementation

CRM7 has been designed and implemented to meet WCAG 2.1 AA accessibility standards, ensuring the application is usable by everyone, including users with disabilities.

## Core Accessibility Features

### 1. Keyboard Navigation

- **Full keyboard accessibility** across all routes and components
- **Tab order management** with proper focus indicators
- **Skip links** to main content on every page
- **Arrow key navigation** for lists and grids
- **Enter/Space activation** for interactive elements

### 2. Screen Reader Support

- **Semantic HTML** with proper landmarks (main, nav, header, footer)
- **ARIA labels and descriptions** for complex interactions
- **Live regions** for dynamic content announcements
- **Route change announcements** for SPA navigation
- **Proper heading hierarchy** (H1 → H2 → H3, etc.)

### 3. Visual Accessibility

- **High contrast mode** support
- **Focus indicators** with 3px outline and proper colors
- **Color contrast** meeting AA standards (4.5:1 for normal text)
- **Text scaling** support up to 200% zoom
- **Reduced motion** preferences respected

### 4. Touch Accessibility

- **Minimum touch targets** of 44px × 44px
- **Adequate spacing** between interactive elements
- **Touch-friendly navigation** on mobile devices

## Route Implementation

### Complete Route Coverage

All 60+ routes in the application include:

- Proper route naming for screen reader announcements
- Accessibility validation on route changes
- Focus management when navigating between pages
- Error handling with accessible 404 pages

### Route Categories

- **Core CRM**: Contacts, Clients, Dashboard
- **Apprentice Management**: Records, Training, Recruitment, Progress
- **Sales Pipeline**: Leads, Opportunities, Deals, Quotes
- **Financial**: Budget, Expenses, Invoicing, Payroll, Awards
- **WHS & Compliance**: Incidents, Inspections, Training, Workflow
- **VET & Training**: Assessments, Qualifications, Units, Packages
- **Administration**: Users, Settings, Permissions, Configuration
- **External**: Field Officers, Host Employers, Labour Hire, Mentors

## Accessibility Testing

### Automated Validation

The application includes an automated accessibility validator that runs in development mode:

```typescript
import { logAccessibilityReport } from '@/utils/accessibility-validator';

// This runs automatically in development to check WCAG compliance
logAccessibilityReport();
```

### Testing Categories

1. **Landmarks** - Validates presence of main, nav, header elements
2. **Headings** - Ensures proper H1-H6 hierarchy
3. **Focus Management** - Checks focus indicators and trapping
4. **Color Contrast** - Validates text/background contrast ratios
5. **Images** - Ensures alt text and proper ARIA labeling
6. **Forms** - Validates labels, error states, and required fields
7. **Skip Links** - Confirms skip navigation functionality
8. **Keyboard** - Tests tab order and interactive elements
9. **ARIA** - Validates proper ARIA usage and references

## Implementation Guidelines

### For Developers

#### Adding New Routes

```typescript
<ProtectedRoute
  path="/new-feature"
  component={createLazyRoute('./pages/new-feature/index')}
  routeName="New Feature"
/>
```

#### Using Accessibility Hooks

```typescript
import { usePageTitle, useRouteAccessibility } from '@/hooks/useAccessibility';

function MyComponent() {
  usePageTitle('Page Title', 'Page description for SEO');
  useRouteAccessibility('User-friendly route name');

  return <div>...</div>;
}
```

#### Focus Management

```typescript
import { useFocusTrap } from '@/hooks/useAccessibility';

function Modal({ isOpen }: { isOpen: boolean }) {
  const focusTrapRef = useFocusTrap(isOpen);

  return (
    <div ref={focusTrapRef} role="dialog" aria-modal="true">
      {/* Modal content */}
    </div>
  );
}
```

#### Form Accessibility

```typescript
import { useFormAccessibility } from '@/hooks/useAccessibility';

function AccessibleForm() {
  const { associateLabel, addErrorMessage } = useFormAccessibility();

  // Use helpers for proper form accessibility
}
```

### CSS Classes for Accessibility

#### Skip Links

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--accent-primary);
  color: #f2f2f2;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 1001;
}

.skip-link:focus {
  top: 6px;
}
```

#### Screen Reader Only Content

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

#### Focus Indicators

```css
:focus {
  outline: 2px solid var(--accent-secondary);
  outline-offset: 2px;
  border-radius: 2px;
}

.theme-dark :focus {
  outline-color: var(--accent-secondary);
  box-shadow: 0 0 0 2px var(--accent-secondary), 0 0 8px var(--glow-neon);
}
```

## Testing Checklist

### Manual Testing

- [ ] Tab through all interactive elements
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify skip links work on all pages
- [ ] Check color contrast with tools like axe DevTools
- [ ] Test with keyboard only (no mouse)
- [ ] Verify zoom functionality up to 200%
- [ ] Test with reduced motion preferences

### Automated Testing

- [ ] Run accessibility validator in development console
- [ ] Check for WCAG violations in browser DevTools
- [ ] Validate HTML semantics
- [ ] Test focus trap in modals and dialogs

## Browser Support

CRM7 accessibility features are tested and supported on:

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

## Compliance Standards

- **WCAG 2.1 AA** - Primary standard
- **Section 508** - US federal compliance
- **EN 301 549** - European accessibility standard
- **ADA** - Americans with Disabilities Act compliance

## Continuous Improvement

The accessibility implementation includes:

- Automated validation in development
- Regular audits with accessibility tools
- User feedback incorporation
- Stay updated with WCAG 2.2 and future standards

For questions or accessibility issues, please consult the development team or file an issue in the project repository.
