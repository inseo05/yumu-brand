/**
 * YUMU - Home Essence section
 * Material 다음 4단계 스크롤 인터랙션 (단계형 휠/터치)
 */

window.addEventListener('load', () => {
  gsap.registerPlugin(ScrollTrigger);

  const section = document.querySelector('.essence');
  if (!section) return;

  const viewport = section.querySelector('.essence__viewport');
  const bgLight = section.querySelector('.essence__bg--light');
  const bgBrand = section.querySelector('.essence__bg--brand');
  const logos = section.querySelector('.essence__logos');
  const logoBase = section.querySelector('.essence__logo--base');
  const logoCeramic = section.querySelector('.essence__logo--ceramic');
  const logoFog = section.querySelector('.essence__logo--fog');

  const stageEls = [
    section.querySelector('.essence__stage--1'),
    section.querySelector('.essence__stage--2'),
    section.querySelector('.essence__stage--3'),
    section.querySelector('.essence__stage--4'),
  ];

  const introText = section.querySelector('.essence__intro');
  const ceramicHanja = section.querySelector('.essence__pair--ceramic .essence__hanja');
  const ceramicDivider = section.querySelector('.essence__pair--ceramic .essence__divider');
  const ceramicDesc = section.querySelector('.essence__pair--ceramic .essence__desc');
  const fogHanja = section.querySelector('.essence__pair--fog .essence__hanja');
  const fogDivider = section.querySelector('.essence__pair--fog .essence__divider');
  const fogDesc = section.querySelector('.essence__pair--fog .essence__desc');
  const finale = section.querySelector('.essence__finale');
  const finaleTop = section.querySelector('.essence__finale-line--top');
  const finaleBrand = section.querySelector('.essence__finale-brand');
  const finaleBottom = section.querySelector('.essence__finale-line--bottom');

  if (!viewport || stageEls.some((el) => !el)) return;

  const LAST_STAGE = 3;
  const WHEEL_THRESHOLD = 4;
  const TOUCH_THRESHOLD = 40;
  const GESTURE_IDLE_MS = 220;

  let currentStage = 0;
  let isAnimating = false;
  let isSectionActive = false;
  let canExitDown = false;
  let awaitingGestureEnd = false;
  let absorbInertia = false;
  let gestureIdleTimer = null;
  let touchStartY = 0;
  let touchGestureConsumed = false;
  let isReady = false;
  /** @type {ScrollTrigger | null} */
  let scrollTrigger = null;
  /** @type {gsap.core.Tween | gsap.core.Timeline | null} */
  let activeTween = null;

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

  const pingGestureActivity = () => {
    clearTimeout(gestureIdleTimer);
    gestureIdleTimer = setTimeout(() => {
      if (!isAnimating) {
        awaitingGestureEnd = false;
        absorbInertia = false;
      }
    }, GESTURE_IDLE_MS);
  };

  const beginGesture = () => {
    awaitingGestureEnd = true;
    pingGestureActivity();
  };

  const finishAnimating = () => {
    isAnimating = false;
    activeTween = null;
    pingGestureActivity();
  };

  const setLogoState = (state, immediate = false) => {
    const map = {
      base: { base: true, ceramic: false, fog: false },
      ceramic: { base: true, ceramic: true, fog: false },
      fog: { base: true, ceramic: false, fog: true },
      none: { base: false, ceramic: false, fog: false },
    }[state];

    const apply = (el, visible) => {
      if (!el) return;
      if (immediate) {
        gsap.set(el, { opacity: visible ? 1 : 0 });
      } else {
        gsap.to(el, { opacity: visible ? 1 : 0, duration: 0.55, ease: 'power1.out' });
      }
    };

    apply(logoBase, map.base);
    apply(logoCeramic, map.ceramic);
    apply(logoFog, map.fog);
  };

  const setStageVisibility = (index) => {
    stageEls.forEach((el, i) => {
      const active = i === index;
      el.classList.toggle('is-active', active);
      gsap.set(el, {
        opacity: active ? 1 : 0,
        visibility: active ? 'visible' : 'hidden',
        filter: 'blur(0px)',
      });
    });
  };

  const resetPairToStart = (type) => {
    if (type === 'ceramic') {
      gsap.set(ceramicHanja, { xPercent: 70 });
      gsap.set(ceramicDivider, { opacity: 0 });
      gsap.set(ceramicDesc, { opacity: 0, y: 28 });
    } else {
      gsap.set(fogHanja, { xPercent: -70 });
      gsap.set(fogDivider, { opacity: 0 });
      gsap.set(fogDesc, { opacity: 0, y: 28 });
    }
  };

  const setPairComplete = (type) => {
    if (type === 'ceramic') {
      gsap.set(ceramicHanja, { xPercent: 0 });
      gsap.set(ceramicDivider, { opacity: 1 });
      gsap.set(ceramicDesc, { opacity: 1, y: 0 });
    } else {
      gsap.set(fogHanja, { xPercent: 0 });
      gsap.set(fogDivider, { opacity: 1 });
      gsap.set(fogDesc, { opacity: 1, y: 0 });
    }
  };

  const finaleItems = [finaleTop, finaleBrand, finaleBottom].filter(Boolean);

  const clearFinaleTextAnimations = () => {
    finaleItems.forEach((el) => {
      el.classList.remove('text-blur-out', 'text-focus-in');
      el.style.removeProperty('filter');
      el.style.removeProperty('opacity');
    });
  };

  const playTextFocusIn = async (element) => {
    if (!element) return;
    element.classList.remove('text-blur-out', 'text-focus-in');
    element.style.removeProperty('filter');
    element.style.removeProperty('opacity');
    void element.offsetWidth;
    element.classList.add('text-focus-in');
    await waitForAnimation(element, 'text-focus-in', 900);
  };

  const setFinaleStart = () => {
    clearFinaleTextAnimations();
    gsap.set(finaleItems, { opacity: 0, clearProps: 'y,transform' });
    gsap.set(bgBrand, { opacity: 0 });
    gsap.set(bgLight, { opacity: 1 });
    gsap.set(logos, { opacity: 1 });
  };

  const setFinaleComplete = () => {
    clearFinaleTextAnimations();
    gsap.set(bgLight, { opacity: 0 });
    gsap.set(bgBrand, { opacity: 1 });
    gsap.set(logos, { opacity: 0 });
    gsap.set(stageEls[3], {
      opacity: 1,
      filter: 'blur(0px)',
      visibility: 'visible',
    });
    gsap.set(finaleItems, { opacity: 1, clearProps: 'y,transform,filter' });
  };

  const showStageInstant = (stage) => {
    if (activeTween) {
      activeTween.kill();
      activeTween = null;
    }

    if (introText) {
      introText.classList.remove('text-blur-out', 'text-focus-in');
      introText.style.removeProperty('filter');
      introText.style.removeProperty('opacity');
    }

    currentStage = stage;
    setStageVisibility(stage);

    if (stage === 0) {
      gsap.set(bgLight, { opacity: 1 });
      gsap.set(bgBrand, { opacity: 0 });
      gsap.set(logos, { opacity: 1 });
      setLogoState('base', true);
      gsap.set(introText, { opacity: 1, clearProps: 'filter' });
      resetPairToStart('ceramic');
      resetPairToStart('fog');
      setFinaleStart();
      return;
    }

    if (stage === 1) {
      gsap.set(bgLight, { opacity: 1 });
      gsap.set(bgBrand, { opacity: 0 });
      gsap.set(logos, { opacity: 1 });
      setLogoState('ceramic', true);
      setPairComplete('ceramic');
      resetPairToStart('fog');
      setFinaleStart();
      return;
    }

    if (stage === 2) {
      gsap.set(bgLight, { opacity: 1 });
      gsap.set(bgBrand, { opacity: 0 });
      gsap.set(logos, { opacity: 1 });
      setLogoState('fog', true);
      setPairComplete('fog');
      resetPairToStart('ceramic');
      setFinaleStart();
      return;
    }

    setLogoState('none', true);
    setFinaleComplete();
  };

  const animatePairIn = (type) => {
    const hanja = type === 'ceramic' ? ceramicHanja : fogHanja;
    const divider = type === 'ceramic' ? ceramicDivider : fogDivider;
    const desc = type === 'ceramic' ? ceramicDesc : fogDesc;
    const fromX = type === 'ceramic' ? 70 : -70;

    resetPairToStart(type);

    const tl = gsap.timeline();
    tl.set(divider, { opacity: 1 }, 0);
    tl.fromTo(
      hanja,
      { xPercent: fromX },
      { xPercent: 0, duration: 0.95, ease: 'power2.out' },
      0
    );
    tl.to(
      desc,
      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
      0.55
    );
    return tl;
  };

  const playForward = async (fromStage, toStage) => {
    if (toStage !== fromStage + 1) {
      showStageInstant(toStage);
      return;
    }

    if (fromStage === 0 && toStage === 1) {
      setStageVisibility(0);
      if (introText) {
        introText.classList.remove('text-focus-in');
        void introText.offsetWidth;
        introText.classList.add('text-blur-out');
        await waitForAnimation(introText, 'text-blur-out', 1300);
      }

      setStageVisibility(1);
      setLogoState('ceramic');
      resetPairToStart('ceramic');
      activeTween = animatePairIn('ceramic');
      await activeTween.then();
      return;
    }

    if (fromStage === 1 && toStage === 2) {
      const out = gsap.timeline();
      out.to(stageEls[1], { opacity: 0, duration: 0.35, ease: 'power1.in' });
      activeTween = out;
      await out.then();

      setStageVisibility(2);
      gsap.set(stageEls[2], { opacity: 1 });
      setLogoState('fog');
      resetPairToStart('fog');
      activeTween = animatePairIn('fog');
      await activeTween.then();
      return;
    }

    if (fromStage === 2 && toStage === 3) {
      stageEls.forEach((el, i) => {
        el.classList.toggle('is-active', i === 3);
      });
      clearFinaleTextAnimations();
      gsap.set(finaleItems, { opacity: 0, clearProps: 'y,transform' });
      gsap.set(stageEls[3], {
        opacity: 0,
        filter: 'blur(0px)',
        visibility: 'visible',
      });

      const tl = gsap.timeline();
      tl.to(stageEls[2], { opacity: 0, duration: 0.4, ease: 'power1.in' }, 0);
      tl.set(stageEls[2], { visibility: 'hidden' });
      tl.to(logos, { opacity: 0, duration: 0.55, ease: 'power1.out' }, 0);
      tl.to(bgLight, { opacity: 0, duration: 0.7, ease: 'power1.out' }, 0.1);
      tl.to(bgBrand, { opacity: 1, duration: 0.7, ease: 'power1.out' }, 0.1);
      tl.to(stageEls[3], { opacity: 1, duration: 0.45, ease: 'power1.out' }, 0.25);

      activeTween = tl;
      await tl.then();
      setLogoState('none', true);

      // 한 줄씩 text-focus-in
      for (const item of finaleItems) {
        await playTextFocusIn(item);
        item.classList.remove('text-focus-in');
        item.style.removeProperty('filter');
        item.style.opacity = '1';
      }
    }
  };

  const getHoldScroll = () => {
    if (!scrollTrigger) return window.scrollY;
    const range = scrollTrigger.end - scrollTrigger.start;
    return scrollTrigger.start + range * 0.5;
  };

  const snapToHold = () => {
    if (!scrollTrigger) return;
    scrollTrigger.scroll(getHoldScroll());
  };

  const scrollPastSection = () => {
    if (!scrollTrigger) return;
    scrollTrigger.scroll(scrollTrigger.end + 1);
  };

  const scrollBeforeSection = () => {
    if (!scrollTrigger) return;
    scrollTrigger.scroll(scrollTrigger.start - 1);
  };

  const goToStage = async (nextStage) => {
    if (nextStage < 0 || nextStage > LAST_STAGE || nextStage === currentStage) return;
    if (isAnimating) return;

    isAnimating = true;
    const from = currentStage;

    try {
      if (nextStage < from) {
        showStageInstant(nextStage);
      } else {
        await playForward(from, nextStage);
        currentStage = nextStage;
      }
    } finally {
      finishAnimating();
    }
  };

  /**
   * @returns {'step' | 'exit-down' | 'exit-up' | 'blocked' | 'none'}
   */
  const handleStep = (direction) => {
    if (!isSectionActive) return 'none';
    if (isAnimating || awaitingGestureEnd) return 'blocked';

    if (direction > 0) {
      if (currentStage < LAST_STAGE) {
        beginGesture();
        goToStage(currentStage + 1);
        return 'step';
      }
      canExitDown = true;
      isSectionActive = false;
      beginGesture();
      return 'exit-down';
    }

    if (direction < 0) {
      if (currentStage > 0) {
        beginGesture();
        goToStage(currentStage - 1);
        return 'step';
      }
      isSectionActive = false;
      absorbInertia = true;
      beginGesture();
      return 'exit-up';
    }

    return 'none';
  };

  const shouldCaptureScroll = () => {
    if (!scrollTrigger || !isReady) return false;
    if (absorbInertia || isSectionActive) return true;
    if (canExitDown) return false;
    return scrollTrigger.isActive;
  };

  const applyResult = (result) => {
    if (result === 'step' || result === 'blocked') {
      snapToHold();
      return;
    }
    if (result === 'exit-up') {
      scrollBeforeSection();
      return;
    }
    if (result === 'exit-down') {
      scrollPastSection();
    }
  };

  const activateSection = (stage = 0) => {
    isSectionActive = true;
    canExitDown = false;
    absorbInertia = false;
    showStageInstant(stage);
    snapToHold();
  };

  const onWheel = (event) => {
    if (event.ctrlKey) return;
    if (!shouldCaptureScroll()) return;

    if (absorbInertia) {
      event.preventDefault();
      pingGestureActivity();
      return;
    }

    if (!isSectionActive && scrollTrigger?.isActive && !canExitDown) {
      event.preventDefault();
      activateSection(currentStage > 0 && scrollTrigger.direction === -1 ? currentStage : 0);
      beginGesture();
      return;
    }

    if (!isSectionActive) return;

    if (isAnimating || awaitingGestureEnd) {
      event.preventDefault();
      snapToHold();
      pingGestureActivity();
      return;
    }

    if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) {
      event.preventDefault();
      snapToHold();
      return;
    }

    const direction = Math.sign(event.deltaY);
    const result = handleStep(direction);
    if (result === 'none') return;
    event.preventDefault();
    applyResult(result);
  };

  const onTouchStart = (event) => {
    if (!event.touches.length) return;
    touchStartY = event.touches[0].clientY;
    touchGestureConsumed = false;
  };

  const onTouchMove = (event) => {
    if (!event.touches.length) return;
    if (!shouldCaptureScroll()) return;

    event.preventDefault();

    if (absorbInertia) {
      pingGestureActivity();
      return;
    }

    if (!isSectionActive && scrollTrigger?.isActive && !canExitDown) {
      activateSection(0);
      beginGesture();
      touchGestureConsumed = true;
      return;
    }

    if (!isSectionActive) return;

    if (isAnimating || awaitingGestureEnd || touchGestureConsumed) {
      snapToHold();
      pingGestureActivity();
      return;
    }

    const deltaY = touchStartY - event.touches[0].clientY;
    if (Math.abs(deltaY) < TOUCH_THRESHOLD) {
      snapToHold();
      return;
    }

    touchGestureConsumed = true;
    applyResult(handleStep(Math.sign(deltaY)));
  };

  const onTouchEnd = () => {
    pingGestureActivity();
  };

  const onKeyDown = (event) => {
    if (!shouldCaptureScroll()) return;

    let direction = 0;
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
      direction = 1;
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      direction = -1;
    } else {
      return;
    }

    if (absorbInertia) {
      event.preventDefault();
      pingGestureActivity();
      return;
    }

    if (!isSectionActive && scrollTrigger?.isActive && !canExitDown) {
      event.preventDefault();
      activateSection(0);
      beginGesture();
      return;
    }

    if (!isSectionActive) return;

    if (isAnimating || awaitingGestureEnd) {
      event.preventDefault();
      snapToHold();
      return;
    }

    const result = handleStep(direction);
    if (result === 'none') return;
    event.preventDefault();
    applyResult(result);
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('keydown', onKeyDown);

  scrollTrigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=120%',
    pin: true,
    anticipatePin: 1,
    fastScrollEnd: true,
    onEnter() {
      if (!canExitDown) {
        activateSection(0);
        beginGesture();
      }
    },
    onEnterBack() {
      canExitDown = false;
      activateSection(LAST_STAGE);
      beginGesture();
    },
    onLeave(self) {
      if (!canExitDown && self.direction === 1) {
        self.scroll(getHoldScroll());
        if (!isSectionActive) {
          activateSection(currentStage);
          beginGesture();
        }
      }
    },
    onLeaveBack() {
      isSectionActive = false;
      absorbInertia = false;
    },
    onUpdate(self) {
      if (isSectionActive && !canExitDown) {
        const hold = getHoldScroll();
        if (Math.abs(self.scroll() - hold) > 1) {
          self.scroll(hold);
        }
        return;
      }
      if (absorbInertia) {
        const target = self.start - 1;
        if (Math.abs(self.scroll() - target) > 1 && self.scroll() > self.start - 2) {
          /* 이탈 직후 위치는 exit-up에서 처리 */
        }
      }
    },
  });

  // 초기 상태
  showStageInstant(0);

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
    requestAnimationFrame(() => {
      isReady = true;
    });
  });
});
