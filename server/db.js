// MongoDB connection with Mongoose. The connection is cached so serverless functions reuse it.
import mongoose from 'mongoose';
import { seed } from './seed.js';

let ready = null;

function mongoUri() {
  const env = process.env;
  if (env.MONGODB_URI) return env.MONGODB_URI;
  // Vercel integrations may add a prefix, e.g. Mangao_MONGODB_URI
  const key = Object.keys(env).find((k) => k.endsWith('MONGODB_URI'));
  if (key) return env[key];
  if (process.env.VERCEL) throw new Error('MONGODB_URI is not set. Connect a MongoDB Atlas database to this Vercel project.');
  return 'mongodb://127.0.0.1:27017/mangao';
}

export function connectDB() {
  if (!ready) {
    ready = (async () => {
      mongoose.set('strictQuery', true);
      await mongoose.connect(mongoUri(), { serverSelectionTimeoutMS: 10000, maxPoolSize: 5 });
      await seed();
    })().catch((err) => {
      ready = null; // try again on the next request
      throw err;
    });
  }
  return ready;
}
