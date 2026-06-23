import { CorsOptions } from 'cors';

const whitelist: string[] = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost',
  'https://project-management-react-pi.vercel.app',
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests without origin (Postman, mobile apps, server-to-server)
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

export default corsOptions;
