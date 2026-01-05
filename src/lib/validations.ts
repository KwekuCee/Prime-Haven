import { z } from 'zod';

// Calculate minimum date (18 years ago)
const getMinimumAge = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date;
};

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export const registerPersonalSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .regex(/^[\d\s\+\-\(\)]+$/, 'Please enter a valid phone number')
    .max(20, 'Phone number must be less than 20 characters'),
  dob: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((date) => {
      const inputDate = new Date(date);
      return inputDate <= getMinimumAge();
    }, 'You must be at least 18 years old'),
  portfolioUrl: z
    .string()
    .url('Please enter a valid URL')
    .or(z.literal('')),
  professionalTitle: z
    .string()
    .min(1, 'Professional title is required'),
});

export const registerSkillsSchema = z.object({
  experience: z.string().min(1, 'Please select your experience level'),
  availableHours: z.string().min(1, 'Please select your availability'),
  previousCompany: z.string().optional(),
});

export const registerAccountSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterPersonalData = z.infer<typeof registerPersonalSchema>;
export type RegisterSkillsData = z.infer<typeof registerSkillsSchema>;
export type RegisterAccountData = z.infer<typeof registerAccountSchema>;
