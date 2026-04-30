import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(1, 'Verplicht'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z
  .object({
    name: z
      .string()
      .trim()
      .transform((v) => (v.length === 0 ? undefined : v))
      .optional(),
    email: z.string().email('Ongeldig e-mailadres'),
    password: z.string().min(8, 'Minimaal 8 tekens'),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'Wachtwoorden komen niet overeen',
    path: ['passwordConfirm'],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Minimaal 8 tekens'),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'Wachtwoorden komen niet overeen',
    path: ['passwordConfirm'],
  });

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
