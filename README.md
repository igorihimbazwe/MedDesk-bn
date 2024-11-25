***Patient Management System***
**Description**
A patient management system for a healthcare facility where Receptionists can assign patients to available doctors, and Doctors can mark their patients as complete. This system allows tracking of patient appointments, reasons for visit, and the receptionist who assigned the patient.

**Features**
**Receptionist:**

Add new patients with their name, phone number, reason, and assigned doctor.
View all patients assigned to them (with reason).
Edit patient details (name and reason) if the patient is in pending status.
**Doctor:**

View all patients assigned to them.
Mark patient status from pending to complete once the treatment is done.
**Technologies**
**Node.js**: Backend server.
**Express**: Web framework for Node.js.
**Mongoose**: ODM for MongoDB.
**MongoDB**: Database to store patient and user data.
**TypeScript**: Type-safe JavaScript for building the backend.
**JWT Authentication**: For protected routes.
**Role-based Access Control**: Ensures proper authorization (receptionists and doctors).
***Installation***
**Prerequisites**
Node.js (v16 or higher)
MongoDB (locally or using MongoDB Atlas)

**Steps**
Clone the repository:
`git clone https://github.com/your-username/patient-management-system.git`
Navigate to the project directory:
`cd patient-management-system`
Install dependencies:
`npm install`
Set up environment variables:

Create a .env file in the root of the project.
Add the following variables (replace with actual values):
`MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_jwt_secret_key
`
Run the development server using nodemon:
`npm run dev`

The server should now be running on http://localhost:3000

**Scripts**
npm run build: Compiles TypeScript files to JavaScript.
npm run dev: Starts the development server using ts-node with nodemon for auto-reload.
npm run seed: Runs the seed script to populate the database with initial data.

**Contributing**
Feel free to fork and submit pull requests for new features or improvements. Ensure all code adheres to the project's style guidelines.

Devs: -Igor IHIMBAZWE
      -Olivier BYIRINGIRO




