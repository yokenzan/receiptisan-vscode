import * as path from 'node:path';

type EtaInstance = {
  render: (templatePath: string, data: Record<string, unknown>) => string | null;
};

type EtaConstructor = new (options: {
  views: string;
  useWith: boolean;
  cache: boolean;
}) => EtaInstance;

// Use vendored Eta runtime copied into out/vendor during build so VSIX packaging
// can run with --no-dependencies.
const { Eta } = require('../vendor/eta.cjs') as { Eta: EtaConstructor };

const views = path.join(__dirname, '..', 'views', 'templates');
const eta = new Eta({ views, useWith: true, cache: true });

/**
 * Renders Eta template with provided data.
 */
export function renderTemplate(templatePath: string, data: Record<string, unknown>): string {
  const template = eta.render(templatePath, data);
  if (template == null) {
    throw new Error(`Template render failed: ${templatePath}`);
  }
  return template;
}
