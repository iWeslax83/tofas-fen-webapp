const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await mongoose.connection.collection('users').findOne({ id: 'admin1' });
  if (!user) {
    console.log('admin1 NOT FOUND in database');
    await mongoose.disconnect();
    return;
  }

  console.log('--- admin1 user ---');
  console.log('id:', user.id);
  console.log('adSoyad:', user.adSoyad);
  console.log('rol:', user.rol);
  console.log('isActive:', user.isActive);
  console.log('sifre exists:', !!user.sifre);
  console.log('sifre prefix:', user.sifre ? user.sifre.substring(0, 10) : 'NONE');
  console.log('tckn:', user.tckn || 'NONE');
  console.log('lockUntil:', user.lockUntil || 'NONE');
  console.log('failedLoginAttempts:', user.failedLoginAttempts || 0);

  if (user.sifre) {
    const match = await bcrypt.compare('123456', user.sifre);
    console.log('bcrypt compare "123456":', match);
  } else {
    console.log('NO sifre field - cannot bcrypt compare');
  }

  if (user.tckn) {
    console.log('tckn equals "123456":', user.tckn === '123456');
  }

  await mongoose.disconnect();
}

check().catch(e => console.error(e));
