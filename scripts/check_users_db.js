
const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tofas-fen-webapp';

async function checkUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const users = await db.collection('users').find({}).limit(5).toArray();

        console.log('Found users:', users.length);
        users.forEach(u => {
            console.log(`User: ${u.id} | Rol: ${u.rol}`);
            console.log(`Has sifre: ${!!u.sifre}, length: ${u.sifre?.length}`);
            console.log(`Has tckn: ${!!u.tckn}, value: ${u.tckn || 'N/A'}`); // Be careful logging TCKN if real, but this is dev env
            console.log('---');
        });

        const admin = await db.collection('users').findOne({ role: 'admin' }) || await db.collection('users').findOne({ rol: 'admin' });
        if (admin) {
            console.log('Admin found:', admin.id);
            console.log('Admin has sifre:', !!admin.sifre);
        } else {
            console.log('No admin found');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkUsers();
