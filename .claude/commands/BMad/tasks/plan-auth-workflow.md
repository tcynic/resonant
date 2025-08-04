# /plan-auth-workflow Task

When this command is used, execute the following task:

# Plan Authentication Workflow with Clerk Test Accounts

## Task Metadata
- **Task ID**: plan-auth-workflow
- **Category**: Authentication Planning
- **Complexity**: Medium
- **Prerequisites**: Clerk setup, existing project structure
- **Elicit**: true

## Overview
Interactive task to plan and design a comprehensive authentication workflow using Clerk with proper test account management for development and testing phases.

## Task Execution Steps

### Step 1: Authentication Requirements Elicitation
**ELICIT_START**
I need to understand your authentication requirements. Please provide the following information:

1. **Authentication Methods** (select all that apply):
   - [ ] Email/Password
   - [ ] Social OAuth (Google, GitHub, etc.)
   - [ ] Magic Links
   - [ ] Phone/SMS
   - [ ] Multi-factor Authentication

2. **User Roles/Types** needed:
   - [ ] Regular Users
   - [ ] Admin Users
   - [ ] Moderators
   - [ ] Other: ___________

3. **Test Account Requirements**:
   - How many test accounts needed? ___________
   - Specific test scenarios: ___________
   - Data persistence requirements: ___________

4. **Environment Setup**:
   - [ ] Development only
   - [ ] Staging environment
   - [ ] CI/CD integration
   - [ ] Local testing

5. **Integration Points**:
   - [ ] Database user sync
   - [ ] Real-time features (Convex)
   - [ ] API authentication
   - [ ] Middleware protection

Please answer the above questions to proceed.
**ELICIT_END**

### Step 2: Analyze Existing Authentication Setup
- Review current Clerk configuration in middleware.ts
- Examine existing auth pages (/sign-in, /sign-up)
- Check Convex user synchronization setup
- Identify gaps in current implementation

### Step 3: Design Test Account Strategy
- Define test user personas based on requirements
- Plan test data scenarios
- Design account lifecycle management
- Create test environment isolation strategy

### Step 4: Create Authentication Flow Documentation
- Map user authentication journeys
- Define error handling scenarios
- Document security considerations
- Plan performance testing approaches

### Step 5: Generate Implementation Plan
- Create task breakdown for development
- Define testing milestones
- Set up monitoring and validation criteria
- Plan deployment and rollback strategies

## Outputs Generated
1. **Authentication Requirements Document**
2. **Test Account Management Plan**
3. **Authentication Flow Diagrams**
4. **Implementation Task List**
5. **Testing Strategy Document**

## Success Criteria
- [ ] Complete authentication requirements captured
- [ ] Test account strategy defined
- [ ] Clear implementation roadmap created
- [ ] Security considerations documented
- [ ] Testing approach planned

## Related Resources
- Template: clerk-auth-setup-tmpl.yaml
- Checklist: auth-implementation-checklist.md
- Data: authentication-best-practices.md