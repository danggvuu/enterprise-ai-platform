const fs = require('fs');
const path = require('path');

const replacements = [
  {
    file: 'dashboard/page.tsx',
    key: 'dashboard',
    title: 'Operational Dashboard',
    desc: 'Live telemetry sync from the API gateway core.'
  },
  {
    file: 'users/page.tsx',
    key: 'users',
    title: 'Organization Users',
    desc: 'Manage access controls, roles, and API keys.'
  },
  {
    file: 'orgs/page.tsx',
    key: 'orgs',
    title: 'Organizations',
    desc: 'Manage tenant workspaces and billing plans.'
  },
  {
    file: 'monitor/page.tsx',
    key: 'monitor',
    title: 'Live Request Monitor',
    desc: 'Real-time HTTP/SSE stream of gateway chat and API traffic.'
  },
  {
    file: 'providers/page.tsx',
    key: 'providers',
    title: 'Provider Management',
    desc: 'Configure weights, toggle endpoints, and inspect capabilities.'
  },
  {
    file: 'routing/page.tsx',
    key: 'routing',
    title: 'Routing Center',
    desc: 'Visualize global router pathfinding and set global optimization weight strategies.'
  },
  {
    file: 'policies/page.tsx',
    key: 'policies',
    title: 'Routing Policies',
    desc: 'Configure automated compliance, cost capping, and model downgrade rules.'
  },
  {
    file: 'cache/page.tsx',
    key: 'cache',
    title: 'Semantic Cache Dashboard',
    desc: 'Monitor Redis-backed semantic query performance and efficiency savings.'
  },
  {
    file: 'costs/page.tsx',
    key: 'costs',
    title: 'Cost Analytics',
    desc: 'Track LLM expenses, token consumption, and financial optimizations.'
  },
  {
    file: 'security/page.tsx',
    key: 'security',
    title: 'Security & Guardrails',
    desc: 'Audit log of Prompt Injection attempts, Vietnamese PII detections, and policy shields.'
  },
  {
    file: 'logs/page.tsx',
    key: 'logs',
    title: 'Logs Explorer',
    desc: 'Structured auditing, system tracing, and transaction outputs.'
  },
  {
    file: 'docs/page.tsx',
    key: 'docs',
    title: 'Gateway Documentation',
    desc: 'Access Swagger UI logs, system-wide schemas, and release architectures.'
  }
];

const basePath = path.join(__dirname, '../apps/control-plane/src/app/[locale]/admin');

replacements.forEach(({ file, key, title, desc }) => {
  const filePath = path.join(basePath, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already translated
  if (content.includes(`t('${key}')`)) return;

  // Inject import
  if (!content.includes("from 'next-intl'")) {
    content = content.replace(/(import React.*?from 'react';\n)/, "$1import { useTranslations } from 'next-intl';\n");
  }

  // Inject hook
  content = content.replace(/(export default function \w+\(.*?\)\s*\{)/, "$1\n  const t = useTranslations('Admin');");

  // Replace Title
  content = content.replace(`>${title}<`, `>{t('${key}')}<`);

  // Replace Description
  content = content.replace(`>${desc}<`, `>{t('${key}Desc')}<`);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Translated ${file}`);
});
