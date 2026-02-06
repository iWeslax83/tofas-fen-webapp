require('dotenv').config({ path: 'server/.env' });
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('No MONGODB_URI found in server/.env');
    process.exit(1);
}

console.log('Attempting to connect to MongoDB...');

mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
})
    .then(() => {
        console.log('✅ MongoDB connection successful!');
        console.log('Connected to:', mongoose.connection.name);
        return mongoose.disconnect();
    })
    .then(() => {
        console.log('Disconnected');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        process.exit(1);
    });
