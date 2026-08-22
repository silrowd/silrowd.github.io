<?php
/**
 * СК ПСП — настройки админки новостей
 *
 * ВАЖНО: смените логин и пароль на свои, чтобы никто посторонний
 * не смог управлять новостями сайта.
 *
 * Этот файл подключается админкой (admin.php) и не предназначен
 * для прямого обращения из браузера.
 */

// Защита от прямого доступа: если файл открыт напрямую — показываем 403.
if (!defined('NEWS_CONFIG_GUARD') && (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'config.php')) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Доступ запрещён.';
    exit;
}
define('NEWS_CONFIG_GUARD', true);

define('NEWS_ADMIN_USER', 'admin');
define('NEWS_ADMIN_PASS', 'plavnikthebest');

// Соль для хэширования пароля (не меняйте, если не сбрасываете доступ)
define('NEWS_SALT', 'skpsp-news-salt');

// Путь к файлу с новостями (относительно корня сайта)
define('NEWS_JSON_PATH', dirname(__DIR__) . '/data/news.json');

// Папка для изображений новостей (относительно корня сайта)
define('NEWS_IMG_DIR', dirname(__DIR__) . '/img/news');

// Максимальный размер загружаемого изображения, байт (2 МБ)
define('NEWS_IMG_MAX_SIZE', 2097152);

// Разрешённые расширения изображений
define('NEWS_IMG_EXT', array('jpg', 'jpeg', 'png', 'webp', 'gif'));