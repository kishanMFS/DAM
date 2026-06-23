import { createDefaultPreset } from 'ts-jest';
// import ts from "typescript";

const tsJestTransformCfg = createDefaultPreset().transform;

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.env.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    // '^.+\\.(ts|tsx)$': 'ts-jest',
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Add this line to handle path aliases for jest tests
  },
  resolver: 'ts-jest-resolver',
  // moduleDirectories: ['node_modules', 'src'],
  // extensionsToTreatAsEsm: ['.ts'],
};
