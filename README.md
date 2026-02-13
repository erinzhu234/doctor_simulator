# CS 144 Final Project: Doctor Simulator

## Project Description

This application lets the user play the role as a doctor to give diagnosis to virtual patients through messaging. The virtual patient messages are provided by openai API and gives information to help with diagnosis. The application now supports the username "doctor" and stores past successful conversations available for download. 

## Live Application URL

You can access the deployed application at:
**[https://cs144-25s-erinzhu234.us-west2.r.appspot.com/](https://cs144-25s-erinzhu234.wl.r.appspot.com/)**

## System Architecture

Our application is built upon a standard client-server architecture, deployed as a single service within Google App Engine (GAE).

* **Frontend (Client):** The user-facing part of our application, developed using React. It resides in the `client/` directory. During the build process, it is compiled into static HTML, CSS, and JavaScript assets in the `client/dist` directory. These static files are then copied to the `server/dist` directory for the backend to serve.
* **Backend (Server):** The server-side logic is implemented using Node.js and the Express.js framework, located in the `server/` directory. The backend is responsible for:
    * Serving the static frontend assets.
    * Exposing RESTful API endpoints for client-server communication.
    * Interacting with the MongoDB database.
* **Database:** We use MongoDB as our primary NoSQL database for persistent data storage. The backend interacts with MongoDB via an Object Data Model (ODM), specifically Mongoose, to define schemas and facilitate data operations.
* **Deployment Environment:** The entire application (backend with integrated frontend assets) is deployed to Google App Engine Flexible Environment. GAE handles the underlying infrastructure, including automatic scaling, load balancing, and instance management.

## How to Deploy the Application

This project utilizes a Continuous Integration/Continuous Deployment (CI/CD) pipeline with GitHub Actions to automate the deployment to Google App Engine.

### Prerequisites

* A Google Cloud Project with billing enabled.
* Node.js (version 20) installed locally for development and dependency management.
* A GitHub repository containing the application code.

### Google Cloud Platform (GCP) Setup

1.  **Create a Service Account:**
    * Navigate to **IAM & Admin > Service Accounts** in your Google Cloud Console.
    * Create a new service account (e.g., `github-actions-deployer`).
2.  **Grant IAM Permissions:**
    * Grant the newly created service account the following essential IAM roles:
        * `App Engine Deployer`
        * `Service Account User`
        * `Cloud Build Editor`
        * `Storage Object Admin`
3.  **Generate Service Account Key:**
    * Click on the service account's email address.
    * Go to the **Keys** tab and click **ADD KEY > Create new key**.
    * Select **JSON** as the key type and click **Create**. A JSON file will be downloaded. **Open this file and copy its entire content.**

### GitHub Repository Secrets Configuration

1.  In your GitHub repository, navigate to **Settings > Secrets and variables > Actions**.
2.  Create two new repository secrets:
    * `GCP_PROJECT_ID`: Paste your Google Cloud Project ID (e.g., `cs144-25s-erinzhu234`).
    * `GCP_SA_KEY`: Paste the **entire JSON content** of the Service Account Key file you downloaded.

### App Engine Configuration (`app.yaml`)

The `app.yaml` file, located in the root of this repository, configures the App Engine Flexible environment for the Node.js application.

### Github Actions Workflow (`.github/workflows/deploy.yml`)

The GitHub Actions workflow defines the CI/CD pipeline for automated deployments. 

### Deployment Trigger

Once the above setup is complete, any push to the `main` branch of this GitHub repository will automatically trigger the CI/CD pipeline defined in `.github/workflows/deploy.yml`, building and deploying the application to Google App Engine.

## Database Description

This application utilizes **MongoDB** as its primary NoSQL database. Data persistence is managed through MongoDB Atlas, a cloud-hosted MongoDB service. We use an Object Data Model (ODM) in our Node.js backend to interact with the database, allowing for structured data handling and schema validation.

## Security and Privacy Features

The application was developed considering common web security vulnerabilities and ensuring user privacy through the following features:

* **Authentication:** User authentication is managed using JWT (JSON Web Tokens) for secure session management. These tokens are transmitted via secure, HttpOnly cookies. A banner at the bottom of the page informs users about cookie usage and their rights.
* **Input Validation and Sanitization:** All user-supplied input is rigorously validated on the server-side to prevent malicious data injection. By using an ODM for MongoDB, the app inherently manages its built-in data handling, which helps minimize common vulnerabilities like SQL injection attacks (analogous to NoSQL injection) and Cross-Site Scripting by ensuring data integrity and proper escaping when interacting with the database.
* **Cross-Site Scripting (XSS) Prevention:** React inherently provides safeguards against most XSS attacks by automatically escaping rendered content. Furthermore, server-side validation and sanitization of all user-generated content contribute to preventing XSS vulnerabilities.
* **HTTPS Enforcement:** All communication with the application is secured using HTTPS, which is automatically enforced by Google App Engine upon deployment.

## Technical Requirements

This section details how the application meets each of the project's technical requirements:

* **Semantic HTML5 & API Usage:** The frontend utilizes semantic HTML5 elements to improve accessibility and structure. The **Microphone API with speech recognition** is used to support voice input, enhancing user interaction.
* **Responsiveness:** The application is designed to be fully responsive, providing an aesthetically pleasing and functional interface on screens as small as 320px across various devices.
* **Offline Availability:** The application uses **Progressive Web App (PWA)** capabilities and can be accessed offline. The general layout and interface render without an internet connection, displaying a banner indicating offline status and responding with corresponding messages when offline.
* **HTTPS:** All communication with the application is secured via HTTPS, ensuring data integrity and confidentiality.
* **Single Page Application (SPA):** The application is implemented as a Single Page Application, providing a smooth user experience without full page reloads. It avoids horizontal or vertical scrolling, instead using an inner scrolling element to display messages efficiently within the viewport.
* **Aesthetics:** The application incorporates proper UI designs to ensure smooth and pleasing user interactions, focusing on a clean and intuitive user interface.
* **Production CSS Processor:** **Tailwind CSS** is used for managing stylesheets, ensuring maintainable, organized, and utility-first CSS styling.
* **User Authentication:** User authentication is robustly handled using JWT and HttpOnly cookies, providing secure login and session management. A cookie consent banner is displayed at the bottom of the page to ensure privacy compliance.
* **Web Security Vulnerabilities:** The design and implementation of the application leverage an ODM (for MongoDB) and React to provide strong defense against common web vulnerabilities like injection attacks, XSS, and CSRF.
* **Caching Layer & Database:** **MongoDB** serves as our primary database for persistent data storage, where conversation history is stored and made available for download. An **in-memory caching layer** is used to preserve conversation status, ensuring that conversations maintain their state even after page refreshes.
* **Node.js and Express:** The backend of the application is built using **Node.js** and the **Express.js** framework, providing a flexible and powerful environment for our server-side logic and API.
* **PWA & Service Worker:** The application uses a PWA with a service worker via `vite-plugin-pwa` to enable offline capabilities and make the app installable on desktop and mobile devices.
* **WASM Module:** Not implemented in this project.
* **API Usage:** The application implements an API that interacts with the **OpenAI API** to provide real-time virtual patient messages, simulating a diagnostic conversation.
* **Significant Front-End Framework:** The frontend is developed using **React**, a widely adopted and significant modern front-end framework, enabling the creation of dynamic and interactive user interfaces.
* **Basic Accessibility Principles:** The application adheres to basic accessibility principles, including considerations for color contrast, keyboard navigation, and appropriate use of semantic HTML elements with ARIA attributes applied where applicable.
* **Google Cloud Deployment & CI/CD:** The application is deployed onto **Google App Engine (GAE)** using **Continuous Integration/Continuous Deployment (CI/CD)** principles via **GitHub Actions** for automated builds and deployments triggered by pushes to the `main` branch.

## REST/API Endpoints

Our application provides the following RESTful API endpoints, served by the Node.js/Express backend. All requests should be made to the base URL of the deployed application (e.g., `https://cs144-25s-erinzhu234.us-west2.r.appspot.com/api`).

---
### User Authentication Endpoints

These endpoints handle user login, logout, and session validation, as defined in `auth.js`.

* **`POST /api/auth/login`**
    * **Description:** Authenticates a user. For this demo, it specifically authenticates the hardcoded username `doctor`. On successful authentication, a JWT is signed and set as an `HttpOnly`, `secure`, `SameSite=Lax` cookie named `token` (expires in 1 hour).
    * **Request Body:**
        ```json
        {
          "username": "doctor"
        }
        ```
    * **Response Body (Success 200 OK):**
        ```json
        {
          "success": true
        }
        ```
    * **Error Response (401 Unauthorized):**
        ```json
        {
          "success": false,
          "message": "Invalid credentials"
        }
        ```
    * **Authentication:** None required.

* **`POST /api/auth/logout`**
    * **Description:** Clears the authentication `token` cookie from the client's browser, effectively logging the user out.
    * **Request Body:** None.
    * **Response Body (Success 200 OK):**
        ```json
        {
          "success": true
        }
        ```
    * **Authentication:** Requires an existing `token` cookie (though it clears it regardless).

* **`GET /api/auth/me`**
    * **Description:** Checks if the client has a valid authentication token in their cookies and returns the authenticated user's username if the token is valid.
    * **Request Body:** None.
    * **Response Body (Success 200 OK):**
        * If authenticated:
            ```json
            {
              "user": "doctor"
            }
            ```
        * If not authenticated or token is invalid/missing:
            ```json
            {
              "user": null
            }
            ```
    * **Authentication:** Requires a valid JWT in the `token` cookie.

---
### Conversation and AI Interaction Endpoints

* **`GET /api/conversations`**
    * **Description:** Retrieves a list of all past conversations for the authenticated user, sorted by creation date (newest first).
    * **Request Body:** None.
    * **Response Body (Success 200 OK):**
        ```json
        [
          {
            "_id": "ObjectId('conv1')",
            "user": "username",
            "messages": [
              {"from": "doctor", "text": "Hi patient."},
              {"from": "patient", "text": "Hi Doctor, I'm not feeling well today..."}
            ],
            "correctDiagnosis": false,
            "createdAt": "YYYY-MM-DDTHH:mm:ssZ"
          },
          // ... more conversation objects
        ]
        ```
    * **Authentication:** Requires a valid JWT in the `token` cookie. Returns `401 Unauthorized` if no token or invalid token.

* **`POST /api/ask`**
    * **Description:** Sends a message to the AI virtual patient and receives a response. This endpoint handles starting new conversations and evaluating potential diagnoses.
    * **Request Body:**
        ```json
        {
          "history": [
            {"from": "doctor", "text": "First message from doctor"},
            {"from": "patient", "text": "First response from patient"}
            // ... more messages in conversation history
          ],
          "isNew": true // Set to true if starting a brand new conversation
        }
        ```
    * **Response Body (Success 200 OK):**
        ```json
        {
          "reply": "AI patient's response to the last message.",
          "correctDiagnosis": false // True if the last doctor message was a correct diagnosis guess.
        }
        ```
    * **Error Responses:**
        * `401 Unauthorized`: No token or invalid token in cookies.
        * `500 Internal Server Error`: Generic error if OpenAI API fails or other server issues occur.
    * **Authentication:** Requires a valid JWT in the `token` cookie.

* **`GET /api/history`**
    * **Description:** Retrieves the 10 most recent conversations for the authenticated user.
    * **Request Body:** None.
    * **Response Body (Success 200 OK):**
        ```json
        [
          {
            "_id": "ObjectId('convA')",
            "user": "username",
            "messages": [ /* ... */ ],
            "correctDiagnosis": true,
            "timestamp": "YYYY-MM-DDTHH:mm:ssZ"
          },
          // ... up to 10 conversation objects
        ]
        ```
    * **Authentication:** Requires a valid JWT in the `token` cookie. Returns `401 Unauthorized` or `500 Failed to retrieve history` on error.

* **`GET /api/conversation`**
    * **Description:** Attempts to retrieve the current ongoing conversation history for the authenticated user from an in-memory server-side cache. This is primarily for maintaining state across brief disconnections or page refreshes.
    * **Request Body:** None.
    * **Response Body (Success 200 OK):**
        * If cached history exists:
            ```json
            {
              "history": [
                {"from": "doctor", "text": "..." },
                {"from": "patient", "text": "..." }
              ],
              "correctDiagnosis": false // Current diagnosis status
            }
            ```
        * If no cached history: `null`
    * **Authentication:** Requires a valid JWT in the `token` cookie. Returns `401 Unauthorized` if no token or invalid token.

---
### Frontend Serving Route

* **`GET /*splat`**
    * **Description:** This is a catch-all route that serves the main `index.html` file of the frontend application. It is crucial for Single Page Application (SPA) routing, allowing client-side routes (e.g., `/dashboard`, `/settings`) to be handled by the frontend JavaScript after the initial page load. Direct API calls should target the `/api/` prefix.
    * **Request Body:** None.
    * **Response Body (Success 200 OK):** The content of `index.html`.
    * **Authentication:** None required.
