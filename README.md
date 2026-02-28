# Society-Hub

Society-Hub is a comprehensive solution designed to manage residential societies efficiently. It provides a suite of tools for administrators and residents to handle everything from bill payments to community announcements, polls, and maintenance complaints.

The project is structured as a monorepo containing three main components: a robust backend API, a modern mobile application for residents, and a web application interface.

## 🚀 Features

- **Multi-Society Support:** Complete data isolation for different societies.
- **Billing & Payments:** Automated bill generation, payment tracking, and integration with **Razorpay**.
- **Community Engagement:** Announcements, polls, and complaint management.
- **Finances:** Management of society expenses and staff reimbursements.
- **Documents:** Centralized document storage and sharing using **Supabase** buckets.
- **Push Notifications:** Real-time push notifications using the **Expo** push notification service.

## 🏗️ Architecture & Tech Stack

The application is split into three main directories:

### 1. Backend (`/backend`)
A high-performance REST API built to handle all business logic, database operations, and third-party integrations.
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/)
- **Database ORM:** [SQLAlchemy](https://www.sqlalchemy.org/)
- **Database:** PostgreSQL (with `psycopg2-binary`)
- **Storage:** [Supabase](https://supabase.com/)
- **Payments:** Razorpay
- **Notifications:** Exponent Server SDK

### 2. Mobile App (`/mobile`)
A cross-platform mobile application targeting iOS and Android for society residents and admins.
- **Framework:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Navigation:** React Navigation (Bottom Tabs, Native Stack, Material Top Tabs)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Forms:** React Hook Form
- **UI Components:** React Native Paper

### 3. Web App (`/web`)
A modern, responsive web application for administration and management.
- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Language:** TypeScript

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Python 3.9+
- PostgreSQL database
- Supabase account (for storage)
- Expo Go app on your phone (for mobile development)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up your `.env` file with the required credentials (Database URL, Supabase keys, Razorpay keys, etc.).
5. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Mobile App Setup
1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npx expo start
   ```

### Web App Setup
1. Navigate to the web directory:
   ```bash
   cd web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🔒 Environment Variables

You will need to configure environment variables for the different parts of the stack. Ensure you have the `.env` files created in their respective directories based on the template logic required by `pydantic-settings` in the backend, and standard environment keys for the frontend apps.

## 📄 License

This project is proprietary and confidential.
