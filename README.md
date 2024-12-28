# Kosher Capital Frontend

A modern web application built with React, Vite, and Web3 technologies. This project provides a seamless interface for interacting with blockchain technologies while maintaining a responsive and user-friendly design.

## 🚀 Technologies

- **React 18** - A JavaScript library for building user interfaces
- **Vite** - Next Generation Frontend Tooling
- **Tailwind CSS** - A utility-first CSS framework
- **Firebase** - Backend services for authentication and database
- **Web3 Integration** - Support for multiple blockchain networks
  - MetaMask SDK
  - Rainbow Kit
  - Wagmi
  - Ethereum & Solana compatibility
- **React Router DOM** - For application routing
- **Framer Motion** - For smooth animations
- **Material-UI** - For enhanced UI components

## 📋 Prerequisites

- Node.js >= 18.17.0
- npm or yarn
- A modern web browser
- MetaMask or other Web3 wallet (for blockchain features)

## 🛠️ Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd front-end
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory and add necessary environment variables:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   # Add other required environment variables
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
# or
yarn dev
```
This will start the development server on `http://localhost:5173`

### Production Build
```bash
npm run build
npm run preview
# or
yarn build
yarn preview
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run start` - Start development server with host access
- `npm run build` - Create production build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## 🌟 Features

- Responsive design with Tailwind CSS
- Web3 wallet integration
- Multi-chain support (Ethereum, Solana)
- Firebase authentication and database integration
- Progressive Web App (PWA) support
- Modern UI with Material-UI components
- Smooth animations with Framer Motion

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.