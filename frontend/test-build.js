const { execSync } = require('child_process');
try {
  execSync('npx next build --debug', { stdio: 'inherit' });
} catch (e) {
  console.log('ERROR:', e.message);
  process.exit(1);
}
