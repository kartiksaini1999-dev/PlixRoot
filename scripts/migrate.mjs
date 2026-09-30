import { database } from '../lib/store.mjs';
const db=await database();console.log('Database schema ready:',db.mode);
