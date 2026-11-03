# TrustTenant

**A web-based rental history reporting and management platform**

TrustTenant is a full-stack web application that allows landlords to submit rental history reports, track their submissions, and search approved reports. It also provides an administrative dashboard for reviewing reports and managing their approval status.

The project was independently developed as a functional prototype to explore backend development, relational database design, authentication, role-based authorization, and cloud deployment.

**Live Demo:** [TrustTenant] https://trusttenant.onrender.com/ 

## Features

### Landlord Dashboard
- Register and log in to a landlord account.
- Submit tenant rental history reports.
- View previously submitted reports and their review statuses.
- Search for approved rental history reports.
- Access report details and review outcomes.

### Administrative Dashboard
- View submitted rental history reports.
- Review report details.
- Approve or reject reports.
- Request additional information.
- Maintain a record of administrative review decisions.

### Authentication and Communication
- Password hashing using bcrypt.
- Session-based authentication with PostgreSQL-backed session storage.
- Role-based access controls for protected routes.
- User messaging functionality using Socket.IO.

## Tech Stack

| Category | Technologies |
|---|---|
| Backend | Node.js, Express.js |
| Frontend | EJS, HTML, CSS, JavaScript, Bootstrap |
| Database | PostgreSQL |
| Authentication | bcrypt, express-session, connect-pg-simple |
| Real-time Communication | Socket.IO |
| Deployment | Render, Render PostgreSQL |
| Version Control | Git, GitHub |

## Application Architecture

TrustTenant follows a server-rendered web application architecture.

1. **Frontend:** EJS templates render pages and forms for landlords and administrators.
2. **Backend:** Express.js handles HTTP requests, validation, authentication, authorization, and application logic.
3. **Database:** PostgreSQL stores user accounts, landlord information, rental history reports, review decisions, and messages.
4. **Sessions:** PostgreSQL-backed session storage maintains authenticated user sessions.
5. **Real-time Messaging:** Socket.IO supports communication between authenticated users.
6. **Hosting:** The Node.js application and PostgreSQL database are deployed on Render.

## Report Review Workflow

1. A landlord submits a rental history report.
2. The report is stored in PostgreSQL with a pending status.
3. An administrator reviews the submitted information.
4. The administrator approves, rejects, or requests additional information.
5. The review decision is recorded in the database.
6. Approved reports become available through the rental history search functionality.

Administrative review updates use PostgreSQL transactions to keep report status changes and review records consistent.

## Running Locally

### Prerequisites

- Node.js and npm
- PostgreSQL
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/Enuma04/TrustTenant/
cd TrustTenant
```

Install dependencies:

```bash
npm install
```

Configure the required environment variables in a `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_NAME=your_database_name
SESSION_SECRET=your_session_secret
NODE_ENV=development
```

Create the PostgreSQL database and import the project's database schema.

Start the application:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

**Note:** The database schema must be configured before registration, authentication, and reporting functionality can operate.

## Deployment

TrustTenant is deployed using Render:

- **Web Service:** Hosts the Node.js/Express application.
- **PostgreSQL:** Stores application data and persistent sessions.
- **Environment Variables:** Configure database credentials and session secrets without hardcoding them into source code.

## Demo and Privacy Notice

**TrustTenant is a portfolio demonstration, not a production rental screening service.**

The application is intended for testing with fictional information only.

- Do not submit real tenant identities, addresses, rental histories, or other sensitive personal information.
- User-submitted information is not independently verified.
- Reports should not be used for real housing, tenancy, or screening decisions.
- The application is not a certified background-check or tenant-screening service.

## Project Status

**Functional prototype — ongoing development**

Implemented functionality includes landlord registration and authentication, rental history submission, administrative review, report searching, messaging, and cloud deployment.

Potential future improvements include stronger input validation, additional security controls, automated testing, and improvements to the user interface.

## Author

Developed independently by **Enuma Otiji**.

GitHub: [Enuma04](https://github.com/Enuma04)
