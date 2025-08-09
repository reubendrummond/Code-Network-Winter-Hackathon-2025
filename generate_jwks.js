import fs from 'fs';
import crypto from 'crypto';

// Read the private key
const privateKey = fs.readFileSync('temp_private_key.pem', 'utf8');

// Create a key object
const keyObject = crypto.createPrivateKey(privateKey);

// Extract the public key
const publicKey = crypto.createPublicKey(keyObject);

// Get the key details
const keyDetails = publicKey.asymmetricKeyDetails;
const keyData = publicKey.export({ format: 'jwk' });

// Generate a key ID (kid)
const kid = crypto.randomBytes(16).toString('hex');

// Create JWKS
const jwks = {
  keys: [
    {
      ...keyData,
      kid: kid,
      alg: 'RS256',
      use: 'sig'
    }
  ]
};

console.log(JSON.stringify(jwks));
