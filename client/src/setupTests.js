/**
 * File: setupTests.js
 *
 * Purpose:
 * Jest setup file loaded by Create React App before unit tests run.
 *
 * Main responsibilities:
 * - Import @testing-library/jest-dom so matchers like toHaveTextContent exist.
 *
 * Data flow:
 * - Not used at runtime in the browser; only during `npm test`.
 *
 * Important concepts:
 * CRA test configuration, Testing Library DOM matchers.
 */

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
