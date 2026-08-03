/**
 * YUMU - Collection page JavaScript
 * 각 .collection-item 제목 → 설명 순차 등장 (.text-focus-in-left)
 * ScrollTrigger: 감지 / once — 실제 효과는 CSS 클래스
 */

window.addEventListener('load', () => {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const waitForAnimation = (element, animationName, fallbackMs = 1100) =>
    new Promise((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        element.removeEventListener('animationend', onEnd);
        resolve();
      };

      const onEnd = (event) => {
        if (event.target !== element) return;
        if (event.animationName && event.animationName !== animationName) return;
        finish();
      };

      element.addEventListener('animationend', onEnd);
      setTimeout(finish, fallbackMs);
    });

  const clearInlineAnimStyles = (element) => {
    element.style.removeProperty('opacity');
    element.style.removeProperty('filter');
    element.style.removeProperty('clip-path');
    element.style.removeProperty('-webkit-clip-path');
    element.style.removeProperty('transform');
    if (typeof gsap !== 'undefined') {
      gsap.set(element, { clearProps: 'opacity,filter,clipPath,transform' });
    }
  };

  const showRevealed = (element) => {
    element.classList.remove('text-focus-in-left');
    clearInlineAnimStyles(element);
    element.classList.add('is-revealed');
  };

  const playFocusInLeft = async (element, fallbackMs = 1100) => {
    clearInlineAnimStyles(element);
    element.classList.remove('is-revealed', 'text-focus-in-left');
    void element.offsetWidth;
    element.classList.add('text-focus-in-left');
    await waitForAnimation(element, 'text-focus-in-left', fallbackMs);
    showRevealed(element);
  };

  document.querySelectorAll('.collection-item').forEach((item) => {
    const title = item.querySelector('.collection-item__title');
    const description = item.querySelector('.collection-item__description');

    if (!title || !description) return;

    clearInlineAnimStyles(title);
    clearInlineAnimStyles(description);

    ScrollTrigger.create({
      trigger: item,
      start: 'top 80%',
      once: true,
      onEnter() {
        (async () => {
          await playFocusInLeft(title, 1900);
          await playFocusInLeft(description, 1100);
        })();
      },
    });
  });
});
