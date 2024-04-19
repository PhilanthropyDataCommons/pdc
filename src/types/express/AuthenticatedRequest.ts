import { Request as JwtRequest } from 'express-jwt';
import type { AuthContext } from '../AuthContext';

type AuthenticatedRequest = JwtRequest & Partial<AuthContext>;

export { AuthenticatedRequest };
