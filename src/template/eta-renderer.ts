import * as path from 'node:path';
import { Eta } from 'eta';

const views = path.join(__dirname, '..', 'views', 'templates');
const eta = new Eta({ views, useWith: false, cache: true });

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
