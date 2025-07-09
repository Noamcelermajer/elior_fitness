import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  build: {
    // OPTIMIZED FOR MINIMAL BUNDLE SIZE
    target: 'es2015', // Broader compatibility
    minify: 'esbuild', // Use esbuild instead of terser (faster and included)
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          utils: ['date-fns', 'clsx', 'class-variance-authority'],
        },
        // Optimize chunk size
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 500, // Reduced from default 1000
    // Enable source maps for debugging (disable in production for smaller size)
    sourcemap: false,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'], // Exclude large UI libraries from pre-bundling
  },
  // Server optimizations
  server: {
    hmr: {
      overlay: false, // Disable error overlay for better performance
    },
  },
  // Explicit module resolution for Render.com compatibility
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
