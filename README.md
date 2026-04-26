# SecureSphere: E2EE Real-Time Chat

A high-security, full-stack communication platform built with the **MERN** stack, featuring **Socket.io** for real-time updates and **Web Crypto API** for true End-to-End Encryption (E2EE).

---

## Key Features

* **Secure Architecture:** Messages are encrypted before they ever leave the sender's browser.
* **Real-Time Messaging:** Instant delivery and "seen" indicators using WebSockets.
* **Dynamic Group Management:** Admin-controlled groups with live "Join/Leave" system announcements.
* **Presence Tracking:** Real-time online/offline status for all users.
* **Secure Media Sharing:** Integrated file and image sharing that preserves end-to-end privacy.

---

## Security & Encryption Architecture

This project implements a robust "Zero-Knowledge" security model. Even with full database access, an intruder cannot read user conversations.

### 1. The Hybrid Encryption Model (RSA + AES)
This project utilizes a hybrid encryption approach to ensure both security and performance:
* **Asymmetric (RSA-2048):** Every user generates a public/private key pair upon registration. Public keys are stored on the server to allow others to "lock" messages for them.
* **Symmetric (AES-GCM):** For every message, a unique 256-bit AES key is generated. This key encrypts the actual message content for high-speed processing.
* **The Key Bundle:** The AES key itself is then encrypted multiple times—once with the RSA public key of every participant in the chat—and stored in a metadata bundle.

### 2. Session-Based PIN Protection
To prevent unauthorized access to local sensitive data (like the RSA Private Key), the app features a **Session Lock**:
* The RSA Private Key is stored in the browser's `IndexedDB`.
* A **User-Defined PIN** is used to derive an encryption key that "locks" the private key.
* The app utilizes `sessionStorage` to keep the app "unlocked" during a single browser session, requiring re-verification only after the tab is closed or the user logs out.

### 3. Secure Group Lifecycle
Unlike standard chats, removing a member in an E2EE environment requires precise synchronization to maintain privacy:
* **Member Synchronization:** Updates the `members` array in real-time across all connected clients.
* **System Announcements:** Logic filters out system messages (e.g., "User was removed") to allow them to be read as plain-text, while strictly enforcing AES decryption for user-to-user content.

---

## Technical Stack

* **Frontend:** React.js, Vite, Tailwind CSS, Context API.
* **Backend:** Node.js, Express.
* **Database:** MongoDB (Mongoose).
* **Real-Time:** Socket.io.
* **Cryptography:** Web Crypto API.

---

## Project Structure

```bash
CHAT-VU (Root)
├── .env                  # Environment variables (Mongo URI, JWT Secret)
├── package.json          # Dependency management & scripts
├── vite.config.js        # Vite configuration
├── index.html            # Entry HTML file
├── src/
│   ├── client/           # Frontend Application logic
│   │   ├── components/   # Chat (DecryptText, GroupInfo, NewChat, SecureFileDisplay), NavBar
│   │   ├── hooks/        # Custom hooks (useFetchRecipient)
│   │   ├── pages/        # Main views (Login, Register, Chat)
│   │   ├── App.css       # Global layout & component styling
│   │   └── index.css     # Tailwind & base styles
│   ├── server/           # Backend Application logic
│   │   ├── Controllers/  # Business logic (Chat, Message, User)
│   │   ├── MiddleWare/   # Multer file upload handling (upload.js)
│   │   ├── Models/       # Mongoose Schemas (E2EE Metadata)
│   │   ├── Routes/       # API Endpoints
│   │   └── uploads/      # Encrypted media storage
│   ├── Context/          # State Management (Auth, Chat, Encryption)
│   ├── utils/            # Web Crypto (crypto.js) & API Services (services.js)
│   ├── assets/           # Logo and UI sound effects
│   ├── App.jsx           # Main application router
│   └── main.jsx          # React entry point
└── public/               # Static assets


Installation & Setup Instructions
To run this project locally for review, please follow these steps:

1. Prerequisites
Ensure you have Node.js (v16+) and npm installed on your machine.

2. Install Dependencies
Open your terminal in the project root and run:
npm install

3. Run the Application
You will need two terminal windows/tabs to run the frontend and backend simultaneously:

Terminal 1 (Frontend):
npm run dev

Terminal 2 (Backend):
cd src/server
node server.js

For the project to work properly a MongoDB database and connection String is also required with an edditional .env file.

The application will be available at http://localhost:5173.

Submitted by: Kian Sabbaghi