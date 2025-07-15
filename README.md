# ComputerX Server Side

![ComputerX API](https://img.shields.io/badge/Computerx-API-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green)
![Express](https://img.shields.io/badge/Express-4.18+-orange)
![Node.js](https://img.shields.io/badge/Node.js-14+-brightgreen)

A robust backend API for the Computerx computer parts manufacturer management system. This server provides secure endpoints for managing computer parts inventory, user authentication, order processing, and payment integration with JWT-based security and MongoDB integration.

## Important Links

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_Site-2ea44f?style=for-the-badge&logo=vercel)](https://computerx-0.netlify.app/)
[![Client Repository](https://img.shields.io/badge/Client_Code-GitHub-blue?style=for-the-badge&logo=github)](https://github.com/azizerorahman/computerx_client-side)
[![Server Repository](https://img.shields.io/badge/Server_Code-GitHub-blue?style=for-the-badge&logo=github)](https://github.com/azizerorahman/computerx_server-side)

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)

## Features

- **Computer Parts Inventory Management**: Full CRUD operations for computer parts inventory
- **User Authentication & Authorization**: JWT-based secure authentication system with admin/user roles
- **Order Management**: Complete order processing from creation to shipment tracking
- **Payment Integration**: Stripe payment gateway for secure credit card transactions
- **User-specific Data**: Personal order collections with user verification
- **Admin Dashboard**: Admin-only features for managing users, parts, and orders
- **Review System**: User review management functionality for parts
- **Secure APIs**: Protected endpoints with token verification and role-based access control

## Technologies Used

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database for storing parts, users, orders, and reviews data
- **JSON Web Token (JWT)**: Secure authentication and authorization
- **Stripe**: Payment processing for secure transactions
- **dotenv**: Environment variable management
- **CORS**: Cross-Origin Resource Sharing support

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB installation
- Stripe account for payment processing
- npm (Node Package Manager)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/azizerorahman/computerx_server-side.git
   cd computerx_server-side
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory with your credentials:

   ``` plaintext
   DB_USERNAME=your_mongodb_username
   DB_PASSWORD=your_mongodb_password
   ACCESS_TOKEN=your_jwt_secret_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   PORT=5000
   ```

4. Start the server:

   ```bash
   npm start
   # or for development
   npm run start-dev
   ```

5. The server will be running at `http://localhost:5000`

## Environment Variables

| Variable | Description |
|----------|-------------|
| DB_USERNAME | MongoDB Atlas username |
| DB_PASSWORD | MongoDB Atlas password |
| ACCESS_TOKEN | Secret key for JWT token generation |
| STRIPE_SECRET_KEY | Stripe secret key for payment processing |
| PORT | Server port (defaults to 5000) |

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Server health check endpoint | No |
| POST | `/create-payment-intent` | Create payment intent for Stripe | Yes |
| GET | `/parts` | Get all computer parts in inventory | No |
| GET | `/purchase/:id` | Get specific part for purchase | No |
| POST | `/parts` | Add a new part to inventory | Yes (Admin) |
| DELETE | `/parts/:id` | Delete a part from inventory | Yes (Admin) |
| PUT | `/parts/:id` | Update part details | Yes |
| PUT | `/update/:id` | Update part quantity after purchase | No |
| GET | `/user` | Get all users | Yes |
| GET | `/admin/:email` | Check if user is admin | No |
| PUT | `/user/admin/:email` | Make user an admin | Yes (Admin) |
| PUT | `/user/:email` | Register/update user and get JWT token | No |
| GET | `/user/:email` | Get specific user details | Yes |
| GET | `/reviews` | Get all reviews | No |
| POST | `/reviews` | Add a new review | Yes |
| GET | `/orders` | Get all orders | No |
| GET | `/payment/order/:id` | Get order details for payment | Yes |
| POST | `/orders` | Create a new order | Yes |
| GET | `/orders/:email` | Get user's orders | Yes |
| PATCH | `/orders/:id` | Update order payment status | Yes |
| PATCH | `/shipped/:id` | Mark order as shipped | Yes |
| DELETE | `/orders/:id` | Cancel/delete an order | Yes |

## Project Structure

``` plaintext
computerx_server-side/
├── node_modules/
├── .env
├── .gitignore
├── index.js
├── package-lock.json
├── package.json
└── README.md
```
