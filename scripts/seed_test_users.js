
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: 'server/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tofas-fen-webapp';

async function seedUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Clear existing just in case (though previous check said 0)
        await usersCollection.deleteMany({ id: { $in: ['admin', 'student1'] } });

        const hashedPassword = await bcrypt.hash('123456', 10);

        const adminUser = {
            id: 'admin',
            adSoyad: 'System Admin',
            rol: 'admin',
            email: 'admin@example.com',
            sifre: hashedPassword,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            tokenVersion: 0,
            emailVerified: true,
            loginCount: 0,
            tckn: '11111111111'
        };

        const studentUser = {
            id: 'student1',
            adSoyad: 'Test Student',
            rol: 'student',
            email: 'student@example.com',
            tckn: '22222222222',
            // Intentionally NO sifre to test TCKN logic if applicable
            isActive: true,
            sinif: '10',
            sube: 'A',
            createdAt: new Date(),
            updatedAt: new Date(),
            tokenVersion: 0,
            emailVerified: true,
            loginCount: 0,
            childId: []
        };

        await usersCollection.insertMany([adminUser, studentUser]);
        console.log('✅ Seeded admin (pass: 123456, tckn: 11111111111)');
        console.log('✅ Seeded student1 (tckn: 22222222222)');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

seedUsers();
