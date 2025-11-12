/**
 * Technology Knowledge Base
 * Reference database of technologies for detection and classification
 */

import { TechCategory, TechAuthenticity } from '../types';

export interface TechnologyDefinition {
  name: string;
  category: TechCategory;
  aliases: string[]; // Alternative names
  patterns: string[]; // Regex patterns for detection
  typical_authenticity?: TechAuthenticity;
  known_wrappers?: string[]; // Known GPT wrapper indicators
  deprecation_info?: {
    is_deprecated: boolean;
    deprecated_since?: string;
    replacement?: string;
  };
  risk_indicators?: {
    security_issues?: string[];
    outdated_threshold?: string; // e.g., "2 years"
    default_risk_score?: number; // 0-100
  };
  license_info?: {
    typical_license: string;
    is_open_source: boolean;
  };
}

/**
 * Frontend Technologies
 */
export const FRONTEND_TECHNOLOGIES: TechnologyDefinition[] = [
  {
    name: 'React',
    category: 'frontend',
    aliases: ['ReactJS', 'React.js'],
    patterns: ['\\breact\\b', 'react-dom', 'jsx', 'tsx'],
    risk_indicators: { default_risk_score: 10 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },
  {
    name: 'Vue',
    category: 'frontend',
    aliases: ['Vue.js', 'VueJS'],
    patterns: ['\\bvue\\b', 'vue-router', 'vuex', 'pinia'],
    risk_indicators: { default_risk_score: 10 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },
  {
    name: 'Angular',
    category: 'frontend',
    aliases: ['AngularJS', 'Angular.js'],
    patterns: ['\\bangular\\b', '@angular/', 'ng-'],
    risk_indicators: { default_risk_score: 15 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },
  {
    name: 'Next.js',
    category: 'frontend',
    aliases: ['NextJS'],
    patterns: ['\\bnext\\b', 'next/.*', 'getServerSideProps', 'getStaticProps'],
    risk_indicators: { default_risk_score: 5 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },
  {
    name: 'Svelte',
    category: 'frontend',
    aliases: ['SvelteKit'],
    patterns: ['\\bsvelte\\b', 'svelte-kit'],
    risk_indicators: { default_risk_score: 20 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },
];

/**
 * Backend Technologies
 */
export const BACKEND_TECHNOLOGIES: TechnologyDefinition[] = [
  {
    name: 'Node.js',
    category: 'backend',
    aliases: ['NodeJS', 'Node'],
    patterns: ['\\bnode\\b', 'nodejs', 'npm', 'package\\.json'],
    risk_indicators: { default_risk_score: 10 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },
  {
    name: 'Express',
    category: 'backend',
    aliases: ['Express.js', 'ExpressJS'],
    patterns: ['\\bexpress\\b', 'express-validator', 'body-parser'],
    risk_indicators: { default_risk_score: 15 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },
  {
    name: 'Django',
    category: 'backend',
    aliases: ['Django Framework'],
    patterns: ['\\bdjango\\b', 'django-admin', 'manage\\.py'],
    risk_indicators: { default_risk_score: 10 },
    license_info: { typical_license: 'BSD', is_open_source: true },
  },
  {
    name: 'Flask',
    category: 'backend',
    aliases: ['Flask Framework'],
    patterns: ['\\bflask\\b', 'flask-restful', 'werkzeug'],
    risk_indicators: { default_risk_score: 20 },
    license_info: { typical_license: 'BSD', is_open_source: true },
  },
  {
    name: 'FastAPI',
    category: 'backend',
    aliases: [],
    patterns: ['\\bfastapi\\b', 'uvicorn', 'starlette'],
    risk_indicators: { default_risk_score: 5 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },
  {
    name: 'Ruby on Rails',
    category: 'backend',
    aliases: ['Rails', 'RoR'],
    patterns: ['\\brails\\b', 'ruby on rails', 'activerecord', 'gemfile'],
    risk_indicators: { default_risk_score: 25 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },
];

/**
 * Database Technologies
 */
export const DATABASE_TECHNOLOGIES: TechnologyDefinition[] = [
  {
    name: 'PostgreSQL',
    category: 'database',
    aliases: ['Postgres', 'psql'],
    patterns: ['\\bpostgres\\b', 'postgresql', 'psql', 'pg_'],
    risk_indicators: { default_risk_score: 5 },
    license_info: { typical_license: 'PostgreSQL', is_open_source: true },
  },
  {
    name: 'MySQL',
    category: 'database',
    aliases: ['MariaDB'],
    patterns: ['\\bmysql\\b', 'mariadb'],
    risk_indicators: { default_risk_score: 10 },
    license_info: { typical_license: 'GPL', is_open_source: true },
  },
  {
    name: 'MongoDB',
    category: 'database',
    aliases: ['Mongo'],
    patterns: ['\\bmongodb\\b', '\\bmongo\\b', 'mongoose'],
    risk_indicators: { default_risk_score: 15 },
    license_info: { typical_license: 'SSPL', is_open_source: true },
  },
  {
    name: 'Redis',
    category: 'database',
    aliases: [],
    patterns: ['\\bredis\\b', 'ioredis', 'redis-cli'],
    risk_indicators: { default_risk_score: 10 },
    license_info: { typical_license: 'BSD', is_open_source: true },
  },
  {
    name: 'Supabase',
    category: 'database',
    aliases: [],
    patterns: ['\\bsupabase\\b', '@supabase/', 'supabase-js'],
    risk_indicators: { default_risk_score: 10 },
    license_info: { typical_license: 'Apache-2.0', is_open_source: true },
  },
];

/**
 * ML/AI Technologies
 */
export const ML_AI_TECHNOLOGIES: TechnologyDefinition[] = [
  // Proprietary AI
  {
    name: 'OpenAI GPT',
    category: 'ml_ai',
    aliases: ['ChatGPT', 'GPT-4', 'GPT-3.5'],
    patterns: ['\\bgpt-4\\b', '\\bgpt-3\\.5\\b', 'openai', 'chatgpt'],
    typical_authenticity: 'third_party',
    risk_indicators: { default_risk_score: 30 },
  },
  {
    name: 'Claude',
    category: 'ml_ai',
    aliases: ['Anthropic Claude'],
    patterns: ['\\bclaude\\b', 'anthropic', 'claude-3', 'claude-2'],
    typical_authenticity: 'third_party',
    risk_indicators: { default_risk_score: 25 },
  },
  {
    name: 'Gemini',
    category: 'ml_ai',
    aliases: ['Google Gemini', 'Bard'],
    patterns: ['\\bgemini\\b', 'google gemini', '\\bbard\\b'],
    typical_authenticity: 'third_party',
    risk_indicators: { default_risk_score: 30 },
  },

  // Open Source Models
  {
    name: 'LLaMA',
    category: 'ml_ai',
    aliases: ['Llama', 'Meta LLaMA'],
    patterns: ['\\bllama\\b', 'meta-llama', 'llama-2', 'llama-3'],
    typical_authenticity: 'third_party',
    risk_indicators: { default_risk_score: 20 },
    license_info: { typical_license: 'Custom Meta', is_open_source: true },
  },
  {
    name: 'Mistral',
    category: 'ml_ai',
    aliases: ['Mistral AI'],
    patterns: ['\\bmistral\\b', 'mistral-7b', 'mixtral'],
    typical_authenticity: 'third_party',
    risk_indicators: { default_risk_score: 20 },
    license_info: { typical_license: 'Apache-2.0', is_open_source: true },
  },

  // ML Frameworks
  {
    name: 'TensorFlow',
    category: 'ml_ai',
    aliases: ['TF'],
    patterns: ['\\btensorflow\\b', '\\btf\\.', 'keras'],
    typical_authenticity: 'third_party',
    risk_indicators: { default_risk_score: 15 },
    license_info: { typical_license: 'Apache-2.0', is_open_source: true },
  },
  {
    name: 'PyTorch',
    category: 'ml_ai',
    aliases: ['Torch'],
    patterns: ['\\bpytorch\\b', '\\btorch\\b', 'torchvision'],
    typical_authenticity: 'third_party',
    risk_indicators: { default_risk_score: 15 },
    license_info: { typical_license: 'BSD', is_open_source: true },
  },
  {
    name: 'Hugging Face',
    category: 'ml_ai',
    aliases: ['HuggingFace', 'transformers'],
    patterns: ['huggingface', 'transformers', 'diffusers', 'datasets'],
    typical_authenticity: 'third_party',
    risk_indicators: { default_risk_score: 10 },
    license_info: { typical_license: 'Apache-2.0', is_open_source: true },
  },
  {
    name: 'LangChain',
    category: 'ml_ai',
    aliases: [],
    patterns: ['\\blangchain\\b', 'langchain-core', 'langsmith'],
    typical_authenticity: 'third_party',
    risk_indicators: { default_risk_score: 20 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },

  // Wrapper Indicators
  {
    name: 'OpenAI API Wrapper',
    category: 'ml_ai',
    aliases: [],
    patterns: ['openai\\.ChatCompletion', 'openai\\.Completion', 'OPENAI_API_KEY'],
    typical_authenticity: 'wrapper',
    known_wrappers: ['Simple API calls without fine-tuning', 'No custom training'],
    risk_indicators: { default_risk_score: 60 },
  },
];

/**
 * Infrastructure Technologies
 */
export const INFRASTRUCTURE_TECHNOLOGIES: TechnologyDefinition[] = [
  {
    name: 'Docker',
    category: 'infrastructure',
    aliases: [],
    patterns: ['\\bdocker\\b', 'dockerfile', 'docker-compose'],
    risk_indicators: { default_risk_score: 5 },
    license_info: { typical_license: 'Apache-2.0', is_open_source: true },
  },
  {
    name: 'Kubernetes',
    category: 'infrastructure',
    aliases: ['K8s'],
    patterns: ['\\bkubernetes\\b', '\\bk8s\\b', 'kubectl', 'helm'],
    risk_indicators: { default_risk_score: 10 },
    license_info: { typical_license: 'Apache-2.0', is_open_source: true },
  },
  {
    name: 'AWS',
    category: 'infrastructure',
    aliases: ['Amazon Web Services'],
    patterns: ['\\baws\\b', 'amazon web services', 'ec2', 's3', 'lambda'],
    risk_indicators: { default_risk_score: 15 },
  },
  {
    name: 'Google Cloud',
    category: 'infrastructure',
    aliases: ['GCP', 'Google Cloud Platform'],
    patterns: ['\\bgcp\\b', 'google cloud', 'gke', 'cloud run'],
    risk_indicators: { default_risk_score: 15 },
  },
  {
    name: 'Azure',
    category: 'infrastructure',
    aliases: ['Microsoft Azure'],
    patterns: ['\\bazure\\b', 'microsoft azure', 'azureml'],
    risk_indicators: { default_risk_score: 15 },
  },
  {
    name: 'Vercel',
    category: 'infrastructure',
    aliases: [],
    patterns: ['\\bvercel\\b', 'vercel\\.json', 'vercel deploy'],
    risk_indicators: { default_risk_score: 10 },
  },
];

/**
 * DevOps Technologies
 */
export const DEVOPS_TECHNOLOGIES: TechnologyDefinition[] = [
  {
    name: 'GitHub Actions',
    category: 'devops',
    aliases: [],
    patterns: ['\\.github/workflows', 'github actions', 'actions/checkout'],
    risk_indicators: { default_risk_score: 5 },
  },
  {
    name: 'GitLab CI',
    category: 'devops',
    aliases: [],
    patterns: ['\\.gitlab-ci\\.yml', 'gitlab-ci', 'gitlab runner'],
    risk_indicators: { default_risk_score: 5 },
  },
  {
    name: 'Jenkins',
    category: 'devops',
    aliases: [],
    patterns: ['\\bjenkins\\b', 'jenkinsfile', 'jenkins pipeline'],
    risk_indicators: { default_risk_score: 25 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },
  {
    name: 'Terraform',
    category: 'devops',
    aliases: [],
    patterns: ['\\bterraform\\b', '\\.tf$', 'terraform apply'],
    risk_indicators: { default_risk_score: 10 },
    license_info: { typical_license: 'MPL-2.0', is_open_source: true },
  },
];

/**
 * Security Technologies
 */
export const SECURITY_TECHNOLOGIES: TechnologyDefinition[] = [
  {
    name: 'OAuth 2.0',
    category: 'security',
    aliases: ['OAuth2'],
    patterns: ['\\boauth\\b', 'oauth2', 'authorization_code', 'access_token'],
    risk_indicators: { default_risk_score: 5 },
  },
  {
    name: 'JWT',
    category: 'security',
    aliases: ['JSON Web Token'],
    patterns: ['\\bjwt\\b', 'jsonwebtoken', 'jose'],
    risk_indicators: { default_risk_score: 10 },
  },
  {
    name: 'Auth0',
    category: 'security',
    aliases: [],
    patterns: ['\\bauth0\\b', '@auth0/', 'auth0-js'],
    risk_indicators: { default_risk_score: 15 },
  },
  {
    name: 'Supabase Auth',
    category: 'security',
    aliases: [],
    patterns: ['supabase\\.auth', '@supabase/auth'],
    risk_indicators: { default_risk_score: 10 },
  },
];

/**
 * Testing Technologies
 */
export const TESTING_TECHNOLOGIES: TechnologyDefinition[] = [
  {
    name: 'Jest',
    category: 'testing',
    aliases: [],
    patterns: ['\\bjest\\b', 'jest\\.config', '@jest/'],
    risk_indicators: { default_risk_score: 5 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },
  {
    name: 'Playwright',
    category: 'testing',
    aliases: [],
    patterns: ['\\bplaywright\\b', '@playwright/', 'playwright\\.config'],
    risk_indicators: { default_risk_score: 5 },
    license_info: { typical_license: 'Apache-2.0', is_open_source: true },
  },
  {
    name: 'Cypress',
    category: 'testing',
    aliases: [],
    patterns: ['\\bcypress\\b', 'cypress\\.json', 'cypress/integration'],
    risk_indicators: { default_risk_score: 10 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },
  {
    name: 'pytest',
    category: 'testing',
    aliases: [],
    patterns: ['\\bpytest\\b', 'pytest\\.ini', 'test_.*\\.py'],
    risk_indicators: { default_risk_score: 5 },
    license_info: { typical_license: 'MIT', is_open_source: true },
  },
];

/**
 * Monitoring Technologies
 */
export const MONITORING_TECHNOLOGIES: TechnologyDefinition[] = [
  {
    name: 'Sentry',
    category: 'monitoring',
    aliases: [],
    patterns: ['\\bsentry\\b', '@sentry/', 'sentry-cli'],
    risk_indicators: { default_risk_score: 5 },
  },
  {
    name: 'Datadog',
    category: 'monitoring',
    aliases: [],
    patterns: ['\\bdatadog\\b', 'dd-trace', 'datadog-agent'],
    risk_indicators: { default_risk_score: 10 },
  },
  {
    name: 'New Relic',
    category: 'monitoring',
    aliases: [],
    patterns: ['\\bnewrelic\\b', 'new relic', 'newrelic-agent'],
    risk_indicators: { default_risk_score: 15 },
  },
  {
    name: 'Prometheus',
    category: 'monitoring',
    aliases: [],
    patterns: ['\\bprometheus\\b', 'prometheus\\.yml', 'promql'],
    risk_indicators: { default_risk_score: 10 },
    license_info: { typical_license: 'Apache-2.0', is_open_source: true },
  },
];

/**
 * Master technology database
 */
export const ALL_TECHNOLOGIES: TechnologyDefinition[] = [
  ...FRONTEND_TECHNOLOGIES,
  ...BACKEND_TECHNOLOGIES,
  ...DATABASE_TECHNOLOGIES,
  ...ML_AI_TECHNOLOGIES,
  ...INFRASTRUCTURE_TECHNOLOGIES,
  ...DEVOPS_TECHNOLOGIES,
  ...SECURITY_TECHNOLOGIES,
  ...TESTING_TECHNOLOGIES,
  ...MONITORING_TECHNOLOGIES,
];

/**
 * Known GPT Wrapper Patterns
 * These indicate a company is just wrapping OpenAI/Claude without proprietary tech
 */
export const GPT_WRAPPER_INDICATORS = [
  'openai.ChatCompletion.create',
  'openai.Completion.create',
  'OPENAI_API_KEY',
  'anthropic.completions.create',
  'ANTHROPIC_API_KEY',
  'simple prompt engineering',
  'no fine-tuning',
  'no custom training data',
  'direct API calls only',
  'system prompts only',
];

/**
 * Proprietary AI Indicators
 * These suggest genuine proprietary AI development
 */
export const PROPRIETARY_AI_INDICATORS = [
  'custom model training',
  'fine-tuning pipeline',
  'training data preprocessing',
  'model evaluation metrics',
  'hyperparameter optimization',
  'custom architecture',
  'model deployment infrastructure',
  'inference optimization',
  'model versioning',
  'a/b testing framework',
  'reinforcement learning',
  'active learning',
  'data labeling workflow',
  'model monitoring',
  'custom embeddings',
];

/**
 * Find technology by name or alias
 */
export function findTechnology(name: string): TechnologyDefinition | undefined {
  const normalized = name.toLowerCase().trim();
  return ALL_TECHNOLOGIES.find(
    (tech) =>
      tech.name.toLowerCase() === normalized ||
      tech.aliases.some((alias) => alias.toLowerCase() === normalized)
  );
}

/**
 * Search technologies by pattern
 */
export function searchTechnologies(text: string): TechnologyDefinition[] {
  const matches: TechnologyDefinition[] = [];
  const normalized = text.toLowerCase();

  for (const tech of ALL_TECHNOLOGIES) {
    // Check if any pattern matches
    const hasMatch = tech.patterns.some((pattern) => {
      try {
        const regex = new RegExp(pattern, 'i');
        return regex.test(normalized);
      } catch {
        // Fallback to simple string matching if regex is invalid
        return normalized.includes(pattern.toLowerCase());
      }
    });

    if (hasMatch) {
      matches.push(tech);
    }
  }

  return matches;
}

/**
 * Get technologies by category
 */
export function getTechnologiesByCategory(category: TechCategory): TechnologyDefinition[] {
  return ALL_TECHNOLOGIES.filter((tech) => tech.category === category);
}

/**
 * Check if text contains GPT wrapper indicators
 */
export function hasGPTWrapperIndicators(text: string): {
  isLikelyWrapper: boolean;
  indicators: string[];
  confidence: number;
} {
  const normalized = text.toLowerCase();
  const foundIndicators = GPT_WRAPPER_INDICATORS.filter((indicator) =>
    normalized.includes(indicator.toLowerCase())
  );

  const confidence = Math.min(
    (foundIndicators.length / GPT_WRAPPER_INDICATORS.length) * 100,
    95
  );

  return {
    isLikelyWrapper: foundIndicators.length >= 2,
    indicators: foundIndicators,
    confidence: Math.round(confidence),
  };
}

/**
 * Check if text contains proprietary AI indicators
 */
export function hasProprietaryAIIndicators(text: string): {
  isLikelyProprietary: boolean;
  indicators: string[];
  confidence: number;
} {
  const normalized = text.toLowerCase();
  const foundIndicators = PROPRIETARY_AI_INDICATORS.filter((indicator) =>
    normalized.includes(indicator.toLowerCase())
  );

  const confidence = Math.min(
    (foundIndicators.length / PROPRIETARY_AI_INDICATORS.length) * 100,
    95
  );

  return {
    isLikelyProprietary: foundIndicators.length >= 3,
    indicators: foundIndicators,
    confidence: Math.round(confidence),
  };
}
