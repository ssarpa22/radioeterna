import type { Metadata } from 'next';
import { ActionForm, Field } from '@/components/forms/ActionForm';
import { loginAction } from './actions';

export const metadata: Metadata = { title: 'Acceso al panel', robots: { index: false, follow: false } };
export default function LoginPage() {
  return (
    <div className="wrap max-w-md py-16">
      <h1 className="mb-6 text-3xl">Acceso al panel</h1>
      <ActionForm action={loginAction} submit="Entrar" pendingLabel="Entrando…">
        <Field name="email" label="Correo electrónico" type="email" required />
        <Field name="password" label="Contraseña" type="password" required />
      </ActionForm>
    </div>
  );
}
