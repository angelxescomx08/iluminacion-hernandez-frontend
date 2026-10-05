# Pruebas E2E del proceso de compra (Playwright)

Prueban la tienda de punta a punta: **frontend (Astro) + backend (Express) + Postgres + Stripe en modo prueba + correos (Resend)**.

## Qué cubren

| Archivo | Flujo |
| --- | --- |
| `compra-exitosa.spec.ts` | Carrito con envío a domicilio ($199) y "Comprar ahora" con recoger en sucursal: pago en Stripe, página de éxito, pedido `paid`, stock descontado, correos al cliente y al negocio, carrito vaciado (o intacto con "Comprar ahora"). |
| `compra-errores.spec.ts` | Tarjeta rechazada (el pedido sigue `pending`, sin cobro ni correos) y reintento exitoso; fondos insuficientes; cancelar desde Stripe (pedido `canceled` y sesión de Stripe expirada). |
| `validaciones.spec.ts` | Sin sesión → "Inicia sesión para pagar" y 401; producto agotado; carrito vacío, cantidades inválidas, más del stock, producto inactivo/inexistente, entrega inválida; el carrito corrige precio y cantidad con el servidor; un cliente no puede ver ni cancelar pedidos de otro. |
| `webhook.spec.ts` | Firma inválida → 400; el webhook confirma el pedido aunque el cliente nunca vuelva a la página de éxito (requiere Stripe CLI). |
| `3d-secure.spec.ts` | Tarjeta que pide autenticación del banco (3D Secure): aprobada → pago completo; fallida → sin cobro y reintento exitoso. |
| `postventa.spec.ts` | Reembolso total (pedido `refunded`, stock regresa), reembolso parcial (sigue `paid`, guarda el monto) y luego total, contracargo (tarjeta `…0259`, se guarda estado y motivo), sesión que expira sin pagar (`expired`) y el mismo evento reenviado 3 veces sin duplicar stock ni correos (requieren Stripe CLI). |

**No automatizables aquí:** Apple Pay / Google Pay (no existen en el navegador de pruebas), OXXO (no está activado; solo se acepta tarjeta) y los recibos automáticos de Stripe (se activan en el Dashboard).

## Requisitos

1. **Dependencias**: `pnpm install` en este proyecto y en el backend.
2. **Navegador de Playwright** (una vez): `pnpm exec playwright install chromium`
3. **Llave de PRUEBA de Stripe** (`sk_test_…`) en el `.env` del backend o en `E2E_STRIPE_SECRET_KEY`. Las pruebas se niegan a correr con una `sk_live_`.
4. **Stripe CLI** (opcional, para probar el webhook): `winget install Stripe.StripeCLI` o `scoop install stripe`. Si no está, esas pruebas se omiten y el resto corre igual.
5. `RESEND_API_KEY` en el `.env` del backend. Los correos de prueba van a `delivered@resend.dev` (Resend los acepta sin enviarlos a nadie).

No necesitas Docker ni levantar nada a mano: `global-setup.ts` arranca un **Postgres embebido** (puerto 5433, base limpia en cada corrida), aplica las migraciones, crea productos de prueba en Stripe (modo prueba, con IDs fijos `e2e_ventilador_*` para no duplicarlos) y levanta backend (`:3001`), frontend (`:4322`) y `stripe listen`.

## Correr

```bash
pnpm test:e2e              # todas
pnpm test:e2e --ui         # modo interactivo
pnpm test:e2e -g "rechazada"   # solo una
E2E_VERBOSE=1 pnpm test:e2e    # ver logs de backend/frontend/Stripe CLI
```

El reporte HTML queda en `e2e/.report` (`pnpm exec playwright show-report e2e/.report`).

### Variables opcionales

| Variable | Default |
| --- | --- |
| `E2E_BACKEND_DIR` | `../../node/backend-iluminacion-hernandez` |
| `E2E_STRIPE_SECRET_KEY` | `STRIPE_SECRET_KEY` del `.env` del backend |
| `E2E_PG_PORT` / `E2E_BACKEND_PORT` / `E2E_FRONTEND_PORT` | `5433` / `3001` / `4322` |
| `STRIPE_CLI` | `stripe` |
