/* Роутер: переключение экранов и история браузера.

   Каждый экран — это одна запись в history через pushState, поэтому системный
   свайп «назад» в iOS Safari и аппаратная кнопка «назад» в Android возвращают
   на предыдущий экран приложения, а не уводят со страницы. Адрес остаётся
   хешем (#feed, #profile, …) — по нему экран открывается напрямую. */
import { pauseFeed, pauseProfileReels, resumeActiveFeed } from '../screens/feed.js';
import { markAllNotificationsRead } from '../screens/notifications.js';
import { activeProfileTab, layoutProfilePages, layoutTabs, profileTabNames, updateProfileTabsMask } from '../screens/profile-tabs.js';
import { openOwnProfile } from '../screens/profile.js';
import { closeProjectDetail, layoutProjectsTabs } from '../screens/projects.js';

const SCREENS = ['start', 'auth', 'setup1', 'setup2', 'projects', 'messages', 'feed',
  'profileReels', 'notifications', 'notificationClip', 'notificationProject',
  'profile', 'settings'];

let currentScreen = 'start';

/* Показать экран, ничего не записывая в историю. */
function applyScreen(name) {
  const leavingNotifications = document.querySelector('[data-screen="notifications"]')?.classList.contains('is-active') && name !== 'notifications';
  if (leavingNotifications) markAllNotificationsRead();

  document.querySelectorAll('.screen-page').forEach(page => {
    page.classList.toggle('is-active', page.dataset.screen === name);
  });

  if (name !== 'notificationClip') document.getElementById('notificationClipVideo')?.pause();
  if (name !== 'profileReels') pauseProfileReels();
  if (name === 'profile') window.requestAnimationFrame(() => {
    layoutTabs();
    layoutProfilePages(profileTabNames.indexOf(activeProfileTab), false);
    updateProfileTabsMask();
  });
  if (name === 'projects') window.requestAnimationFrame(() => layoutProjectsTabs());
  if (name === 'feed') window.requestAnimationFrame(resumeActiveFeed);
  else window.requestAnimationFrame(pauseFeed);

  currentScreen = name;
}

/* Перейти на экран и добавить запись в историю. */
function show(name, { replace = false } = {}) {
  if (!SCREENS.includes(name)) return;
  if (name === currentScreen) {
    applyScreen(name);
    return;
  }
  const entry = { screen: name };
  if (replace) history.replaceState(entry, '', `#${name}`);
  else history.pushState(entry, '', `#${name}`);
  applyScreen(name);
}

function goBack() {
  history.back();
}

function screenFromHash() {
  const name = location.hash.replace('#', '');
  return SCREENS.includes(name) ? name : null;
}

window.addEventListener('popstate', event => {
  applyScreen(event.state?.screen || screenFromHash() || 'start');
});

/* Ручная правка хеша в адресной строке тоже открывает экран. */
window.addEventListener('hashchange', () => {
  const name = screenFromHash();
  if (name && name !== currentScreen) applyScreen(name);
});

document.addEventListener('click', event => {
  const go = event.target.closest('[data-go]');
  if (go) {
    if (document.getElementById('projectDetail')?.classList.contains('is-open')) closeProjectDetail();
    if (go.dataset.go === 'profile') openOwnProfile();
    else show(go.dataset.go);
  }

  const back = event.target.closest('[data-back]');
  if (back) show(back.dataset.back);
});

/* Стартовый экран: из хеша, если он есть. Заменяем запись, чтобы первый
   «назад» уводил со страницы, а не по кругу внутри приложения. */
function startRouter() {
  const initial = screenFromHash() || 'start';
  history.replaceState({ screen: initial }, '', `#${initial}`);
  applyScreen(initial);
}

export { SCREENS, goBack, show, startRouter };
