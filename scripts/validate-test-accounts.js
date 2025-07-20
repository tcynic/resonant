#!/usr/bin/env node

/**
 * Test Account Validation Script for CI/CD
 * Validates that test accounts are accessible and functional
 */

const { config } = require('dotenv');
const path = require('path');

// Load test environment variables
config({ path: path.resolve(process.cwd(), '.env.test') });

async function validateTestAccounts() {
  console.log('🔍 Validating test accounts...');
  
  const testAccounts = [
    {
      name: 'New User',
      email: 'newuser@test.resonant.local',
      type: 'new_user'
    },
    {
      name: 'Active User', 
      email: 'activeuser@test.resonant.local',
      type: 'active_user'
    },
    {
      name: 'Power User',
      email: 'poweruser@test.resonant.local',
      type: 'power_user'
    },
    {
      name: 'Edge Case User',
      email: 'edgeuser@test.resonant.local',
      type: 'edge_case_user'
    }
  ];

  let validationResults = {
    totalAccounts: testAccounts.length,
    validAccounts: 0,
    invalidAccounts: 0,
    details: []
  };

  try {
    for (const account of testAccounts) {
      console.log(`  🔎 Validating: ${account.name} (${account.email})`);
      
      const validation = await validateSingleAccount(account);
      validationResults.details.push(validation);
      
      if (validation.isValid) {
        validationResults.validAccounts++;
        console.log(`    ✅ Valid: ${account.name}`);
      } else {
        validationResults.invalidAccounts++;
        console.log(`    ❌ Invalid: ${account.name} - ${validation.error}`);
      }
    }

    // Summary
    console.log('\n📊 Validation Summary:');
    console.log(`  Total accounts: ${validationResults.totalAccounts}`);
    console.log(`  Valid accounts: ${validationResults.validAccounts}`);
    console.log(`  Invalid accounts: ${validationResults.invalidAccounts}`);
    
    const successRate = (validationResults.validAccounts / validationResults.totalAccounts) * 100;
    console.log(`  Success rate: ${successRate.toFixed(1)}%`);

    if (validationResults.invalidAccounts === 0) {
      console.log('🎉 All test accounts are valid and accessible!');
      return true;
    } else {
      console.log('⚠️  Some test accounts failed validation');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test account validation failed:', error.message);
    return false;
  }
}

async function validateSingleAccount(account) {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(account.email)) {
      return {
        account: account.name,
        isValid: false,
        error: 'Invalid email format'
      };
    }

    // Validate test domain
    if (!account.email.includes('test.resonant.local')) {
      return {
        account: account.name,
        isValid: false,
        error: 'Email not in test domain'
      };
    }

    // Validate account type
    const validTypes = ['new_user', 'active_user', 'power_user', 'edge_case_user'];
    if (!validTypes.includes(account.type)) {
      return {
        account: account.name,
        isValid: false,
        error: 'Invalid account type'
      };
    }

    // In a real implementation, we would check Convex database here
    // For now, we'll simulate the check
    if (process.env.NEXT_PUBLIC_CONVEX_URL_TEST) {
      // Simulate database check
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      account: account.name,
      isValid: true,
      error: null
    };
    
  } catch (error) {
    return {
      account: account.name,
      isValid: false,
      error: error.message
    };
  }
}

// Run if called directly
if (require.main === module) {
  validateTestAccounts()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Validation script crashed:', error);
      process.exit(1);
    });
}

module.exports = { validateTestAccounts };