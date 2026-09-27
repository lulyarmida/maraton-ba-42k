# Maratón de Buenos Aires 42K: comparador de tiempos

Gráfico interactivo que compara la distribución de tiempos de llegada del Maratón de Buenos Aires (42K) en 2024, 2025 y 2026.

La página permite:

- filtrar por sexo y grupo de edad;
- elegir tiempo neto u oficial;
- alternar entre la curva de distribución y el porcentaje acumulado de llegadas;
- ver, al pasar el cursor, qué porcentaje de cada año ya había llegado a esa hora;
- cargar un tiempo propio y ver a qué porcentaje de corredores le habrías ganado.

## Estructura

```
public/                 sitio estático que publica Vercel
  index.html
  css/styles.css
  js/app.js             lógica del gráfico (D3)
  js/vendor/d3.v7.min.js
  data/resultados.json  datos compactos que usa la página (generado)
data/
  maraton_42k_2024_2026_limpio.csv   datos fuente
scripts/
  build_data.py         CSV -> public/data/resultados.json
vercel.json
```

## Datos

Resultados oficiales publicados en my.raceresult.com. Criterios de limpieza, aplicados también en `build_data.py`:

- solo listas de resultado general (en 2024 se excluyen las listas SUD y de atletas con discapacidad);
- se descartan registros con tiempo neto u oficial menor a 2 horas (errores de carga).

Para regenerar el JSON después de cambiar el CSV:

```bash
pip install -r requirements.txt
python scripts/build_data.py
```

## Ver en local

La página carga el JSON con `fetch`, así que hay que servirla (abrir el HTML con doble clic no alcanza):

```bash
cd public
python -m http.server 8000
# http://localhost:8000
```

## Publicar en Vercel

1. Subí el repo a GitHub.
2. En Vercel: **Add New… > Project**, importá el repo.
3. Framework Preset: **Other**. No hace falta comando de build; `vercel.json` ya indica que se publica la carpeta `public`.
4. Deploy.

Cada push a la rama principal vuelve a publicar el sitio.
