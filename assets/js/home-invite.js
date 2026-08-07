/**
 * YUMU - Home Invite section
 * 일반 스크롤 섹션: 아래로 첫 진입 시에만 text-focus-in 순차 등장
 */

window.addEventListener('load', () => {
  gsap.registerPlugin(ScrollTrigger);

  const section = document.querySelector('.invite');
  if (!section) return;

  const primary = section.querySelector('.invite__line--primary');
  const secondary = section.querySelector('.invite__line--secondary');
  if (!primary || !secondary) return;

  let hasPlayed = false;

  const waitForAnimation = (element, animationName, fallbackMs) =>
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

  const clearTextAnimation = (element) => {
    element.classList.remove('text-blur-out', 'text-focus-in', 'is-shown');
    element.style.removeProperty('filter');
    element.style.removeProperty('opacity');
  };

  const showFinalState = () => {
    clearTextAnimation(primary);
    clearTextAnimation(secondary);
    primary.classList.add('is-shown');
    secondary.classList.add('is-shown');
  };

  const playFocusIn = async (element) => {
    clearTextAnimation(element);
    void element.offsetWidth;
    element.classList.add('text-focus-in');
    await waitForAnimation(element, 'text-focus-in', 900);
  };

  clearTextAnimation(primary);
  clearTextAnimation(secondary);

  ScrollTrigger.create({
    trigger: section,
    start: 'top 50%',
    onEnter() {
      if (hasPlayed) {
        showFinalState();
        return;
      }

      hasPlayed = true;

      (async () => {
        await playFocusIn(primary);
        primary.classList.remove('text-focus-in');
        primary.style.removeProperty('filter');
        primary.classList.add('is-shown');

        await playFocusIn(secondary);
        secondary.classList.remove('text-focus-in');
        secondary.style.removeProperty('filter');
        secondary.classList.add('is-shown');
      })();
    },
    onEnterBack() {
      showFinalState();
    },
  });
});
