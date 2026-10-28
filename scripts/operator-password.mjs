// Reads the password from stdin, never command-line arguments or source files.
import {randomBytes,scryptSync} from 'node:crypto';
let input='';for await(const chunk of process.stdin)input+=chunk;
const password=input.replace(/\r?\n$/,'');if(password.length<16){console.error('Use at least 16 characters.');process.exit(1);}
const salt=randomBytes(24).toString('hex');console.log(`scrypt$${salt}$${scryptSync(password,salt,64).toString('hex')}`);
