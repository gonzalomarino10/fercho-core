# Deploy de Fercho Core en el VPS (Docker)

Objetivo: correr Fercho Core como un contenedor más, en la misma red que n8n y Postgres,
siempre prendido y alcanzable por n8n.

## 1. Subir el código al VPS

La carpeta `fercho-core/` tiene que quedar en el servidor, al lado de tu `docker-compose.yml`
(en la misma carpeta donde viven n8n y Postgres). Ver el mensaje del chat para el método
de transferencia según tu caso (git, o script).

## 2. Ajustar el .env para la red interna de Docker

Dentro del VPS, en `fercho-core/.env`, el `DATABASE_URL` NO usa `localhost`, sino el
**mismo host que usa la credencial de Postgres en n8n** (normalmente el nombre del servicio
de Postgres en tu compose, por ejemplo `postgres`):

    DATABASE_URL=postgres://USUARIO:PASSWORD@postgres:5432/BASEDEDATOS

(Reemplazá `postgres` por el nombre real del servicio si es otro.)

## 3. Agregar el servicio al docker-compose.yml

Pegá este bloque dentro de `services:` en tu `docker-compose.yml` existente
(respetando la indentación de los otros servicios):

    fercho-core:
      build: ./fercho-core
      restart: unless-stopped
      env_file: ./fercho-core/.env
      ports:
        - "8787:8787"
      networks:
        - default        # la MISMA red donde estan n8n y postgres

Notas:
- Si tus servicios usan una red con nombre propio (ej: `n8n_default` o `web`), poné esa
  en `networks:` en lugar de `default`, para que Fercho vea a Postgres.
- El puerto `8787:8787` es opcional; sirve para probar desde afuera. n8n igual lo alcanza
  internamente como `http://fercho-core:8787`.

## 4. Levantarlo

En la carpeta del compose:

    docker compose up -d --build fercho-core

Ver que arrancó:

    docker compose logs -f fercho-core
    # esperás: 🧠 Fercho Core escuchando en http://localhost:8787

Probar el health (desde el VPS):

    curl http://localhost:8787/health
    # { "ok": true, "db": { "ok": true, "funciones": [...] } }

## 5. Conectar n8n (más adelante)

Una vez que `/health` da ok, el flujo de WhatsApp en n8n se simplifica: en vez de toda la
lógica actual, un nodo HTTP Request hace:

    POST http://fercho-core:8787/message
    Header: Authorization: Bearer <FERCHO_API_TOKEN>
    Body: { "user_id": "{{ numero }}", "mensaje": "{{ texto }}" }

y devuelve `output`. Eso lo armamos en la próxima etapa.
