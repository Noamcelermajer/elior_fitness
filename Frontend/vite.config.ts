import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // OPTIMIZED FOR MINIMAL BUNDLE SIZE
    target: 'es2015', // Broader compatibility
    minify: 'terser', // More aggressive minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific functions
      },
      mangle: {
        toplevel: true, // Mangle top-level names
      },
    },
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
})
