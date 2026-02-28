# GTO Management System: Direction & Progress

## Current Vision & Approach

### Core Philosophy

- **One-shot Data Entry**: Maintain a single point of data entry for all information. Data should be entered once and accessed from multiple views/interfaces.
- **Modular Architecture**: Build core functionality first, with the ability to extend via separate connected projects.
- **Developer-friendly Configuration**: Allow the developer user (braden.lang77@gmail.com) to visually configure forms, pages, and components.
- **Separation of Concerns**: Larger subsystems like payroll and portals should be treated as separate projects with API connectivity.

### Immediate Priorities

1. **Remove Puck Editor**: Complete replacement with CRUD-based approach
2. **Improve Navigation & UI/UX**: Refine existing interface components
3. **Implement Marketing Integration**: Add email and SMS capabilities
4. **Develop Real Data Dashboards**: Create meaningful visualizations using actual system data
5. **Enhance Record-keeping Functionality**: Ensure all basic information can be entered and accessed

## Component Status

### Core System

| Component          | Status      | Notes                                         |
| ------------------ | ----------- | --------------------------------------------- |
| Navigation         | In Progress | Basic structure implemented, needs refinement |
| Authentication     | Complete    | Using Supabase auth with role-based access    |
| Base UI Components | Complete    | Core UI library established                   |
| Database Structure | In Progress | Main entities defined, relationships evolving |

### Replaced Components

| Previous Approach | New Approach                | Status      |
| ----------------- | --------------------------- | ----------- |
| Puck Editor       | CRUD-based UI Builder       | In Progress |
| Hard-coded forms  | Schema-based Form Generator | In Progress |
| Static navigation | Configurable navigation     | In Progress |

### Record-keeping Components

| Component                  | Status      | Notes                                        |
| -------------------------- | ----------- | -------------------------------------------- |
| Client Records (replaces rference to "customers)            | In Progress | Basic structure implemented    # Customers/Clients aka Host Employers              |
| Apprentice/Trainee Records | In Progress | Core fields established                      |
| Employee Records           | In Progress | Basic structure implemented                  |
| Training Records           | In Progress | Foundational elements in place               |
| Award/Agreement Records    | Planned     | For reference only until full payroll system |

### Future Modular Extensions

| Module               | Status  | Approach                                               |
| -------------------- | ------- | ------------------------------------------------------ |
| Payroll System       | Planned | Will be developed as separate connected project        |
| Host Employer Portal | Planned | Will be separate project with API access               |
| RTO Integration      | Planned | Will focus on AVETMISS compliance and API connectivity |
| Learning Management  | Planned | Will integrate with existing LMS systems               |

## Next Steps Timeline

### Immediate (Next 2 Weeks)

- Complete removal of Puck Editor components
- Finalize CRUD-based UI builder
- Refine navigation experience
- Implement basic email/SMS integration

### Short-term (1 Month)

- Create real data dashboards
- Enhance client record functionality
- Improve apprentice/trainee management
- Implement basic reporting

### Medium-term (2-3 Months)

- Establish API endpoints for future module connectivity
- Implement document management
- Enhance safety & compliance features
- Add advanced search and filtering

### Long-term (3+ Months)

- Begin modular extension development
- Implement initial payroll record-keeping
- Design portal architecture
- Plan RTO integration requirements

## Progress Tracking

### Recently Completed

- Navigation structure documentation
- Basic form generation from schema
- Client management improvements
- Apprentice/trainee record structure

### Currently In Progress

- Removing Puck Editor components
- Implementing CRUD-based UI builder
- Refining navigation experience
- Enhancing record-keeping capabilities

### Blocked/Waiting

- Full payroll implementation (intentionally deferred)
- Portal development (planned as separate project)
- Advanced reporting (dependent on more complete data model)
