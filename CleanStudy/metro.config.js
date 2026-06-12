const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The Anthropic SDK lazily imports Node builtins (node:fs, node:path) for
// reading `ant auth` credential profiles. Those code paths never run in the
// app — we always pass an explicit API key — so stub the builtins out for
// React Native, where they don't exist.
const NODE_BUILTINS = new Set(['fs', 'path', 'os', 'child_process', 'util', 'crypto']);
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const bare = moduleName.startsWith('node:') ? moduleName.slice(5) : moduleName;
  if (moduleName.startsWith('node:') || NODE_BUILTINS.has(bare)) {
    return { type: 'empty' };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
