import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2020
      }
    },
    rules: {
      // Regras básicas do TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
      
      // Regras gerais de segurança
      'no-console': 'off', // Permitir console.log para logging
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      
      // Regras customizadas para segurança de escopo
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name=/^(findAllGlobal|findByIdGlobal|countGlobal|createScopedQueryBuilder)$/]',
          message: 'Métodos globais do ScopedRepository devem ser usados apenas com validação adequada de escopo. Considere usar métodos com escopo ou validar explicitamente o contexto.'
        },
        {
          selector: 'NewExpression[callee.name="ScopedRepository"][arguments.1.properties[?(@.key.name="allowGlobalScope" && @.value.value=true)]]',
          message: 'allowGlobalScope=true deve ser usado apenas em casos específicos e documentados. Verifique se é realmente necessário.'
        }
      ]
    }
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts'],
    rules: {
      // Regras mais flexíveis para testes
      '@typescript-eslint/no-explicit-any': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'security/detect-object-injection': 'off'
    }
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.js',
      '*.d.ts',
      'public/**',
      'docs/**'
    ]
  }
];