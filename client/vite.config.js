import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This is crucial if your backend runs on port 5000 and your frontend on 5173 (Vite default)
  server: {
    host: 'localhost',
    port: 5173, // Optional: Set to 3000 to match typical React apps, or leave default 5173
    proxy: {
        // You generally don't need this proxy here as you are using direct fetch 
        // to http://localhost:5000/api/analyze in App.js, but keeping it simple is best.
    }
  }
})