***Patient Management System***<br>
**Description**<br>
A patient management system for a healthcare facility where Receptionists can assign patients to available doctors, and Doctors can mark their patients as complete. This system allows tracking of patient appointments, reasons for visit, and the receptionist who assigned the patient.<br>

**Features**<br>
**Receptionist:**<br>

Add new patients with their name, phone number, reason, and assigned doctor.<br>
View all patients assigned to them (with reason).<br>
Edit patient details (name and reason) if the patient is in pending status.<br>
**Doctor:**<br>

View all patients assigned to them.<br>
Mark patient status from pending to complete once the treatment is done.<br>
**Technologies**<br>
**Node.js**: Backend server.<br>
**Express**: Web framework for Node.js.<br>
**Mongoose**: ODM for MongoDB.<br>
**MongoDB**: Database to store patient and user data.<br>
**TypeScript**: Type-safe JavaScript for building the backend.<br>
**JWT Authentication**: For protected routes.<br>
**Role-based Access Control**: Ensures proper authorization (receptionists and doctors).<br>
***Installation***<br>
**Prerequisites**<br>
Node.js (v16 or higher)<br>
MongoDB (locally or using MongoDB Atlas)<br>

**Steps**<br>
Clone the repository:<br>
`git clone https://github.com/your-username/patient-management-system.git`<br>
Navigate to the project directory:<br>
`cd patient-management-system`<br>
Install dependencies:<br>
`npm install`<br>
Set up environment variables:<br>

Create a .env file in the root of the project.<br>
Add the following variables (replace with actual values):<br>
`MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_jwt_secret_key<br>
`
Run the development server using nodemon:<br>
`npm run dev`<br>

The server should now be running on [http://localhost:3000](https://meddesk-bn.onrender.com)<br>

**Scripts**<br>
npm run build: Compiles TypeScript files to JavaScript.<br>
npm run dev: Starts the development server using ts-node with nodemon for auto-reload.<br>
npm run seed: Runs the seed script to populate the database with initial data.<br>

**Contributing**<br>
Feel free to fork and submit pull requests for new features or improvements. Ensure all code adheres to the project's style guidelines.<br>

Devs: -Igor IHIMBAZWE<br>
      -Olivier BYIRINGIRO<br>




