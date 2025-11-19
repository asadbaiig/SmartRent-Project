#!/bin/bash
# Script to run tests with coverage report

echo "Running tests with coverage..."
echo ""

NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage --coverageReporters=text --coverageReporters=text-summary

echo ""
echo "Coverage report generated in 'coverage' directory"
echo "HTML report available at: coverage/index.html"














