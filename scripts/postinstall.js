const fs = require('fs');
const path = require('path');

const gradlePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-dev-client',
  'android',
  'build.gradle'
);

const hasProjectBlock = `
def hasProject = { name ->
  return rootProject.findProject(name) != null
}

`;

const originalBlock = [
  'dependencies {',
  '  androidTestImplementation project(":expo-dev-menu-interface")',
  '  androidTestImplementation project(":expo-updates-interface")',
  '  androidTestImplementation project(":expo-dev-menu")',
  '  androidTestImplementation project(":expo-dev-launcher")',
  '  androidTestImplementation project(":expo-manifests")',
].join('\n');

const patchedBlock = [
  'dependencies {',
  '  if (hasProject(":expo-dev-menu-interface")) {',
  '    androidTestImplementation project(":expo-dev-menu-interface")',
  '  }',
  '  androidTestImplementation project(":expo-updates-interface")',
  '  if (hasProject(":expo-dev-menu")) {',
  '    androidTestImplementation project(":expo-dev-menu")',
  '  }',
  '  if (hasProject(":expo-dev-launcher")) {',
  '    androidTestImplementation project(":expo-dev-launcher")',
  '  }',
  '  androidTestImplementation project(":expo-manifests")',
].join('\n');

try {
  if (!fs.existsSync(gradlePath)) {
    console.warn('[postinstall] expo-dev-client build.gradle not found, skipping patch.');
    process.exit(0);
  }

  const original = fs.readFileSync(gradlePath, 'utf8');
  const normalized = original.replace(/\r\n/g, '\n');

  if (normalized.includes('def hasProject = { name ->')) {
    console.log('[postinstall] expo-dev-client build.gradle already patched.');
    process.exit(0);
  }

  const updated = normalized.replace(
    `${originalBlock}\n`,
    `${hasProjectBlock}${patchedBlock}\n`
  );

  if (updated === normalized) {
    console.warn('[postinstall] Expected dependency block not found, skipping patch.');
    process.exit(0);
  }

  fs.writeFileSync(gradlePath, updated, 'utf8');
  console.log('[postinstall] Patched expo-dev-client build.gradle to guard optional projects.');
} catch (error) {
  console.error('[postinstall] Failed to patch expo-dev-client build.gradle:', error);
  process.exit(1);
}

