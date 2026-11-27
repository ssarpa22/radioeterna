import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/',
  '/radios',
  '/paises',
  '/categorias',
  '/favoritas',
  '/sumar-radio',
  '/contacto',
  '/privacidad',
  '/terminos',
];

test('la portada carga y muestra la identidad de Radio Eterna', async ({ page }) => {
  const response = await page.goto('/');
  expect(response, 'la portada debe responder').not.toBeNull();
  expect(response!.status()).toBe(200);
  await expect(page).toHaveTitle(/Radios cristianas en vivo de todo el mundo/i);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Radio Eterna, inicio/i })).toBeVisible();
});

for (const route of publicRoutes.slice(1)) {
  test(`ruta pública ${route} responde sin error de servidor`, async ({ request }) => {
    const response = await request.get(route);
    expect(response.status(), `${route} devolvió HTTP ${response.status()}`).toBeLessThan(500);
    expect(response.status(), `${route} no debe ser una página inexistente`).toBe(200);
  });
}

test('rutas SEO públicas responden correctamente', async ({ request }) => {
  for (const route of ['/robots.txt', '/sitemap.xml']) {
    const response = await request.get(route);
    expect(response.status(), `${route} debe responder 200`).toBe(200);
  }
});

test('el área administrativa no expone el panel sin sesión', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\\/admin\\/login/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
