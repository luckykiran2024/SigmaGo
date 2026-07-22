const fs = require('fs');
const filePath = 'prisma/migrations/0_init/migration.sql';
let content = fs.readFileSync(filePath, 'utf8');
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
content = content.replace(/\0/g, '');
fs.writeFileSync(filePath, content, 'utf8');
console.log("Stripped BOM and null bytes successfully.");
