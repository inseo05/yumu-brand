/**
 * YUMU - About page
 * Hero 세로 문구 text-focus-in 순차 등장
 * 텍스트 스크롤 연동 opacity (ScrollTrigger scrub)
 */

const ABOUT_REVEAL = {
  pending: 0.25,
  active: 1,
  passed: 0.55,
};

document.addEventListener('DOMContentLoaded', () => {
  initAboutHeroPhrases();
  initAboutScrollReveals();
  const meaningController = initAboutMeaningAnimation();
  initAboutNameEntrances();
  initAboutFogMeaningTransition(meaningController);
  initAboutNameHanjaAlign();
  initAboutSymbolAnimation();
  initAboutNameMobileScale();
  initAboutMaterialStory();
});

function initAboutHeroPhrases() {
  const rightPhrase = document.querySelector('.about-hero__phrase--right');
  const leftPhrase = document.querySelector('.about-hero__phrase--left');

  if (!rightPhrase || !leftPhrase) return;

  const HERO_HOLD_MS = 500;

  const playFocusIn = (element) => {
    element.classList.remove('text-focus-in');
    void element.offsetWidth;
    element.classList.add('text-focus-in');
  };

  const onRightAnimationEnd = (event) => {
    if (event.target !== rightPhrase) return;
    if (event.animationName && event.animationName !== 'text-focus-in') return;
    rightPhrase.removeEventListener('animationend', onRightAnimationEnd);
    playFocusIn(leftPhrase);
  };

  rightPhrase.addEventListener('animationend', onRightAnimationEnd);

  // Hero 표시 후 0.5초 대기 → 오른쪽 → (animationend) → 왼쪽
  window.setTimeout(() => {
    playFocusIn(rightPhrase);
  }, HERO_HOLD_MS);
}

/**
 * Intro 전용 — opacity 1 도달 후 유지 (passed fade 없음)
 * @param {Array<Element|Element[]>} lines
 * @returns {gsap.core.Timeline[]}
 */
function createIntroRevealTimelines(lines) {
  const { pending, active } = ABOUT_REVEAL;
  const flat = lines.flat();

  gsap.set(flat, {
    opacity: pending,
    clearProps: 'filter,y,x,translate,transform',
  });

  return lines.map((line) => {
    const targets = Array.isArray(line) ? line : [line];

    return gsap.timeline({
      scrollTrigger: {
        trigger: targets[0],
        endTrigger: targets[targets.length - 1],
        start: 'top 85%',
        end: 'bottom 25%',
        scrub: true,
      },
    }).fromTo(
      targets,
      { opacity: pending },
      { opacity: active, duration: 1, ease: 'none' }
    );
  });
}

/**
 * @param {Array<Element|Element[]>} lines
 * @returns {gsap.core.Timeline[]}
 */
function createOpacityRevealTimelines(lines) {
  const { pending, active, passed } = ABOUT_REVEAL;
  const flat = lines.flat();

  gsap.set(flat, {
    opacity: pending,
    clearProps: 'filter,y,x,translate,transform',
  });

  return lines.map((line) => {
    const targets = Array.isArray(line) ? line : [line];

    return gsap
      .timeline({
        scrollTrigger: {
          trigger: targets[0],
          endTrigger: targets[targets.length - 1],
          start: 'top 85%',
          end: 'bottom 25%',
          scrub: true,
        },
      })
      .fromTo(
        targets,
        { opacity: pending },
        { opacity: active, duration: 0.5, ease: 'none' }
      )
      .to(targets, {
        opacity: passed,
        duration: 0.5,
        ease: 'none',
      });
  });
}

function initAboutScrollReveals() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  initAboutIntroReveal();
  initAboutSectionReveals();

  const refreshTriggers = () => {
    ScrollTrigger.refresh();
  };

  requestAnimationFrame(refreshTriggers);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refreshTriggers);
  }

  window.addEventListener('load', refreshTriggers, { once: true });
}

function initAboutIntroReveal() {
  const section = document.querySelector('.about-intro');
  const parts = Array.from(document.querySelectorAll('.about-intro__part'));

  if (!section || !parts.length) return;

  const getGroups = (attr) => {
    const map = new Map();

    parts.forEach((part) => {
      const key = part.getAttribute(attr);
      if (key === null) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(part);
    });

    return Array.from(map.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, group]) => group);
  };

  const createReveal = (attr) => {
    const groups = getGroups(attr);
    if (!groups.length) return () => {};

    const timelines = createIntroRevealTimelines(groups);

    return () => {
      timelines.forEach((timeline) => {
        if (timeline.scrollTrigger) timeline.scrollTrigger.kill();
        timeline.kill();
      });
      gsap.set(parts, {
        opacity: ABOUT_REVEAL.pending,
        clearProps: 'filter,y,x,translate,transform',
      });
    };
  };

  const mm = gsap.matchMedia();

  mm.add('(min-width: 64.0625rem)', () => createReveal('data-d'));
  mm.add('(max-width: 64rem) and (min-width: 48.0625rem)', () => createReveal('data-t'));
  mm.add('(max-width: 48rem)', () => createReveal('data-m'));
}

function initAboutSectionReveals() {
  const sections = Array.from(document.querySelectorAll('[data-about-reveal]'));

  sections.forEach((section) => {
    // about-name / about-meaning: 별도 등장 로직 사용 (scrub 제외)
    if (
      section.classList.contains('about-name') ||
      section.classList.contains('about-meaning')
    ) {
      return;
    }

    const lines = Array.from(section.querySelectorAll('.about-reveal__line'));
    if (!lines.length) return;
    createOpacityRevealTimelines(lines);
  });
}

/**
 * about-meaning — fog 전환 후 text-focus-in, 이탈 시 blur-out
 * playEnter()는 fog→meaning 브릿지 또는 fallback 진입에서 호출
 */
function initAboutMeaningAnimation() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

  gsap.registerPlugin(ScrollTrigger);

  const section = document.querySelector('.about-meaning');
  if (!section) return null;

  const title = section.querySelector('.about-meaning__title');
  const paragraphs = Array.from(
    section.querySelectorAll('.about-meaning__paragraph')
  );
  if (!title || !paragraphs.length) return null;

  const allText = [title, ...paragraphs];
  const READ_LOCK_MS = 1000;
  let hasPlayedEnter = false;
  let isAnimating = false;
  let isBlurredOut = false;
  let isSequenceActive = false;
  let enterToken = 0;

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

  const delay = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const clearTextAnimation = (element) => {
    element.classList.remove('text-blur-out', 'text-focus-in', 'is-shown');
    element.style.removeProperty('filter');
    element.style.removeProperty('opacity');
  };

  const overlay = section.querySelector('.about-meaning__overlay');

  const restoreMeaningOverlay = () => {
    if (!overlay) return;

    if (typeof gsap !== 'undefined') {
      gsap.set(overlay, { opacity: 0.5 });
    } else {
      overlay.style.opacity = '0.5';
    }
  };

  const showComplete = () => {
    if (isSequenceActive) return;

    enterToken += 1;
    isAnimating = false;
    isBlurredOut = false;
    hasPlayedEnter = true;
    section.classList.remove('is-transition-pending', 'is-transition-crossfade');
    section.classList.add('is-meaning-entered');
    restoreMeaningOverlay();
    allText.forEach((element) => {
      clearTextAnimation(element);
      element.classList.add('is-shown');
    });
  };

  const playFocusIn = async (element, token) => {
    if (token !== enterToken) return;
    clearTextAnimation(element);
    void element.offsetWidth;
    element.classList.add('text-focus-in');
    await waitForAnimation(element, 'text-focus-in', 900);
    if (token !== enterToken) return;
    element.classList.remove('text-focus-in');
    element.style.removeProperty('filter');
    element.classList.add('is-shown');
  };

  const lockPageScroll = () => {
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.add('is-scroll-locked');
    document.body.style.paddingRight = scrollbarWidth
      ? `${scrollbarWidth}px`
      : '';
  };

  const unlockPageScroll = () => {
    document.documentElement.classList.remove('is-scroll-locked');
    document.body.style.paddingRight = '';
  };

  const settleMeaningScroll = () => {
    window.scrollTo(0, section.offsetTop);
  };

  const playEnter = async (options = {}) => {
    const { force = false, fromFogBridge = false } = options;
    if (!force && (hasPlayedEnter || isAnimating || isSequenceActive)) return;

    isAnimating = true;
    isSequenceActive = true;
    isBlurredOut = false;
    const token = ++enterToken;

    section.classList.remove('is-transition-pending');
    section.classList.add('is-meaning-entered');

    if (fromFogBridge) {
      section.classList.add('is-transition-crossfade');
    } else {
      section.classList.remove('is-transition-crossfade');
    }

    lockPageScroll();

    const onWheel = (event) => {
      if (!isSequenceActive) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const onTouchMove = (event) => {
      if (!isSequenceActive) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const onKeyDown = (event) => {
      if (!isSequenceActive) return;
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'PageDown' ||
        event.key === 'PageUp' ||
        event.key === ' ' ||
        event.key === 'Home' ||
        event.key === 'End'
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('touchmove', onTouchMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener('keydown', onKeyDown, { capture: true });

    const releaseListeners = () => {
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('touchmove', onTouchMove, { capture: true });
      window.removeEventListener('keydown', onKeyDown, { capture: true });
    };

    try {
      await playFocusIn(title, token);
      if (token !== enterToken) return;

      for (const paragraph of paragraphs) {
        await playFocusIn(paragraph, token);
        if (token !== enterToken) return;
      }

      hasPlayedEnter = true;

      await delay(READ_LOCK_MS);
      if (token !== enterToken) return;
    } finally {
      releaseListeners();
      if (token === enterToken) {
        isSequenceActive = false;
        isAnimating = false;
        section.classList.remove('is-transition-crossfade');
        restoreMeaningOverlay();

        // fog 브릿지에서는 잠금/스크롤 정리를 브릿지 쪽에서 한 번에 처리
        if (!fromFogBridge) {
          settleMeaningScroll();
          unlockPageScroll();
        }
      }
    }
  };

  const playBlurOut = async () => {
    if (isBlurredOut || isSequenceActive || !hasPlayedEnter) return;

    enterToken += 1;
    isAnimating = true;
    isBlurredOut = true;

    allText.forEach((element) => {
      element.classList.remove('text-blur-out', 'text-focus-in');
      element.style.removeProperty('filter');
      element.style.opacity = '1';
      element.classList.remove('is-shown');
    });

    if (allText[0]) void allText[0].offsetWidth;
    allText.forEach((element) => {
      element.classList.add('text-blur-out');
    });

    try {
      await Promise.all(
        allText.map((element) => waitForAnimation(element, 'text-blur-out', 900))
      );
    } finally {
      allText.forEach((element) => {
        element.classList.remove('text-blur-out', 'is-shown');
        element.style.removeProperty('filter');
        element.style.removeProperty('opacity');
      });
      isAnimating = false;
    }
  };

  // 빠른 스크롤 등 fog 브릿지 없이 진입한 경우 fallback
  ScrollTrigger.create({
    trigger: section,
    start: 'top 50%',
    onEnter() {
      if (hasPlayedEnter) {
        showComplete();
        return;
      }
      if (section.dataset.fogBridgePending === 'true') return;
      playEnter();
    },
    onEnterBack() {
      if (isSequenceActive) return;
      showComplete();
    },
  });

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom top',
    onEnter() {
      if (hasPlayedEnter) showComplete();
    },
    onLeave() {
      // 애니메이션/잠금 중이 아닐 때만 blur — 빠른 스크롤 끊김 완화
      if (isSequenceActive || isAnimating) return;
      if (hasPlayedEnter) playBlurOut();
    },
    onEnterBack() {
      if (isSequenceActive) return;
      showComplete();
    },
  });

  return {
    playEnter,
    showComplete,
    get hasPlayedEnter() {
      return hasPlayedEnter;
    },
    setHasPlayedEnter(value) {
      hasPlayedEnter = value;
    },
  };
}

/**
 * Name meaning 한자 — 텍스트 박스(.about-name__copy) 세로 중앙에 맞춤
 * slot의 top/height만 조정하고, 한자 자체는 line-height:100% + translateY(-50%) 유지
 */
function syncAboutNameHanjaAlign() {
  const isMobile = window.matchMedia('(max-width: 48rem)').matches;

  document.querySelectorAll('.about-name').forEach((section) => {
    const body = section.querySelector('.about-name__body');
    const copy = section.querySelector('.about-name__copy');
    const slot = section.querySelector('.about-name__hanja-slot');
    if (!body || !copy || !slot) return;

    if (isMobile) {
      slot.style.top = '';
      slot.style.bottom = '';
      slot.style.height = '';
      return;
    }

    const bodyRect = body.getBoundingClientRect();
    const copyRect = copy.getBoundingClientRect();

    slot.style.top = `${copyRect.top - bodyRect.top}px`;
    slot.style.bottom = 'auto';
    slot.style.height = `${copyRect.height}px`;
  });
}

function initAboutNameHanjaAlign() {
  syncAboutNameHanjaAlign();
  window.addEventListener('resize', syncAboutNameHanjaAlign);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncAboutNameHanjaAlign);
  }
}

const NAME_SLIDE_DURATION_MS = 1300;
const NAME_FADE_DURATION_MS = 1300;

function waitForCssAnimation(element, animationName, fallbackMs) {
  return new Promise((resolve) => {
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
}

function wrapTextSlideUpReveal(element) {
  let wrapper = element.querySelector(':scope > .text-slide-up-reveal');
  if (wrapper) return wrapper;

  wrapper = document.createElement('span');
  wrapper.className = 'text-slide-up-reveal';

  const inner = document.createElement('span');
  inner.className = 'text-slide-up-reveal__inner';

  while (element.firstChild) {
    inner.appendChild(element.firstChild);
  }

  wrapper.appendChild(inner);
  element.appendChild(wrapper);
  return wrapper;
}

function finalizeSlideUpReveal(element) {
  wrapTextSlideUpReveal(element);
  const inner = element.querySelector('.text-slide-up-reveal__inner');
  element.style.opacity = '1';
  if (!inner) return;

  inner.classList.remove('text-slide-up-reveal--play');
  inner.classList.add('text-slide-up-reveal--done');
  inner.style.transform = 'translateY(0)';
}

async function playNameTextSlideUp(element) {
  wrapTextSlideUpReveal(element);
  const inner = element.querySelector('.text-slide-up-reveal__inner');
  if (!inner) return;

  element.style.opacity = '1';
  inner.classList.remove('text-slide-up-reveal--play', 'text-slide-up-reveal--done');
  inner.style.transform = 'translateY(100%)';
  void inner.offsetWidth;
  inner.classList.add('text-slide-up-reveal--play');
  await waitForCssAnimation(inner, 'text-slide-up-reveal', NAME_SLIDE_DURATION_MS);
  inner.classList.remove('text-slide-up-reveal--play');
  inner.classList.add('text-slide-up-reveal--done');
  inner.style.transform = 'translateY(0)';
}

async function playNameTextFade(element) {
  element.classList.remove('text-name-fade-in');
  element.style.removeProperty('opacity');

  if (typeof gsap !== 'undefined') {
    gsap.set(element, { opacity: 0, clearProps: 'transform,filter' });
  }

  void element.offsetWidth;
  element.classList.add('text-name-fade-in');
  await waitForCssAnimation(element, 'text-name-fade-in', NAME_FADE_DURATION_MS);
  element.classList.remove('text-name-fade-in');
  element.style.opacity = '1';
}

function showAboutNameComplete(section) {
  const heading = section.querySelector('.about-name__heading');
  const bodyText = section.querySelector('.about-name__text');
  if (!heading || !bodyText) return;

  section.classList.remove('is-name-animating');
  section.classList.add('is-name-entered');
  finalizeSlideUpReveal(heading);
  bodyText.classList.remove('text-name-fade-in');
  bodyText.style.opacity = '1';

  if (typeof gsap !== 'undefined') {
    gsap.set([heading, bodyText], { clearProps: 'opacity,transform,filter' });
  }
}

/**
 * Name meaning — 제목 Slide-up Reveal + 본문 fade (각 1.2s)
 * 섹션 진입 시 등장 / 재진입 시 완성 상태
 */
function initAboutNameEntrances() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll('.about-name').forEach((section) => {
    const hanjaMotion = section.querySelector('.about-name__hanja-motion');
    const heading = section.querySelector('.about-name__heading');
    const bodyText = section.querySelector('.about-name__text');

    if (!heading || !bodyText) return;

    if (hanjaMotion) {
      gsap.set(hanjaMotion, { x: 0, clearProps: 'transform' });
    }

    wrapTextSlideUpReveal(heading);

    let hasPlayed = section.classList.contains('is-name-entered');
    let isAnimating = false;

    if (!hasPlayed) {
      gsap.set([heading, bodyText], { opacity: 0, clearProps: 'transform,y,filter' });
    } else {
      showAboutNameComplete(section);
    }

    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      invalidateOnRefresh: true,
      onEnter() {
        if (hasPlayed) {
          showAboutNameComplete(section);
          return;
        }
        if (isAnimating) return;

        void (async () => {
          isAnimating = true;
          section.classList.add('is-name-animating');

          try {
            await playNameTextSlideUp(heading);
            await playNameTextFade(bodyText);

            section.classList.remove('is-name-animating');
            section.classList.add('is-name-entered');
            hasPlayed = true;
            gsap.set([heading, bodyText], { clearProps: 'opacity,transform,filter' });
            section.dispatchEvent(
              new CustomEvent('about-name-entered', {
                bubbles: true,
                detail: { section },
              })
            );
          } finally {
            section.classList.remove('is-name-animating');
            isAnimating = false;
          }
        })();
      },
      onEnterBack() {
        if (isAnimating) return;
        if (hasPlayed) showAboutNameComplete(section);
      },
    });
  });
}

/**
 * 안개 무 진입 즉시 pin → 텍스트 등장 → 배경 crossfade → text-focus-in
 * 재진입 시 완성 상태 표시 (pin/snap/refresh 최소화로 스크롤 끊김 방지)
 */
function initAboutFogMeaningTransition(meaningController) {
  if (
    typeof gsap === 'undefined' ||
    typeof ScrollTrigger === 'undefined' ||
    !meaningController
  ) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const fogSection = document.querySelector('.about-name--fog');
  const meaningSection = document.querySelector('.about-meaning');
  if (!fogSection || !meaningSection) return;

  meaningSection.dataset.fogBridgePending = 'true';

  const meaningBgLayer = fogSection.querySelector('.about-name__bg-layer--meaning');
  const meaningOverlay = meaningSection.querySelector('.about-meaning__overlay');
  const fogFadeTargets = [
    fogSection.querySelector('.about-name__copy-group'),
    fogSection.querySelector('.about-name__hanja-slot'),
  ].filter(Boolean);

  const WHEEL_THRESHOLD = 36;
  const TOUCH_THRESHOLD = 24;
  const BG_CROSSFADE_DURATION = 2;
  const CONTENT_FADE_DURATION = 0.8;

  let isHolding = false;
  let isTransitioning = false;
  let hasTransitioned = false;
  let isAnimationComplete = false;
  let holdToken = 0;
  let releaseHold = null;
  let wheelAccum = 0;
  let holdScrollTrigger = null;
  let reentryScrollTrigger = null;
  let fogVisualReady = false;

  const lockPageScroll = () => {
    if (document.documentElement.classList.contains('is-scroll-locked')) return;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.add('is-scroll-locked');
    document.body.style.paddingRight = scrollbarWidth
      ? `${scrollbarWidth}px`
      : '';
  };

  const unlockPageScroll = () => {
    document.documentElement.classList.remove('is-scroll-locked');
    document.body.style.paddingRight = '';
  };

  const showFogReentryComplete = () => {
    if (fogVisualReady && hasTransitioned) return;

    showAboutNameComplete(fogSection);
    gsap.set(fogFadeTargets, { opacity: 1 });
    if (meaningBgLayer) gsap.set(meaningBgLayer, { opacity: 0 });
    if (!hasTransitioned && meaningOverlay) {
      gsap.set(meaningOverlay, { opacity: 0 });
    }
    fogVisualReady = true;
    isAnimationComplete = true;
  };

  const setupFogReentryWatch = () => {
    if (reentryScrollTrigger) return;

    reentryScrollTrigger = ScrollTrigger.create({
      trigger: fogSection,
      start: 'top 80%',
      end: 'bottom top',
      onEnter: showFogReentryComplete,
      onEnterBack: showFogReentryComplete,
    });
  };

  const teardownHoldTrigger = () => {
    if (!holdScrollTrigger) return;
    holdScrollTrigger.kill(true);
    holdScrollTrigger = null;
  };

  const normalizeWheelDelta = (event) => {
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 16;
    if (event.deltaMode === 2) delta *= window.innerHeight;
    return delta;
  };

  const canTriggerTransition = () =>
    isAnimationComplete && !isTransitioning && !hasTransitioned;

  const clearHoldListeners = () => {
    holdToken += 1;
    isHolding = false;
    wheelAccum = 0;
    if (releaseHold) {
      releaseHold();
      releaseHold = null;
    }
  };

  const deactivateHold = () => {
    clearHoldListeners();
    unlockPageScroll();
  };

  const attachHoldListeners = () => {
    if (releaseHold) return;

    const token = holdToken;

    const onWheel = (event) => {
      if (!isHolding || token !== holdToken) return;

      event.preventDefault();
      event.stopPropagation();

      // 텍스트 등장 중에는 스크롤만 막고 전환은 대기
      if (!canTriggerTransition()) return;

      const delta = normalizeWheelDelta(event);
      if (delta <= 0) {
        wheelAccum = 0;
        return;
      }

      wheelAccum += delta;
      if (wheelAccum < WHEEL_THRESHOLD) return;

      triggerTransitionFromHold();
    };

    let touchStartY = 0;
    const onTouchStart = (event) => {
      touchStartY = event.touches[0].clientY;
    };
    const onTouchMove = (event) => {
      if (!isHolding || token !== holdToken) return;

      event.preventDefault();
      event.stopPropagation();

      if (!canTriggerTransition()) return;

      const delta = touchStartY - event.touches[0].clientY;
      if (delta <= TOUCH_THRESHOLD) return;

      triggerTransitionFromHold();
    };

    const onKeyDown = (event) => {
      if (!isHolding || token !== holdToken || !canTriggerTransition()) return;

      if (
        event.key === 'ArrowDown' ||
        event.key === 'PageDown' ||
        event.key === ' '
      ) {
        event.preventDefault();
        triggerTransitionFromHold();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('touchstart', onTouchStart, {
      passive: true,
      capture: true,
    });
    window.addEventListener('touchmove', onTouchMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener('keydown', onKeyDown, { capture: true });

    releaseHold = () => {
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('touchstart', onTouchStart, { capture: true });
      window.removeEventListener('touchmove', onTouchMove, { capture: true });
      window.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  };

  const triggerTransitionFromHold = () => {
    if (!isHolding || !canTriggerTransition()) return;
    playTransition();
  };

  const beginHold = () => {
    if (hasTransitioned || isTransitioning || isHolding) return;

    isHolding = true;
    wheelAccum = 0;
    holdToken += 1;
    lockPageScroll();
    attachHoldListeners();

    // 텍스트가 이미 끝난 상태로 pin에 들어오면 바로 전환
    if (isAnimationComplete) {
      playTransition();
    }
  };

  const releaseBridgeScroll = () => {
    clearHoldListeners();
    teardownHoldTrigger();

    requestAnimationFrame(() => {
      window.scrollTo(0, meaningSection.offsetTop);
      unlockPageScroll();

      requestAnimationFrame(() => {
        setupFogReentryWatch();
        ScrollTrigger.refresh();
      });
    });
  };

  const playTransition = async () => {
    if (isTransitioning || hasTransitioned) return;

    isTransitioning = true;
    hasTransitioned = true;
    fogVisualReady = false;
    clearHoldListeners();
    lockPageScroll();

    try {
      if (meaningBgLayer) gsap.set(meaningBgLayer, { opacity: 0 });
      if (meaningOverlay) gsap.set(meaningOverlay, { opacity: 0 });

      meaningSection.classList.remove('is-transition-pending');
      meaningSection.classList.add('is-transition-crossfade');

      const crossfadeTimeline = gsap.timeline();

      crossfadeTimeline.to(fogFadeTargets, {
        opacity: 0,
        duration: CONTENT_FADE_DURATION,
        ease: 'power2.inOut',
      });

      if (meaningBgLayer) {
        crossfadeTimeline.to(
          meaningBgLayer,
          {
            opacity: 1,
            duration: BG_CROSSFADE_DURATION,
            ease: 'power2.inOut',
          },
          0
        );
      }

      if (meaningOverlay) {
        crossfadeTimeline.to(
          meaningOverlay,
          {
            opacity: 0.5,
            duration: BG_CROSSFADE_DURATION * 0.85,
            ease: 'power2.inOut',
          },
          BG_CROSSFADE_DURATION * 0.15
        );
      }

      await crossfadeTimeline;

      if (meaningBgLayer) {
        gsap.set(meaningBgLayer, { opacity: 1 });
      }
      if (meaningOverlay) {
        gsap.set(meaningOverlay, { opacity: 0.5 });
      }

      delete meaningSection.dataset.fogBridgePending;

      await meaningController.playEnter({ force: true, fromFogBridge: true });
    } finally {
      isTransitioning = false;
      releaseBridgeScroll();
    }
  };

  const markAnimationComplete = () => {
    isAnimationComplete = true;
    if (hasTransitioned || isTransitioning) return;
    if (!isHolding) return;
    playTransition();
  };

  const handleHoldEnter = () => {
    if (hasTransitioned) {
      showFogReentryComplete();
      return;
    }
    beginHold();
  };

  holdScrollTrigger = ScrollTrigger.create({
    trigger: fogSection,
    start: 'top top',
    end: '+=100%',
    pin: true,
    pinSpacing: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onEnter: handleHoldEnter,
    onEnterBack: handleHoldEnter,
    onLeaveBack: () => {
      if (!hasTransitioned) deactivateHold();
    },
  });

  fogSection.addEventListener('about-name-entered', (event) => {
    if (event.detail?.section !== fogSection) return;
    markAnimationComplete();
  });

  if (fogSection.classList.contains('is-name-entered')) {
    isAnimationComplete = true;
  }
}

/**
 * about-symbol
 * 이미지 먼저 → (선 0.6s → 0.5s → text-focus-in) × 좌/상 → 우/하
 * PC: 좌→우 / tablet·mobile: 위→아래 / 재진입: 완성 상태
 */
function initAboutSymbolAnimation() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const section = document.querySelector('.about-symbol');
  if (!section) return;

  const textA = section.querySelector('.about-symbol__text--a');
  const textB = section.querySelector('.about-symbol__text--b');
  const ruleA = section.querySelector('.about-symbol__rule--a');
  const ruleB = section.querySelector('.about-symbol__rule--b');
  if (!textA || !textB || !ruleA || !ruleB) return;

  const LINE_DURATION = 0.42;
  const LINE_TO_TEXT_DELAY_MS = 350;
  const FOCUS_FALLBACK_MS = 630;

  let hasPlayed = false;
  let isAnimating = false;
  let playToken = 0;

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

  const delay = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const clearTextAnimation = (element) => {
    element.classList.remove('text-blur-out', 'text-focus-in', 'is-shown');
    element.style.removeProperty('filter');
    element.style.removeProperty('opacity');
  };

  const clipStart = {
    left: 'inset(0 0 0 100%)',
    right: 'inset(0 100% 0 0)',
    up: 'inset(100% 0 0 0)',
    down: 'inset(0 0 100% 0)',
  };

  const setRulesHidden = (vertical) => {
    if (vertical) {
      gsap.set(ruleA, { clipPath: clipStart.up });
      gsap.set(ruleB, { clipPath: clipStart.down });
      return;
    }
    gsap.set(ruleA, { clipPath: clipStart.left });
    gsap.set(ruleB, { clipPath: clipStart.right });
  };

  const showComplete = () => {
    playToken += 1;
    isAnimating = false;
    hasPlayed = true;
    section.classList.add('is-symbol-entered');
    [textA, textB].forEach((element) => {
      clearTextAnimation(element);
      element.classList.add('is-shown');
    });
    gsap.set([ruleA, ruleB], { clipPath: 'none' });
  };

  const resetHidden = (vertical) => {
    if (hasPlayed) {
      showComplete();
      return;
    }
    section.classList.remove('is-symbol-entered');
    [textA, textB].forEach(clearTextAnimation);
    setRulesHidden(vertical);
  };

  const animateRule = (rule, direction) =>
    gsap.fromTo(
      rule,
      { clipPath: clipStart[direction] },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: LINE_DURATION,
        ease: 'power2.out',
      }
    );

  const playFocusIn = async (element, token) => {
    if (token !== playToken) return;
    clearTextAnimation(element);
    void element.offsetWidth;
    element.classList.add('text-focus-in');
    await waitForAnimation(element, 'text-focus-in', FOCUS_FALLBACK_MS);
    if (token !== playToken) return;
    element.classList.remove('text-focus-in');
    element.style.removeProperty('filter');
    element.classList.add('is-shown');
  };

  const playEnter = async (vertical) => {
    if (hasPlayed || isAnimating) return;

    isAnimating = true;
    const token = ++playToken;
    setRulesHidden(vertical);
    [textA, textB].forEach(clearTextAnimation);

    const firstRuleDir = vertical ? 'up' : 'left';
    const secondRuleDir = vertical ? 'down' : 'right';

    try {
      await animateRule(ruleA, firstRuleDir);
      if (token !== playToken) return;

      await delay(LINE_TO_TEXT_DELAY_MS);
      if (token !== playToken) return;

      await playFocusIn(textA, token);
      if (token !== playToken) return;

      await animateRule(ruleB, secondRuleDir);
      if (token !== playToken) return;

      await delay(LINE_TO_TEXT_DELAY_MS);
      if (token !== playToken) return;

      await playFocusIn(textB, token);
      if (token !== playToken) return;

      hasPlayed = true;
      section.classList.add('is-symbol-entered');
    } finally {
      if (token === playToken) {
        isAnimating = false;
      }
    }
  };

  const createTrigger = (vertical) => {
    resetHidden(vertical);

    return ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      onEnter() {
        if (!hasPlayed) {
          playEnter(vertical);
          return;
        }
        showComplete();
      },
      onEnterBack() {
        showComplete();
      },
    });
  };

  const mm = gsap.matchMedia();

  mm.add('(min-width: 1441px)', () => {
    const trigger = createTrigger(false);
    return () => trigger.kill();
  });

  mm.add('(max-width: 1440px)', () => {
    const trigger = createTrigger(true);
    return () => trigger.kill();
  });
}

function initAboutNameMobileScale() {
  const sections = Array.from(document.querySelectorAll('.about-name'));
  if (!sections.length) return;

  const BASE_WIDTH = 360;
  const BASE_HEIGHT = 808;
  const mobileQuery = window.matchMedia('(max-width: 48rem)');

  const pairs = sections
    .map((section) => ({
      viewport: section.querySelector('.about-name__viewport'),
      stage: section.querySelector('.about-name__stage'),
    }))
    .filter((pair) => pair.viewport && pair.stage);

  if (!pairs.length) return;

  const updateScale = () => {
    pairs.forEach(({ viewport, stage }) => {
      if (!mobileQuery.matches) {
        stage.style.transform = '';
        return;
      }

      const scale = Math.min(
        viewport.clientWidth / BASE_WIDTH,
        viewport.clientHeight / BASE_HEIGHT
      );

      stage.style.transform = `scale(${scale})`;
    });

    syncAboutNameHanjaAlign();

    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  };

  updateScale();
  window.addEventListener('resize', updateScale);
  mobileQuery.addEventListener('change', updateScale);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateScale);
  }
}

function initAboutMaterialStory() {
  const root = document.querySelector('.about-material__swiper');
  const fill = document.querySelector('.about-material__progress-fill');

  if (!root || !fill || typeof Swiper === 'undefined') return;

  const setProgress = (ratio) => {
    const value = Math.min(1, Math.max(0, ratio));

    if (typeof gsap !== 'undefined') {
      gsap.set(fill, { scaleX: value, transformOrigin: 'left center' });
      return;
    }

    fill.style.transformOrigin = 'left center';
    fill.style.transform = `scaleX(${value})`;
  };

  const isDesktopMaterial = window.matchMedia('(min-width: 64.0625rem)').matches;

  const swiper = new Swiper(root, {
    slidesPerView: 1,
    spaceBetween: 0,
    loop: true,
    speed: isDesktopMaterial ? 1000 : 500,
    grabCursor: true,
    allowTouchMove: true,
    followFinger: true,
    freeMode: false,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
      pauseOnMouseEnter: false,
    },
    on: {
      init() {
        setProgress(0);
      },
      slideChange() {
        setProgress(0);
      },
      autoplayTimeLeft(_swiper, _time, progress) {
        // progress: 1 → 0 (remaining). Fill should go 0 → 1.
        setProgress(1 - progress);
      },
    },
  });

  return swiper;
}
