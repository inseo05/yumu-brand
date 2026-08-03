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
  initAboutNameEntrances();
  initAboutNameMobileScale();
  initAboutMaterialStory();
});

function initAboutHeroPhrases() {
  const rightPhrase = document.querySelector('.about-hero__phrase--right');
  const leftPhrase = document.querySelector('.about-hero__phrase--left');

  if (!rightPhrase || !leftPhrase) return;

  const playFocusIn = (element) => {
    element.classList.remove('text-focus-in');
    void element.offsetWidth;
    element.classList.add('text-focus-in');
  };

  const onRightAnimationEnd = (event) => {
    if (event.animationName && event.animationName !== 'text-focus-in') return;
    rightPhrase.removeEventListener('animationend', onRightAnimationEnd);
    playFocusIn(leftPhrase);
  };

  rightPhrase.addEventListener('animationend', onRightAnimationEnd);
  playFocusIn(rightPhrase);
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

    const timelines = createOpacityRevealTimelines(groups);

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
    // about-name 도자기·안개: 별도 등장 타임라인 사용 (scrub 제외)
    if (section.classList.contains('about-name')) return;

    const lines = Array.from(section.querySelectorAll('.about-reveal__line'));
    if (!lines.length) return;
    createOpacityRevealTimelines(lines);
  });
}

/**
 * Name meaning — 도자기(釉)·안개(霧)
 * motion wrapper x 이동 → 텍스트 영역 순차 등장
 * 한자 요소의 CSS transform/위치는 건드리지 않음
 */
function initAboutNameEntrances() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const configs = [
    {
      section: document.querySelector('.about-name:not(.about-name--fog)'),
      direction: -1,
    },
    {
      section: document.querySelector('.about-name--fog'),
      direction: 1,
    },
  ];

  configs.forEach(({ section, direction }) => {
    if (!section) return;

    const hanjaMotion = section.querySelector('.about-name__hanja-motion');
    const heading = section.querySelector('.about-name__heading');
    const bodyText = section.querySelector('.about-name__text');

    if (!hanjaMotion || !heading || !bodyText) return;

    gsap.set(hanjaMotion, {
      x: () => direction * Math.max(window.innerWidth, section.offsetWidth),
    });
    gsap.set([heading, bodyText], { y: 24, opacity: 0.25 });

    gsap
      .timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 75%',
          once: true,
          invalidateOnRefresh: true,
        },
      })
      .fromTo(
        hanjaMotion,
        {
          x: () => direction * Math.max(window.innerWidth, section.offsetWidth),
        },
        {
          x: 0,
          duration: 1.2,
          ease: 'power2.out',
        }
      )
      .fromTo(
        heading,
        { y: 24, opacity: 0.25 },
        { y: 0, opacity: 1, duration: 1.2, ease: 'power2.out' }
      )
      .fromTo(
        bodyText,
        { y: 24, opacity: 0.25 },
        { y: 0, opacity: 1, duration: 1.2, ease: 'power2.out' }
      )
      .add(() => {
        // FOUC CSS 해제 후에야 clearProps — 제목이 다시 숨겨지지 않도록
        section.classList.add('is-name-entered');
        gsap.set([heading, bodyText], { clearProps: 'transform,opacity' });
      });
  });

  ScrollTrigger.refresh();
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

  const swiper = new Swiper(root, {
    slidesPerView: 1,
    spaceBetween: 0,
    loop: true,
    speed: 300,
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
