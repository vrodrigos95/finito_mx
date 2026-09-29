# Finito

PWA personal para salir de deudas: cuánto puedes gastar esta semana, cuánto separar para pagos, calendario por quincena con checkbox, deudas con simulador de abono a capital, apartados, ingresos semanales por plataforma y estadísticas.

- Código en `src/` (React + Vite). La versión publicada está en `docs/`.
- Los datos se guardan solo en el teléfono (localStorage). Respaldo en **Más → Ajustes y respaldo**.

## Desarrollo

```bash
npm install
npm run dev      # local
npm run build    # genera docs/ para GitHub Pages o Hostinger
```

## Publicar

- **GitHub Pages:** Settings → Pages → Deploy from a branch → `main` / `/docs`.
- **Hostinger:** sube el contenido de `docs/` a la carpeta del dominio o subdominio.
