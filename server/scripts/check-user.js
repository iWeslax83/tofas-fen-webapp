const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkUser() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error('MONGODB_URI is not set');
            process.exit(1);
        }

        console.log('Connecting to DB...');
        await mongoose.connect(uri);
        console.log('Connected to DB');

        // Check for admin1
        const user = await mongoose.connection.collection('users').findOne({ id: 'admin1' });
        console.log('User admin1:', user ? 'FOUND' : 'NOT FOUND');
        if (user) {
            console.log('admin1 password hash:', user.sifre ? user.sifre.substring(0, 10) + '...' : 'NONE');
        }

        // Check for admin
        const admin = await mongoose.connection.collection('users').findOne({ id: 'admin' });
        console.log('User admin:', admin ? 'FOUND' : 'NOT FOUND');

        // Count total users
        const count = await mongoose.connection.collection('users').countDocuments();
        console.log('Total users:', count);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        process.exit(0);
    }
}

checkUser();
