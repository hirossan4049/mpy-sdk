import { PythonAnalyzer } from './PythonAnalyzer';

describe('PythonAnalyzer', () => {
  let analyzer: PythonAnalyzer;

  beforeEach(() => {
    analyzer = new PythonAnalyzer();
  });

  describe('basic functionality', () => {
    it('should be instantiated', () => {
      expect(analyzer).toBeDefined();
    });

    it('should have isBuiltinModule method', () => {
      expect(typeof analyzer.isBuiltinModule).toBe('function');
    });

    it('should identify Python builtin modules', () => {
      expect(analyzer.isBuiltinModule('os')).toBe(true);
      expect(analyzer.isBuiltinModule('sys')).toBe(true);
      expect(analyzer.isBuiltinModule('json')).toBe(true);
      expect(analyzer.isBuiltinModule('math')).toBe(true);
    });

    it('should identify custom modules correctly', () => {
      expect(analyzer.isBuiltinModule('mymodule')).toBe(false);
      expect(analyzer.isBuiltinModule('custom_package')).toBe(false);
    });
  });

  describe('parseImports', () => {
    it('should parse basic import statements', () => {
      const code = `
import os
import sys
from math import sqrt
      `;
      
      const imports = analyzer.parseImports(code);
      
      expect(imports).toHaveLength(3);
      expect(imports[0]).toMatchObject({
        type: 'import',
        module: 'os',
        isRelative: false,
      });
    });

    it('should handle empty code', () => {
      const imports = analyzer.parseImports('');
      expect(imports).toHaveLength(0);
    });
  });
});
