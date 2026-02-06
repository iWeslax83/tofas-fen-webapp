const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    adSoyad: { type: String, required: true },
    rol: { type: String, required: true },
    sifre: { type: String },
    email: { type: String },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: true },
    loginCount: { type: Number, default: 0 },
    tokenVersion: { type: Number, default: 0 }
});

// Use existing collection name 'users' implicitly or explicitly
const User = mongoose.model('User', UserSchema);

async function seed() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error("MONGODB_URI missing");
            process.exit(1);
        }
        console.log('Connecting to DB...');
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const hashedPassword = await bcrypt.hash('123456', 8);

        // Create admin user
        const admin = {
            id: 'admin1',
            adSoyad: 'Dr. Mehmet Yılmaz',
            email: 'mehmet.yilmaz@tofasfen.edu.tr',
            rol: 'admin',
            sifre: hashedPassword,
            isActive: true,
            emailVerified: true,
            tokenVersion: 0,
            loginCount: 0
        };

        const res = await User.updateOne(
            { id: 'admin1' },
            { $set: admin },
            { upsert: true }
        );

        console.log('Seed result:', res);
        console.log('✅ Admin user (admin1) seeded successfully');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
