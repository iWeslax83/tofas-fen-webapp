/**
 * OpenAPI Specification Generator
 * Generates OpenAPI 3.0 specification from Swagger JSDoc annotations
 */

import fs from 'fs';
import path from 'path';
import { specs } from '../utils/swagger';

const OUTPUT_DIR = path.join(__dirname, '../../..');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'openapi.yaml');

/**
 * Convert OpenAPI spec to YAML format
 */
function jsonToYaml(obj: any, indent = 0): string {
  const indentStr = '  '.repeat(indent);
  let yaml = '';

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]\n';
    }
    obj.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        yaml += `${indentStr}- `;
        yaml += jsonToYaml(item, indent + 1).trimStart();
      } else {
        yaml += `${indentStr}- ${item}\n`;
      }
    });
  } else if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach((key, index) => {
      const value = obj[key];
      const isLast = index === Object.keys(obj).length - 1;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        yaml += `${indentStr}${key}:\n`;
        yaml += jsonToYaml(value, indent + 1);
      } else if (Array.isArray(value)) {
        yaml += `${indentStr}${key}:\n`;
        yaml += jsonToYaml(value, indent + 1);
      } else {
        const formattedValue = typeof value === 'string' && value.includes('\n')
          ? `|\n${value.split('\n').map(line => `${indentStr}  ${line}`).join('\n')}`
          : value;
        yaml += `${indentStr}${key}: ${formattedValue}\n`;
      }
    });
  } else {
    yaml += `${indentStr}${obj}\n`;
  }

  return yaml;
}

/**
 * Generate OpenAPI YAML file
 */
async function generateOpenApi() {
  try {
    console.log('Generating OpenAPI specification...');

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Convert JSON spec to YAML
    const yamlContent = jsonToYaml(specs);

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, yamlContent, 'utf8');

    console.log(`✅ OpenAPI specification generated: ${OUTPUT_FILE}`);

    // Also write JSON version for reference
    const jsonFile = path.join(OUTPUT_DIR, 'openapi.json');
    fs.writeFileSync(jsonFile, JSON.stringify(specs, null, 2), 'utf8');
    console.log(`✅ OpenAPI JSON specification generated: ${jsonFile}`);

    return { success: true, file: OUTPUT_FILE };
  } catch (error) {
    console.error('❌ Error generating OpenAPI specification:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generateOpenApi()
    .then(() => {
      console.log('OpenAPI generation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('OpenAPI generation failed:', error);
      process.exit(1);
    });
}

export { generateOpenApi };

