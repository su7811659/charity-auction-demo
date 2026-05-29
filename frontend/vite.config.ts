import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: 'esbuild',  // Use esbuild for minification
    chunkSizeWarningLimit: 1024,  // Set the chunk size warning limit to 1024 KB
  },
  server: {
    port: 3000, // Set the development server port
    open: true, // Automatically open the browser when the server starts
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',  // The address of the backend API (use a routable address)
        changeOrigin: true,
        //rewrite: (path) => path.replace(/^\/api/, ''),  // Rewrites the URL to remove the '/api' prefix
      },
    },
    host: "0.0.0.0",
    allowedHosts: ['esg.market.office.example.com', 'localhost', '127.0.0.1'],
    // Simplified HMR configuration to prevent WebSocket errors
    hmr: false, // Temporarily disable HMR to prevent WebSocket connection issues
    // Alternative: use manual refresh instead of hot reload
    // hmr: {
    //   overlay: false,
    //   clientPort: 3000,
    // },
    // File watching with polling for better compatibility
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
  resolve: {
    alias: {
      '@': '/src',  // Set alias '@' to point to the 'src' directory for cleaner imports
    },
  },
  plugins: [react()], // Use the React plugin to support React projects
  optimizeDeps: {
    include: ['react', 'react-dom'],  // Pre-compile React and ReactDOM for better performance
  },
})
