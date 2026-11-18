// The server handles advertised mobile devices. This also catches touch-only
// browsers using a desktop user agent, such as iPad Safari.
(() => {
  if (!/^(?:www\.)?totehm\.space$/i.test(location.hostname)) return;
  if (/^\/desktop(?:\.html)?\/?$/.test(location.pathname)) return;

  const userAgent = navigator.userAgent;
  const iPadDesktop = /Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1;
  const mobile = navigator.userAgentData?.mobile || iPadDesktop ||
    /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(userAgent);
  const touchOnly = matchMedia('(pointer: coarse) and (any-hover: none) and (max-width: 1180px)').matches;
  if (!mobile && !touchOnly) return;

  document.documentElement.style.background = '#000';
  document.documentElement.style.visibility = 'hidden';
  window.stop();
  location.replace('/desktop');
})();
