
const axios = require('axios');

const API_URL = 'http://localhost:3001/api/auth/login';

// Valid credentials (assuming we have a seed user or I can find one)
// Based on previous contexts or assume standard test user
// Typically 'admin' / '123456' or similar. 
// authController says password checks against bcrypt.
// authService says: if tckn exists, check tckn (plaintext?), else check sifre (bcrypt).
// "Check password - artık TCKN kullanılıyor"
// "Önce TCKN kontrolü yap, yoksa eski şifre sistemine geri dön"

async function testLogin(id, sifre, description) {
    console.log(`\nTesting: ${description}`);
    console.log(`Payload: { id: '${id}', sifre: '${sifre}' }`);

    try {
        const response = await axios.post(API_URL, {
            id,
            sifre
        }, {
            validateStatus: () => true // Don't throw on error status
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));

        return response.status;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('Error: Connection refused. Is the server running on port 3001?');
        } else {
            console.log('Error:', error.message);
        }
        return 0;
    }
}

async function runTests() {
    console.log('Starting Login API Tests...');

    // Test 1: Missing credentials (expect 400)
    await testLogin('', '', 'Missing Credentials');

    // Test 2: Admin Login (Bcrypt) -> Should Success
    await testLogin('admin', '123456', 'Admin Login (Bcrypt)');

    // Test 3: Student Login (TCKN) -> Should Success
    await testLogin('student1', '22222222222', 'Student Login (TCKN)');

    // Test 4: Invalid User
    await testLogin('nonexistent', 'fail', 'Invalid User');

    // Test 5: Wrong Password
    await testLogin('admin', 'wrong', 'Wrong Password');
}

runTests();
