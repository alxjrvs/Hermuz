// Script to remove comments from all TypeScript files in the /src directory
import fs from 'fs';
import path from 'path';

// Function to recursively find all TypeScript files in a directory
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to remove comments from a TypeScript file
function removeComments(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove single-line comments
    content = content.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove empty lines (optional)
    content = content.replace(/^\s*[\r\n]/gm, '');
    
    // Write the modified content back to the file
    fs.writeFileSync(filePath, content);
    
    console.log(`Removed comments from: ${filePath}`);
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

// Main function
function main() {
  const srcDir = path.join(process.cwd(), 'src');
  const tsFiles = findTsFiles(srcDir);
  
  console.log(`Found ${tsFiles.length} TypeScript files in /src`);
  
  tsFiles.forEach(file => {
    removeComments(file);
  });
  
  console.log('Finished removing comments from all TypeScript files');
}

main();
