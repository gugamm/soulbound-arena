// Node ESM resolver hook.
// Maps the browser-style "/shared/..." specifiers used by the client to
// filesystem paths, so test code can import client modules directly under Node.

const repoRoot = new URL('../../', import.meta.url);

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('/shared/')) {
    const rewritten = new URL('shared/' + specifier.slice('/shared/'.length), repoRoot).href;
    return nextResolve(rewritten, context);
  }
  return nextResolve(specifier, context);
}
