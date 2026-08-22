<?php
/**
 * СК ПСП — админка новостей
 * Управляет файлом data/news.json (без базы данных).
 * Загрузка изображений — в img/news/.
 */

require __DIR__ . '/config.php';

session_start();

/* ---------- helpers ---------- */

function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

/* Запасная реализация mb_strimwidth на случай, если расширение mbstring не включено */
if (!function_exists('mb_strimwidth')) {
    function mb_strimwidth($string, $start, $width, $trimmarker, $encoding = 'UTF-8') {
        $string = (string)$string;
        if (function_exists('mb_strlen')) {
            return mb_substr($string, $start, $width, $encoding) .
                   (mb_strlen($string, $encoding) > $start + $width ? $trimmarker : '');
        }
        // Последний вариант — посимвольно по UTF-8
        $chars = preg_split('//u', $string, -1, PREG_SPLIT_NO_EMPTY);
        $total = count($chars);
        $slice = array_slice($chars, $start, $width);
        $out = implode('', $slice);
        if ($total > $start + $width) { $out .= $trimmarker; }
        return $out;
    }
}

function csrf_token() {
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['csrf'];
}

function verify_login($user, $pass) {
    $passHash = hash('sha256', $pass . NEWS_SALT);
    $expPass  = hash('sha256', NEWS_ADMIN_PASS . NEWS_SALT);
    $userHash = hash('sha256', $user . NEWS_SALT);
    $expUser  = hash('sha256', NEWS_ADMIN_USER . NEWS_SALT);
    return hash_equals($expPass, $passHash) && hash_equals($expUser, $userHash);
}

function load_news() {
    if (!is_file(NEWS_JSON_PATH)) return array();
    $raw = file_get_contents(NEWS_JSON_PATH);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : array();
}

function save_news($list) {
    // сортировка: новые сверху
    usort($list, function ($a, $b) {
        return strcmp($b['date'], $a['date']);
    });
    $json = json_encode($list, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $json = preg_replace('/^\xEF\xBB\xBF/', '', $json); // без BOM
    $ok = file_put_contents(NEWS_JSON_PATH, $json . "\n");
    return $ok !== false;
}

function fmt_date($iso) {
    $ts = strtotime($iso);
    return $ts ? date('d.m.Y', $ts) : $iso;
}

/* ---------- actions ---------- */

$flash = '';
$error = '';
$action = isset($_GET['action']) ? $_GET['action'] : 'list';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['do_login'])) {
        // --- вход ---
        $user = trim($_POST['username'] ?? '');
        $pass = $_POST['password'] ?? '';
        if (verify_login($user, $pass)) {
            session_regenerate_id(true);
            $_SESSION['authed'] = true;
            $_SESSION['csrf'] = '';
            $flash = 'Вы вошли в панель управления.';
            $action = 'list';
        } else {
            $error = 'Неверный логин или пароль.';
            $action = 'login';
        }
    }
    elseif (isset($_POST['do_logout'])) {
        $_SESSION = array();
        session_destroy();
        header('Location: admin.php');
        exit;
    }
}

// дальше только для авторизованных
if ($action !== 'login' && empty($_SESSION['authed'])) {
    $action = 'login';
}

if ($action !== 'login' && $_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['do_login'])) {
    // проверка CSRF (форма входа не содержит токен — проверяем логин/пароль)
    if (!hash_equals(csrf_token(), $_POST['csrf'] ?? '')) {
        die('Ошибка безопасности: неверный CSRF-токен. Обновите страницу и попробуйте снова.');
    }

    if (isset($_POST['do_delete'])) {
        // --- удаление ---
        $id = (int)($_POST['id'] ?? 0);
        $list = load_news();
        $new = array();
        $removed = null;
        foreach ($list as $n) {
            if ((int)$n['id'] === $id) { $removed = $n; }
            else { $new[] = $n; }
        }
        if ($removed !== null) {
            if (save_news($new)) {
                // удалить картинку, если она в нашей папке
                if (!empty($removed['image'])) {
                    $p = NEWS_IMG_DIR . '/' . basename($removed['image']);
                    if (is_file($p)) @unlink($p);
                }
                $flash = 'Новость «' . $removed['title'] . '» удалена.';
            } else {
                $error = 'Не удалось сохранить news.json. Проверьте права записи на файл data/news.json.';
            }
        }
        $action = 'list';
    }

    if (isset($_POST['do_save'])) {
        // --- добавление / редактирование ---
        $id      = (int)($_POST['id'] ?? 0);
        $date    = trim($_POST['date'] ?? '');
        $title   = trim($_POST['title'] ?? '');
        $text    = trim($_POST['text'] ?? '');
        $link    = trim($_POST['link'] ?? '');
        $linkTxt = trim($_POST['link_text'] ?? '');
        $image   = '';

        // дата
        if ($date && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $error = 'Дата должна быть в формате ГГГГ-ММ-ДД.';
            $action = 'edit';
            $_GET['id'] = $id;
        }

        // картинка
        if ($error === '' && !empty($_FILES['image']['name'])) {
            $f = $_FILES['image'];
            $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, NEWS_IMG_EXT, true)) {
                $error = 'Недопустимый формат изображения. Разрешены: ' . implode(', ', NEWS_IMG_EXT) . '.';
            } elseif ($f['size'] > NEWS_IMG_MAX_SIZE) {
                $error = 'Файл слишком большой (максимум 2 МБ).';
            } elseif (!is_file($f['tmp_name']) || !getimagesize($f['tmp_name'])) {
                $error = 'Файл не является корректным изображением.';
            } else {
                if (!is_dir(NEWS_IMG_DIR)) {
                    if (!mkdir(NEWS_IMG_DIR, 0755, true)) {
                        $error = 'Не удалось создать папку img/news. Проверьте права записи.';
                    }
                }
                if ($error === '' && is_dir(NEWS_IMG_DIR)) {
                    $fname = 'news-' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.' . $ext;
                    if (!move_uploaded_file($f['tmp_name'], NEWS_IMG_DIR . '/' . $fname)) {
                        $error = 'Не удалось сохранить изображение. Проверьте права записи на папку img/news.';
                    } else {
                        $image = 'img/news/' . $fname; // относительный путь от корня сайта
                    }
                }
            }
        }

        if ($error === '' && ($title === '' || $date === '')) {
            $error = 'Заполните заголовок и дату.';
            $action = 'edit';
            $_GET['id'] = $id;
        }

        if ($error === '') {
            $list = load_news();
            $item = array(
                'id'        => $id > 0 ? $id : (int)time(),
                'date'      => $date,
                'title'     => $title,
                'text'      => $text,
                'image'     => $image !== '' ? $image : (isset($_POST['image_keep']) ? $_POST['image_keep'] : ''),
                'link'      => $link,
                'link_text' => $linkTxt !== '' ? $linkTxt : 'Подробнее',
            );
            $replaced = false;
            foreach ($list as $i => $n) {
                if ((int)$n['id'] === $item['id']) {
                    // удалить старую картинку, если заменили
                    if ($image !== '' && !empty($n['image']) && $n['image'] !== $image) {
                        $p = NEWS_IMG_DIR . '/' . basename($n['image']);
                        if (is_file($p)) @unlink($p);
                    }
                    $list[$i] = $item;
                    $replaced = true;
                }
            }
            if (!$replaced) { $list[] = $item; }
            if (save_news($list)) {
                $flash = $replaced ? 'Новость обновлена.' : 'Новость добавлена.';
                $action = 'list';
            } else {
                $error = 'Не удалось сохранить news.json. Проверьте права записи.';
                $action = 'edit';
                $_GET['id'] = $id;
            }
        }
    }
}

/* ---------- find news for edit ---------- */
$editNews = null;
if ($action === 'edit' || $action === 'new') {
    $eid = (int)($_GET['id'] ?? 0);
    if ($eid > 0) {
        $list = load_news();
        foreach ($list as $n) {
            if ((int)$n['id'] === $eid) { $editNews = $n; break; }
        }
        if (!$editNews) { $error = 'Новость не найдена.'; $action = 'list'; }
    }
    if (!$editNews && $action !== 'list') {
        // Новая новость или возврат после ошибки валидации —
        // восстанавливаем введённые значения из POST
        $editNews = array(
            'id'        => $eid,
            'date'      => !empty($_POST['date']) ? $_POST['date'] : date('Y-m-d'),
            'title'     => $_POST['title'] ?? '',
            'text'      => $_POST['text'] ?? '',
            'image'     => $_POST['image_keep'] ?? '',
            'link'      => $_POST['link'] ?? '',
            'link_text' => $_POST['link_text'] ?? '',
        );
    }
    // При возврате после ошибки — не теряем введённые значения
    if ($editNews !== null && isset($_POST['do_save']) && $error !== '') {
        $editNews['date']      = $_POST['date'] ?? $editNews['date'];
        $editNews['title']     = $_POST['title'] ?? $editNews['title'];
        $editNews['text']      = $_POST['text'] ?? $editNews['text'];
        $editNews['link']      = $_POST['link'] ?? $editNews['link'];
        $editNews['link_text'] = $_POST['link_text'] ?? $editNews['link_text'];
        $editNews['image']     = $_POST['image_keep'] ?? $editNews['image'];
    }
}

$list = ($action === 'list') ? load_news() : array();

/* ---------- view ---------- */
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Админка новостей — СК ПСП</title>
<style>
  :root { --ink:#1c2733; --muted:#5c6b7a; --border:#dde5ec; --blue:#1f6f9e; --red:#c0392b; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:'Roboto',Arial,sans-serif; color:var(--ink); background:#f4f7f9; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 24px 16px 60px; }
  header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:20px; }
  header h1 { font-size:20px; margin:0; }
  header h1 small { color:var(--muted); font-weight:400; }
  .btn { display:inline-block; padding:10px 18px; border-radius:6px; border:1px solid var(--blue);
         background:var(--blue); color:#fff; font-weight:600; font-size:14px; cursor:pointer; text-decoration:none; }
  .btn:hover { background:#175a80; }
  .btn--ghost { background:#fff; color:var(--blue); }
  .btn--ghost:hover { background:#eef5fa; }
  .btn--danger { background:#fff; color:var(--red); border-color:var(--red); }
  .btn--danger:hover { background:#fbeeee; }
  .card { background:#fff; border:1px solid var(--border); border-radius:10px; padding:24px; margin-bottom:18px;
          box-shadow:0 1px 3px rgba(20,40,60,.06); }
  .flash { background:#e8f6ee; border:1px solid #bfe5cd; color:#1e6b3a; padding:12px 16px; border-radius:8px; margin-bottom:16px; }
  .errbox { background:#fdecec; border:1px solid #f3c1c1; color:#8c2323; padding:12px 16px; border-radius:8px; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th, td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--border); vertical-align:top; }
  th { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
  tr:hover td { background:#f8fafc; }
  .thumb { width:84px; height:56px; object-fit:cover; border-radius:6px; border:1px solid var(--border); display:block; }
  .thumb--none { background:#eef2f6; display:grid; place-items:center; color:#a5b2bf; font-size:11px; }
  .noimg { color:var(--muted); font-size:12px; }
  label { display:block; font-size:13px; font-weight:600; color:var(--muted); margin:14px 0 6px; }
  input[type=text], input[type=date], input[type=password], textarea {
    width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:6px; font-size:14px; font-family:inherit; }
  input:focus, textarea:focus { outline:none; border-color:var(--blue); box-shadow:0 0 0 3px rgba(31,111,158,.12); }
  textarea { min-height:120px; resize:vertical; }
  .row { display:flex; gap:16px; flex-wrap:wrap; }
  .row > div { flex:1 1 220px; }
  .hint { font-size:12px; color:var(--muted); margin-top:4px; }
  .login { max-width:380px; margin:60px auto; }
  .actions { white-space:nowrap; }
  .actions form { display:inline; }
  .img-prev { max-width:180px; margin-top:8px; border-radius:6px; border:1px solid var(--border); display:block; }
  .empty { color:var(--muted); padding:20px 0; text-align:center; }
</style>
</head>
<body>
<div class="wrap">

<?php if ($action === 'login'): ?>
  <div class="card login">
    <h1 style="font-size:20px;margin:0 0 6px;">Админка новостей</h1>
    <p style="color:var(--muted);font-size:14px;margin:0 0 16px;">Войдите, чтобы управлять новостями сайта.</p>
    <?php if ($error): ?><div class="errbox"><?php echo e($error); ?></div><?php endif; ?>
    <form method="post" action="admin.php">
      <input type="hidden" name="do_login" value="1" />
      <label>Логин</label>
      <input type="text" name="username" required autofocus autocomplete="username" />
      <label>Пароль</label>
      <input type="password" name="password" required autocomplete="current-password" />
      <div style="margin-top:18px;">
        <button class="btn" type="submit">Войти</button>
      </div>
    </form>
  </div>

<?php else: ?>

  <header>
    <h1>Админка новостей <small>— СК ПСП</small></h1>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <a class="btn btn--ghost" href="admin.php?action=new">+ Добавить новость</a>
      <form method="post" action="admin.php" style="display:inline;">
        <input type="hidden" name="do_logout" value="1" />
        <input type="hidden" name="csrf" value="<?php echo e(csrf_token()); ?>" />
        <button class="btn btn--ghost" type="submit">Выйти</button>
      </form>
    </div>
  </header>

  <?php if ($flash): ?><div class="flash"><?php echo e($flash); ?></div><?php endif; ?>
  <?php if ($error): ?><div class="errbox"><?php echo e($error); ?></div><?php endif; ?>

<?php if ($action === 'list'): ?>
  <div class="card">
    <?php if (empty($list)): ?>
      <div class="empty">Пока нет новостей. <a href="admin.php?action=new">Добавить первую</a>.</div>
    <?php else: ?>
    <table>
      <thead>
        <tr><th style="width:90px;">Фото</th><th style="width:110px;">Дата</th><th>Заголовок</th><th style="width:150px;">Действия</th></tr>
      </thead>
      <tbody>
      <?php foreach ($list as $n): ?>
        <tr>
          <td>
            <?php if (!empty($n['image'])): ?>
              <img class="thumb" src="../<?php echo e($n['image']); ?>" alt="" />
            <?php else: ?>
              <span class="thumb thumb--none">нет фото</span>
            <?php endif; ?>
          </td>
          <td><?php echo e(fmt_date($n['date'])); ?></td>
          <td>
            <b><?php echo e($n['title']); ?></b>
            <?php if (!empty($n['text'])): ?>
              <div class="noimg"><?php echo e(mb_strimwidth($n['text'], 0, 120, '…', 'UTF-8')); ?></div>
            <?php endif; ?>
          </td>
          <td class="actions">
            <a class="btn btn--ghost" style="padding:6px 12px;font-size:13px;" href="admin.php?action=edit&id=<?php echo (int)$n['id']; ?>">Изменить</a>
            <form method="post" action="admin.php" onsubmit="return confirm('Удалить новость «<?php echo e(addslashes($n['title'])); ?>»? Картинка тоже будет удалена.');">
              <input type="hidden" name="do_delete" value="1" />
              <input type="hidden" name="csrf" value="<?php echo e(csrf_token()); ?>" />
              <input type="hidden" name="id" value="<?php echo (int)$n['id']; ?>" />
              <button class="btn btn--danger" style="padding:6px 12px;font-size:13px;" type="submit">Удалить</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
    <?php endif; ?>
  </div>

<?php else: /* new / edit */ ?>
  <div class="card">
    <h2 style="margin:0 0 4px;font-size:18px;"><?php echo $editNews['id'] ? 'Редактирование новости' : 'Новая новость'; ?></h2>
    <form method="post" action="admin.php" enctype="multipart/form-data">
      <input type="hidden" name="do_save" value="1" />
      <input type="hidden" name="csrf" value="<?php echo e(csrf_token()); ?>" />
      <input type="hidden" name="id" value="<?php echo (int)$editNews['id']; ?>" />
      <?php if (!empty($editNews['image'])): ?>
        <input type="hidden" name="image_keep" value="<?php echo e($editNews['image']); ?>" />
      <?php endif; ?>

      <div class="row">
        <div>
          <label>Дата</label>
          <input type="date" name="date" value="<?php echo e($editNews['date']); ?>" required />
        </div>
        <div>
          <label>Ссылка «Подробнее» (пусто = без ссылки)</label>
          <input type="text" name="link" value="<?php echo e($editNews['link']); ?>" placeholder="objects.html" />
          <div class="hint">Ссылка на страницу сайта: objects.html, about.html и т.п.</div>
        </div>
      </div>

      <label>Заголовок</label>
      <input type="text" name="title" value="<?php echo e($editNews['title']); ?>" required placeholder="Сдан объект…" />

      <label>Текст</label>
      <textarea name="text" placeholder="Краткий текст новости…"><?php echo e($editNews['text']); ?></textarea>

      <label>Картинка (jpg, png, webp, gif — до 2 МБ)</label>
      <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" />
      <?php if (!empty($editNews['image'])): ?>
        <img class="img-prev" src="../<?php echo e($editNews['image']); ?>" alt="Текущая картинка" />
        <div class="hint">Текущая картинка. Загрузите новую, чтобы заменить.</div>
      <?php endif; ?>

      <label>Текст ссылки (необязательно)</label>
      <input type="text" name="link_text" value="<?php echo e($editNews['link_text']); ?>" placeholder="Подробнее" />

      <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn" type="submit">Сохранить</button>
        <a class="btn btn--ghost" href="admin.php">Отмена</a>
      </div>
    </form>
  </div>
<?php endif; ?>

<?php endif; ?>
</div>
</body>
</html>