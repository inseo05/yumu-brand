/**
 * YUMU - Home page JavaScript
 * Hero → Intro 영상 전환 + Intro 텍스트 전환 (단일 pin)
 */

window.addEventListener('load', () => {
  gsap.registerPlugin(ScrollTrigger);

  const wrapper = document.querySelector('.home-scroll');
  const heroPanel = document.querySelector('.home-scroll__panel--hero');
  const introPanel = document.querySelector('.home-scroll__panel--intro');
  const heroText = document.querySelector('.home-scroll__text');
  const introCopy = document.querySelector('.home-scroll__intro-copy');
  const introLines = introCopy
    ? Array.from(introCopy.querySelectorAll('.home-scroll__intro-line'))
    : [];

  if (!wrapper || !heroPanel || !introPanel) return;

  gsap.set(heroPanel, {
    transformOrigin: '50% 50%',
    force3D: true,
  });

  gsap.set(introPanel, {
    scale: 1.1,
    transformOrigin: '50% 50%',
    force3D: true,
  });

  /* 전체 pin: 영상 1 + 텍스트 2 = 스크롤 길이 300%
     타임라인 duration 3 기준 → 영상 구간 progress 0 ~ 1/3 */
  const VIDEO_END = 1 / 3;
  const START_EPSILON = 0.025;

  let isReady = false;
  let hasUserScrolled = false;
  /** @type {'visible' | 'hidden'} */
  let textState = 'visible';
  let activeIntroIndex = 0;
  let introCopyVisible = false;

  const clearTextAnimationClasses = () => {
    if (!heroText) return;
    heroText.classList.remove('text-blur-out', 'text-focus-in');
  };

  const clearTextInlineState = () => {
    if (!heroText) return;
    heroText.style.removeProperty('filter');
    heroText.style.removeProperty('opacity');
  };

  const swapTextAnimation = (nextClass) => {
    if (!heroText) return;
    clearTextInlineState();
    clearTextAnimationClasses();
    void heroText.offsetWidth;
    heroText.classList.add(nextClass);
  };

  const isHeroStart = (progress) =>
    progress <= START_EPSILON || window.scrollY <= 1;

  const markUserScrolled = () => {
    hasUserScrolled = true;
  };

  window.addEventListener('wheel', markUserScrolled, { passive: true });
  window.addEventListener('touchmove', markUserScrolled, { passive: true });
  window.addEventListener('keydown', (event) => {
    const scrollKeys = [
      'ArrowDown',
      'ArrowUp',
      'PageDown',
      'PageUp',
      'Home',
      'End',
      ' ',
      'Spacebar',
    ];
    if (scrollKeys.includes(event.key)) {
      markUserScrolled();
    }
  });

  if (heroText) {
    clearTextAnimationClasses();
    clearTextInlineState();
    textState = 'visible';
  }

  const clearIntroLineAnimations = (line) => {
    line.classList.remove('text-blur-out', 'text-focus-in');
  };

  const setIntroCopyVisible = (visible) => {
    if (!introCopy || introCopyVisible === visible) return;
    introCopyVisible = visible;
    introCopy.classList.toggle('is-visible', visible);
  };

  const goToIntroIndex = (nextIndex) => {
    if (nextIndex === activeIntroIndex || introLines.length !== 3) return;

    const fromLine = introLines[activeIntroIndex];
    const toLine = introLines[nextIndex];

    introLines.forEach((line, index) => {
      clearIntroLineAnimations(line);
      if (index !== activeIntroIndex && index !== nextIndex) {
        line.classList.remove('is-active');
      }
    });

    void fromLine.offsetWidth;
    void toLine.offsetWidth;

    fromLine.classList.add('text-blur-out');
    toLine.classList.add('is-active', 'text-focus-in');

    const onBlurEnd = (event) => {
      if (event.animationName && event.animationName !== 'text-blur-out') return;
      if (activeIntroIndex === nextIndex) {
        fromLine.classList.remove('is-active', 'text-blur-out');
      }
      fromLine.removeEventListener('animationend', onBlurEnd);
    };

    fromLine.addEventListener('animationend', onBlurEnd);
    activeIntroIndex = nextIndex;
  };

  const introIndexFromProgress = (textProgress) => {
    if (textProgress < 1 / 3) return 0;
    if (textProgress < 2 / 3) return 1;
    return 2;
  };

  const syncIntroIndex = (textProgress, animate) => {
    if (introLines.length !== 3) return;

    const nextIndex = introIndexFromProgress(textProgress);

    if (!animate) {
      introLines.forEach((line, index) => {
        clearIntroLineAnimations(line);
        line.classList.toggle('is-active', index === nextIndex);
      });
      activeIntroIndex = nextIndex;
      return;
    }

    goToIntroIndex(nextIndex);
  };

  const updateIntroText = (progress, animate) => {
    if (introLines.length !== 3) return;

    if (progress < VIDEO_END) {
      setIntroCopyVisible(false);
      syncIntroIndex(0, false);
      return;
    }

    setIntroCopyVisible(true);
    const textProgress = (progress - VIDEO_END) / (1 - VIDEO_END);
    syncIntroIndex(textProgress, animate);
  };

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: wrapper,
      start: 'top top',
      end: '+=300%',
      pin: true,
      scrub: true,
      onUpdate(self) {
        updateIntroText(self.progress, true);

        if (!heroText || !isReady || !hasUserScrolled) return;

        // 1) 시작점이면 보이는 상태로 고정하고 사라짐 로직은 실행하지 않음
        if (isHeroStart(self.progress)) {
          if (textState === 'hidden') {
            swapTextAnimation('text-focus-in');
            textState = 'visible';
          } else if (heroText.classList.contains('text-blur-out')) {
            clearTextAnimationClasses();
            clearTextInlineState();
          }
          return;
        }

        // 2) 시작점을 벗어난 뒤, 아래 방향 스크롤일 때만 퇴장
        if (textState !== 'visible') return;
        if (self.direction !== 1) return;
        if (self.progress <= START_EPSILON) return;

        swapTextAnimation('text-blur-out');
        textState = 'hidden';
      },
      onRefresh(self) {
        updateIntroText(self.progress, false);
      },
    },
  });

  // duration 1: 영상 전환 / duration 2: 텍스트 전환 구간 확보 (전체 3)
  timeline
    .to(
      heroPanel,
      {
        scale: 2,
        z: 350,
        autoAlpha: 0,
        ease: 'none',
        duration: 1,
      },
      0
    )
    .to(
      introPanel,
      {
        scale: 1,
        ease: 'none',
        duration: 1,
      },
      0
    )
    .to({}, { duration: 2 });

  const scrollTrigger = timeline.scrollTrigger;

  const syncInitialTextState = () => {
    if (!heroText || !scrollTrigger) return;

    clearTextAnimationClasses();
    clearTextInlineState();

    if (isHeroStart(scrollTrigger.progress)) {
      textState = 'visible';
      return;
    }

    textState = 'hidden';
    heroText.style.filter = 'blur(12px)';
    heroText.style.opacity = '0';
  };

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
    syncInitialTextState();
    if (scrollTrigger) {
      updateIntroText(scrollTrigger.progress, false);
    }
    requestAnimationFrame(() => {
      isReady = true;
    });
  });

  /* Material 섹션 진입 전환 (Ease in / 1000ms) */
  const materialSection = document.querySelector('.material');

  if (materialSection) {
    gsap.from(materialSection, {
      autoAlpha: 0,
      y: 48,
      duration: 1,
      ease: 'power1.in',
      scrollTrigger: {
        trigger: materialSection,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  }
});
