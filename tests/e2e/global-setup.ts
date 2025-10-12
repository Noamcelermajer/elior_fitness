import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup runs once before all tests
 * Verifies that the application is running and accessible
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.use;
  
  console.log('\n🔍 Verifying application is running...');
  
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Check if the application is accessible
    const response = await page.goto(`${baseURL}/health`, { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    if (!response || !response.ok()) {
      throw new Error(
        `❌ Application is not accessible at ${baseURL}\n` +
        `   Please ensure Docker is running: docker-compose up --build\n` +
        `   Status: ${response?.status() || 'No response'}`
      );
    }
    
    console.log('✅ Application is running and accessible');
    console.log(`   Base URL: ${baseURL}`);
    
    await browser.close();
  } catch (error) {
    console.error('\n❌ Pre-flight check failed:');
    console.error(error);
    console.error('\n📝 Make sure Docker is running:');
    console.error('   docker-compose up --build\n');
    throw error;
  }
  
  console.log('✅ Global setup complete\n');
}

export default globalSetup;


