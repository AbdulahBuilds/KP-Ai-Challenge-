# PROJECT-WIDE UI/UX DESIGN SYSTEM
## AI-Powered Healthcare Coordination & Intelligent Referral System

### 1. Project Overview

We are developing a centralized healthcare coordination platform connecting three portals:

1. **Rescue 1122 Portal** – Emergency case registration and hospital selection.
2. **BHU Portal** – Patient information and AI-assisted hospital referrals.
3. **Hospital Portal** – Hospital resource management, incoming referrals, and emergency alerts.

All three portals are part of ONE platform.

Your task is to follow a consistent, modern, professional healthcare design system across the entire project.

---

### 2. Overall Design Direction

Use a:

- Modern healthcare SaaS dashboard design.
- Clean and professional interface.
- Light theme.
- Minimal and uncluttered layouts.
- Clear visual hierarchy.
- Professional typography.
- Consistent spacing and alignment.
- Soft shadows and subtle borders.
- Rounded cards and buttons.
- Simple and understandable navigation.

Avoid:
- Excessive gradients.
- Too many colors.
- Unnecessary animations.
- Glassmorphism everywhere.
- Overly rounded components.
- Crowded dashboards.
- Unnecessary decorative elements.
- Dark backgrounds across the entire application.

The interface should look like a real healthcare management platform, not a generic student dashboard.

---

### 3. Main Project Color Palette

Use these colors as the shared foundation for all three portals.

| Purpose | Color | HEX |
|---|---|---|
| Primary Brand | Healthcare Blue | #164E78 |
| Secondary Brand | Healthcare Teal | #0D9488 |
| Main Background | Light Gray | #F8FAFC |
| Secondary Background | Light Blue | #EAF4FA |
| Card Background | White | #FFFFFF |
| Primary Text | Dark Slate | #1E293B |
| Secondary Text | Slate Gray | #64748B |
| Borders | Light Gray | #E2E8F0 |

### 4. Portal-Specific Accent Colors

Each portal should have its own accent color while maintaining the same overall design system.

**A. Rescue 1122 Portal**
- Accent Color: Emergency Red
- HEX: #DC2626
- Use for emergency actions, emergency indicators, and important alerts.
- Do not use red for the entire dashboard.

**B. BHU Portal**
- Accent Color: Healthcare Teal
- HEX: #0D9488
- Use for patient referral actions, primary buttons, selected navigation items, and important highlights.

**C. Hospital Portal**
- Accent Color: Healthcare Blue
- HEX: #164E78
- Use for hospital resource management, navigation, and primary actions.

These accent colors must not override the shared status colors.

---

### 5. Standard Status Colors

Use the same status colors throughout all three portals.

| Status | HEX |
|---|---|
| Accepted | #16A34A |
| Available | #16A34A |
| Pending | #D97706 |
| Declined | #DC2626 |
| Critical | #DC2626 |
| Information | #2563EB |
| Unavailable | #64748B |
| Outdated Information | #64748B |

Always display status text alongside its color.

For example:
- Green badge: Accepted
- Amber badge: Pending
- Red badge: Declined
- Gray badge: Outdated

---

### 6. Typography

Use **Inter** as the primary font throughout the platform.

Typography guidelines:

- Page titles: 24–28px, SemiBold.
- Section headings: 18–20px, SemiBold.
- Card headings: 15–16px, Medium or SemiBold.
- Body text: 14–15px, Regular.
- Labels: 13–14px, Medium.
- Secondary information: 12–13px.

Maintain consistent typography across all portals.

---

### 7. Layout and Components

**Sidebar**
- Dark Healthcare Blue (#164E78).
- White navigation text.
- Clear Lucide icons.
- Highlight the active navigation item.
- Keep navigation simple.
- Display the project logo and portal name at the top.
- Keep logout at the bottom.

**Top Navigation**
- White background.
- Page title or breadcrumb.
- Notification icon.
- User profile.
- Portal or hospital name where appropriate.

**Dashboard Cards**
- White background.
- Subtle border (#E2E8F0).
- 12px border radius.
- Soft shadow.
- Clear icons and readable statistics.
- Consistent card heights and spacing.

**Buttons**
- Primary buttons use the portal's accent color.
- White text on primary buttons.
- Secondary buttons use white backgrounds and subtle borders.
- Destructive actions use red.
- Use consistent 8px border radius.
- Provide hover, focus, disabled, and loading states.

**Forms**
- White input backgrounds.
- Light gray borders.
- Clear labels above inputs.
- Consistent input heights.
- Proper validation messages.
- Clearly indicate required fields.
- Group related information into sections.

**Tables**
- Clean white backgrounds.
- Clear column headings.
- Subtle row dividers.
- Proper spacing.
- Status badges.
- Search and filtering where required.
- Responsive behavior on smaller screens.

**Modals and Dialogs**
- White background.
- Clear title and description.
- Proper confirmation buttons.
- Use confirmation dialogs for important actions such as accepting or declining referrals.

---

### 8. Icons and Visual Elements

Use Lucide React icons consistently.

Suggested icons:
- Rescue: Ambulance, Siren, AlertTriangle.
- BHU: Stethoscope, UserRound, ClipboardList.
- Hospital: Hospital, BedDouble, Activity.
- Referrals: FileText, ClipboardCheck.
- Resources: Package, Droplets, HeartPulse.
- Notifications: Bell.
- Settings: Settings.

Do not mix different icon libraries unnecessarily.

---

### 9. User Experience Requirements

The system will be used by healthcare professionals, so usability is more important than visual decoration.

Follow these principles:

1. Important actions should be easy to find.
2. Keep forms short and logically organized.
3. Use understandable language.
4. Display clear success and error messages.
5. Provide loading indicators when fetching data.
6. Display empty states when no records exist.
7. Never display fake or hardcoded resource availability.
8. Show timestamps for hospital resource information.
9. Clearly identify outdated or unavailable information.
10. Require confirmation before important actions.
11. Make all pages responsive.
12. Ensure accessible color contrast and keyboard navigation.

---

### 10. Responsive Design

The platform should work on:

- Desktop computers.
- Laptops.
- Tablets.
- Mobile devices.

Desktop:
- Full sidebar.
- Spacious dashboard.
- Tables and cards.

Tablet:
- Collapsible sidebar.
- Responsive card grids.

Mobile:
- Collapsible navigation.
- Single-column layouts.
- Mobile-friendly forms.
- Responsive tables or card-based alternatives.

---

### 11. Shared Design System Across All Portals

All three developers must follow these rules:

- Use the same font.
- Use the same background colors.
- Use the same card styles.
- Use the same border radius.
- Use the same button styles.
- Use the same form styles.
- Use the same table styles.
- Use the same status colors.
- Use consistent spacing.
- Use consistent icon styles.

Only the portal-specific accent color and portal-related content should differ.

The three portals must look like different sections of one unified healthcare platform.

---

### 12. Technical Implementation Instructions

Before making changes:

1. Inspect the existing project structure.
2. Identify the current frontend framework and styling system.
3. Reuse existing components where appropriate.
4. Avoid unnecessary dependency installation.
5. Do not break existing backend integrations.
6. Preserve existing API functionality.
7. Do not replace real data with mock data.
8. Keep components reusable and maintainable.
9. Apply the design system consistently to all relevant pages.
10. Test the interface after implementation.

If the project already uses Tailwind CSS, implement the palette through shared theme variables or Tailwind configuration rather than scattering HEX values throughout components.

Create reusable components for:
- Buttons.
- Cards.
- Status badges.
- Form inputs.
- Tables.
- Modals.
- Dashboard statistics.
- Page headers.

---

### 13. Final Design Goal

The final platform should communicate:

- Trust.
- Healthcare professionalism.
- Emergency readiness.
- Reliability.
- Simplicity.
- Security.

**Most Important Instruction:**

Do not redesign the three portals as completely different applications. They must share one professional healthcare identity, with small accent-color differences to distinguish Rescue 1122, BHU, and Hospital portals.

Prioritize usability, consistency, readability, and functional workflows over unnecessary visual effects.

