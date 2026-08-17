import crypto from 'node:crypto';

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Provide an admin password of at least 12 characters.');
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, salt, 64);
console.log(`scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`);
