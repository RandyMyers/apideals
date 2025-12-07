const fs = require('fs');
const path = require('path');

const scriptsDir = __dirname;
const seedFiles = fs.readdirSync(scriptsDir).filter(f => f.startsWith('seed') && f.endsWith('.js'));

console.log('🔍 Checking for untranslated entries (where fr/pt/nl = en)...\n');

let totalIssues = 0;

seedFiles.forEach(file => {
  const filePath = path.join(scriptsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Simple regex to find translation objects
  const translationRegex = /{\s*key:\s*['"]([^'"]+)['"][^}]*en:\s*['"]([^'"]+)['"][^}]*fr:\s*['"]([^'"]+)['"][^}]*pt:\s*['"]([^'"]+)['"][^}]*nl:\s*['"]([^'"]+)['"]/gs;
  
  let match;
  const issues = [];
  
  while ((match = translationRegex.exec(content)) !== null) {
    const [, key, en, fr, pt, nl] = match;
    
    // Check if translations match English (case-insensitive for better detection)
    if (en.toLowerCase() === fr.toLowerCase() || 
        en.toLowerCase() === pt.toLowerCase() || 
        en.toLowerCase() === nl.toLowerCase()) {
      issues.push({
        key,
        en,
        fr: fr.toLowerCase() === en.toLowerCase() ? '❌ SAME AS EN' : '✅',
        pt: pt.toLowerCase() === en.toLowerCase() ? '❌ SAME AS EN' : '✅',
        nl: nl.toLowerCase() === en.toLowerCase() ? '❌ SAME AS EN' : '✅'
      });
    }
  }
  
  if (issues.length > 0) {
    console.log(`📄 ${file}:`);
    issues.forEach(issue => {
      console.log(`  ⚠️  ${issue.key}`);
      console.log(`      en: "${issue.en}"`);
      if (issue.fr.includes('❌')) console.log(`      fr: ${issue.fr}`);
      if (issue.pt.includes('❌')) console.log(`      pt: ${issue.pt}`);
      if (issue.nl.includes('❌')) console.log(`      nl: ${issue.nl}`);
      console.log('');
    });
    totalIssues += issues.length;
  }
});

console.log(`\n${'='.repeat(60)}`);
if (totalIssues === 0) {
  console.log('✅ No untranslated entries found! All good!');
} else {
  console.log(`⚠️  Found ${totalIssues} entries that may need translation`);
}




