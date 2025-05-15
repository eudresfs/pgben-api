module.exports = {
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:security/recommended",
    "plugin:node/recommended",
    "plugin:sonarjs/recommended"
  ],
  "plugins": [
    "@typescript-eslint",
    "security",
    "node",
    "sonarjs",
    "no-secrets"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "rules": {
    // Regras de segurança
    "security/detect-buffer-noassert": "error",
    "security/detect-child-process": "warn",
    "security/detect-disable-mustache-escape": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-new-buffer": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-non-literal-fs-filename": "warn",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-non-literal-require": "warn",
    "security/detect-object-injection": "warn",
    "security/detect-possible-timing-attacks": "error",
    "security/detect-pseudoRandomBytes": "error",
    "security/detect-unsafe-regex": "error",
    
    // Regras para evitar vazamento de segredos
    "no-secrets/no-secrets": ["error", {
      "ignoreIdentifiers": [
        "IGNORE_",
        "PUBLIC_"
      ],
      "additionalRegexes": {
        "Basic Auth": "Authorization: Basic [A-Za-z0-9+/=]*"
      }
    }],
    
    // Regras de qualidade de código
    "sonarjs/cognitive-complexity": ["error", 15],
    "sonarjs/no-duplicate-string": ["error", 5],
    "sonarjs/no-identical-functions": "error",
    "sonarjs/no-redundant-boolean": "error",
    "sonarjs/no-small-switch": "error",
    "sonarjs/no-unused-collection": "error",
    "sonarjs/prefer-immediate-return": "error",
    "sonarjs/prefer-object-literal": "error",
    "sonarjs/prefer-single-boolean-return": "error",
    
    // Regras específicas para Node.js
    "node/no-deprecated-api": "error",
    "node/no-extraneous-require": "error",
    "node/no-missing-require": "error",
    "node/no-unpublished-require": "off",
    "node/no-unsupported-features/es-syntax": "off",
    
    // Regras TypeScript
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { 
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_" 
    }],
    "@typescript-eslint/no-use-before-define": ["error", { 
      "functions": false,
      "classes": true,
      "variables": true
    }]
  },
  "overrides": [
    {
      "files": ["*.spec.ts", "*.test.ts"],
      "rules": {
        "sonarjs/no-duplicate-string": "off",
        "sonarjs/cognitive-complexity": "off",
        "node/no-unpublished-require": "off",
        "security/detect-non-literal-fs-filename": "off"
      }
    }
  ],
  "settings": {
    "node": {
      "tryExtensions": [".ts", ".js", ".json", ".node"]
    }
  }
}
