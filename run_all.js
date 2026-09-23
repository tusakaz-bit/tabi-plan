const { execSync } = require('child_process');
try {
    console.log('Running city pages...');
    execSync('node scripts/generate_city_pages.js', { stdio: 'inherit' });
    console.log('Running niche pages...');
    execSync('node scripts/generate_niche_pages.js', { stdio: 'inherit' });
    console.log('Running features pages...');
    execSync('node scripts/generate_features_pages.js', { stdio: 'inherit' });
    console.log('ALL DONE');
} catch (e) {
    console.error('Failed', e);
}
