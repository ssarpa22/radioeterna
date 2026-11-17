# Importación de radios desde Radio Browser

El importador `import-radios.ts` consulta Radio Browser para los países de Latinoamérica, filtra emisoras que figuran online, descarta streams HTTP (para evitar mixed content) y verifica el audio con el verificador SSRF-safe que ya usa el proyecto.

## Requisitos

- Node.js compatible con el proyecto.
- Acceso a Internet.
- No necesita variables de Supabase ni una Service Role Key.
- Usa `npx.cmd --yes tsx` para ejecutar TypeScript sin agregar dependencias al proyecto.

## Ejecución

Desde la raíz del repositorio:

```powershell
npx --yes tsx scripts/import-radios.ts --dry-run
```

Para generar un SQL de borradores:

```powershell
npx --yes tsx scripts/import-radios.ts --sql
```

Para generar un informe JSON revisable:

```powershell
npx --yes tsx scripts/import-radios.ts --json
```

El importador amplía las etiquetas cristianas consultadas en todos los países y agrega búsquedas por nombre específicas para Argentina. Verifica hasta 400 emisoras por defecto. Se puede aumentar el límite si hay más candidatas:

```powershell
npx --yes tsx scripts/import-radios.ts --sql --max-checks=400
```

Los archivos se generan en `radio-import-output/`, una carpeta local ignorada por Git.

## Seguridad y revisión

- El script **no se conecta a Supabase y no inserta datos directamente**.
- No requiere ni lee `SUPABASE_SERVICE_ROLE_KEY`.
- Solo considera streams HTTPS y vuelve a comprobar HTTPS después de las redirecciones.
- La comprobación técnica usa `verifyStream`, que valida DNS/IP y protege contra SSRF.
- No interpreta el campo `state` de Radio Browser como ciudad: lo conserva como región en el informe.
- Deduplica por UUID, URL de stream y nombre/país entre los resultados descargados.
- El SQL vuelve a comprobar duplicados contra `stations` por URL o nombre/país.
- Los registros SQL se crean como `status = 'draft'`, `verification_status = 'verified'`, sin destacar ni publicar radios. La verificación indica que el stream pasó la comprobación técnica, no que la emisora haya sido aprobada editorialmente.
- El SQL usa `unique_station_slug` (migración `0005_admin_workflow.sql`) para evitar colisiones de slug.
- Antes de ejecutar el SQL en Supabase, revisar manualmente nombres, país, categoría, sitio web, logos y derechos de uso. Confirmar también que las categorías y países de referencia estén cargados.

**No ejecutar un SQL generado sin revisar primero el informe JSON y el contenido del SQL.** La aprobación y publicación final deben seguir el flujo administrativo de Radio Eterna.
