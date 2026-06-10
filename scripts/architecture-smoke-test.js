const fs = require('fs');
const path = require('path');

const root = process.cwd();

const mustExist = [
  'features/listings/api/listing-repository.ts',
  'features/listings/api/image-upload-service.ts',
  'features/listings/hooks/use-listing-feeds.ts',
  'features/listings/hooks/use-listing-detail.ts',
  'features/chat/api/chat-repository.ts',
  'features/chat/hooks/use-resolve-conversation.ts',
  'features/subscription/api/subscription-service.ts',
  'features/taxonomy/api/taxonomy-cache.ts',
  'components/states/BlockingState.tsx',
  'hooks/use-color-scheme.ts',
  'hooks/use-client-only-value.ts',
  'types/domain.ts',
];

const mustNotExist = [
  'lib/ImageOptimizer.ts',
  'components/useColorScheme.ts',
  'components/useColorScheme.web.ts',
  'components/useClientOnlyValue.ts',
  'components/useClientOnlyValue.web.ts',
  'scraper_diagnose.tsx',
  'scraper_fixed.tsx',
  'scraper_fixed_v2.tsx',
  'scraper_fixed_v2 (1).tsx',
  'fix_db.sql',
  'test.txt',
  'check_constraints.js',
];

for (const file of mustExist) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Expected architecture file missing: ${file}`);
  }
}

for (const file of mustNotExist) {
  const fullPath = path.join(root, file);
  if (fs.existsSync(fullPath)) {
    throw new Error(`Legacy architecture artifact still at root/old path: ${file}`);
  }
}

console.log('Architecture smoke checks passed.');
