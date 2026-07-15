-- IVOO GESTIÓN de Infraestructura
-- Esquema MySQL/MariaDB para los modulos actuales del frontend React.
-- Generado para XAMPP / MariaDB.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "-04:00";

CREATE DATABASE IF NOT EXISTS `ivoo_gestion_infraestructura`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `ivoo_gestion_infraestructura`;

-- Limpieza ordenada por dependencias.
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `project_payments`;
DROP TABLE IF EXISTS `project_proposals`;
DROP TABLE IF EXISTS `project_materials`;
DROP TABLE IF EXISTS `projects`;
DROP TABLE IF EXISTS `material_catalog`;
DROP TABLE IF EXISTS `contractors`;
DROP TABLE IF EXISTS `app_modules`;

-- Modulos/rutas actuales del sistema.
CREATE TABLE `app_modules` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(60) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `route` VARCHAR(120) NOT NULL,
  `is_public` TINYINT(1) NOT NULL DEFAULT 0,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_modules_code` (`code`),
  UNIQUE KEY `uk_app_modules_route` (`route`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Proveedores/contratistas.
-- La pagina publica /registro-proveedores inserta aqui.
-- El modulo interno /catalogos consulta esta misma tabla.
CREATE TABLE `contractors` (
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `specialty` VARCHAR(180) NOT NULL,
  `rating` DECIMAL(3,1) NOT NULL DEFAULT 4.0,
  `contact` VARCHAR(180) NOT NULL,
  `registration_source` ENUM('SEED','PUBLIC_PORTAL','INTERNAL') NOT NULL DEFAULT 'PUBLIC_PORTAL',
  `status` ENUM('PENDING_REVIEW','ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`),
  KEY `idx_contractors_name` (`name`),
  KEY `idx_contractors_specialty` (`specialty`),
  KEY `idx_contractors_status` (`status`),
  CONSTRAINT `chk_contractors_rating` CHECK (`rating` >= 0 AND `rating` <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catalogo maestro de insumos usado por Infraestructura/Mantenimiento.
CREATE TABLE `material_catalog` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(180) NOT NULL,
  `unit` VARCHAR(80) NOT NULL,
  `estimated_unit_price` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_catalog_name_unit` (`name`,`unit`),
  KEY `idx_material_catalog_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Obras/proyectos y estado principal del workflow.
CREATE TABLE `projects` (
  `id` VARCHAR(40) NOT NULL,
  `title` VARCHAR(220) NOT NULL,
  `type` ENUM('INFRAESTRUCTURA','MANTENIMIENTO') NOT NULL,
  `description` TEXT NOT NULL,
  `location` VARCHAR(180) NOT NULL,
  `created_date` DATE NOT NULL,
  `status` ENUM(
    'CREADO',
    'REVISADO_CIERRE',
    'CONFIRMADO_PROCURA',
    'COMPARATIVA_ENVIADA',
    'CONTRATADO',
    'EN_EJECUCION',
    'VERIFICANDO_FINALIZACION',
    'LISTO_PAGO_FINAL',
    'COMPLETADO_PAGADO'
  ) NOT NULL DEFAULT 'CREADO',
  `estimated_total` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `cierre_obra_notes` TEXT NULL,
  `calculations_added` TINYINT(1) NOT NULL DEFAULT 0,
  `blueprints_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `procura_review_notes` TEXT NULL,
  `approved_investment_amount` DECIMAL(14,2) NULL,
  `selected_contractor_code` VARCHAR(30) NULL,
  `selected_proposal_id` VARCHAR(40) NULL,
  `quality_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `completion_verified_date` DATE NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_projects_status` (`status`),
  KEY `idx_projects_type` (`type`),
  KEY `idx_projects_created_date` (`created_date`),
  KEY `idx_projects_selected_contractor` (`selected_contractor_code`),
  CONSTRAINT `fk_projects_selected_contractor`
    FOREIGN KEY (`selected_contractor_code`) REFERENCES `contractors` (`code`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Materiales asociados a cada obra.
CREATE TABLE `project_materials` (
  `id` VARCHAR(40) NOT NULL,
  `project_id` VARCHAR(40) NOT NULL,
  `material_catalog_id` BIGINT UNSIGNED NULL,
  `name` VARCHAR(180) NOT NULL,
  `quantity` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `unit` VARCHAR(80) NOT NULL,
  `estimated_unit_price` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project_materials_project` (`project_id`),
  KEY `idx_project_materials_catalog` (`material_catalog_id`),
  CONSTRAINT `fk_project_materials_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_project_materials_catalog`
    FOREIGN KEY (`material_catalog_id`) REFERENCES `material_catalog` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Propuestas/cotizaciones cargadas por Analistas.
CREATE TABLE `project_proposals` (
  `id` VARCHAR(40) NOT NULL,
  `project_id` VARCHAR(40) NOT NULL,
  `contractor_code` VARCHAR(30) NOT NULL,
  `contractor_name_snapshot` VARCHAR(180) NOT NULL,
  `material_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `labor_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `delivery_weeks` INT UNSIGNED NOT NULL DEFAULT 0,
  `negotiated_advance_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `description` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project_proposals_project` (`project_id`),
  KEY `idx_project_proposals_contractor` (`contractor_code`),
  CONSTRAINT `fk_project_proposals_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_project_proposals_contractor`
    FOREIGN KEY (`contractor_code`) REFERENCES `contractors` (`code`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_project_proposals_advance`
    CHECK (`negotiated_advance_percent` >= 0 AND `negotiated_advance_percent` <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `projects`
  ADD CONSTRAINT `fk_projects_selected_proposal`
    FOREIGN KEY (`selected_proposal_id`) REFERENCES `project_proposals` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- Pagos de Finanzas. Reemplaza los campos advancePaid/finalPaid del frontend
-- en una estructura extensible.
CREATE TABLE `project_payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` VARCHAR(40) NOT NULL,
  `proposal_id` VARCHAR(40) NULL,
  `payment_type` ENUM('ADVANCE','FINAL') NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `paid_date` DATE NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_payment_type` (`project_id`,`payment_type`),
  KEY `idx_project_payments_proposal` (`proposal_id`),
  CONSTRAINT `fk_project_payments_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_project_payments_proposal`
    FOREIGN KEY (`proposal_id`) REFERENCES `project_proposals` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Auditoria transversal del workflow.
CREATE TABLE `audit_logs` (
  `id` VARCHAR(40) NOT NULL,
  `project_id` VARCHAR(40) NOT NULL,
  `project_title_snapshot` VARCHAR(220) NOT NULL,
  `role` ENUM('PRESIDENCIA','INFRAESTRUCTURA','CIERRE_DE_OBRA','PROCURA','ANALISTA','FINANZAS','SISTEMA') NOT NULL,
  `action` VARCHAR(180) NOT NULL,
  `logged_at` DATETIME NOT NULL,
  `details` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_project` (`project_id`),
  KEY `idx_audit_logs_role` (`role`),
  KEY `idx_audit_logs_logged_at` (`logged_at`),
  CONSTRAINT `fk_audit_logs_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seeds: modulos actuales.
INSERT INTO `app_modules` (`code`, `name`, `route`, `is_public`, `description`) VALUES
('PRESIDENCIA', 'Presidencia', '/presidencia', 0, 'Dashboard ejecutivo, indicadores y trazabilidad general.'),
('INFRAESTRUCTURA', 'Infraestructura / Mantenimiento', '/infraestructura', 0, 'Registro de solicitudes de obra y materiales requeridos.'),
('CIERRE_DE_OBRA', 'Cierre de Obra', '/cierre-obra', 0, 'Revision tecnica, planos, calculos y certificacion final.'),
('PROCURA', 'Procura', '/procura', 0, 'Aprobacion de inversion y adjudicacion de contratistas.'),
('ANALISTA', 'Analistas', '/analistas', 0, 'Carga de propuestas y cuadro comparativo.'),
('FINANZAS', 'Finanzas', '/finanzas', 0, 'Pago de anticipos y liquidaciones finales.'),
('CATALOGOS', 'Proveedores registrados', '/catalogos', 0, 'Listado interno de proveedores recibidos desde el portal publico.'),
('REGISTRO_PROVEEDORES', 'Registro publico de proveedores', '/registro-proveedores', 1, 'Pagina publica sin sidebar para alta de proveedores.');

-- Seeds: proveedores iniciales.
INSERT INTO `contractors` (`code`, `name`, `specialty`, `rating`, `contact`, `registration_source`, `status`) VALUES
('CON-301', 'Constructora Andes C.A.', 'Obras Civiles y Estructuras', 4.8, 'contacto@constandes.com', 'SEED', 'ACTIVE'),
('CON-302', 'Sistemas Electricos Voltio, S.A.', 'Alta Tension e Iluminacion', 4.5, 'proyectos@voltiosa.com', 'SEED', 'ACTIVE'),
('CON-303', 'Mantenimiento Integral Express', 'Pintura, Drywall y Acabados', 4.2, 'gerencia@mantexpress.net', 'SEED', 'ACTIVE'),
('CON-304', 'Tuberias y Soldaduras Occidente', 'Sistemas de Enfriamiento e Hidraulicos', 4.7, 'ventas@tuboccidente.com', 'SEED', 'ACTIVE'),
('CON-305', 'Soluciones de Climatizacion Termo-Control', 'Aire Acondicionado y Ventilacion', 4.6, 'soporte@termocontrol.ve', 'SEED', 'ACTIVE');

-- Seeds: catalogo de materiales.
INSERT INTO `material_catalog` (`id`, `name`, `unit`, `estimated_unit_price`) VALUES
(1, 'Cemento Portland (Saco 42.5kg)', 'Saco', 12.50),
(2, 'Acero de Refuerzo 1/2 pulgada', 'Cabilla', 18.00),
(3, 'Bloque de Arcilla de 15cm', 'Millar', 450.00),
(4, 'Arena Lavada para Concreto', 'm3', 35.00),
(5, 'Piedra Picada para Mezcla', 'm3', 40.00),
(6, 'Cable de Cobre THHN #10 AWG', 'Rollo (100m)', 110.00),
(7, 'Lampara LED Industrial 150W', 'Unidad', 55.00),
(8, 'Pintura de Caucho Profesional (Cunete)', 'Cunete', 85.00),
(9, 'Tubo de PVC de Agua 3 pulgadas', 'Tubo (6m)', 22.00),
(10, 'Tablero Electrico Principal de 24 Circuitos', 'Unidad', 320.00);

-- Seeds: proyectos iniciales.
INSERT INTO `projects` (
  `id`, `title`, `type`, `description`, `location`, `created_date`, `status`,
  `estimated_total`, `cierre_obra_notes`, `calculations_added`, `blueprints_count`,
  `procura_review_notes`, `approved_investment_amount`,
  `selected_contractor_code`, `selected_proposal_id`,
  `quality_verified`, `completion_verified_date`
) VALUES
('PRJ-001', 'Optimizacion de Planta de Enfriamiento Sede Norte', 'INFRAESTRUCTURA',
 'Sustitucion de tuberias de refrigeracion oxidadas y optimizacion de bombas de agua helada para los chillers principales.',
 'Sede Principal Norte', '2026-06-20', 'CREADO', 915.50, NULL, 0, 0, NULL, NULL, NULL, NULL, 0, NULL),
('PRJ-002', 'Mantenimiento General y Pintura de Fachada IVOO', 'MANTENIMIENTO',
 'Reparacion de grietas superficiales en fachada externa y aplicacion de pintura de alta resistencia para intemperie.',
 'Tienda IVOO Valencia', '2026-06-15', 'COMPARATIVA_ENVIADA', 1225.00,
 'Se validaron los calculos de area de fachada (1200 m2). Requiere andamios de seguridad y equipo de arnes.',
 1, 1,
 'Monto estimado inicial de $1,225 aprobado para licitacion. Se solicita un anticipo no mayor al 40%.',
 1225.00, NULL, NULL, 0, NULL),
('PRJ-003', 'Ampliacion de Galpon de Despacho Logistico', 'INFRAESTRUCTURA',
 'Construccion de losa de concreto de 150m2 y estructura metalica techada para zona de carga express de mercancia.',
 'Centro de Distribucion Central', '2026-05-10', 'COMPLETADO_PAGADO', 4365.00,
 'Planos estructurales aprobados por ingenieria municipal. Calculos de resistencia de suelo verificados.',
 1, 4,
 'Proyecto estrategico para despacho de ventas e-commerce. Aprobado para licitacion de emergencia.',
 4365.00, 'CON-301', NULL, 1, '2026-06-12');

-- Seeds: materiales por proyecto.
INSERT INTO `project_materials` (`id`, `project_id`, `material_catalog_id`, `name`, `quantity`, `unit`, `estimated_unit_price`) VALUES
('m1', 'PRJ-001', 9, 'Tubo de PVC de Agua 3 pulgadas', 24, 'Tubo (6m)', 22.00),
('m2', 'PRJ-001', 5, 'Piedra Picada para Mezcla', 5, 'm3', 40.00),
('m3', 'PRJ-001', 1, 'Cemento Portland (Saco 42.5kg)', 15, 'Saco', 12.50),
('m4', 'PRJ-002', 8, 'Pintura de Caucho Profesional (Cunete)', 12, 'Cunete', 85.00),
('m5', 'PRJ-002', 1, 'Cemento Portland (Saco 42.5kg)', 8, 'Saco', 12.50),
('m6', 'PRJ-002', 4, 'Arena Lavada para Concreto', 3, 'm3', 35.00),
('m7', 'PRJ-003', 1, 'Cemento Portland (Saco 42.5kg)', 120, 'Saco', 12.50),
('m8', 'PRJ-003', 2, 'Acero de Refuerzo 1/2 pulgada', 80, 'Cabilla', 18.00),
('m9', 'PRJ-003', 4, 'Arena Lavada para Concreto', 15, 'm3', 35.00),
('m10', 'PRJ-003', 3, 'Bloque de Arcilla de 15cm', 2, 'Millar', 450.00);

-- Seeds: propuestas por proyecto.
INSERT INTO `project_proposals` (
  `id`, `project_id`, `contractor_code`, `contractor_name_snapshot`,
  `material_cost`, `labor_cost`, `total_cost`, `delivery_weeks`,
  `negotiated_advance_percent`, `description`
) VALUES
('PROP-201', 'PRJ-002', 'CON-303', 'Mantenimiento Integral Express',
 1100.00, 1500.00, 2600.00, 2, 30.00,
 'Trabajo completo de andamiaje, lavado previo a presion, sellado de fisuras y dos manos de pintura premium. 30% de anticipo negociado.'),
('PROP-202', 'PRJ-002', 'CON-301', 'Constructora Andes C.A.',
 1200.00, 1800.00, 3000.00, 3, 40.00,
 'Reparacion estructural menor con malla de fibra y pintura de intemperie con garantia de 5 anos. 40% de anticipo requerido.'),
('PROP-301', 'PRJ-003', 'CON-301', 'Constructora Andes C.A.',
 4100.00, 3500.00, 7600.00, 4, 30.00,
 'Construccion de losa con fibra de alta resistencia y herreria de columnas de soporte para techado de zinc.');

UPDATE `projects`
SET `selected_proposal_id` = 'PROP-301'
WHERE `id` = 'PRJ-003';

-- Seeds: pagos del proyecto completado.
INSERT INTO `project_payments` (`project_id`, `proposal_id`, `payment_type`, `amount`, `paid_date`, `notes`) VALUES
('PRJ-003', 'PROP-301', 'ADVANCE', 2280.00, '2026-05-18', 'Anticipo del 30% para inicio de obras civiles.'),
('PRJ-003', 'PROP-301', 'FINAL', 5320.00, '2026-06-14', 'Pago final y cierre presupuestario.');

-- Seeds: auditoria inicial.
INSERT INTO `audit_logs` (`id`, `project_id`, `project_title_snapshot`, `role`, `action`, `logged_at`, `details`) VALUES
('LOG-101', 'PRJ-003', 'Ampliacion de Galpon de Despacho Logistico', 'INFRAESTRUCTURA', 'Creacion de peticion de obra', '2026-05-10 09:30:00', 'Se generaron requerimientos de concreto y herreria para la zona de despacho.'),
('LOG-102', 'PRJ-003', 'Ampliacion de Galpon de Despacho Logistico', 'CIERRE_DE_OBRA', 'Revision tecnica de calculos y planos', '2026-05-12 11:15:00', 'Calculos estructurales corregidos y aprobados. 4 planos cargados al servidor.'),
('LOG-103', 'PRJ-003', 'Ampliacion de Galpon de Despacho Logistico', 'PROCURA', 'Confirmacion de presupuesto y envio a licitacion', '2026-05-14 14:00:00', 'Monto aprobado de $4,365. Peticion transferida a los analistas de licitacion.'),
('LOG-104', 'PRJ-003', 'Ampliacion de Galpon de Despacho Logistico', 'ANALISTA', 'Carga de cuadro comparativo', '2026-05-16 10:45:00', 'Propuesta de Constructora Andes C.A. cargada con un anticipo pactado del 30%.'),
('LOG-105', 'PRJ-003', 'Ampliacion de Galpon de Despacho Logistico', 'PROCURA', 'Confirmacion de contratacion', '2026-05-17 16:30:00', 'Contratista Constructora Andes C.A. asignada bajo codigo CON-301.'),
('LOG-106', 'PRJ-003', 'Ampliacion de Galpon de Despacho Logistico', 'FINANZAS', 'Liberacion de anticipo del 30%', '2026-05-18 09:00:00', 'Liberado anticipo de $2,280 para inicio de obras civiles.'),
('LOG-107', 'PRJ-003', 'Ampliacion de Galpon de Despacho Logistico', 'CIERRE_DE_OBRA', 'Verificacion de finalizacion y calidad de obra', '2026-06-12 15:20:00', 'Trabajo culminado satisfactoriamente bajo estandares de resistencia de concreto.'),
('LOG-108', 'PRJ-003', 'Ampliacion de Galpon de Despacho Logistico', 'FINANZAS', 'Liberacion total de fondos', '2026-06-14 10:10:00', 'Pago final de $5,320 liberado. Obra cerrada presupuestariamente.');

-- Vistas utiles para modulos actuales.
CREATE OR REPLACE VIEW `vw_project_summary` AS
SELECT
  p.`id`,
  p.`title`,
  p.`type`,
  p.`location`,
  p.`created_date`,
  p.`status`,
  p.`estimated_total`,
  p.`approved_investment_amount`,
  p.`selected_contractor_code`,
  c.`name` AS `selected_contractor_name`,
  p.`selected_proposal_id`,
  pp.`total_cost` AS `selected_total_cost`,
  COALESCE(SUM(pay.`amount`), 0) AS `paid_total`,
  p.`quality_verified`,
  p.`completion_verified_date`
FROM `projects` p
LEFT JOIN `contractors` c ON c.`code` = p.`selected_contractor_code`
LEFT JOIN `project_proposals` pp ON pp.`id` = p.`selected_proposal_id`
LEFT JOIN `project_payments` pay ON pay.`project_id` = p.`id`
GROUP BY
  p.`id`, p.`title`, p.`type`, p.`location`, p.`created_date`, p.`status`,
  p.`estimated_total`, p.`approved_investment_amount`, p.`selected_contractor_code`,
  c.`name`, p.`selected_proposal_id`, pp.`total_cost`, p.`quality_verified`,
  p.`completion_verified_date`;

CREATE OR REPLACE VIEW `vw_registered_contractors` AS
SELECT
  `code`,
  `name`,
  `specialty`,
  `rating`,
  `contact`,
  `registration_source`,
  `status`,
  `created_at`
FROM `contractors`
ORDER BY `created_at` DESC, `code` DESC;

COMMIT;
