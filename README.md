A web-based AI platform that enables administrators and users to run analytics, manage AI-driven features, and monitor system health. This repository contains the source code for the frontend and server used by the AI Studio application.

## 🚀 Features

- **Admin Dashboard**: Manage users, view audit logs, system health, and more.
- **AI Site Builder**: Create and customize AI-driven pages.
- **Live Map & Analysis**: Visualize data and trends in real time.
- **Chatbot & Smart Suggestions**: Interact via conversational UI and receive AI suggestions.
- **Authentication**: Login page with secure token management.
- **Context System**: Centralized settings via React Context.

## 📁 Repository Structure

```
index.html
metadata.json
package.json
README.md
server.ts
tsconfig.json
vite.config.ts
src/
  App.tsx
  index.css
  main.tsx
  components/
    (React components for UI views)
  context/
    SettingsContext.tsx
  lib/
    utils.ts
```

## 💡 Prerequisites

- Node.js (>=16.x recommended)
- npm (bundled with Node.js)
- Gemini API key (set in `.env.local`)

## 🛠️ Getting Started (Local Development)

1. Clone the repository:
   ```bash
   git clone https://github.com/nxtboi/Aravalli_Intelligence.git
   cd Aravalli_Intelligence
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the project root and add:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:3000` (or as shown in the terminal).

## 📦 Build & Deployment

- To create a production build:
  ```bash
  npm run build
  ```
- Deploy the `dist` directory to any static hosting service or integrate with your existing backend.

## 🤝 Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature/my-feature`
3. Make your changes and commit: `git commit -m "Add some feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a pull request against `main` and describe your changes.

Please follow the existing code style and add tests where appropriate.

## 📝 License

This project is licensed under the [MIT License](LICENSE).

## 📞 Contact
vk16122001@gmail.com, nehapathak9953@gmail.com
---
