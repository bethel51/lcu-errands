# 🛡️ LeadCity Errands

**LeadCity Errands** is a campus-based mobile and web platform designed to connect students who need help running errands with trusted student errand runners within the university environment. The system provides a fast, secure, and convenient way for students to outsource everyday tasks such as food delivery, grocery shopping, printing documents, hostel deliveries, laundry pickup, parcel handling, and other campus-related activities.

## 🚀 Overview
The platform allows users to create and post errands in real time, while available errand runners can accept tasks based on their location, availability, and delivery capacity. Integrated features such as live status updates, in-app messaging, ratings and reviews, secure payments, notifications, and order tracking help ensure transparency, reliability, and smooth communication between both parties.

## ✨ Core Features
* **User Authentication & Profiles**: Secure registration for Senders and Messengers.
* **Real-time Errand Posting**: Instantly request help with campus tasks.
* **Errand Acceptance & Tracking**: Live status updates for active tasks.
* **In-app Chat & Notifications**: Direct communication between parties.
* **Secure Online Payments**: Integrated wallet and payment processing.
* **Ratings & Review System**: Build trust within the campus community.
* **Admin Dashboard**: Centralized management and monitoring.
* **Location-based Matching**: Find the closest runners for fast requests.

## 👥 Target Users
* **Students**: Needing quick assistance with tasks to save time.
* **Student Errand Runners**: Seeking income opportunities within their campus.
* **Campus Administrators**: Managing platform activities and ensuring security.

## 🏗️ Architecture (Monorepo)
The project is built using a microservices architecture managed via NPM Workspaces:
- `backend/`: Student API (Node.js/Express)
- `admin-service/`: Private Admin API (Node.js/Express)
- `frontend/`: Main Student Web App (React/Vite)
- `admin-frontend/`: Management Portal (React/Vite)

## 🛠️ Development Setup
1. **Install All Dependencies**:
   ```bash
   npm install
   ```
2. **Run All Services (Dev Mode)**:
   ```bash
   npm run dev
   ```

## 🎯 Project Goal
The goal of LeadCity Errands is to digitize and simplify campus errand services by creating a centralized platform that promotes convenience, efficiency, trust, and economic opportunities within the university community.
