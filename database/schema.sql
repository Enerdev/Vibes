-- ============================================================
--  Vibes · Base de datos MySQL / MariaDB
--  Uso: crear la base en Plesk (Bases de datos → Añadir base de datos)
--  y ejecutar este archivo en phpMyAdmin, o en local:
--    mysql -u root < database/schema.sql
-- ============================================================
CREATE DATABASE IF NOT EXISTS vibes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vibes;

-- Usuarios: el PIN se guarda con password_hash (bcrypt), nunca en texto plano.
CREATE TABLE IF NOT EXISTS usuarios (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(30)  NOT NULL,
  clave       VARCHAR(30)  NOT NULL UNIQUE,          -- nombre en minúsculas, para iniciar sesión
  pin_hash    VARCHAR(255) NOT NULL,
  token       CHAR(64)     NULL UNIQUE,              -- sesión actual (Bearer)
  datos       JSON         NOT NULL,                 -- lugares, rutas favoritas y filtros
  creado      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Rutas grabadas por la comunidad (combi, mototaxi, lancha).
CREATE TABLE IF NOT EXISTS rutas (
  id              VARCHAR(40)  PRIMARY KEY,           -- id generado en el celular
  nombre          VARCHAR(60)  NOT NULL,
  tipo            ENUM('combi','mototaxi','lancha') NOT NULL,
  tarifa          DECIMAL(6,2) NOT NULL DEFAULT 0,
  velocidad       SMALLINT     NOT NULL DEFAULT 15,   -- km/h
  trazo           JSON         NOT NULL,              -- [[lat, lng], ...]
  paradas         JSON         NOT NULL,              -- [[lat, lng], ...]
  confirmaciones  INT UNSIGNED NOT NULL DEFAULT 1,
  usuario_id      INT UNSIGNED NULL,
  creado          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Reportes en vivo (accidente, bloqueo, obra, clima...). Caducan a las 6 h.
CREATE TABLE IF NOT EXISTS reportes (
  id      VARCHAR(40)  PRIMARY KEY,
  tipo    VARCHAR(20)  NOT NULL,
  lat     DECIMAL(9,6) NOT NULL,
  lng     DECIMAL(9,6) NOT NULL,
  texto   VARCHAR(140) NOT NULL DEFAULT '',
  sigue   INT UNSIGNED NOT NULL DEFAULT 0,
  ya_no   INT UNSIGNED NOT NULL DEFAULT 0,
  creado  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reportes_creado (creado)
) ENGINE=InnoDB;
