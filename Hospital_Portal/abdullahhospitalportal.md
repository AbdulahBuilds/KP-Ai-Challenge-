# HOSPITAL PORTAL – Complete Development Requirements

**Assigned Developer:** Abdullah  
**Project:** AI-Powered Healthcare Coordination & Intelligent Referral System  
**Portal:** Government Hospital Portal

## 1. Purpose of the Hospital Portal

The Hospital Portal will allow authorized hospital staff to manage and update hospital resources, receive patient referrals from BHUs and emergency alerts from Rescue 1122, and respond to incoming requests.

The main purpose is to provide accurate, updated information about hospital facilities and resources so Rescue 1122 responders and BHU doctors can identify suitable hospitals.

**Important:** The Hospital Portal is not a complete Hospital Management System (HMS). It is a resource management and referral coordination portal that works alongside existing hospital systems.

## 2. Portal Pages and Features

### A. Login Page

Create a secure login page for hospital staff.

Features:
- Email or username.
- Password.
- Login button.
- Forgot password option.
- Only authorized hospital staff can access the portal.

Each hospital account should be connected to its respective hospital.

### B. Hospital Dashboard

After login, hospital staff should see a simple dashboard.

Display these summary cards:

1. Total Available Beds.
2. Occupied Beds.
3. Pending Referrals.
4. Accepted Referrals.
5. Emergency Alerts.

Below the summary cards, display:

- Recent incoming referrals.
- Recent Rescue 1122 alerts.
- Resource availability overview.
- Last resource update time.

Include quick action buttons:
- Update Resources.
- View Referrals.
- View Emergency Alerts.

### C. Resource Management

This is the most important feature of the Hospital Portal.

Hospital staff should be able to update their hospital's available resources.

**1. Bed Availability**

Display:
- Total beds.
- Available beds.
- Occupied beds.
- ICU beds.
- Available ICU beds.

Staff should be able to update bed availability.

**2. Blood Bank Availability**

Display available blood products and their quantities.

Include:
- Blood groups (A+, A-, B+, B-, AB+, AB-, O+, O-).
- Whole blood (if available).
- Packed Red Blood Cells (PRBC).
- Fresh Frozen Plasma (FFP).
- Platelets.
- Cryoprecipitate.

Staff should be able to update quantities and availability.

**3. Medical Equipment**

Display the availability of important medical equipment, such as:

- Ventilators.
- Oxygen supply.
- ECG machines.
- X-ray.
- Ultrasound.
- CT scan.
- MRI.
- Dialysis machines.

Staff should be able to update the available quantity or status of each resource.

**4. Specialist Availability**

Display available medical specialists.

Examples:
- Cardiologist.
- Neurologist.
- Orthopedic specialist.
- General surgeon.
- Neurosurgeon.
- Gynecologist.
- Pediatrician.
- Anesthesiologist.

Staff should be able to update specialist availability and relevant service status.

**5. Hospital Services**

Display important hospital services:

- Emergency department.
- ICU.
- Operation theatre.
- Laboratory.
- Blood bank.
- Radiology.
- Dialysis.

Staff should be able to mark services as:
- Available.
- Unavailable.
- Temporarily unavailable.

**Important Resource Rules:**

- Every resource update must have a last-updated timestamp.
- Resource information should automatically become outdated after a configured period without an update.
- Outdated information must not be presented as confirmed availability.
- Staff should be able to update resources whenever availability changes.
- When a hospital accepts a referral, relevant resources should be re-confirmed.

### D. Incoming Referrals

Create a separate page called "Incoming Referrals".

This page will display patient referrals received from BHU doctors.

Display:
- Patient ID.
- Patient name.
- Age.
- Gender.
- Referring BHU.
- Required medical services.
- Referral date and time.
- Referral status.

Each referral should have a "View Details" option.

The hospital staff should be able to:
- Review patient information.
- Review medical requirements.
- Check relevant hospital resources.
- Accept the referral.
- Decline the referral.

If declining, staff should provide a reason, such as:
- Required facility unavailable.
- No available beds.
- Required specialist unavailable.
- Service temporarily unavailable.
- Other.

### E. Referral Details

When hospital staff open a referral, display:

**Patient Information:**
- Patient name.
- Patient ID.
- Age.
- Gender.

**Medical Information:**
- Symptoms.
- Medical history.
- Current condition.
- Required services.
- Doctor's notes.

**Referral Information:**
- Referring BHU.
- Referral date and time.
- Relevant medical requirements.
- Referral status.

**Available Actions:**
1. Accept Referral.
2. Decline Referral.

When accepting:
- Confirm relevant resource availability.
- Update the referral status to Accepted.
- Notify the BHU doctor.

When declining:
- Require a reason.
- Update the referral status to Declined.
- Notify the BHU doctor so another hospital can be selected.

### F. Emergency Alerts – Rescue 1122

Create a separate page called "Emergency Alerts".

This page will display emergency cases and pre-arrival alerts sent by Rescue 1122.

Display:
- Emergency Case ID.
- Patient information, when available.
- Emergency type.
- Required medical facilities.
- Estimated arrival time, if provided.
- Alert received time.
- Alert status.

Hospital staff should be able to:

- View incoming emergency alerts.
- Open emergency case details.
- Review the patient's requirements.
- Check relevant hospital resources.
- Acknowledge the alert.
- Confirm whether the required facilities are available.

The hospital should be able to communicate its response to Rescue 1122.

Keep emergency alerts separate from regular BHU referrals because they are different workflows.

### G. Hospital Profile

Display hospital information:

- Hospital name.
- Hospital type (DHQ, THQ, or tertiary hospital).
- Location.
- Address.
- Contact number.
- Email.
- Hospital administrator or authorized staff information.

Only authorized staff should be able to update hospital information.

### H. Settings

Keep this section simple.

Features:
- Staff profile.
- Change password.
- Notification preferences.
- Logout.

## 3. Complete Hospital Portal Workflow

### Workflow 1: Resource Management

1. Hospital staff log into the portal.
2. Open the dashboard.
3. Go to Resource Management.
4. Update available beds.
5. Update blood products.
6. Update medical equipment.
7. Update specialist availability.
8. Update hospital services.
9. Save changes.
10. The system records the last-updated time.
11. Updated information becomes available to the centralized system for hospital recommendations.

### Workflow 2: BHU Patient Referral

1. BHU doctor sends a patient referral.
2. Hospital receives the referral.
3. Hospital staff receive a notification.
4. Staff open the referral details.
5. Staff review patient information and medical requirements.
6. Staff check relevant resources.
7. Hospital accepts or declines the referral.
8. System updates the referral status.
9. BHU doctor receives the response.

### Workflow 3: Rescue 1122 Emergency Alert

1. Rescue 1122 registers an emergency case.
2. Rescue 1122 selects a suitable hospital.
3. Hospital receives a pre-arrival alert.
4. Hospital staff review emergency details.
5. Staff check relevant facilities and resources.
6. Hospital acknowledges the alert and confirms relevant availability.
7. Rescue 1122 receives the response.
8. Hospital prepares for the patient's arrival.

## 4. Important System Requirements

Please follow these requirements:

- Build a simple and professional interface.
- Use a responsive design for desktop, tablet, and mobile.
- Implement secure role-based authentication.
- Hospital staff should only manage their own hospital's information.
- Do not use hardcoded or fake resource availability in the connected system.
- Every resource update must include a timestamp.
- Outdated resources must be clearly identified.
- Accepting a referral must trigger resource re-confirmation.
- Send notifications when new referrals or emergency alerts arrive.
- Display loading states, success messages, and error messages.
- Maintain a record of important resource updates and referral actions.
- Connect the portal with the shared backend and centralized database.
- Protect patient information and allow access only to authorized staff involved in the case.

## 5. Pages to Develop

| No. | Page | Priority |
|---|---|---|
| 1 | Login | Required |
| 2 | Hospital Dashboard | Required |
| 3 | Resource Management | Required |
| 4 | Incoming Referrals | Required |
| 5 | Referral Details | Required |
| 6 | Emergency Alerts | Required |
| 7 | Hospital Profile | Required |
| 8 | Settings | Required |

## 6. Development Priority

Develop the portal in this order:

**Priority 1 – Core Features**
- Login and authentication.
- Hospital Dashboard.
- Resource Management.
- Bed availability.
- Blood product availability.
- Equipment and specialist availability.

**Priority 2 – Referral System**
- Incoming referrals.
- Referral details.
- Accept and decline functionality.
- Referral status updates.
- BHU notifications.

**Priority 3 – Rescue 1122 Integration**
- Emergency alerts.
- Emergency case details.
- Alert acknowledgement.
- Resource confirmation.
- Rescue 1122 notifications.

**Priority 4 – Final Improvements**
- Hospital profile.
- Settings.
- Responsive design.
- Error handling.
- Testing and integration.

## 7. Project Scope

For the first phase:

- Focus on government hospitals in Khyber Pakhtunkhwa.
- Support DHQ, THQ, and tertiary government hospitals.
- Private hospitals will be considered in a future phase.
- The portal should complement existing Hospital Management Systems rather than replace them.
- Where approved APIs are available, hospital resource information can be integrated. Otherwise, authorized hospital staff can update information through this portal.

## 8. Expected Final Result

The final Hospital Portal should allow hospital staff to:

- Log in securely.
- View hospital resource information.
- Update available beds and occupied beds.
- Manage blood products, including FFP and Cryoprecipitate.
- Update equipment and specialist availability.
- Manage hospital services.
- Receive referrals from BHUs.
- Accept or decline patient referrals.
- Receive emergency alerts from Rescue 1122.
- Confirm relevant resource availability.
- Keep hospital information updated in the centralized system.

**Final Development Goal:**

Build a simple, reliable Hospital Portal that acts as the central receiving point for BHU referrals and Rescue 1122 emergency alerts while providing accurate, updated hospital resource information to the entire healthcare coordination platform.