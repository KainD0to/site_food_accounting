import express from 'express';
import pkg from 'pg';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const { Pool } = pkg;
const app = express();

// CORS для фронтенда
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend-app.onrender.com' // замените на ваш URL
  ],
  credentials: true
}));

// Остальной код сервера остается как ранее...
// [здесь ваш существующий код]

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL}`);
  initDatabase();
});